// Client-side helper for browsing & loading the bundled LaMetric icon library.
// Automatically uses Express /api/* when running full-stack, and falls back to
// static files under `${import.meta.env.BASE_URL}data/lametric/` on GitHub Pages.

export interface LametricLibraryStats {
  ready: boolean;
  totalIcons: number;
  pngCount: number;
  gifCount: number;
  totalPayloadBytes?: number;
  updatedAt?: string | null;
}

export interface LametricCatalogItem {
  id: number;
  title: string;
  type: 'gif' | 'png';
  category: string | null;
}

export type LametricBackendMode = 'api' | 'static';

export interface LametricSearchResult {
  ready: boolean;
  mode: LametricBackendMode;
  stats: LametricLibraryStats;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  items: LametricCatalogItem[];
}

interface RawCompactCatalogItem {
  id: number;
  t: string;
  y: 0 | 1;
  c: string | null;
}

const RECORD_SIZE = 16;

let detectedMode: LametricBackendMode | null = null;
let cachedStats: LametricLibraryStats | null = null;
let detectPromise: Promise<{ mode: LametricBackendMode; stats: LametricLibraryStats }> | null = null;

let staticCatalogCache: LametricCatalogItem[] | null = null;
let staticCatalogPromise: Promise<LametricCatalogItem[]> | null = null;

let staticIndexCache: DataView | null = null;
let staticIndexPromise: Promise<DataView | null> | null = null;

function getStaticDataBaseUrl(): string {
  const base = import.meta.env.BASE_URL || '/';
  const normalized = base.endsWith('/') ? base : `${base}/`;
  return `${normalized}data/lametric`;
}

async function gunzipIfNeeded(buf: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buf);
  const isGzip = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  if (!isGzip) {
    return new TextDecoder('utf-8').decode(bytes);
  }
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('当前浏览器不支持 DecompressionStream 解压离线目录');
  }
  const ds = new DecompressionStream('gzip');
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  return await new Response(stream).text();
}

export async function initLametricLibrary(): Promise<{
  mode: LametricBackendMode;
  stats: LametricLibraryStats;
}> {
  if (detectedMode && cachedStats) {
    return { mode: detectedMode, stats: cachedStats };
  }
  if (detectPromise) return detectPromise;

  detectPromise = (async () => {
    // 1. Try Express backend API first
    try {
      const apiRes = await fetch('/api/lametric-icons?page=1&pageSize=1');
      const ct = apiRes.headers.get('content-type') || '';
      if (apiRes.ok && ct.includes('application/json')) {
        const data = await apiRes.json();
        if (data?.stats) {
          detectedMode = 'api';
          cachedStats = data.stats;
          return { mode: 'api' as const, stats: data.stats as LametricLibraryStats };
        }
      }
    } catch {
      // No Express backend -> fall through to static mode
    }

    // 2. Fall back to static GitHub Pages files under data/lametric/
    try {
      const manifestRes = await fetch(`${getStaticDataBaseUrl()}/manifest.json`);
      const ct = manifestRes.headers.get('content-type') || '';
      if (manifestRes.ok && ct.includes('application/json')) {
        const m = await manifestRes.json();
        if (m && typeof m.totalDownloaded === 'number' && m.totalDownloaded > 0) {
          const stats: LametricLibraryStats = {
            ready: true,
            totalIcons: m.totalDownloaded,
            pngCount: m.pngCount || 0,
            gifCount: m.gifCount || 0,
            totalPayloadBytes: m.totalPayloadBytes || 0,
            updatedAt: m.updatedAt || null,
          };
          detectedMode = 'static';
          cachedStats = stats;
          return { mode: 'static' as const, stats };
        }
      }
    } catch {
      // Static manifest unavailable
    }

    const emptyStats: LametricLibraryStats = {
      ready: false,
      totalIcons: 0,
      pngCount: 0,
      gifCount: 0,
    };
    detectedMode = 'static';
    cachedStats = emptyStats;
    return { mode: 'static' as const, stats: emptyStats };
  })();

  return detectPromise;
}

async function loadStaticCatalog(): Promise<LametricCatalogItem[]> {
  if (staticCatalogCache) return staticCatalogCache;
  if (staticCatalogPromise) return staticCatalogPromise;

  staticCatalogPromise = (async () => {
    const res = await fetch(`${getStaticDataBaseUrl()}/catalog.json.gz`);
    if (!res.ok) {
      throw new Error(`无法加载离线图标目录 (HTTP ${res.status})`);
    }
    const buf = await res.arrayBuffer();
    const jsonText = await gunzipIfNeeded(buf);
    const rawItems = JSON.parse(jsonText) as RawCompactCatalogItem[];
    staticCatalogCache = rawItems.map(r => ({
      id: r.id,
      title: r.t,
      type: r.y === 1 ? 'gif' : 'png',
      category: r.c ?? null,
    }));
    return staticCatalogCache;
  })();

  try {
    return await staticCatalogPromise;
  } catch (err) {
    staticCatalogPromise = null;
    throw err;
  }
}

