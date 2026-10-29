// NCI RGB565 Binary Format & GIF/PNG Converter Utility
// Faithfully matching the NeoClock / Awtrix specification from index_3f785a56.html
// Magic Header: "NCI1" (0x4E, 0x43, 0x49, 0x31)

export interface NciPixelRGBA {
  0: number; // Red (0..255)
  1: number; // Green (0..255)
  2: number; // Blue (0..255)
  3: number; // Alpha (0..255)
}

export interface NciRawFrame {
  pixels: [number, number, number, number][]; // Array of [R, G, B, A]
  delay: number; // Delay in milliseconds
}

export interface NciAnimationData {
  width: number;
  height: number;
  frameCount: number;
  frameMs: number;
  frames: NciRawFrame[];
}

/** Convert R, G, B (0..255) to 16-bit RGB565 integer */
export function rgb565(r: number, g: number, b: number): number {
  return ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
}

/** Convert 16-bit RGB565 to [R, G, B, A] */
export function rgb565ToRgba(val: number): [number, number, number, number] {
  if (val === 0) return [0, 0, 0, 0];
  const r = Math.round(((val >> 11) & 31) * 255 / 31);
  const g = Math.round(((val >> 5) & 63) * 255 / 63);
  const b = Math.round((val & 31) * 255 / 31);
  return [r, g, b, 255];
}

/** Convert 16-bit RGB565 to Hex string */
export function rgb565ToHex(val: number): string {
  if (val === 0) return '#000000';
  const [r, g, b] = rgb565ToRgba(val);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}

/** Convert Hex string (#RRGGBB or #RGB) to [R, G, B, A] */
export function hexToRgba(hex: string): [number, number, number, number] {
  if (!hex || hex === '.' || hex === 'transparent' || hex === '#000000' || hex === '#121721') {
    return [0, 0, 0, 0];
  }
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [0, 0, 0, 0];
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return [r, g, b, 255];
}

/** Convert Hex string directly to 16-bit RGB565 */
export function hexToRgb565(hex: string): number {
  const [r, g, b, a] = hexToRgba(hex);
  if (a === 0) return 0;
  return rgb565(r, g, b);
}

/**
 * Create NCI binary Blob from NciRawFrame array
 * Header layout (12 bytes):
 * - Byte 0..3: 'N', 'C', 'I', '1' (78, 67, 73, 49)
 * - Byte 4: width (uint8)
 * - Byte 5: height (uint8)
 * - Byte 6: frameCount (uint8)
 * - Byte 7: version = 1 (uint8)
 * - Byte 8..9: frameMs (uint16 LE)
 * - Byte 10..11: 0 (uint16 LE reserved)
 * Followed by width * height uint16 LE pixel values per frame.
 */
export function makeNci(frames: NciRawFrame[], w: number, h: number, frameMs: number): Blob {
  const header = 12;
  const bytes = header + frames.length * w * h * 2;
  const buf = new ArrayBuffer(bytes);
  const v = new DataView(buf);

  v.setUint8(0, 78); // 'N'
  v.setUint8(1, 67); // 'C'
  v.setUint8(2, 73); // 'I'
  v.setUint8(3, 49); // '1'
  v.setUint8(4, w);
  v.setUint8(5, h);
  v.setUint8(6, frames.length);
  v.setUint8(7, 1);
  v.setUint16(8, frameMs, true);
  v.setUint16(10, 0, true);

  let o = header;
  for (const fr of frames) {
    for (let i = 0; i < w * h; i++) {
      const p = fr.pixels[i] || [0, 0, 0, 0];
      const val = p[3] === 0 ? 0 : rgb565(p[0], p[1], p[2]);
      v.setUint16(o, val, true);
      o += 2;
    }
  }

  return new Blob([buf], { type: 'application/octet-stream' });
}

/**
 * Convert 8x32 / custom hex color grids into NCI Raw Frames, then make NCI binary Blob
 */
export function makeNciFromHexGrids(hexGrids: string[][][], w: number, h: number, frameMs: number): Blob {
  const frames: NciRawFrame[] = hexGrids.map(grid => {
    const pixels: [number, number, number, number][] = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const hex = grid[y]?.[x] || '';
        pixels.push(hexToRgba(hex));
      }
    }
    return { pixels, delay: frameMs };
  });

  return makeNci(frames, w, h, frameMs);
}

