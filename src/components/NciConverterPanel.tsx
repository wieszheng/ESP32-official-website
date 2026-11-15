import React, { useState, useEffect, useRef } from 'react';
import { 
  FileCode, Upload, Download, Copy, Check, Play, Pause,
  Layers, Eye, Send, Terminal, Sparkles, RefreshCw, X, ArrowUpRight, Wifi, Edit3, Hash,
  Search, Grid, ChevronLeft, ChevronRight, Database
} from 'lucide-react';
import { 
  buildNciByVersion, parseNci, fileToNciFrames, downloadNciBlob, generateCppRgb565Code,
  nciRawFrameToHexGrid, normalizeNci2FrameDelay,
  NciRawFrame, NciFormatVersion, NciVarTimeMode, NciBuildResult
} from '../utils/nciFormat';

export interface NciSimulatorLoadPayload {
  framesRgb: string[][][]; // always 8 rows x 32 cols for upper simulator
  fps: number;
  frameMs: number;
  frameDelays?: number[];
  version?: NciFormatVersion;
  iconName: string;
  targetWidth: 8 | 32;
  targetHeight: 8;
  cropOffsetX: number;
}

export interface NciWritebackPayload {
  id: number;
  frames: NciRawFrame[];
  width: 8 | 32;
  height: 8;
  frameMs: number;
  frameDelays?: number[];
  version?: NciFormatVersion;
  iconName: string;
}

interface NciConverterPanelProps {
  onLoadToSimulator?: (payload: NciSimulatorLoadPayload) => void;
  writebackPayload?: NciWritebackPayload | null;
}

interface LogEntry {
  text: string;
  type: 'info' | 'ok' | 'err';
  time: string;
}