async function loadStaticIndex(): Promise<DataView | null> {
  if (staticIndexCache) return staticIndexCache;
  if (staticIndexPromise) return staticIndexPromise;

  staticIndexPromise = (async () => {
    try {
      const res = await fetch(`${getStaticDataBaseUrl()}/index.bin`);
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      if (buf.byteLength < RECORD_SIZE) return null;
      staticIndexCache = new DataView(buf);
      return staticIndexCache;
    } catch {
      return null;
    }
  })();

  return staticIndexPromise;
}

export async function searchLametricLibrary(options: {
  q?: string;
  type?: 'all' | 'gif' | 'png';
  page?: number;
  pageSize?: number;
}): Promise<LametricSearchResult> {
  const { mode, stats } = await initLametricLibrary();
  const q = options.q || '';
  const typeFilter = options.type || 'all';
  const page = Math.max(1, Number(options.page) || 1);
  const pageSize = Math.max(1, Math.min(120, Number(options.pageSize) || 36));

  if (mode === 'api') {
    const params = new URLSearchParams({
      q,
      type: typeFilter,
      page: String(page),
      pageSize: String(pageSize),
    });
    const res = await fetch(`/api/lametric-icons?${params.toString()}`);
    const data = await res.json();
    return {
      ready: Boolean(data?.ready),
      mode: 'api',
      stats: data?.stats || stats,
      total: data?.total || 0,
      page: data?.page || page,
      pageSize: data?.pageSize || pageSize,
      totalPages: data?.totalPages || 1,
      items: Array.isArray(data?.items) ? data.items : [],
    };
  }

  if (!stats.ready) {
    return {
      ready: false,
      mode: 'static',
      stats,
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
      items: [],
    };
  }

  const catalog = await loadStaticCatalog();
  const qNorm = q.trim().toLowerCase().replace(/^#/, '');

  let filtered = catalog;
  if (typeFilter === 'gif') {
    filtered = filtered.filter(i => i.type === 'gif');
  } else if (typeFilter === 'png') {
    filtered = filtered.filter(i => i.type === 'png');
  }

  if (qNorm) {
    const isNumeric = /^\d+$/.test(qNorm);
    const exactMatches: LametricCatalogItem[] = [];
    const otherMatches: LametricCatalogItem[] = [];
    for (const item of filtered) {
      const idStr = String(item.id);
      if (isNumeric && idStr === qNorm) {
        exactMatches.push(item);
      } else if (idStr.includes(qNorm) || item.title.toLowerCase().includes(qNorm)) {
        otherMatches.push(item);
      }
    }
    filtered = exactMatches.length > 0 ? [...exactMatches, ...otherMatches] : otherMatches;
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    ready: true,
    mode: 'static',
    stats,
    total,
    page: safePage,
    pageSize,
    totalPages,
    items: filtered.slice(start, start + pageSize),
  };
}

/**
 * Fetch a single icon binary from static GitHub Pages pack shards using HTTP Range requests.
 * Returns null if static pack is unavailable or server doesn't support HTTP 206 Range.
 */
export async function fetchStaticLametricIconBlob(
  targetId: number
): Promise<{ blob: Blob; contentType: string } | null> {
  const indexView = await loadStaticIndex();
  if (!indexView) return null;

  const entryCount = Math.floor(indexView.byteLength / RECORD_SIZE);
  let lo = 0;
  let hi = entryCount - 1;
  let foundIdx = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const midId = indexView.getUint32(mid * RECORD_SIZE, true);
    if (midId === targetId) {
      foundIdx = mid;
      break;
    }
    if (midId < targetId) lo = mid + 1;
    else hi = mid - 1;
  }

  if (foundIdx === -1) return null;

  const base = foundIdx * RECORD_SIZE;
  const shard = indexView.getUint16(base + 4, true);
  const mediaType = indexView.getUint8(base + 6);
  const offset = indexView.getUint32(base + 8, true);
  const length = indexView.getUint32(base + 12, true);
  if (length <= 0) return null;

  const shardUrl = `${getStaticDataBaseUrl()}/pack_${String(shard).padStart(2, '0')}.bin`;
  try {
    const res = await fetch(shardUrl, {
      headers: {
        Range: `bytes=${offset}-${offset + length - 1}`,
      },
    });
    if (res.status !== 206) {
      return null;
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength !== length) {
      return null;
    }
    const contentType =
      mediaType === 2 ? 'image/gif' : mediaType === 3 ? 'image/webp' : 'image/png';
    return {
      blob: new Blob([buf], { type: contentType }),
      contentType,
    };
  } catch {
    return null;
  }
}

export function getLametricThumbUrl(id: number, mode: LametricBackendMode): string {
  if (mode === 'api') {
    return `/api/lametric-icon/${id}`;
  }
  return `https://developer.lametric.com/content/apps/icon_thumbs/${id}`;
}
