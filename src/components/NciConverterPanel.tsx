import React, { useState, useRef, useEffect } from 'react';
import { 
  FileCode, Upload, Download, Copy, Check, Play, 
  Sparkles, Sliders, RefreshCw, Layers, ArrowRight, Eye, Send
} from 'lucide-react';
import { 
  makeNci, downloadNciFile, generateCppRgb565Code, 
  rgbToRgb565, rgb565ToRgb, rgb565ToHex 
} from '../utils/nciFormat';

interface NciConverterPanelProps {
  onLoadToSimulator?: (framesRgb: string[][][], fps: number, title: string) => void;
}

export const NciConverterPanel: React.FC<NciConverterPanelProps> = ({ onLoadToSimulator }) => {
  const [file, setFile] = useState<File | null>(null);
  const [iconName, setIconName] = useState<string>('time');
  const [iconCustom, setIconCustom] = useState<string>('weather');
  const [width, setWidth] = useState<number>(8);
  const [height, setHeight] = useState<number>(8);
  const [frameCount, setFrameCount] = useState<number>(1);
  const [frameMs, setFrameMs] = useState<number>(120);
  const [deviceIp, setDeviceIp] = useState<string>('192.168.4.1');
  
  const [convertedFrames, setConvertedFrames] = useState<number[][]>([]);
  const [previewFrameIdx, setPreviewFrameIdx] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('请选择图片（PNG/GIF/JPG）开始转换');
  const [isUploadSuccess, setIsUploadSuccess] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const targetName = iconName === 'custom' ? (iconCustom.trim() || 'custom') : iconName;

  // Process uploaded image file into RGB565 frames
  const processImage = (imgFile: File) => {
    setIsProcessing(true);
    setStatusMessage('正在解析图片并提取 RGB565 帧数据...');

    const url = URL.createObjectURL(imgFile);
    const img = new Image();

    img.onload = async () => {
      try {
        const offscreen = document.createElement('canvas');
        const ctx = offscreen.getContext('2d');
        if (!ctx) throw new Error('无法创建 Canvas 2D 绘图环境');

        offscreen.width = width;
        offscreen.height = height;

        const frames: number[][] = [];
        const fc = Math.max(1, Math.min(60, frameCount));

        for (let i = 0; i < fc; i++) {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const imgData = ctx.getImageData(0, 0, width, height).data;
          const frameRgb565: number[] = [];

          for (let p = 0; p < width * height; p++) {
            const r = imgData[p * 4];
            const g = imgData[p * 4 + 1];
            const b = imgData[p * 4 + 2];
            const a = imgData[p * 4 + 3];

            // If transparent / dark pixel
            if (a < 25) {
              frameRgb565.push(0);
            } else {
              frameRgb565.push(rgbToRgb565(r, g, b));
            }
          }

          frames.push(frameRgb565);
          if (fc > 1) {
            await new Promise(r => setTimeout(r, 20));
          }
        }

        setConvertedFrames(frames);
        setPreviewFrameIdx(0);
        setStatusMessage(`成功转换 ${targetName} · ${width}×${height} · ${frames.length} 帧 · NCI1 RGB565`);
      } catch (err: any) {
        console.error('Image processing failed:', err);
        setStatusMessage(`转换失败: ${err.message || '图片格式不支持'}`);
      } finally {
        setIsProcessing(false);
        URL.revokeObjectURL(url);
      }
    };

    img.onerror = () => {
      setStatusMessage('图片加载失败，请检查文件是否为有效图片');
      setIsProcessing(false);
      URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      processImage(selected);
    }
  };

  // Re-render preview canvas whenever convertedFrames or previewFrameIdx changes
  useEffect(() => {
    if (!canvasRef.current || convertedFrames.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    const frame = convertedFrames[previewFrameIdx] || convertedFrames[0];
    const imgData = ctx.createImageData(width, height);

    for (let i = 0; i < frame.length; i++) {
      const v = frame[i];
      if (v === 0) {
        imgData.data[i * 4] = 16;
        imgData.data[i * 4 + 1] = 20;
        imgData.data[i * 4 + 2] = 28;
        imgData.data[i * 4 + 3] = 255;
      } else {
        const [r, g, b] = rgb565ToRgb(v);
        imgData.data[i * 4] = r;
        imgData.data[i * 4 + 1] = g;
        imgData.data[i * 4 + 2] = b;
        imgData.data[i * 4 + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [convertedFrames, previewFrameIdx, width, height]);

  // Download .nci binary
  const handleDownloadNci = () => {
    if (convertedFrames.length === 0) return;
    const nciBytes = makeNci(convertedFrames, width, height, frameMs);
    downloadNciFile(nciBytes, `${targetName}.nci`);
  };

  // Copy C++ RGB565 code
  const handleCopyCppCode = () => {
    if (convertedFrames.length === 0) return;
    const code = generateCppRgb565Code(convertedFrames, targetName, width, height, frameMs);
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Push converted frames to the top 8x32 simulator
  const handleLoadToClock = () => {
    if (convertedFrames.length === 0 || !onLoadToSimulator) return;

    // Convert each RGB565 frame to 8x32 hex matrix
    const hexFrames: string[][][] = convertedFrames.map(frame => {
      const grid: string[][] = [];
      for (let r = 0; r < 8; r++) {
        const row: string[] = [];
        for (let c = 0; c < 32; c++) {
          if (r < height && c < width) {
            const idx = r * width + c;
            const px = frame[idx];
            row.push(px === 0 ? '' : rgb565ToHex(px));
          } else {
            row.push('');
          }
        }
        grid.push(row);
      }
      return grid;
    });

    const fps = Math.round(1000 / Math.max(30, frameMs));
    onLoadToSimulator(hexFrames, fps, `NCI: ${targetName}`);
  };

  // Upload to ESP32 device via HTTP PUT /api/v1/icons/{name}
  const handleUploadToDevice = async () => {
    if (convertedFrames.length === 0) return;
    setIsProcessing(true);
    setIsUploadSuccess(false);
    setStatusMessage(`正在上传至设备 http://${deviceIp}/api/v1/icons/${targetName} ...`);

    try {
      const nciBytes = makeNci(convertedFrames, width, height, frameMs);
      const url = `http://${deviceIp}/api/v1/icons/${encodeURIComponent(targetName)}`;
      
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: new Blob([nciBytes.buffer as ArrayBuffer]),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      setIsUploadSuccess(true);
      setStatusMessage(`✅ 上传成功！设备图标已更新至 /api/v1/icons/${targetName}`);
    } catch (err: any) {
      console.warn('Direct device upload failed:', err);
      // Explain CORS / hotspot connectivity note
      setStatusMessage(`设备上传提示: ${err.message || '网络连接失败'}（请确认手机/电脑已连接 NeoClock 热点）`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-colors duration-200">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF6B6B] to-[#FFA07A] flex items-center justify-center text-white shadow-sm">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                NCI RGB565 图标与动画转换工具
              </h3>
              <span className="text-[10px] font-mono font-semibold text-[#FF6B6B] bg-[#FF6B6B]/10 px-2 py-0.5 rounded border border-[#FF6B6B]/20">
                NeoClock / Awtrix 官方标准
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              单文件零依赖 · 支持 PNG/GIF 转换为 16-bit RGB565 NCI1 二进制固件格式并即时预览
            </p>
          </div>
        </div>

        <div className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <span>标识: NCI1 (0x4E 0x43 0x49 0x31)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Form: Inputs & Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* File input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              选择源图片文件 (PNG / GIF / JPG / WebP):
            </label>
            <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#FF6B6B] dark:hover:border-[#FF6B6B] rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-950/40">
              <input
                type="file"
                accept="image/png,image/gif,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center gap-1.5">
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {file ? file.name : '点击或拖拽图片到此处'}
                </span>
                <span className="text-[11px] text-slate-400">
                  支持动图 GIF 或透明背景 PNG
                </span>
              </div>
            </div>
          </div>

          {/* Grid Settings: Icon Name & Target */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                图标预设槽位:
              </label>
              <select
                value={iconName}
                onChange={e => setIconName(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]"
              >
                <option value="time">time (时间页角标)</option>
                <option value="date">date (日期页角标)</option>
                <option value="weather">weather (天气页图标)</option>
                <option value="custom">custom (自定义命名)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                自定义图标名称:
              </label>
              <input
                type="text"
                value={iconCustom}
                disabled={iconName !== 'custom'}
                onChange={e => setIconCustom(e.target.value)}
                placeholder="如: heart, mario, wifi"
                maxLength={31}
                className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]"
              />
            </div>
          </div>

          {/* Resolution & Frames */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                宽度 (W):
              </label>
              <input
                type="number"
                min="1"
                max="32"
                value={width}
                onChange={e => {
                  const val = Math.max(1, Math.min(32, Number(e.target.value) || 8));
                  setWidth(val);
                  if (file) processImage(file);
                }}
                className="w-full h-9 px-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                高度 (H):
              </label>
              <input
                type="number"
                min="1"
                max="8"
                value={height}
                onChange={e => {
                  const val = Math.max(1, Math.min(8, Number(e.target.value) || 8));
                  setHeight(val);
                  if (file) processImage(file);
                }}
                className="w-full h-9 px-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                帧数 (Frames):
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={frameCount}
                onChange={e => {
                  const val = Math.max(1, Math.min(60, Number(e.target.value) || 1));
                  setFrameCount(val);
                  if (file) processImage(file);
                }}
                className="w-full h-9 px-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                帧间隔 (ms):
              </label>
              <input
                type="number"
                min="30"
                max="5000"
                value={frameMs}
                onChange={e => setFrameMs(Math.max(30, Math.min(5000, Number(e.target.value) || 120)))}
                className="w-full h-9 px-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Quick preset buttons for common formats */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400">快速规格:</span>
            {[
              { label: '8×8 经典单角标 (time/date)', w: 8, h: 8, f: 1 },
              { label: '8×8 动图 (4帧)', w: 8, h: 8, f: 4 },
              { label: '32×8 全横屏动画 (6帧)', w: 32, h: 8, f: 6 },
            ].map(preset => (
              <button
                key={preset.label}
                onClick={() => {
                  setWidth(preset.w);
                  setHeight(preset.h);
                  setFrameCount(preset.f);
                  if (file) processImage(file);
                }}
                className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>

        </div>

        {/* Right Preview & Action Area (5 cols) */}
        <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
          
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>RGB565 量化点阵预览:</span>
            <span className="text-slate-400 font-mono text-[11px]">
              {convertedFrames.length > 0 ? `帧 ${previewFrameIdx + 1} / ${convertedFrames.length}` : '未就绪'}
            </span>
          </div>

          {/* Canvas Box */}
          <div className="flex flex-col items-center justify-center p-3 bg-black rounded-xl border border-slate-800 min-h-[140px]">
            <canvas
              ref={canvasRef}
              className="image-rendering-pixelated rounded shadow-md border border-slate-800"
              style={{
                width: width === 32 ? '100%' : '112px',
                height: width === 32 ? '28px' : '112px',
                maxWidth: '260px',
              }}
            />

            {convertedFrames.length > 1 && (
              <div className="flex items-center gap-2 mt-3 text-xs font-mono text-slate-400">
                <button
                  onClick={() => setPreviewFrameIdx(p => (p - 1 + convertedFrames.length) % convertedFrames.length)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200"
                >
                  ◀
                </button>
                <span>帧 #{previewFrameIdx + 1}</span>
                <button
                  onClick={() => setPreviewFrameIdx(p => (p + 1) % convertedFrames.length)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200"
                >
                  ▶
                </button>
              </div>
            )}
          </div>

          {/* Status message */}
          <div className="text-[11px] text-slate-500 dark:text-slate-400 break-words font-mono bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
            {statusMessage}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={handleDownloadNci}
              disabled={convertedFrames.length === 0}
              className="w-full h-10 px-4 text-xs font-bold text-white bg-gradient-to-r from-[#FF6B6B] to-[#FFA07A] hover:brightness-105 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>下载 {targetName}.nci 二进制固件文件</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleLoadToClock}
                disabled={convertedFrames.length === 0}
                className="h-9 px-3 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 text-emerald-500" />
                <span>载入上方时钟</span>
              </button>

              <button
                onClick={handleCopyCppCode}
                disabled={convertedFrames.length === 0}
                className="h-9 px-3 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 transition-colors flex items-center justify-center gap-1.5"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? '已复制代码' : '复制 C++ 数组'}</span>
              </button>
            </div>
          </div>

          {/* Direct Device Upload Option */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                无线上传至 ESP32 设备:
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={deviceIp}
                onChange={e => setDeviceIp(e.target.value)}
                placeholder="设备IP: 192.168.4.1"
                className="flex-1 h-8 px-2.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
              <button
                onClick={handleUploadToDevice}
                disabled={convertedFrames.length === 0 || isProcessing}
                className="h-8 px-3 text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-40 rounded-lg transition-all flex items-center gap-1 whitespace-nowrap"
              >
                <Send className="w-3 h-3" />
                <span>PUT 上传</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