export const NciConverterPanel: React.FC<NciConverterPanelProps> = ({ 
  onLoadToSimulator,
  writebackPayload,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [sizeKey, setSizeKey] = useState<'8x8' | '32x8'>('8x8');
  const [nciVersion, setNciVersion] = useState<NciFormatVersion>('NCI2');
  const [varTimeMode, setVarTimeMode] = useState<NciVarTimeMode>('auto');
  const [frameMsOverride, setFrameMsOverride] = useState<number>(0);
  const [maxFrames, setMaxFrames] = useState<number>(60);
  const [iconName, setIconName] = useState<string>('time');
  const [deviceUrl, setDeviceUrl] = useState<string>('');

  // Conversion results
  const [frames, setFrames] = useState<NciRawFrame[]>([]);
  const [nciBlob, setNciBlob] = useState<Blob | null>(null);
  const [buildMeta, setBuildMeta] = useState<NciBuildResult | null>(null);
  const [activeDims, setActiveDims] = useState<{ w: number; h: number }>({ w: 8, h: 8 });
  const [metaInfo, setMetaInfo] = useState<string>('未载入文件');
  const [activeFrameIndex, setActiveFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isTestingDevice, setIsTestingDevice] = useState<boolean>(false);
  const [deviceTestResult, setDeviceTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [lametricInput, setLametricInput] = useState<string>('230');
  const [isFetchingLametric, setIsFetchingLametric] = useState<boolean>(false);
  const [showLibraryBrowser, setShowLibraryBrowser] = useState<boolean>(false);
  const [libraryStats, setLibraryStats] = useState<{
    ready: boolean;
    totalIcons: number;
    pngCount: number;
    gifCount: number;
  } | null>(null);
  const [libQuery, setLibQuery] = useState<string>('');
  const [libType, setLibType] = useState<'all' | 'gif' | 'png'>('all');
  const [libPage, setLibPage] = useState<number>(1);
  const [libTotal, setLibTotal] = useState<number>(0);
  const [libTotalPages, setLibTotalPages] = useState<number>(1);
  const [libItems, setLibItems] = useState<{ id: number; title: string; type: 'gif' | 'png' }[]>([]);
  const [isLoadingLib, setIsLoadingLib] = useState<boolean>(false);
  const [syncBadge, setSyncBadge] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([
    { text: '转换引擎已就绪：支持 PNG / GIF / .NCI (NCI1/NCI2) 与 LaMetric 本地全库图标加载，默认输出 NCI2 格式', type: 'info', time: 'SYS' }
  ]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastWritebackIdRef = useRef<number>(0);

  // Target resolution
  const [targetWidth, targetHeight] = sizeKey === '8x8' ? [8, 8] : [32, 8];
  const previewWidth = frames.length > 0 ? activeDims.w : targetWidth;
  const previewHeight = frames.length > 0 ? activeDims.h : targetHeight;

  const addLog = (text: string, type: 'info' | 'ok' | 'err' = 'info') => {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    setLogs(prev => [...prev, { text, type, time }]);
  };

  const clearLog = () => {
    setLogs([]);
  };

  function validName(s: string): boolean {
    return /^[A-Za-z0-9_-]{1,31}$/.test(s);
  }

  // Check local LaMetric library availability on mount
  useEffect(() => {
    fetch('/api/lametric-icons?page=1&pageSize=1')
      .then(r => r.json())
      .then(data => {
        if (data?.stats) {
          setLibraryStats(data.stats);
        }
      })
      .catch(() => {});
  }, []);

  // Search/paginate local LaMetric icon library when browser is open
  useEffect(() => {
    if (!showLibraryBrowser) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsLoadingLib(true);
      try {
        const params = new URLSearchParams({
          q: libQuery,
          type: libType,
          page: String(libPage),
          pageSize: '36',
        });
        const res = await fetch(`/api/lametric-icons?${params.toString()}`);
        const data = await res.json();
        if (!cancelled && data) {
          if (data.stats) setLibraryStats(data.stats);
          setLibItems(Array.isArray(data.items) ? data.items : []);
          setLibTotal(data.total || 0);
          setLibTotalPages(data.totalPages || 1);
        }
      } catch {
        // ignore transient errors
      } finally {
        if (!cancelled) setIsLoadingLib(false);
      }
    }, libQuery ? 160 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [showLibraryBrowser, libQuery, libType, libPage]);

  // Animation player timer matching exact GIF delays
  useEffect(() => {
    if (!isPlaying || frames.length <= 1) return;
    const currentDelay = Math.max(30, frames[activeFrameIndex]?.delay || 200);
    const timer = setTimeout(() => {
      setActiveFrameIndex(prev => (prev + 1) % frames.length);
    }, currentDelay);
    return () => clearTimeout(timer);
  }, [isPlaying, frames, activeFrameIndex]);

  // Format summary metadata string for banner & logs
  const formatMetaSummary = (res: NciBuildResult, baseName: string, extraTag?: string): string => {
    const minDelay = Math.min(...res.frameDelays);
    const maxDelay = Math.max(...res.frameDelays);
    const delayDesc = res.hasVarTime
      ? (minDelay === maxDelay ? `逐帧表 ${minDelay}ms` : `逐帧表 ${minDelay}~${maxDelay}ms`)
      : `${res.headerFrameMs === 0 ? '默认 200' : res.headerFrameMs}ms`;
    const flagDesc = res.version === 'NCI2'
      ? `NCI2 (0x${res.flags.toString(16).padStart(2, '0')}${res.hasVarTime ? ' VARTIME' : ''})`
      : 'NCI1';
    const byteDesc = res.version === 'NCI2'
      ? `${res.totalBytes} B (12+${res.delayTableBytes}+${res.pixelBytes})`
      : `${res.totalBytes} 字节`;
    return [
      `${res.width}×${res.height}`,
      `${res.frameCount} 帧`,
      delayDesc,
      extraTag,
      `${flagDesc} · ${byteDesc} (${baseName}.nci)`,
    ].filter(Boolean).join(' · ');
  };

  // Repack existing frames whenever format version or VARTIME mode changes
  const repackFrames = (
    sourceFrames: NciRawFrame[],
    w: number,
    h: number,
    overrideMs: number,
    version: NciFormatVersion,
    vtMode: NciVarTimeMode,
    baseName: string,
    extraTag?: string
  ): NciBuildResult => {
    const firstDelay = sourceFrames[0]?.delay || 200;
    const baseFrameMs = overrideMs > 0
      ? Math.max(30, overrideMs)
      : (version === 'NCI2' && sourceFrames.length === 1 && firstDelay === 200 ? 0 : firstDelay);

    const res = buildNciByVersion(version, sourceFrames, w, h, baseFrameMs, {
      varTime: vtMode,
      useZeroForDefault200: overrideMs === 0,
    });
    setNciBlob(res.blob);
    setBuildMeta(res);
    setActiveDims({ w, h });
    setMetaInfo(formatMetaSummary(res, baseName, extraTag));
    return res;
  };

  const handleVersionChange = (nextVersion: NciFormatVersion) => {
    setNciVersion(nextVersion);
    if (frames.length > 0) {
      const base = iconName.replace(/[^A-Za-z0-9_-]/g, '') || 'icon';
      const res = repackFrames(frames, activeDims.w, activeDims.h, frameMsOverride, nextVersion, varTimeMode, base);
      addLog(
        `已切换封装协议为 ${res.version} (flags=0x${res.flags.toString(16).padStart(2, '0')}${res.hasVarTime ? ' VARTIME' : ''})，固件大小 ${res.totalBytes} 字节 (12+${res.delayTableBytes}+${res.pixelBytes})`,
        'ok'
      );
    }
  };

  const handleVarTimeChange = (nextVt: NciVarTimeMode) => {
    setVarTimeMode(nextVt);
    if (frames.length > 0 && nciVersion === 'NCI2') {
      const base = iconName.replace(/[^A-Za-z0-9_-]/g, '') || 'icon';
      const res = repackFrames(frames, activeDims.w, activeDims.h, frameMsOverride, 'NCI2', nextVt, base);
      addLog(
        `已更新 NCI2 延时表模式 (${nextVt})：flags=0x${res.flags.toString(16).padStart(2, '0')}${res.hasVarTime ? ' VARTIME' : ''}，总长 ${res.totalBytes} 字节 (12+${res.delayTableBytes}+${res.pixelBytes})`,
        'ok'
      );
    }
  };

  // Receive writeback edits from the upper 8x32 Clock Simulator and rebuild .nci firmware
  useEffect(() => {
    if (!writebackPayload || writebackPayload.id === lastWritebackIdRef.current) return;
    lastWritebackIdRef.current = writebackPayload.id;

    const { frames: editedFrames, width: w, height: h, frameMs, version: wbVersion, iconName: editedName } = writebackPayload;
    if (!editedFrames || editedFrames.length === 0) return;

    const nextSizeKey: '8x8' | '32x8' = w === 8 ? '8x8' : '32x8';
    setSizeKey(nextSizeKey);

    const targetVer = wbVersion || nciVersion;
    if (wbVersion) setNciVersion(wbVersion);

    const safeBase = editedName.replace(/^NCI:\s*/i, '').replace(/[^A-Za-z0-9_-]/g, '') || iconName || 'icon';
    setIconName(safeBase);

    const delaysDiffer = editedFrames.length > 1 && new Set(editedFrames.map(f => normalizeNci2FrameDelay(f.delay, frameMs))).size > 1;
    setFrameMsOverride(delaysDiffer ? 0 : frameMs);

    const res = repackFrames(editedFrames, w, h, delaysDiffer ? 0 : frameMs, targetVer, varTimeMode, safeBase, '已同步时钟修改');
    setFrames(editedFrames);
    setActiveFrameIndex(0);
    setIsPlaying(editedFrames.length > 1);

    setSyncBadge(`已写回上方时钟修改 (${editedFrames.length} 帧 ${w}×${h} · ${res.version})`);
    setTimeout(() => setSyncBadge(null), 6000);

    addLog(
      `✅ 已从上方时钟写回 ${editedFrames.length} 帧 (${w}×${h})，封包 ${res.version} (flags=0x${res.flags.toString(16).padStart(2, '0')}${res.hasVarTime ? ' VARTIME' : ''})，总长 ${res.totalBytes} 字节 (${safeBase}.nci)`,
      'ok'
    );
  }, [writebackPayload]);

  // Handle conversion matching exact functional logic (supports NCI1 & NCI2 + PNG/JPG/GIF)
  const handleConvert = async (inputFile?: File, overrideWidth?: number, overrideHeight?: number, overrideIconName?: string) => {
    const f = inputFile || file;
    if (!f) {
      addLog('请先选择或拖入 PNG / GIF / NCI 文件，或输入 LaMetric 图标 ID 拉取', 'err');
      return;
    }

    const effectiveW = overrideWidth ?? targetWidth;
    const effectiveH = overrideHeight ?? targetHeight;

    setIsProcessing(true);
    try {
      const isNciFile = f.name.toLowerCase().endsWith('.nci');

      if (isNciFile) {
        addLog(`正在解析已有 NCI 二进制固件: ${f.name} ...`, 'info');
        const buf = await f.arrayBuffer();
        const parsed = parseNci(buf);
        if (parsed.width === 8) setSizeKey('8x8');
        else if (parsed.width === 32) setSizeKey('32x8');

        setNciVersion(parsed.version);
        if (parsed.version === 'NCI2') {
          if (parsed.hasVarTime && new Set(parsed.frameDelays).size <= 1) {
            setVarTimeMode('always');
          } else if (!parsed.hasVarTime && parsed.frameCount > 1) {
            setVarTimeMode('off');
          }
        }

        const safeOverride = frameMsOverride > 0 ? Math.max(30, frameMsOverride) : 0;
        const finalFrames = safeOverride > 0
          ? parsed.frames.map(fr => ({ ...fr, delay: safeOverride }))
          : parsed.frames;

        const effectiveVt: NciVarTimeMode = parsed.version === 'NCI2'
          ? (parsed.hasVarTime && new Set(parsed.frameDelays).size <= 1 ? 'always' : (parsed.hasVarTime ? 'auto' : varTimeMode))
          : varTimeMode;

        const base = (overrideIconName || iconName).replace(/[^A-Za-z0-9_-]/g, '') || 'icon';
        const res = buildNciByVersion(
          parsed.version,
          finalFrames,
          parsed.width,
          parsed.height,
          safeOverride > 0 ? safeOverride : (parsed.rawFrameMs ?? parsed.frameMs),
          { varTime: effectiveVt, useZeroForDefault200: safeOverride === 0 && parsed.rawFrameMs === 0 }
        );

        setFrames(finalFrames);
        setNciBlob(res.blob);
        setBuildMeta(res);
        setActiveDims({ w: parsed.width, h: parsed.height });
        setActiveFrameIndex(0);
        setIsPlaying(finalFrames.length > 1);
        setSyncBadge(null);

        setMetaInfo(formatMetaSummary(res, base));
        addLog(
          `解析 ${parsed.version} 成功！${finalFrames.length} 帧 (${parsed.width}×${parsed.height}), flags=0x${parsed.flags.toString(16).padStart(2, '0')}${parsed.hasVarTime ? ' VARTIME' : ''}, 长度 ${buf.byteLength} B`,
          'ok'
        );
        return;
      }

      const isGif = f.type === 'image/gif' || f.name.toLowerCase().endsWith('.gif');
      addLog(isGif ? `开始二进制 LZW 解码动图: ${f.name} ...` : `解析静态像素图像: ${f.name} ...`, 'info');

      const clampedOverride = frameMsOverride > 0 ? Math.max(30, frameMsOverride) : 0;
      if (frameMsOverride > 0 && frameMsOverride < 30 && nciVersion === 'NCI2') {
        addLog(`注意：NCI2 协议要求非 0 帧间隔 >= 30ms，已自动修正 ${frameMsOverride}ms -> 30ms`, 'info');
      }

      const parsedFrames = await fileToNciFrames(
        f,
        effectiveW,
        effectiveH,
        maxFrames,
        clampedOverride
      );

      if (!parsedFrames || parsedFrames.length === 0) {
        throw new Error('未能从图片中解析出有效像素帧');
      }

      if (!isGif && clampedOverride > 0) {
        parsedFrames.forEach(fr => { fr.delay = clampedOverride; });
      }

      const base = (overrideIconName || iconName).replace(/[^A-Za-z0-9_-]/g, '') || 'icon';
      const res = repackFrames(parsedFrames, effectiveW, effectiveH, clampedOverride, nciVersion, varTimeMode, base);

      setFrames(parsedFrames);
      setActiveFrameIndex(0);
      setIsPlaying(parsedFrames.length > 1);
      setSyncBadge(null);

      addLog(
        `转换成功！${res.version} 格式 · ${res.frameCount} 帧 (${effectiveW}×${effectiveH}) · flags=0x${res.flags.toString(16).padStart(2, '0')}${res.hasVarTime ? ' VARTIME逐帧表' : ''} · 总长 ${res.totalBytes} B (12头+${res.delayTableBytes}延时+${res.pixelBytes}像素)`,
        'ok'
      );
    } catch (err: any) {
      console.error('NCI conversion failed:', err);
      addLog(`转换失败: ${err.message || String(err)}`, 'err');
      setMetaInfo('转换出错');
    } finally {
      setIsProcessing(false);
    }
  };

  // Extract numeric LaMetric icon ID from raw ID ("230", "a230", "#230") or full URL
  const extractLametricId = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    // Full URL e.g. https://developer.lametric.com/content/apps/icon_thumbs/230
    const urlMatch = trimmed.match(/icon_thumbs\/(\d+)/i);
    if (urlMatch) return urlMatch[1];
    // Prefixed or pure numeric ID (230, a230, i230, #230)
    const idMatch = trimmed.match(/^[#aiAI]?(\d{1,10})$/);
    if (idMatch) return idMatch[1];
    // Fallback: grab last numeric segment
    const anyNum = trimmed.match(/(\d{1,10})/);
    return anyNum ? anyNum[1] : '';
  };

  // Load LaMetric icon by ID (fetches via backend proxy first, then direct CORS URL fallback)
  const handleLoadLametricIcon = async (customInput?: string) => {
    const rawVal = customInput !== undefined ? customInput : lametricInput;
    const cleanId = extractLametricId(rawVal);

    if (!cleanId) {
      addLog('请输入有效的 LaMetric 图标 ID（例如 230）或完整链接 https://developer.lametric.com/content/apps/icon_thumbs/230', 'err');
      return;
    }

    setLametricInput(cleanId);
    setIsFetchingLametric(true);
    addLog(`正在从 LaMetric 图标库拉取图标 #${cleanId} ...`, 'info');

    try {
      let blob: Blob | null = null;
      let contentType = '';
      let fromLocal = false;

      // 1. Try local repository library / backend proxy (/api/lametric-icon/:id)
      try {
        const proxyRes = await fetch(`/api/lametric-icon/${cleanId}`);
        if (proxyRes.ok) {
          contentType = proxyRes.headers.get('content-type') || '';
          fromLocal = proxyRes.headers.get('x-lametric-source') === 'local-library';
          blob = await proxyRes.blob();
        } else if (proxyRes.status === 404) {
          throw new Error(`LaMetric 官方库中不存在 ID 为 #${cleanId} 的图标`);
        }
      } catch (proxyErr: any) {
        if (proxyErr.message?.includes('不存在')) throw proxyErr;
      }

      // 2. Direct browser fetch fallback (developer.lametric.com sets Access-Control-Allow-Origin: *)
      if (!blob) {
        const directUrl = `https://developer.lametric.com/content/apps/icon_thumbs/${cleanId}`;
        const directRes = await fetch(directUrl);
        if (!directRes.ok) {
          throw new Error(directRes.status === 404 ? `未找到 LaMetric 图标 #${cleanId}` : `拉取失败 (HTTP ${directRes.status})`);
        }
        contentType = directRes.headers.get('content-type') || '';
        blob = await directRes.blob();
      }

      // Detect magic bytes to ensure exact file extension & MIME type (GIF vs PNG)
      const headBytes = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
      const isGifMagic = headBytes[0] === 0x47 && headBytes[1] === 0x49 && headBytes[2] === 0x46; // "GIF"
      const isPngMagic = headBytes[0] === 0x89 && headBytes[1] === 0x50 && headBytes[2] === 0x4E && headBytes[3] === 0x47; // "\x89PNG"

      const isGif = isGifMagic || contentType.includes('gif');
      const ext = isGif ? '.gif' : (isPngMagic || contentType.includes('png') ? '.png' : '.png');
      const mime = isGif ? 'image/gif' : 'image/png';

      const fetchedName = `lametric_${cleanId}${ext}`;
      const fetchedFile = new File([blob], fetchedName, { type: mime });
      const newIconName = `lm_${cleanId}`;

      // LaMetric icons are native 8x8 sprites -> automatically switch target to 8x8
      setSizeKey('8x8');
      setFile(fetchedFile);
      setIconName(newIconName);

      addLog(
        `✅ 已从${fromLocal ? '本地离线库' : 'LaMetric 在线源'}加载图标 #${cleanId} (${isGif ? 'GIF 动图' : 'PNG 静态图'}, ${blob.size} 字节)，正在转换为 8×8 RGB565...`,
        'ok'
      );

      await handleConvert(fetchedFile, 8, 8, newIconName);
    } catch (err: any) {
      console.error('Failed to fetch LaMetric icon:', err);
      addLog(`❌ 加载 LaMetric 图标失败: ${err.message || String(err)}`, 'err');
    } finally {
      setIsFetchingLametric(false);
    }
  };

  // Download .nci binary
  const handleDownloadNci = () => {
    if (!nciBlob) return;
    const base = iconName.replace(/[^A-Za-z0-9_-]/g, '') || 'icon';
    downloadNciBlob(nciBlob, `${base}.nci`);
    addLog(`已保存 ${buildMeta?.version || nciVersion} 二进制固件至本地: ${base}.nci (${nciBlob.size} 字节)`, 'ok');
  };

  // Load to 8x32 simulator above
  const handleLoadToSimulator = () => {
    if (!onLoadToSimulator || frames.length === 0) return;
    const finalFrameMs = frameMsOverride > 0 ? Math.max(30, frameMsOverride) : (frames[0].delay || 200);
    const fps = Math.max(2, Math.min(12, Math.round(1000 / Math.max(30, finalFrameMs))));
    const w = previewWidth;
    const h = previewHeight;

    // Convert to hex matrix (8 rows × 32 cols)
    const hexGrids: string[][][] = frames.map(fr => {
      const rawGrid = nciRawFrameToHexGrid(fr, w, h);
      // Pad vertically if h < 8 and horizontally into 32 cols
      const padLeft = w <= 8 ? 12 : Math.max(0, Math.floor((32 - w) / 2));
      const fullRows: string[][] = [];
      for (let r = 0; r < 8; r++) {
        const srcRow = rawGrid[r] || [];
        const row32 = Array(32).fill('#121721');
        for (let c = 0; c < w && padLeft + c < 32; c++) {
          if (srcRow[c]) row32[padLeft + c] = srcRow[c];
        }
        fullRows.push(row32);
      }
      return fullRows;
    });

    const base = iconName.replace(/[^A-Za-z0-9_-]/g, '') || 'icon';
    const frameDelays = frames.map(fr => normalizeNci2FrameDelay(fr.delay, finalFrameMs));
    onLoadToSimulator({
      framesRgb: hexGrids,
      fps,
      frameMs: finalFrameMs,
      frameDelays,
      version: nciVersion,
      iconName: base,
      targetWidth: w <= 8 ? 8 : 32,
      targetHeight: 8,
      cropOffsetX: w <= 8 ? 12 : 0,
    });
    addLog(`已载入上方 8×32 时钟（${w}×${h}, ${frames.length} 帧, ${nciVersion}）。请在上方点阵屏修改后点击「写回 NCI 固件」！`, 'ok');

    // Scroll smoothly to upper simulator
    const el = document.getElementById('simulator');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Copy C++ uint16_t RGB565 Array code
  const handleCopyCppCode = () => {
    if (frames.length === 0) return;
    const finalFrameMs = frameMsOverride > 0 ? Math.max(30, frameMsOverride) : (frames[0].delay || 200);
    const base = iconName.replace(/[^A-Za-z0-9_-]/g, '') || 'icon';
    const code = generateCppRgb565Code(frames, base, previewWidth, previewHeight, finalFrameMs, nciVersion);
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    addLog(`C++ uint16_t RGB565 数组 (${nciVersion}) 已复制到剪贴板，可直接粘贴进 Arduino / ESP-IDF 项目`, 'ok');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Helper to normalize device URL (auto-prepend http:// if user wrote 192.168.x.x)
  const getNormalizedDeviceUrl = (raw: string): string => {
    let clean = raw.trim().replace(/\/$/, '');
    if (!clean) return '';
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'http://' + clean;
    }
    return clean;
  };

  // Test connection to local ESP32 device
  const handleTestDevice = async () => {
    const cleanDev = getNormalizedDeviceUrl(deviceUrl);
    if (!cleanDev) {
      addLog('请输入有效的设备 IP 地址（例如 192.168.1.55 或 192.168.4.1）', 'err');
      return;
    }

    setIsTestingDevice(true);
    setDeviceTestResult(null);
    addLog(`正在探测设备连通性: ${cleanDev} ...`, 'info');

    try {
      // 1. Try local Express backend ping proxy (bypasses browser CORS & mixed-content blocks)
      const res = await fetch(`/api/ping-device?url=${encodeURIComponent(cleanDev)}`);
      const data = await res.json().catch(() => null);

      if (data?.reachable) {
        setDeviceTestResult({ ok: true, msg: `连接正常 (${data.latencyMs}ms)` });
        addLog(`✅ 设备在线！${cleanDev} 响应正常，延迟 ${data.latencyMs}ms (HTTP ${data.status})`, 'ok');
        return;
      }

      // 2. Fallback: try browser direct fetch
      try {
        const directStart = Date.now();
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 2500);
        await fetch(`${cleanDev}/api/v1/status`, { method: 'GET', mode: 'no-cors', signal: controller.signal });
        clearTimeout(t);
        setDeviceTestResult({ ok: true, msg: `直连可达 (${Date.now() - directStart}ms)` });
        addLog(`✅ 浏览器直连可达: ${cleanDev} (${Date.now() - directStart}ms)`, 'ok');
      } catch (directErr: any) {
        setDeviceTestResult({ ok: false, msg: '未响应或离线' });
        addLog(
          `❌ 无法连接到 ${cleanDev}。请检查：1. ESP32 是否已开机联网；2. 电脑/手机与 ESP32 是否在同一局域网 WiFi。`,
          'err'
        );
      }
    } catch (e: any) {
      setDeviceTestResult({ ok: false, msg: '测试失败' });
      addLog(`测试异常: ${e.message || String(e)}`, 'err');
    } finally {
      setIsTestingDevice(false);
    }
  };

  // Upload to ESP32 device via HTTP PUT /api/v1/icons/{name}
  // Supports both local backend proxy (bypasses browser CORS / Mixed Content) and direct browser fetch
  const handleUploadToDevice = async () => {
    try {
      if (!nciBlob) throw new Error('请先转换图片生成 NCI 固件');
      const cleanDev = getNormalizedDeviceUrl(deviceUrl);
      const name = iconName.trim();
      if (!cleanDev) throw new Error('请输入设备地址（例如 192.168.1.55 或 http://192.168.1.55）');
      if (!validName(name)) throw new Error('图标名称只能包含字母、数字、_、-，长度 1..31');

      const targetEndpoint = `${cleanDev}/api/v1/icons/${encodeURIComponent(name)}`;
      addLog(`正在推送到设备: ${targetEndpoint} ...`, 'info');

      let uploadedSuccessfully = false;
      let lastErrMsg = '';

      // Strategy 1: Attempt via Server-side Proxy (/api/proxy-device)
      // This bypasses browser CORS, Private Network Access (PNA), and Mixed-Content (HTTPS->HTTP) blocks!
      try {
        const proxyRes = await fetch('/api/proxy-device', {
          method: 'POST',
          headers: {
            'x-target-url': targetEndpoint,
            'x-target-method': 'PUT',
            'Content-Type': 'application/octet-stream',
          },
          body: nciBlob,
        });

        if (proxyRes.ok) {
          uploadedSuccessfully = true;
          addLog(`✅ 上传成功！图标已通过本地代理推送至 ESP32 (${cleanDev}/api/v1/icons/${name})`, 'ok');
        } else {
          const errData = await proxyRes.json().catch(() => null);
          lastErrMsg = errData?.error || `HTTP ${proxyRes.status}`;
        }
      } catch (proxyErr: any) {
        lastErrMsg = proxyErr.message || String(proxyErr);
      }

      // Strategy 2: If proxy could not reach target, attempt direct browser fetch fallback!
      if (!uploadedSuccessfully) {
        addLog(`正在尝试浏览器局域网直连推送...`, 'info');
        try {
          const directRes = await fetch(targetEndpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: nciBlob,
          });

          if (directRes.ok) {
            uploadedSuccessfully = true;
            addLog(`✅ 直连上传成功！ESP32 设备图标已更新至 /api/v1/icons/${name}`, 'ok');
          } else {
            const txt = await directRes.text().catch(() => '');
            throw new Error(txt || `HTTP ${directRes.status}`);
          }
        } catch (directErr: any) {
          throw new Error(
            `无法上传到设备 (${cleanDev})：${directErr.message || lastErrMsg}。\n` +
            `👉 解决建议：1. 确认设备 IP 是否正确且开机；2. 确认当前电脑/手机与 ESP32 在同一局域网；3. 可直接点击下方「下载 .nci 固件」并在 NeoClock 后台直接导入。`
          );
        }
      }
    } catch (err: any) {
      addLog(`上传失败: ${err.message || String(err)}`, 'err');
    }
  };

  const currentFrame = frames[activeFrameIndex];

  return (
    <div id="nci-converter" className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-colors duration-200 space-y-6">
      
      {/* 1. Header Bar matching Site Theme */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#E60012]/10 border border-[#E60012]/20 flex items-center justify-center text-[#E60012]">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                NCI RGB565 固件转换工作台
              </h3>
              <span className="text-[10px] font-mono font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                支持 NCI2 / NCI1 · RGB565
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              单文件独立工具：支持将本地 PNG / GIF / LaMetric 图标转化为 16-bit RGB565 NCI2（含 VARTIME 逐帧延时表）或 NCI1 二进制固件。
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Protocol Version Toggle: NCI2 vs NCI1 */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono">
            <button
              type="button"
              onClick={() => handleVersionChange('NCI2')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer ${
                nciVersion === 'NCI2'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="NCI2 新版协议：支持 0x01 RGB565 与 0x02 VARTIME 逐帧延时表"
            >
              <span>NCI2</span>
              <span className={`text-[9px] px-1 rounded ${nciVersion === 'NCI2' ? 'bg-white/20 text-white' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'}`}>
                推荐
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleVersionChange('NCI1')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                nciVersion === 'NCI1'
                  ? 'bg-white dark:bg-slate-900 text-[#E60012] font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="NCI1 传统固定帧速协议（向后兼容旧版固件）"
            >
              NCI1
            </button>
          </div>

          {/* Target Size Toggle Pill */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono">
            <button
              type="button"
              onClick={() => setSizeKey('8x8')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                sizeKey === '8x8'
                  ? 'bg-white dark:bg-slate-900 text-[#E60012] font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              8×8 图标
            </button>
            <button
              type="button"
              onClick={() => setSizeKey('32x8')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                sizeKey === '32x8'
                  ? 'bg-white dark:bg-slate-900 text-[#E60012] font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              32×8 横幅全景
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Interactive Workspace (Left: Upload & Settings, Right: Pixel Matrix Preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: File Drop & Configuration (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Drag & Drop File Zone */}
          <div
            onDragOver={e => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => {
              e.preventDefault();
              setIsDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) {
                setFile(f);
                const cleanName = f.name.replace(/\.[^/.]+$/, '').replace(/[^A-Za-z0-9_-]/g, '');
                if (cleanName && iconName === 'time') setIconName(cleanName.substring(0, 31));
                handleConvert(f);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`group relative p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer flex items-center justify-between gap-4 ${
              isDragging 
                ? 'border-[#E60012] bg-[#E60012]/5 dark:bg-[#E60012]/10' 
                : 'border-slate-300 dark:border-slate-700 hover:border-[#E60012]/60 hover:bg-slate-50 dark:hover:bg-slate-800/50 bg-slate-50/50 dark:bg-slate-800/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/gif,image/jpeg,image/webp,.nci"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) {
                  setFile(f);
                  const cleanName = f.name.replace(/\.[^/.]+$/, '').replace(/[^A-Za-z0-9_-]/g, '');
                  if (cleanName && iconName === 'time') setIconName(cleanName.substring(0, 31));
                  handleConvert(f);
                }
              }}
              className="hidden"
            />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200/80 dark:bg-slate-700/80 group-hover:bg-[#E60012]/10 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:text-[#E60012] transition-colors">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {file ? file.name : '点击选择或拖入 PNG / GIF / .NCI 固件'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {file ? `${(file.size / 1024).toFixed(1)} KB · 点击可重新更换文件` : '支持透明 PNG、多帧 GIF 以及直接读取现有 .nci 文件回炉修改'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-2xs transition-colors shrink-0"
            >
              浏览文件
            </button>
          </div>

          {/* LaMetric Icon ID & Local Full Library Loader */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-[#E60012]" />
                  <span>LaMetric 8×8 图标库</span>
                </label>
                {libraryStats?.ready && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <Database className="w-2.5 h-2.5" />
                    <span>已入库 {libraryStats.totalIcons.toLocaleString()} 枚</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowLibraryBrowser(prev => !prev)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 border transition-colors cursor-pointer ${
                    showLibraryBrowser
                      ? 'bg-[#E60012] text-white border-[#E60012]'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-[#E60012]/50 hover:text-[#E60012]'
                  }`}
                >
                  <Grid className="w-3 h-3" />
                  <span>{showLibraryBrowser ? '收起全库浏览' : '浏览本地全库'}</span>
                </button>
                <a
                  href="https://developer.lametric.com/icons"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 font-mono"
                >
                  <span>官网库</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={lametricInput}
                onChange={e => setLametricInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLoadLametricIcon();
                  }
                }}
                placeholder="输入 ID（如 230、2867）或粘贴 icon_thumbs 链接"
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#E60012]/30"
              />
              <button
                type="button"
                onClick={() => handleLoadLametricIcon()}
                disabled={isFetchingLametric || isProcessing || !lametricInput.trim()}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-[#E60012] dark:hover:bg-[#CC0010] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all whitespace-nowrap cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetchingLametric ? 'animate-spin' : ''}`} />
                <span>{isFetchingLametric ? '加载中...' : '加载图标 ID'}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-slate-500 dark:text-slate-400 text-[10px]">热门测试 ID:</span>
              {[
                { id: '230', label: '#230' },
                { id: '87', label: '#87 笑脸' },
                { id: '2867', label: '#2867 动图' },
                { id: '795', label: '#795 火焰' },
                { id: '1246', label: '#1246 信号' },
                { id: '13524', label: '#13524 霓虹' },
                { id: '635', label: '#635 PNG' },
                { id: '90', label: '#90 太阳' },
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleLoadLametricIcon(item.id)}
                  disabled={isFetchingLametric}
                  className={`px-2 py-0.5 rounded-md font-mono text-[10px] border transition-colors cursor-pointer ${
                    extractLametricId(lametricInput) === item.id && iconName === `lm_${item.id}`
                      ? 'bg-[#E60012]/10 border-[#E60012]/40 text-[#E60012] font-bold'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#E60012]/40 hover:text-[#E60012]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Expandable Local LaMetric Full Icon Library Browser */}
            {showLibraryBrowser && (
              <div className="mt-2 pt-3 border-t border-slate-200 dark:border-slate-700/80 space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[160px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={libQuery}
                      onChange={e => {
                        setLibQuery(e.target.value);
                        setLibPage(1);
                      }}
                      placeholder="按关键词 (clock, cat, fire, btc) 或 ID 搜索..."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E60012]/30"
                    />
                    {libQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setLibQuery('');
                          setLibPage(1);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center bg-slate-200/70 dark:bg-slate-900 rounded-lg p-0.5 text-[10px] font-mono">
                    {[
                      { key: 'all' as const, label: '全部' },
                      { key: 'gif' as const, label: 'GIF 动图' },
                      { key: 'png' as const, label: 'PNG 静态' },
                    ].map(opt => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          setLibType(opt.key);
                          setLibPage(1);
                        }}
                        className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                          libType === opt.key
                            ? 'bg-white dark:bg-slate-800 text-[#E60012] font-bold shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {!libraryStats?.ready ? (
                  <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400 font-mono">
                    本地图标包加载中或尚未同步完成，请稍后刷新查看...
                  </div>
                ) : isLoadingLib && libItems.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400 font-mono">
                    正在检索本地图标库...
                  </div>
                ) : libItems.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400 font-mono">
                    未找到匹配的图标，请更换关键词或数字 ID
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                      {libItems.map(item => {
                        const isSelected = extractLametricId(lametricInput) === String(item.id) && iconName === `lm_${item.id}`;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleLoadLametricIcon(String(item.id))}
                            title={`#${item.id} · ${item.title} (${item.type.toUpperCase()})`}
                            className={`group p-1.5 rounded-lg border text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                              isSelected
                                ? 'bg-[#E60012]/10 border-[#E60012] ring-1 ring-[#E60012]/30'
                                : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-[#E60012]/50'
                            }`}
                          >
                            <div className="w-8 h-8 rounded bg-[#0F141E] border border-slate-800 flex items-center justify-center overflow-hidden">
                              <img
                                src={`/api/lametric-icon/${item.id}`}
                                alt={item.title}
                                loading="lazy"
                                className="w-6 h-6 object-contain [image-rendering:pixelated]"
                              />
                            </div>
                            <div className="w-full flex items-center justify-center gap-1 text-[9px] font-mono leading-none">
                              <span className="text-slate-700 dark:text-slate-300 font-semibold truncate">
                                #{item.id}
                              </span>
                              {item.type === 'gif' && (
                                <span className="text-[8px] px-1 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold">
                                  GIF
                                </span>
                              )}
                            </div>
                            <span className="w-full text-[9px] text-slate-400 truncate leading-tight">
                              {item.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-1">
                      <span>
                        共 {libTotal.toLocaleString()} 枚 · 第 {libPage} / {libTotalPages} 页
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setLibPage(p => Math.max(1, p - 1))}
                          disabled={libPage <= 1 || isLoadingLib}
                          className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:text-slate-900 dark:hover:text-white flex items-center gap-0.5 cursor-pointer"
                        >
                          <ChevronLeft className="w-3 h-3" />
                          <span>上一页</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setLibPage(p => Math.min(libTotalPages, p + 1))}
                          disabled={libPage >= libTotalPages || isLoadingLib}
                          className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:text-slate-900 dark:hover:text-white flex items-center gap-0.5 cursor-pointer"
                        >
                          <span>下一页</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Form Settings Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            
            {/* Icon Name & Presets */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                图标标识名 (用于 ESP32 路径)
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={31}
                  value={iconName}
                  onChange={e => setIconName(e.target.value)}
                  placeholder="time, date, weather, custom"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#E60012]/30"
                />
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[10px] text-slate-400">预设:</span>
                {['time', 'date', 'weather', 'heart'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setIconName(tag)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                      iconName === tag 
                        ? 'bg-[#E60012]/10 text-[#E60012] font-bold' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Frame Delay Override */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                帧间隔覆盖 (0 = 原始/默认200ms，否则 ≥30ms)
              </label>
              <input
                type="number"
                min="0"
                max="5000"
                value={frameMsOverride}
                onChange={e => setFrameMsOverride(Math.max(0, Number(e.target.value) || 0))}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#E60012]/30"
                placeholder="0 为使用 GIF 原始延迟 / 默认 200ms"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                NCI2 规范：0 表示默认 200ms（或保留 GIF 原延时）；否则必须 ≥ 30ms
              </span>
            </div>

            {/* Max Frame limit */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                最大抽取帧数 (1 ~ 60)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={maxFrames}
                onChange={e => setMaxFrames(Math.max(1, Math.min(60, Number(e.target.value) || 60)))}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#E60012]/30"
              />
            </div>

            {/* NCI2 VARTIME Per-frame Delay Table Selector */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                NCI2 逐帧延时表 (flags bit1: 0x02 VARTIME)
              </label>
              <div className={`grid grid-cols-3 gap-1 p-1 rounded-xl border text-[11px] font-mono ${
                nciVersion === 'NCI2'
                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  : 'bg-slate-100/50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 opacity-50 pointer-events-none'
              }`}>
                {[
                  { key: 'auto' as const, label: '自动识别' },
                  { key: 'always' as const, label: '强制开启' },
                  { key: 'off' as const, label: '关闭(固定)' },
                ].map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handleVarTimeChange(opt.key)}
                    className={`py-1.5 px-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                      varTimeMode === opt.key
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-bold shadow-2xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {nciVersion === 'NCI2'
                  ? '自动模式：GIF 帧间隔不同时自动写入逐帧 u16 延时表 (0x03)'
                  : '当前为 NCI1 兼容模式，切换至 NCI2 可启用逐帧延时表'}
              </span>
            </div>

            {/* Optional Device IP */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-blue-500" />
                  <span>ESP32 局域网推送地址 (可选)</span>
                </label>
                {deviceTestResult && (
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                    deviceTestResult.ok 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                  }`}>
                    {deviceTestResult.msg}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={deviceUrl}
                    onChange={e => {
                      setDeviceUrl(e.target.value);
                      if (deviceTestResult) setDeviceTestResult(null);
                    }}
                    placeholder="例如 192.168.1.55 或 192.168.4.1"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#E60012]/30"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleTestDevice}
                  disabled={isTestingDevice || !deviceUrl.trim()}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer"
                  title="探测局域网内 ESP32 设备是否在线并测试响应延迟"
                >
                  <RefreshCw className={`w-3 h-3 ${isTestingDevice ? 'animate-spin text-blue-500' : ''}`} />
                  <span>{isTestingDevice ? '探测中...' : '测速连接'}</span>
                </button>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                支持直接输入 IP（如 192.168.1.55 或 192.168.4.1），内置服务端代理已自动穿透浏览器跨域与私网(PNA)隔离。
              </span>
            </div>

          </div>

        </div>

        {/* Right Column: Hardware Pixel Simulation Preview + Action Buttons Toolbar (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-4">
            
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#E60012]" />
                <span>点阵屏仿真预览 ({previewWidth}×{previewHeight})</span>
              </span>

              {frames.length > 1 && (
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
                  >
                    {isPlaying ? <Pause className="w-2.5 h-2.5 text-amber-500" /> : <Play className="w-2.5 h-2.5 text-emerald-500" />}
                    <span>{isPlaying ? '暂停' : '播放'}</span>
                  </button>
                  <span>{activeFrameIndex + 1} / {frames.length} 帧 ({Math.max(30, currentFrame?.delay || 200)}ms)</span>
                </div>
              )}
            </div>

            {/* Pixel LED Matrix Chassis matching top display */}
            <div className="w-full flex items-center justify-center py-2">
              <div className="p-3 rounded-xl bg-[#0F141E] border border-slate-800 shadow-inner w-full flex items-center justify-center">
                <div 
                  className="grid gap-[2px] sm:gap-[3px] select-none"
                  style={{
                    gridTemplateColumns: `repeat(${previewWidth}, minmax(0, 1fr))`,
                    maxWidth: previewWidth <= 8 ? '160px' : '100%',
                    width: '100%'
                  }}
                >
                  {Array.from({ length: previewHeight * previewWidth }).map((_, i) => {
                    const pixel = currentFrame?.pixels?.[i] || [0, 0, 0, 0];
                    const isTransparent = (!pixel[3] || pixel[3] < 64);
                    const bgStyle = isTransparent 
                      ? '#121721' 
                      : `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;

                    return (
                      <div
                        key={i}
                        style={{ 
                          backgroundColor: bgStyle,
                          boxShadow: (!isTransparent) ? `0 0 5px 1px ${bgStyle}60` : 'none'
                        }}
                        className="aspect-square rounded-[2px] transition-colors duration-75 relative"
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Meta text banner + NCI2 binary layout breakdown */}
            <div className="text-center font-mono text-[11px] text-slate-500 dark:text-slate-400 py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
              <div>{metaInfo}</div>
              {buildMeta && buildMeta.version === 'NCI2' && (
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
                  <span>magic=&quot;NCI2&quot;</span>
                  <span>flags=0x{buildMeta.flags.toString(16).padStart(2, '0')}</span>
                  <span>frameMs={buildMeta.headerFrameMs}</span>
                  <span>长度=12+{buildMeta.delayTableBytes}+{buildMeta.pixelBytes}={buildMeta.totalBytes}B</span>
                </div>
              )}
            </div>

          </div>

          {/* Action Buttons Toolbar placed directly below the Preview */}
          <div className="grid grid-cols-2 gap-2">
            
            {/* Primary Convert */}
            <button
              onClick={() => handleConvert()}
              disabled={isProcessing}
              className="w-full justify-center px-3 py-2.5 bg-gradient-to-r from-[#E60012] to-amber-600 hover:from-[#CC0010] hover:to-amber-700 active:scale-[0.98] disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-950/20 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isProcessing ? 'animate-spin' : ''}`} />
              <span className="truncate">{isProcessing ? '正在转换...' : '执行转换'}</span>
            </button>

            {/* Load directly to Simulator */}
            <button
              onClick={handleLoadToSimulator}
              disabled={frames.length === 0}
              className="w-full justify-center px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="将转换得到的每一帧载入上方 8×32 时钟屏幕进行预览与像素微调"
            >
              <Edit3 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">载入上方时钟修改</span>
            </button>

            {/* Download .NCI */}
            <button
              onClick={handleDownloadNci}
              disabled={!nciBlob}
              className="w-full justify-center px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">下载 .nci 固件</span>
            </button>

            {/* Copy C++ Code */}
            <button
              onClick={handleCopyCppCode}
              disabled={frames.length === 0}
              className="w-full justify-center px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 shrink-0 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
              <span className="truncate">{copiedCode ? '已复制' : '复制 C++ 数组'}</span>
            </button>

            {/* Push to Device: Always shown on full row, grayed out when firmware or IP is missing */}
            <button
              onClick={handleUploadToDevice}
              disabled={!nciBlob || !deviceUrl.trim()}
              className="col-span-2 w-full justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-950/20 transition-all cursor-pointer"
              title={!deviceUrl.trim() ? '请先在左侧填写 ESP32 局域网地址并转换固件' : '将当前 .nci 固件直接推送到局域网 ESP32 设备'}
            >
              <Send className="w-3.5 h-3.5 shrink-0" />
              <span>推送到设备{deviceUrl.trim() ? ` (${deviceUrl.trim()})` : ''}</span>
            </button>

          </div>

          {syncBadge && (
            <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>{syncBadge} — 现在可直接点击「下载 .nci 固件」或「推送到设备」</span>
              </span>
            </div>
          )}

        </div>

      </div>

      {/* 3. Developer Console / Progress Logs Strip */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2 font-mono">
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-[#E60012]" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">转换状态终端</span>
          </div>
          <button
            onClick={clearLog}
            className="hover:text-slate-900 dark:hover:text-white transition-colors text-[11px]"
          >
            清空输出
          </button>
        </div>

        <div className="bg-[#0B101A] border border-slate-800 rounded-xl p-3 min-h-[72px] max-h-32 overflow-y-auto font-mono text-[11px] text-emerald-400 space-y-1 scrollbar-thin">
          {logs.map((log, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-slate-600 text-[10px] shrink-0">[{log.time}]</span>
              <span className={
                log.type === 'ok' ? 'text-emerald-400 font-medium' :
                log.type === 'err' ? 'text-red-400 font-bold' :
                'text-slate-300'
              }>
                {log.text}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
