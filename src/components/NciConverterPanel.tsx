import React, { useState, useEffect, useRef } from 'react';
import { 
  FileCode, Upload, Download, Copy, Check, Play, Pause,
  Layers, Eye, Send, Terminal, Sparkles, RefreshCw, X, ArrowUpRight
} from 'lucide-react';
import { 
  makeNci, fileToNciFrames, downloadNciBlob, generateCppRgb565Code,
  nciRawFrameToHexGrid, NciRawFrame 
} from '../utils/nciFormat';

interface NciConverterPanelProps {
  onLoadToSimulator?: (framesRgb: string[][][], fps: number, title: string) => void;
}

interface LogEntry {
  text: string;
  type: 'info' | 'ok' | 'err';
  time: string;
}

export const NciConverterPanel: React.FC<NciConverterPanelProps> = ({ onLoadToSimulator }) => {
  const [file, setFile] = useState<File | null>(null);
  const [sizeKey, setSizeKey] = useState<'8x8' | '32x8'>('8x8');
  const [frameMsOverride, setFrameMsOverride] = useState<number>(0);
  const [maxFrames, setMaxFrames] = useState<number>(60);
  const [iconName, setIconName] = useState<string>('time');
  const [deviceUrl, setDeviceUrl] = useState<string>('');

  // Conversion results
  const [frames, setFrames] = useState<NciRawFrame[]>([]);
  const [nciBlob, setNciBlob] = useState<Blob | null>(null);
  const [metaInfo, setMetaInfo] = useState<string>('未载入文件');
  const [activeFrameIndex, setActiveFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [logs, setLogs] = useState<LogEntry[]>([
    { text: '转换引擎已就绪：支持解析标准 PNG 及多帧 GIF 动图', type: 'info', time: 'SYS' }
  ]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Target resolution
  const [targetWidth, targetHeight] = sizeKey === '8x8' ? [8, 8] : [32, 8];

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

  // Animation player timer matching exact GIF delays
  useEffect(() => {
    if (!isPlaying || frames.length <= 1) return;
    const currentDelay = Math.max(30, frames[activeFrameIndex]?.delay || 200);
    const timer = setTimeout(() => {
      setActiveFrameIndex(prev => (prev + 1) % frames.length);
    }, currentDelay);
    return () => clearTimeout(timer);
  }, [isPlaying, frames, activeFrameIndex]);

  // Handle conversion matching exact functional logic from index_3f785a56.html
  const handleConvert = async (inputFile?: File) => {
    const f = inputFile || file;
    if (!f) {
      addLog('请先选择或拖入 PNG / GIF 图片文件', 'err');
      return;
    }

    setIsProcessing(true);
    try {
      const isGif = f.type === 'image/gif' || f.name.toLowerCase().endsWith('.gif');
      addLog(isGif ? `开始二进制 LZW 解码动图: ${f.name} ...` : `解析静态像素图像: ${f.name} ...`, 'info');

      const parsedFrames = await fileToNciFrames(
        f,
        targetWidth,
        targetHeight,
        maxFrames,
        frameMsOverride
      );

      if (!parsedFrames || parsedFrames.length === 0) {
        throw new Error('未能从图片中解析出有效像素帧');
      }

      const finalFrameMs = frameMsOverride || parsedFrames[0].delay || 200;
      const blob = makeNci(parsedFrames, targetWidth, targetHeight, finalFrameMs);

      setFrames(parsedFrames);
      setNciBlob(blob);
      setActiveFrameIndex(0);
      setIsPlaying(true);

      const base = iconName.replace(/[^A-Za-z0-9_-]/g, '') || 'icon';
      const infoStr = `${targetWidth}×${targetHeight} · ${parsedFrames.length} 帧 · 帧间隔 ${finalFrameMs}ms · NCI1 固件 ${blob.size} 字节 (${base}.nci)`;
      setMetaInfo(infoStr);

      addLog(`转换成功！已生成 ${parsedFrames.length} 帧 16-bit RGB565 数据，体积 ${blob.size} 字节`, 'ok');
    } catch (err: any) {
      console.error('NCI conversion failed:', err);
      addLog(`转换失败: ${err.message || String(err)}`, 'err');
      setMetaInfo('转换出错');
    } finally {
      setIsProcessing(false);
    }
  };

  // Download .nci binary
  const handleDownloadNci = () => {
    if (!nciBlob) return;
    const base = iconName.replace(/[^A-Za-z0-9_-]/g, '') || 'icon';
    downloadNciBlob(nciBlob, `${base}.nci`);
    addLog(`已保存 NCI1 二进制固件至本地: ${base}.nci`, 'ok');
  };

  // Load to 8x32 simulator above
  const handleLoadToSimulator = () => {
    if (!onLoadToSimulator || frames.length === 0) return;
    const finalFrameMs = frameMsOverride || frames[0].delay || 200;
    const fps = Math.round(1000 / Math.max(30, finalFrameMs));

    // Convert to hex matrix (8 rows × 32 cols)
    const hexGrids: string[][][] = frames.map(fr => {
      const rawGrid = nciRawFrameToHexGrid(fr, targetWidth, targetHeight);
      if (targetWidth === 8) {
        // Horizontally center 8x8 icon on 8x32 display (12 cols empty, 8 cols icon, 12 cols empty)
        return rawGrid.map(row => [
          ...Array(12).fill('#121721'),
          ...row,
          ...Array(12).fill('#121721')
        ]);
      }
      return rawGrid;
    });

    const base = iconName.trim() || 'icon';
    onLoadToSimulator(hexGrids, fps, `NCI: ${base}`);
    addLog(`已成功载入上方 8×32 硬件仿真器进行全彩连续播放（${frames.length} 帧，${fps} FPS）`, 'ok');
  };

  // Copy C++ uint16_t RGB565 Array code
  const handleCopyCppCode = () => {
    if (frames.length === 0) return;
    const finalFrameMs = frameMsOverride || frames[0].delay || 200;
    const base = iconName.replace(/[^A-Za-z0-9_-]/g, '') || 'icon';
    const code = generateCppRgb565Code(frames, base, targetWidth, targetHeight, finalFrameMs);
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    addLog('C++ uint16_t RGB565 数组已复制到剪贴板，可直接粘贴进 Arduino / ESP-IDF 项目', 'ok');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Upload to ESP32 device via HTTP PUT /api/v1/icons/{name}
  const handleUploadToDevice = async () => {
    try {
      if (!nciBlob) throw new Error('请先转换图片生成 NCI 固件');
      const dev = deviceUrl.trim().replace(/\/$/, '');
      const name = iconName.trim();
      if (!dev) throw new Error('请输入设备地址（例如 http://192.168.1.55）');
      if (!validName(name)) throw new Error('图标名称只能包含字母、数字、_、-，长度 1..31');

      addLog(`正在推送到设备: ${dev}/api/v1/icons/${encodeURIComponent(name)} ...`, 'info');

      const res = await fetch(`${dev}/api/v1/icons/${encodeURIComponent(name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: nciBlob,
      });

      const txt = await res.text();
      if (!res.ok) throw new Error(txt || `HTTP ${res.status}`);

      addLog(`上传成功！ESP32 设备图标已更新至 /api/v1/icons/${name}`, 'ok');
    } catch (err: any) {
      addLog(`上传失败: ${err.message || String(err)}（请确认当前网络已接入 NeoClock 热点）`, 'err');
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
                NeoClock / Awtrix 原生格式
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              单文件独立工具：支持将本地 PNG / GIF 转化为 16-bit RGB565 NCI1 二进制固件，提供实时像素预览与一键导入时钟。
            </p>
          </div>
        </div>

        {/* Target Size Toggle Pill */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono">
          <button
            onClick={() => setSizeKey('8x8')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              sizeKey === '8x8'
                ? 'bg-white dark:bg-slate-900 text-[#E60012] font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            8×8 图标
          </button>
          <button
            onClick={() => setSizeKey('32x8')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              sizeKey === '32x8'
                ? 'bg-white dark:bg-slate-900 text-[#E60012] font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            32×8 横幅全景
          </button>
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
              accept="image/png,image/gif,image/jpeg,image/webp"
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
                  {file ? file.name : '点击选择或拖入 PNG / GIF 动图'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {file ? `${(file.size / 1024).toFixed(1)} KB · 点击可重新更换文件` : '支持透明通道 PNG 与多帧序列 GIF，自动最近邻像素化'}
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
                帧间隔覆盖 (毫秒，0 = 原始)
              </label>
              <input
                type="number"
                min="0"
                max="5000"
                value={frameMsOverride}
                onChange={e => setFrameMsOverride(Math.max(0, Number(e.target.value) || 0))}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#E60012]/30"
                placeholder="0 为使用 GIF 原始延迟"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                设置大于 0 则覆盖 GIF 内部帧速（如 120ms ≈ 8 FPS）
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

            {/* Optional Device IP */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                设备局域网地址 (可选)
              </label>
              <input
                type="text"
                value={deviceUrl}
                onChange={e => setDeviceUrl(e.target.value)}
                placeholder="http://192.168.1.55"
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#E60012]/30"
              />
            </div>

          </div>

          {/* Action Buttons Toolbar */}
          <div className="pt-2 flex flex-wrap items-center gap-2">
            
            {/* Primary Convert */}
            <button
              onClick={() => handleConvert()}
              disabled={isProcessing}
              className="px-4 py-2 bg-gradient-to-r from-[#E60012] to-amber-600 hover:from-[#CC0010] hover:to-amber-700 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-950/20 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>{isProcessing ? '正在转换...' : '执行转换'}</span>
            </button>

            {/* Load directly to Simulator */}
            <button
              onClick={handleLoadToSimulator}
              disabled={frames.length === 0}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="将转换得到的每一帧实时载入上方 8×32 硬件时钟仿真器进行真彩连播"
            >
              <Play className="w-3.5 h-3.5" />
              <span>载入上方时钟</span>
            </button>

            {/* Download .NCI */}
            <button
              onClick={handleDownloadNci}
              disabled={!nciBlob}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载 .nci 固件</span>
            </button>

            {/* Copy C++ Code */}
            <button
              onClick={handleCopyCppCode}
              disabled={frames.length === 0}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? '已复制' : '复制 C++ 数组'}</span>
            </button>

            {/* Push to Device */}
            {deviceUrl.trim() && (
              <button
                onClick={handleUploadToDevice}
                disabled={!nciBlob}
                className="px-3 py-2 bg-blue-600/10 hover:bg-blue-600/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-blue-600 dark:text-blue-400 border border-blue-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>推送到设备</span>
              </button>
            )}

          </div>

        </div>

        {/* Right Column: Hardware Pixel Simulation Preview (5 cols) */}
        <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-4">
          
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#E60012]" />
              <span>点阵屏仿真预览 ({targetWidth}×{targetHeight})</span>
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
                <span>{activeFrameIndex + 1} / {frames.length} 帧</span>
              </div>
            )}
          </div>

          {/* Pixel LED Matrix Chassis matching top display */}
          <div className="w-full flex items-center justify-center py-2">
            <div className="p-3 rounded-xl bg-[#0F141E] border border-slate-800 shadow-inner w-full flex items-center justify-center">
              <div 
                className="grid gap-[2px] sm:gap-[3px] select-none"
                style={{
                  gridTemplateColumns: `repeat(${targetWidth}, minmax(0, 1fr))`,
                  maxWidth: targetWidth === 8 ? '160px' : '100%',
                  width: '100%'
                }}
              >
                {Array.from({ length: targetHeight * targetWidth }).map((_, i) => {
                  const pixel = currentFrame?.pixels?.[i] || [0, 0, 0, 0];
                  const isTransparent = pixel[3] === 0;
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

          {/* Meta text banner */}
          <div className="text-center font-mono text-[11px] text-slate-500 dark:text-slate-400 py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
            {metaInfo}
          </div>

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
