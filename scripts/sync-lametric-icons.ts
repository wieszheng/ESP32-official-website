import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUT_DIR = path.resolve(ROOT_DIR, 'data', 'lametric');

const PAGE_SIZE = 500;
const CATALOG_CONCURRENCY = 8;
const ICON_CONCURRENCY = 80;
const MAX_SHARD_BYTES = 10 * 1024 * 1024; // 10 MB per shard

interface LaMetricApiIcon {
  id: number;
  title?: string;
  code?: string;
  type?: string;
  category?: string | null;
  url?: string;
}

export interface CompactCatalogItem {
  id: number;
  t: string; // title
  y: 0 | 1;  // 0 = png/picture, 1 = gif/movie
  c: string | null; // category
  u?: string; // original url path suffix or full url
}

async function fetchWithRetry(url: string, retries = 4, timeoutMs = 10000): Promise<Response | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'NeoClock-Studio-Sync/1.0',
          'Accept': '*/*',
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.status === 404) {
        return res;
      }
      if (res.ok) {
        return res;
      }
      if (res.status === 429 || res.status >= 500) {
        const wait = 300 * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      return res;
    } catch {
      if (attempt < retries) {
        const wait = 250 * Math.pow(2, attempt) + Math.floor(Math.random() * 150);
        await new Promise(r => setTimeout(r, wait));
      }
    }
  }
  return null;
}

async function fetchAllCatalog(): Promise<{ items: CompactCatalogItem[]; urlMap: Map<number, string> }> {
  console.log('Phase 1: Fetching full LaMetric v2 icon catalog (0-indexed pages 0..N)...');
  const iconMap = new Map<number, CompactCatalogItem>();
  const urlMap = new Map<number, string>();

  let nextPage = 0;
  let reachedEnd = false;
  let pagesFetched = 0;

  const worker = async () => {
    while (!reachedEnd) {
      const page = nextPage++;
      const url = `https://developer.lametric.com/api/v2/icons?page=${page}&page_size=${PAGE_SIZE}`;
      const res = await fetchWithRetry(url, 4, 15000);
      if (!res || res.status === 404) {
        if (page > 0) reachedEnd = true;
        break;
      }
      if (!res.ok) {
        console.warn(`Catalog page ${page} returned HTTP ${res.status}`);
        continue;
      }
      const json = (await res.json().catch(() => null)) as { data?: LaMetricApiIcon[] } | null;
      const list = json?.data;
      if (!Array.isArray(list) || list.length === 0) {
        if (page > 0) reachedEnd = true;
        break;
      }

      for (const item of list) {
        if (!item || typeof item.id !== 'number') continue;
        const isGif = item.type === 'movie' || Boolean(item.url?.endsWith('.gif'));
        iconMap.set(item.id, {
          id: item.id,
          t: (item.title || `Icon #${item.id}`).trim(),
          y: isGif ? 1 : 0,
          c: item.category || null,
        });
        urlMap.set(
          item.id,
          item.url || `https://developer.lametric.com/content/apps/icon_thumbs/${item.id}`
        );
      }

      pagesFetched++;
      if (pagesFetched % 20 === 0) {
        console.log(`  Fetched ${pagesFetched} catalog pages (${iconMap.size} unique icons so far)...`);
      }
      if (page > 0 && list.length < PAGE_SIZE) {
        reachedEnd = true;
        break;
      }
    }
  };

  await Promise.all(Array.from({ length: CATALOG_CONCURRENCY }, () => worker()));

  const items = Array.from(iconMap.values()).sort((a, b) => a.id - b.id);
  console.log(`Catalog complete: ${items.length} unique icons across ${pagesFetched} pages.`);
  return { items, urlMap };
}

function detectMediaType(buf: Buffer, fallbackIsGif: boolean): 1 | 2 | 3 {
  if (buf.length >= 3 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    return 2; // GIF
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return 1; // PNG
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 3; // WEBP
  }
  return fallbackIsGif ? 2 : 1;
}