/**
 * Parse an NCI binary file from ArrayBuffer
 */
export function parseNci(buffer: ArrayBuffer): NciAnimationData {
  if (buffer.byteLength < 12) {
    throw new Error('文件过小，不是有效的 NCI 文件');
  }
  const view = new DataView(buffer);
  const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (magic !== 'NCI1') {
    throw new Error(`未知的文件头标识: ${magic}，应为 NCI1`);
  }

  const width = view.getUint8(4);
  const height = view.getUint8(5);
  const frameCount = view.getUint8(6);
  const frameMs = view.getUint16(8, true);

  const frames: NciRawFrame[] = [];
  let offset = 12;
  const pixelsPerFrame = width * height;

  for (let f = 0; f < frameCount; f++) {
    const pixels: [number, number, number, number][] = [];
    for (let p = 0; p < pixelsPerFrame; p++) {
      if (offset + 1 < buffer.byteLength) {
        const val = view.getUint16(offset, true);
        offset += 2;
        pixels.push(rgb565ToRgba(val));
      } else {
        pixels.push([0, 0, 0, 0]);
      }
    }
    frames.push({ pixels, delay: frameMs });
  }

  return { width, height, frameCount, frameMs, frames };
}

/**
 * Nearest-neighbor scale RGBA buffer to target dimensions (exact logic from index_3f785a56.html)
 */
export function scaleRgba(
  rgba: Uint8ClampedArray,
  sw: number,
  sh: number,
  w: number,
  h: number,
  delay: number
): NciRawFrame {
  const pixels: [number, number, number, number][] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = Math.min(sw - 1, Math.floor(x * sw / w));
      const sy = Math.min(sh - 1, Math.floor(y * sh / h));
      const o = (sy * sw + sx) * 4;
      pixels.push([rgba[o], rgba[o + 1], rgba[o + 2], rgba[o + 3]]);
    }
  }
  return { pixels, delay };
}

/**
 * LZW decompression for GIF sub-blocks (exact logic from index_3f785a56.html)
 */
export function lzwDecode(min: number, data: Uint8Array, limit: number): number[] {
  let pos = 0;
  function code(size: number): number {
    let c = 0;
    for (let i = 0; i < size; i++) {
      if (data[pos >> 3] & (1 << (pos & 7))) c |= 1 << i;
      pos++;
    }
    return c;
  }

  const clear = 1 << min;
  const end = clear + 1;
  let size = min + 1;
  let dict: number[][] = [];
  const out: number[] = [];

  function reset() {
    dict = [];
    for (let i = 0; i < clear; i++) dict[i] = [i];
    dict[clear] = [];
    dict[end] = [];
    size = min + 1;
  }

  reset();
  let prev: number[] | null = null;

  for (;;) {
    const c = code(size);
    if (c === clear) {
      reset();
      prev = null;
      continue;
    }
    if (c === end || out.length >= limit) break;
    const entry: number[] = dict[c] ? dict[c].slice() : (prev ? prev.concat(prev[0]) : []);
    out.push(...entry);

    if (prev) {
      dict.push(prev.concat(entry[0]));
      if (dict.length === (1 << size) && size < 12) size++;
    }
    prev = entry;
  }

  return out.slice(0, limit);
}

/**
 * Full binary GIF parser (exact logic from index_3f785a56.html)
 * Decodes all frames, handles local/global color tables, transparent color, frame delay, and disposal methods.
 */
