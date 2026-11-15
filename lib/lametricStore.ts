import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

export interface LocalCatalogItem {
  id: number;
  title: string;
  isGif: boolean;
  category: string | null;
}

export interface LibraryStats {
  ready: boolean;
  totalIcons: number;
  pngCount: number;
  gifCount: number;
  totalPayloadBytes: number;
  updatedAt: string | null;
}

interface RawCatalogItem {
  id: number;
  t: string;
  y: 0 | 1;
  c: string | null;
}

const RECORD_SIZE = 16;

class LaMetricLocalStore {
  private dataDir: string;
  private indexBuf: Buffer | null = null;
  private entryCount = 0;
  private catalog: LocalCatalogItem[] = [];
  private shardFds: Map<number, number> = new Map();
  private stats: LibraryStats = {
    ready: false,
    totalIcons: 0,
    pngCount: 0,
    gifCount: 0,
    totalPayloadBytes: 0,
    updatedAt: null,
  };
  private lastProbeTime = 0;

  constructor() {
    this.dataDir = path.resolve(process.cwd(), 'data', 'lametric');
  }

  private resolveDataDir(): string {
    const cwdPath = path.resolve(process.cwd(), 'data', 'lametric');
    if (fs.existsSync(path.join(cwdPath, 'index.bin'))) return cwdPath;
    return this.dataDir;
  }

  public reload(): boolean {
    const dir = this.resolveDataDir();
    const indexPath = path.join(dir, 'index.bin');
    const catalogPath = path.join(dir, 'catalog.json.gz');
    const manifestPath = path.join(dir, 'manifest.json');

    if (!fs.existsSync(indexPath) || !fs.existsSync(catalogPath)) {
      return false;
    }

    try {
      // Close any existing shard file descriptors
      for (const fd of this.shardFds.values()) {
        try {
          fs.closeSync(fd);
        } catch {
          // ignore
        }
      }
      this.shardFds.clear();

      const indexBuf = fs.readFileSync(indexPath);
      const entryCount = Math.floor(indexBuf.length / RECORD_SIZE);

      const gzBuf = fs.readFileSync(catalogPath);
      const rawJson = zlib.gunzipSync(gzBuf).toString('utf8');
      const rawItems = JSON.parse(rawJson) as RawCatalogItem[];

      const catalog: LocalCatalogItem[] = rawItems.map(r => ({
        id: r.id,
        title: r.t,
        isGif: r.y === 1,
        category: r.c,
      }));

      let pngCount = 0;
      let gifCount = 0;
      for (const item of catalog) {
        if (item.isGif) gifCount++;
        else pngCount++;
      }

      let totalPayloadBytes = 0;
      let updatedAt: string | null = null;
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          totalPayloadBytes = manifest.totalPayloadBytes || 0;
          updatedAt = manifest.updatedAt || null;
        } catch {
          // ignore manifest parse error
        }
      }

      this.dataDir = dir;
      this.indexBuf = indexBuf;
      this.entryCount = entryCount;
      this.catalog = catalog;
      this.stats = {
        ready: entryCount > 0,
        totalIcons: catalog.length || entryCount,
        pngCount,
        gifCount,
        totalPayloadBytes,
        updatedAt,
      };
      return true;
    } catch (err) {
      console.warn('[LaMetricLocalStore] Failed to load local library:', err);
      return false;
    }
  }

  private ensureLoaded(): boolean {
    if (this.indexBuf && this.entryCount > 0) return true;
    const now = Date.now();
    if (now - this.lastProbeTime < 5000) return false;
    this.lastProbeTime = now;
    return this.reload();
  }

  public getStats(): LibraryStats {
    this.ensureLoaded();
    return this.stats;
  }

  public getIconById(targetId: number): { buffer: Buffer; contentType: string } | null {
    if (!this.ensureLoaded() || !this.indexBuf || this.entryCount === 0) {
      return null;
    }

    // Binary search in sorted index.bin
    let lo = 0;
    let hi = this.entryCount - 1;
    let foundIdx = -1;

    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const midId = this.indexBuf.readUInt32LE(mid * RECORD_SIZE);
      if (midId === targetId) {
        foundIdx = mid;
        break;
      }
      if (midId < targetId) lo = mid + 1;
      else hi = mid - 1;
    }

    if (foundIdx === -1) return null;

    const base = foundIdx * RECORD_SIZE;
    const shard = this.indexBuf.readUInt16LE(base + 4);
    const mediaType = this.indexBuf.readUInt8(base + 6);
    const offset = this.indexBuf.readUInt32LE(base + 8);
    const length = this.indexBuf.readUInt32LE(base + 12);

    if (length <= 0) return null;

    let fd = this.shardFds.get(shard);
    if (fd === undefined) {
      const shardPath = path.join(this.dataDir, `pack_${String(shard).padStart(2, '0')}.bin`);
      if (!fs.existsSync(shardPath)) return null;
      fd = fs.openSync(shardPath, 'r');
      this.shardFds.set(shard, fd);
    }

    const outBuf = Buffer.allocUnsafe(length);
    const bytesRead = fs.readSync(fd, outBuf, 0, length, offset);
    if (bytesRead <= 0) return null;

    const contentType =
      mediaType === 2 ? 'image/gif' : mediaType === 3 ? 'image/webp' : 'image/png';

    return {
      buffer: bytesRead === length ? outBuf : outBuf.subarray(0, bytesRead),
      contentType,
    };
  }

  public searchCatalog(options: {
    q?: string;
    type?: 'all' | 'gif' | 'png';
    page?: number;
    pageSize?: number;
  }) {
    this.ensureLoaded();
    const qRaw = (options.q || '').trim().toLowerCase().replace(/^#/, '');
    const typeFilter = options.type || 'all';
    const pageSize = Math.max(1, Math.min(120, Number(options.pageSize) || 48));
    const page = Math.max(1, Number(options.page) || 1);

    let filtered = this.catalog;

    if (typeFilter === 'gif') {
      filtered = filtered.filter(i => i.isGif);
    } else if (typeFilter === 'png') {
      filtered = filtered.filter(i => !i.isGif);
    }

    if (qRaw) {
      const isNumeric = /^\d+$/.test(qRaw);
      const exactIdMatches: LocalCatalogItem[] = [];
      const otherMatches: LocalCatalogItem[] = [];

      for (const item of filtered) {
        const idStr = String(item.id);
        if (isNumeric && idStr === qRaw) {
          exactIdMatches.push(item);
        } else if (idStr.includes(qRaw) || item.title.toLowerCase().includes(qRaw)) {
          otherMatches.push(item);
        }
      }
      filtered = exactIdMatches.length > 0 ? [...exactIdMatches, ...otherMatches] : otherMatches;
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize).map(it => ({
      id: it.id,
      title: it.title,
      type: it.isGif ? ('gif' as const) : ('png' as const),
      category: it.category,
    }));

    return {
      ready: this.stats.ready,
      stats: this.stats,
      total,
      page: safePage,
      pageSize,
      totalPages,
      items,
    };
  }
}

export const lametricStore = new LaMetricLocalStore();