function loadExistingLocalIcons(): Map<number, { buf: Buffer; mediaType: 1 | 2 | 3 }> {
  const map = new Map<number, { buf: Buffer; mediaType: 1 | 2 | 3 }>();
  const indexPath = path.join(OUT_DIR, 'index.bin');
  if (!fs.existsSync(indexPath)) return map;

  const indexBuf = fs.readFileSync(indexPath);
  const count = Math.floor(indexBuf.length / 16);
  const shardBuffers = new Map<number, Buffer>();

  for (let i = 0; i < count; i++) {
    const base = i * 16;
    const id = indexBuf.readUInt32LE(base);
    const shard = indexBuf.readUInt16LE(base + 4);
    const mediaType = indexBuf.readUInt8(base + 6) as 1 | 2 | 3;
    const offset = indexBuf.readUInt32LE(base + 8);
    const length = indexBuf.readUInt32LE(base + 12);

    let shardBuf = shardBuffers.get(shard);
    if (!shardBuf) {
      const sp = path.join(OUT_DIR, `pack_${String(shard).padStart(2, '0')}.bin`);
      if (!fs.existsSync(sp)) continue;
      shardBuf = fs.readFileSync(sp);
      shardBuffers.set(shard, shardBuf);
    }

    if (offset + length <= shardBuf.length) {
      map.set(id, { buf: shardBuf.subarray(offset, offset + length), mediaType });
    }
  }
  return map;
}