export function parseGif(
  buf: ArrayBuffer,
  w: number,
  h: number,
  maxFrames: number = 60,
  overrideDelay: number = 0
): NciRawFrame[] {
  const b = new Uint8Array(buf);
  let p = 0;

  function rd(n: number): Uint8Array {
    const s = b.slice(p, p + n);
    p += n;
    return s;
  }

  function u16(): number {
    const v = b[p] | (b[p + 1] << 8);
    p += 2;
    return v;
  }

  function subBlocks(): Uint8Array {
    const out: number[] = [];
    for (;;) {
      const n = b[p++];
      if (!n) break;
      out.push(...b.slice(p, p + n));
      p += n;
    }
    return new Uint8Array(out);
  }

  function table(n: number): [number, number, number, number][] {
    const t: [number, number, number, number][] = [];
    for (let i = 0; i < n; i++) {
      t.push([b[p++], b[p++], b[p++], 255]);
    }
    return t;
  }

  const sig = String.fromCharCode(...rd(6));
  if (!sig.startsWith('GIF')) {
    throw new Error('不是有效的 GIF 文件');
  }

  const sw = u16();
  const sh = u16();
  const packed = b[p++];
  const bg = b[p++];
  p++; // aspect ratio byte

  const gctFlag = packed & 0x80;
  const gctSize = 2 << (packed & 7);
  const gct = gctFlag ? table(gctSize) : [];

  let gce = { delay: 100, trans: null as number | null, dispose: 0 };
  let screen = new Uint8ClampedArray(sw * sh * 4);

  if (gct[bg]) {
    for (let i = 0; i < sw * sh; i++) {
      screen[i * 4] = gct[bg][0];
      screen[i * 4 + 1] = gct[bg][1];
      screen[i * 4 + 2] = gct[bg][2];
      screen[i * 4 + 3] = 255;
    }
  }

  const frames: NciRawFrame[] = [];

  while (p < b.length && frames.length < maxFrames) {
    const sep = b[p++];
    if (sep === 0x3B) break; // Trailer
    if (sep === 0x21) {
      // Extension block
      const lab = b[p++];
      if (lab === 0xF9) {
        // Graphic Control Extension
        p++; // block size (4)
        const pk = b[p++];
        const del = u16() * 10; // delay in centiseconds -> ms
        const tr = b[p++]; // transparent color index
        p++; // terminator
        gce = {
          delay: overrideDelay || Math.max(30, del || 100),
          trans: (pk & 1) ? tr : null,
          dispose: (pk >> 2) & 7,
        };
      } else {
        subBlocks();
      }
      continue;
    }

    if (sep !== 0x2C) {
      throw new Error('GIF 块格式不支持 (期望 0x2C Image Descriptor)');
    }

    const ix = u16();
    const iy = u16();
    const iw = u16();
    const ih = u16();
    const ip = b[p++];
    const lct = (ip & 0x80) ? table(2 << (ip & 7)) : null;
    const inter = !!(ip & 0x40);
    const ct = lct || gct;
    const min = b[p++];
    const data = subBlocks();
    const idx = lzwDecode(min, data, iw * ih);
    const prev = screen.slice();
    const order: number[] = [];

    if (inter) {
      for (const [st, step] of [[0, 8], [4, 8], [2, 4], [1, 2]]) {
        for (let y = st; y < ih; y += step) order.push(y);
      }
    } else {
      for (let y = 0; y < ih; y++) order.push(y);
    }

    let k = 0;
    for (const y of order) {
      for (let x = 0; x < iw; x++, k++) {
        const ci = idx[k];
        if (ci === undefined) continue;
        if (gce.trans !== null && ci === gce.trans) continue;
        const col = ct[ci] || [0, 0, 0, 255];
        const sx = ix + x;
        const sy = iy + y;
        if (sx < 0 || sy < 0 || sx >= sw || sy >= sh) continue;
        const o = (sy * sw + sx) * 4;
        screen[o] = col[0];
        screen[o + 1] = col[1];
        screen[o + 2] = col[2];
        screen[o + 3] = 255;
      }
    }

    frames.push(scaleRgba(screen, sw, sh, w, h, gce.delay));

    if (gce.dispose === 2) {
      // Restore to background
      for (let y = iy; y < iy + ih; y++) {
        for (let x = ix; x < ix + iw; x++) {
          if (x < 0 || y < 0 || x >= sw || y >= sh) continue;
          const o = (y * sw + x) * 4;
          screen[o] = screen[o + 1] = screen[o + 2] = 0;
          screen[o + 3] = 0;
        }
      }
    } else if (gce.dispose === 3) {
      // Restore to previous
      screen = prev;
    }
    gce = { delay: 100, trans: null, dispose: 0 };
  }

  return frames;
}

/**
 * Draw static HTMLImageElement to single NciRawFrame with nearest-neighbor scaling
 */
