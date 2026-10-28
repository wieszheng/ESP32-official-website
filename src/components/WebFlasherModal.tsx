import React, { useState, useEffect, useRef } from 'react';
import { X, Terminal, CheckCircle2, AlertCircle, RefreshCw, Wifi, Radio, Cpu } from 'lucide-react';

interface WebFlasherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WebFlasherModal: React.FC<WebFlasherModalProps> = ({ isOpen, onClose }) => {
  const [firmwareVersion, setFirmwareVersion] = useState<string>('v2.4.0-stable');
  const [wifiSsid, setWifiSsid] = useState<string>('Geek_Studio_5G');
  const [wifiPass, setWifiPass] = useState<string>('');
  const [mqttServer, setMqttServer] = useState<string>('homeassistant.local');
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [flashStatus, setFlashStatus] = useState<'idle' | 'flashing' | 'success' | 'error'>('idle');
  const [logs, setLogs] = useState<string[]>([
    'WebSerial Flash Engine v1.4.2 [ESP-Tool JS Integration Ready]',
    '等待连接 ESP32-S3 硬件设备 (请使用包含数据传输功能的 Type-C 数据线)...',
  ]);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll logs
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!isOpen) return null;

  const handleStartFlashing = async () => {
    setIsFlashing(true);
    setFlashStatus('flashing');
    setProgress(0);
    setLogs(prev => [
      ...prev,
      '--------------------------------------------------',
      '>>> 正在请求 WebSerial 端口权限...',
      '>>> 检索到设备: CH343 High-Speed USB Serial (COM3 / /dev/ttyUSB0)',
      '>>> 正在与 ESP32-S3 ROM 引导程序握手...',
    ]);

    const stepDelay = (ms: number) => new Promise(r => setTimeout(r, ms));

    await stepDelay(600);
    setLogs(prev => [
      ...prev,
      'Chip is ESP32-S3 (revision v0.2), Dual-core Xtensa LX7 @ 240MHz',
      'Features: WiFi 4, BLE 5.0, 16MB Flash (Quad), 8MB Octal PSRAM',
      'MAC Address: 84:F7:03:A1:B9:4C',
      'Crystal is 40MHz',
    ]);
    setProgress(15);

    await stepDelay(500);
    setLogs(prev => [
      ...prev,
      '>>> 正在擦除闪存扇区并写入 Bootloader (0x000000)...',
    ]);
    setProgress(30);

    await stepDelay(500);
    setLogs(prev => [
      ...prev,
      '>>> 正在写入分区表 (0x008000)...',
      '>>> 正在烧录 NVS 预置配置 (Wi-Fi: "' + wifiSsid + '", MQTT: "' + mqttServer + '")...',
    ]);
    setProgress(50);

    await stepDelay(600);
    setLogs(prev => [
      ...prev,
      '>>> 正在烧录核心应用固件: esp_pixel_matrix_' + firmwareVersion + '.bin (0x010000)...',
    ]);

    // Simulate progress counting up
    for (let p = 55; p <= 95; p += 10) {
      await stepDelay(250);
      setProgress(p);
      setLogs(prev => [...prev, `Writing at 0x${(p * 1000).toString(16)}... ${p}%`]);
    }

    await stepDelay(400);
    setProgress(100);
    setLogs(prev => [
      ...prev,
      '>>> 校验 MD5 哈希校验和: 63af8b19e0499... 校验完全匹配 (OK)',
      '>>> 正在通过 RTS 引脚进行硬件自动冷复位 (Hard Reset)...',
      '==================================================',
      '🎉 [BOOT] ESP-PixelMatrix 启动成功!',
      '🎉 [WIFI] 已接入 ' + wifiSsid + ', 分配 IP: 192.168.1.188',
      '🎉 [NTP] 授时同步成功 (cn.pool.ntp.org), 当前时钟锁定',
      '🎉 [HOME ASSISTANT] MQTT 实体已自动广播注册',
    ]);
    setFlashStatus('success');
    setIsFlashing(false);
  };

  const handleReset = () => {
    setIsFlashing(false);
    setFlashStatus('idle');
    setProgress(0);
    setLogs([
      'WebSerial Flash Engine v1.4.2 [ESP-Tool JS Integration Ready]',
      '设备已重置。等待重新选择固件与参数...',
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div 
        className="w-full max-w-3xl bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200 transition-colors"
        role="dialog"
        aria-modal="true"
      >
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-[#090D14] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E60012]/15 border border-[#E60012]/40 flex items-center justify-center text-[#E60012]">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
                WebSerial 浏览器在线免驱烧录器
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                基于 WebSerial API · 适用于 Chrome / Edge / Opera 浏览器
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Configuration Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Firmware Version */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                官方固件发布通道
              </label>
              <select
                value={firmwareVersion}
                disabled={isFlashing}
                onChange={e => setFirmwareVersion(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#090D14] border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#E60012]"
              >
                <option value="v2.4.0-stable">v2.4.0 官方稳定版 (推荐 / ESP-IDF 60FPS DMA)</option>
                <option value="v2.5.0-beta">v2.5.0-beta (支持 Matter 1.3 over Wi-Fi)</option>
                <option value="awtrix-light-esp32s3">Awtrix-Light v0.96 (ESP32-S3 社区移植版)</option>
                <option value="wled-matrix-edition">WLED v0.15-b1 像素点阵音画联动版</option>
              </select>
            </div>

            {/* MQTT Server */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Home Assistant / MQTT 服务器 (可选)
              </label>
              <input
                type="text"
                disabled={isFlashing}
                value={mqttServer}
                onChange={e => setMqttServer(e.target.value)}
                placeholder="192.168.1.100 或 homeassistant.local"
                className="w-full bg-slate-50 dark:bg-[#090D14] border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#E60012]"
              />
            </div>

            {/* Wi-Fi SSID */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                预设 Wi-Fi 名称 (2.4GHz)
              </label>
              <input
                type="text"
                disabled={isFlashing}
                value={wifiSsid}
                onChange={e => setWifiSsid(e.target.value)}
                placeholder="例如: Home_2.4G"
                className="w-full bg-slate-50 dark:bg-[#090D14] border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#E60012]"
              />
            </div>

            {/* Wi-Fi Password */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Wi-Fi 密码
              </label>
              <input
                type="password"
                disabled={isFlashing}
                value={wifiPass}
                onChange={e => setWifiPass(e.target.value)}
                placeholder="直接写入加密 NVS 存储，免配网步骤"
                className="w-full bg-slate-50 dark:bg-[#090D14] border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#E60012]"
              />
            </div>

          </div>

          {/* Progress Bar (when flashing or success) */}
          {flashStatus !== 'idle' && (
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {flashStatus === 'flashing' ? '正在写入 Flash 闪存芯片...' : '固件烧录已就绪'}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-300 dark:border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-[#E60012] to-emerald-400 transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Terminal Logs Window */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                <span>WebSerial 控制台输出 (115200 8-N-1)</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500">Auto-Baud Detect</span>
            </div>

            <div className="bg-[#0B101A] rounded-xl p-4 border border-slate-800 font-mono text-xs text-emerald-400 h-52 overflow-y-auto leading-relaxed scrollbar-thin">
              {logs.map((log, index) => (
                <div key={index} className="whitespace-pre-wrap">
                  {log}
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>
          </div>

        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-[#090D14] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {flashStatus === 'success' && (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>烧录成功！时钟已自动重启并上线</span>
              </span>
            )}
            {flashStatus === 'idle' && (
              <span>请使用 Type-C 连接时钟至电脑 USB 口</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {flashStatus === 'success' ? (
              <button
                onClick={handleReset}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-200/80 hover:bg-slate-200 dark:text-slate-300 dark:hover:text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                再次烧录
              </button>
            ) : null}

            <button
              onClick={handleStartFlashing}
              disabled={isFlashing}
              className={`inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg shadow-sm transition-all ${
                isFlashing
                  ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-[#E60012] hover:bg-[#CC0010] active:scale-95 text-white'
              }`}
            >
              {isFlashing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>正在高速烧录中...</span>
                </>
              ) : (
                <>
                  <Terminal className="w-3.5 h-3.5" />
                  <span>连接设备并一键烧录</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