async function main() {
  const startTime = Date.now();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const forceFull = process.argv.includes('--full');
  const existingMap = forceFull ? new Map<number, { buf: Buffer; mediaType: 1 | 2 | 3 }>() : loadExistingLocalIcons();
  if (existingMap.size > 0) {
    console.log(`Loaded ${existingMap.size} existing icons from local pack (incremental sync).`);
  }

  // Clean old shard packs before writing updated packs
  for (const fname of fs.readdirSync(OUT_DIR)) {
    if (/^pack_\d+\.bin$/.test(fname)) {
      fs.unlinkSync(path.join(OUT_DIR, fname));
    }
  }

  const { items, urlMap } = await fetchAllCatalog();
  if (items.length === 0) {
    throw new Error('No icons fetched from LaMetric catalog!');
  }

  console.log(`Phase 2: Downloading ${items.length} icon binaries (concurrency=${ICON_CONCURRENCY})...`);

  // Sharded pack writer state
  let currentShardIdx = 0;
  let currentShardOffset = 0;
  let currentShardFd = fs.openSync(path.join(OUT_DIR, `pack_00.bin`), 'w');
  const shardSizes: number[] = [0];

  const indexEntries: {
    id: number;
    shard: number;
    mediaType: 1 | 2 | 3;
    offset: number;
    length: number;
  }[] = [];
  const failedIds: number[] = [];

  let cursor = 0;
  let completed = 0;
  let totalPayloadBytes = 0;

  const appendToPack = (id: number, buf: Buffer, mediaType: 1 | 2 | 3) => {
    if (currentShardOffset > 0 && currentShardOffset + buf.length > MAX_SHARD_BYTES) {
      fs.closeSync(currentShardFd);
      currentShardIdx++;
      currentShardOffset = 0;
      shardSizes.push(0);
      const shardName = `pack_${String(currentShardIdx).padStart(2, '0')}.bin`;
      currentShardFd = fs.openSync(path.join(OUT_DIR, shardName), 'w');
    }

    const offset = currentShardOffset;
    fs.writeSync(currentShardFd, buf);
    currentShardOffset += buf.length;
    shardSizes[currentShardIdx] = currentShardOffset;
    totalPayloadBytes += buf.length;

    indexEntries.push({
      id,
      shard: currentShardIdx,
      mediaType,
      offset,
      length: buf.length,
    });
  };

  const downloadWorker = async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) break;
      const item = items[idx];
      const existing = existingMap.get(item.id);

      if (existing && existing.buf.length > 0) {
        item.y = existing.mediaType === 2 ? 1 : 0;
        appendToPack(item.id, existing.buf, existing.mediaType);
      } else {
        const primaryUrl = urlMap.get(item.id) || `https://developer.lametric.com/content/apps/icon_thumbs/${item.id}`;
        const fallbackUrl = `https://developer.lametric.com/content/apps/icon_thumbs/${item.id}`;

        let res = await fetchWithRetry(primaryUrl, 3, 8000);
        if ((!res || !res.ok) && primaryUrl !== fallbackUrl) {
          res = await fetchWithRetry(fallbackUrl, 2, 8000);
        }

        if (res && res.ok) {
          const arr = await res.arrayBuffer();
          const buf = Buffer.from(arr);
          if (buf.length > 0) {
            const mediaType = detectMediaType(buf, item.y === 1);
            // Sync actual GIF/PNG flag back into catalog
            item.y = mediaType === 2 ? 1 : 0;
            appendToPack(item.id, buf, mediaType);
          } else {
            failedIds.push(item.id);
          }
        } else {
          failedIds.push(item.id);
        }
      }

      completed++;
      if (completed % 5000 === 0 || completed === items.length) {
        const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
        const mb = (totalPayloadBytes / (1024 * 1024)).toFixed(2);
        console.log(
          `  Progress: ${completed}/${items.length} (${((completed / items.length) * 100).toFixed(1)}%) · ${mb} MB packed · failed=${failedIds.length} · ${elapsedSec}s`
        );
      }
    }
  };

  await Promise.all(Array.from({ length: ICON_CONCURRENCY }, () => downloadWorker()));

  // Retry failed IDs once more gently if any (concurrency 15)
  if (failedIds.length > 0 && failedIds.length < 2000) {
    console.log(`Retrying ${failedIds.length} failed icons with lower concurrency...`);
    const retryList = failedIds.splice(0, failedIds.length);
    const itemById = new Map(items.map(it => [it.id, it]));
    let rCursor = 0;

    const retryWorker = async () => {
      while (true) {
        const rIdx = rCursor++;
        if (rIdx >= retryList.length) break;
        const id = retryList[rIdx];
        const fallbackUrl = `https://developer.lametric.com/content/apps/icon_thumbs/${id}`;
        const res = await fetchWithRetry(fallbackUrl, 3, 10000);
        if (res && res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          if (buf.length > 0) {
            const it = itemById.get(id);
            const mediaType = detectMediaType(buf, it?.y === 1);
            if (it) it.y = mediaType === 2 ? 1 : 0;
            appendToPack(id, buf, mediaType);
            continue;
          }
        }
        failedIds.push(id);
      }
    };
    await Promise.all(Array.from({ length: 15 }, () => retryWorker()));
  }

  fs.closeSync(currentShardFd);

  // Sort indexEntries by id ascending for O(log N) binary search
  indexEntries.sort((a, b) => a.id - b.id);

  // Write index.bin (16 bytes per entry)
  const indexBuf = Buffer.allocUnsafe(indexEntries.length * 16);
  for (let i = 0; i < indexEntries.length; i++) {
    const e = indexEntries[i];
    const base = i * 16;
    indexBuf.writeUInt32LE(e.id, base);
    indexBuf.writeUInt16LE(e.shard, base + 4);
    indexBuf.writeUInt8(e.mediaType, base + 6);
    indexBuf.writeUInt8(0, base + 7);
    indexBuf.writeUInt32LE(e.offset, base + 8);
    indexBuf.writeUInt32LE(e.length, base + 12);
  }
  fs.writeFileSync(path.join(OUT_DIR, 'index.bin'), indexBuf);

  // Only keep catalog items that have valid downloaded payloads (or keep all catalog metadata? Let's keep downloaded items so preview never 404s, plus record failedIds in manifest)
  const validIdSet = new Set(indexEntries.map(e => e.id));
  const packedCatalog = items.filter(it => validIdSet.has(it.id));
  const catalogGz = zlib.gzipSync(Buffer.from(JSON.stringify(packedCatalog)), { level: 9 });
  fs.writeFileSync(path.join(OUT_DIR, 'catalog.json.gz'), catalogGz);

  const gifCount = packedCatalog.filter(i => i.y === 1).length;
  const pngCount = packedCatalog.length - gifCount;

  const manifest = {
    source: 'https://developer.lametric.com/api/v2/icons',
    updatedAt: new Date().toISOString(),
    totalCatalog: items.length,
    totalDownloaded: indexEntries.length,
    pngCount,
    gifCount,
    failedCount: failedIds.length,
    failedIds: failedIds.slice(0, 100),
    shardCount: shardSizes.length,
    shardSizes,
    totalPayloadBytes,
    indexBytes: indexBuf.length,
    catalogGzBytes: catalogGz.length,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log('Sync complete!');
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