export function drawImageToFrame(img: HTMLImageElement, w: number, h: number, delay: number = 200): NciRawFrame {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('无法创建 Canvas 2D 绘图上下文');
  }

  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, w, h);

  const d = ctx.getImageData(0, 0, w, h).data;
  const pixels: [number, number, number, number][] = [];
  for (let i = 0; i < d.length; i += 4) {
    pixels.push([d[i], d[i + 1], d[i + 2], d[i + 3]]);
  }

  return { pixels, delay };
}

/**
 * Convert static image file (PNG/JPG/WebP) to NciRawFrame array
 */
export async function imageToFrame(file: File, w: number, h: number): Promise<NciRawFrame[]> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = url;
    });
    return [drawImageToFrame(img, w, h, 200)];
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Convert file (PNG or GIF) to NciRawFrame array with full GIF decoding
 */
export async function fileToNciFrames(
  file: File,
  w: number,
  h: number,
  maxFrames: number = 60,
  overrideDelay: number = 0
): Promise<NciRawFrame[]> {
  const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
  if (isGif) {
    const buf = await file.arrayBuffer();
    return parseGif(buf, w, h, maxFrames, overrideDelay);
  } else {
    return imageToFrame(file, w, h);
  }
}

/**
 * Convert NciRawFrame pixels to Hex Color Matrix [H][W]
 */
export function nciRawFrameToHexGrid(frame: NciRawFrame, w: number, h: number): string[][] {
  const grid: string[][] = [];
  let idx = 0;
  for (let y = 0; y < h; y++) {
    const row: string[] = [];
    for (let x = 0; x < w; x++) {
      const p = frame.pixels[idx++] || [0, 0, 0, 0];
      if (p[3] === 0) {
        row.push('#121721'); // unlit black
      } else {
        const hex = `#${p[0].toString(16).padStart(2, '0')}${p[1].toString(16).padStart(2, '0')}${p[2].toString(16).padStart(2, '0')}`.toUpperCase();
        row.push(hex);
      }
    }
    grid.push(row);
  }
  return grid;
}

/**
 * Trigger browser download of NCI Blob
 */
export function downloadNciBlob(blob: Blob, filename: string): void {
  const safeName = filename.endsWith('.nci') ? filename : `${filename}.nci`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Export C++ RGB565 Array code for Arduino / ESP-IDF / NeoClock
 */
export function generateCppRgb565Code(
  frames: NciRawFrame[],
  animName: string,
  width: number = 32,
  height: number = 8,
  frameMs: number = 120
): string {
  const frameCount = frames.length;
  const pixelsPerFrame = width * height;

  const frameBlocks = frames.map((frame, fIdx) => {
    const hexLines: string[] = [];
    const step = 8; // 8 values per line
    for (let i = 0; i < pixelsPerFrame; i += step) {
      const chunk: string[] = [];
      for (let j = 0; j < step; j++) {
        const p = frame.pixels[i + j] || [0, 0, 0, 0];
        const val = p[3] === 0 ? 0 : rgb565(p[0], p[1], p[2]);
        chunk.push(`0x${val.toString(16).padStart(4, '0').toUpperCase()}`);
      }
      hexLines.push(`    ${chunk.join(', ')}`);
    }
    return `  // Frame ${fIdx} (${width}x${height})\n  {\n${hexLines.join(',\n')}\n  }`;
  });

  return `// ESP32-S3 ${width}x${height} NCI RGB565 Animation
// Name: ${animName} | Frames: ${frameCount} | Interval: ${frameMs}ms
#define ANIM_WIDTH       ${width}
#define ANIM_HEIGHT      ${height}
#define ANIM_FRAME_COUNT ${frameCount}
#define ANIM_FRAME_MS    ${frameMs}

// 16-bit RGB565 Framebuffer (PROGMEM flash storage)
const uint16_t PROGMEM anim_rgb565[ANIM_FRAME_COUNT][${pixelsPerFrame}] = {
${frameBlocks.join(',\n')}
};

// Direct push to display (NeoClock / TFT_eSPI / FastLED / HUB75):
// void drawNciFrame(uint8_t frameIdx) {
//   for (int i = 0; i < ${pixelsPerFrame}; i++) {
//     uint16_t color565 = pgm_read_word(&(anim_rgb565[frameIdx][i]));
//     matrix.drawPixel(i % ${width}, i / ${width}, color565);
//   }
// }`;
}
