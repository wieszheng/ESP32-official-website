// NCI RGB565 Binary Format Utility for ESP32 NeoClock / Awtrix matrix
// Magic Header: "NCI1" (0x4E, 0x43, 0x49, 0x31)
// Specification matches index_3f785a56.html reference

export interface NciAnimationData {
  width: number;
  height: number;
  frameCount: number;
  frameMs: number;
  // Each frame is an array of width * height RGB565 numbers (0..65535)
  frames: number[][];
}

/** Convert R, G, B (0..255) to 16-bit RGB565 (5 bits Red, 6 bits Green, 5 bits Blue) */
export function rgbToRgb565(r: number, g: number, b: number): number {
  return ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
}

/** Convert Hex string (#RRGGBB or #RGB) to 16-bit RGB565 */
export function hexToRgb565(hex: string): number {
  if (!hex || hex === '.' || hex === 'transparent' || hex === '#000000') return 0;
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return 0;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return rgbToRgb565(r, g, b);
}

/** Convert 16-bit RGB565 to [R, G, B] */
export function rgb565ToRgb(val: number): [number, number, number] {
  const r = Math.round(((val >> 11) & 31) * 255 / 31);
  const g = Math.round(((val >> 5) & 63) * 255 / 63);
  const b = Math.round((val & 31) * 255 / 31);
  return [r, g, b];
}

/** Convert 16-bit RGB565 to Hex string */
export function rgb565ToHex(val: number): string {
  if (val === 0) return '#000000';
  const [r, g, b] = rgb565ToRgb(val);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}

/** Helper to append 16-bit unsigned integer little endian */
function appendU16LE(bytes: number[], val: number): void {
  bytes.push(val & 255, (val >> 8) & 255);
}

/**
 * Generate NCI1 binary bytes from RGB565 frames
 * @param frames Array of frames, each containing width*height uint16 numbers
 * @param width Matrix width (e.g. 8 or 32)
 * @param height Matrix height (e.g. 8)
 * @param frameMs Frame interval in milliseconds (default 120ms ~ 166ms)
 */
export function makeNci(frames: number[][], width: number, height: number, frameMs: number = 120): Uint8Array {
  const bytes: number[] = [];
  
  // Header: 'N', 'C', 'I', '1', width, height, frameCount, version=1
  bytes.push(78, 67, 73, 49, width, height, frames.length, 1);
  
  // Frame interval in ms (uint16 LE)
  appendU16LE(bytes, Math.max(20, Math.min(5000, frameMs)));
  
  // Reserved 2 bytes (uint16 LE)
  appendU16LE(bytes, 0);
  
  // Pixel data for each frame: uint16 LE
  for (let f = 0; f < frames.length; f++) {
    const fr = frames[f];
    for (let i = 0; i < width * height; i++) {
      const px = (fr && fr[i] !== undefined) ? fr[i] : 0;
      appendU16LE(bytes, px);
    }
  }
  
  return new Uint8Array(bytes);
}

/**
 * Parse an NCI1 binary file from ArrayBuffer
 */
export function parseNci(buffer: ArrayBuffer): NciAnimationData {
  const view = new DataView(buffer);
  if (buffer.byteLength < 12) {
    throw new Error('文件过小，不是有效的 NCI 文件');
  }

  // Check magic 'NCI1'
  const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (magic !== 'NCI1') {
    throw new Error(`未知的文件头标识: ${magic}，应为 NCI1`);
  }

  const width = view.getUint8(4);
  const height = view.getUint8(5);
  const frameCount = view.getUint8(6);
  const frameMs = view.getUint16(8, true);

  const frames: number[][] = [];
  let offset = 12;
  const pixelsPerFrame = width * height;

  for (let f = 0; f < frameCount; f++) {
    const frame: number[] = [];
    for (let p = 0; p < pixelsPerFrame; p++) {
      if (offset + 1 < buffer.byteLength) {
        frame.push(view.getUint16(offset, true));
        offset += 2;
      } else {
        frame.push(0);
      }
    }
    frames.push(frame);
  }

  return { width, height, frameCount, frameMs, frames };
}

/** Trigger browser download of NCI binary */
export function downloadNciFile(nciBytes: Uint8Array, filename: string): void {
  const safeName = filename.endsWith('.nci') ? filename : `${filename}.nci`;
  const blob = new Blob([nciBytes.buffer as ArrayBuffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Convert 8x32 string grid + palette to 256-pixel RGB565 array
 */
export function gridToRgb565Frame(grid: string[], palette: Record<string, string>): number[] {
  const out: number[] = [];
  for (let r = 0; r < 8; r++) {
    const rowStr = grid[r] || '.'.repeat(32);
    for (let c = 0; c < 32; c++) {
      const char = rowStr[c] || '.';
      const hex = palette[char] || '#000000';
      out.push(hexToRgb565(hex));
    }
  }
  return out;
}

/**
 * Convert 8x32 hex matrix (8 rows × 32 hex strings) to 256-pixel RGB565 array
 */
export function colorMatrixToRgb565Frame(matrix: string[][]): number[] {
  const out: number[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 32; c++) {
      const hex = matrix[r]?.[c] || '';
      out.push(hexToRgb565(hex));
    }
  }
  return out;
}

/**
 * Export C++ RGB565 Array code for Arduino / ESP-IDF
 */
export function generateCppRgb565Code(framesRgb565: number[][], animName: string, width: number = 32, height: number = 8, frameMs: number = 120): string {
  const frameCount = framesRgb565.length;
  const pixelsPerFrame = width * height;
  
  const frameBlocks = framesRgb565.map((frame, fIdx) => {
    const hexLines: string[] = [];
    const step = width === 32 ? 8 : 8; // 8 values per line
    for (let i = 0; i < pixelsPerFrame; i += step) {
      const chunk = frame.slice(i, i + step).map(v => `0x${v.toString(16).padStart(4, '0').toUpperCase()}`);
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

// Push frame to matrix example (TFT_eSPI / NeoMatrix / HUB75):
// void drawNciFrame(uint8_t frameIdx) {
//   for (int i = 0; i < ${pixelsPerFrame}; i++) {
//     uint16_t color565 = pgm_read_word(&(anim_rgb565[frameIdx][i]));
//     matrix.drawPixel(i % ${width}, i / ${width}, color565);
//   }
// }`;
}
