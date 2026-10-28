import React from 'react';
import { Check, Minus } from 'lucide-react';

interface SpecRow {
  parameter: string;
  standard: string;
  pro: string;
  highlight?: boolean;
}

const SPEC_DATA: SpecRow[] = [
  {
    parameter: '主控芯片 (SoC)',
    standard: 'ESP32-C3 单核 RISC-V @ 160MHz',
    pro: 'ESP32-S3 双核 Xtensa® LX7 @ 240MHz (AI 指令加速)',
    highlight: true,
  },
  {
    parameter: '片上存储组合',
    standard: '4MB Flash + 400KB SRAM',
    pro: '16MB Quad SPI Flash + 8MB Octal PSRAM (超大缓存)',
    highlight: true,
  },
  {
    parameter: '点阵分辨率与工艺',
    standard: '8×32 (256 像素) / WS2812B 柔性柔光点阵屏',
    pro: '8×32 Pro (256 像素沉金黑面板 / 支持双联扩展 8×64)',
    highlight: true,
  },
  {
    parameter: '硬件刷新率与总线',
    standard: '30 FPS (软件定时中断)',
    pro: '60 FPS (硬件 DMA 零拷贝通道)',
    highlight: true,
  },
  {
    parameter: '无线通信能力',
    standard: 'Wi-Fi 4 (802.11 b/g/n) + BLE 5.0',
    pro: 'Wi-Fi 4 + BLE 5.0 Mesh + ESP-NOW 本地私网',
  },
  {
    parameter: '音频交互子系统',
    standard: '无源蜂鸣器 (滴滴整点提示)',
    pro: 'Knowles MEMS 硅麦 + MAX98357A I2S 功放 + 3W 腔体喇叭',
  },
  {
    parameter: '声波律动 FFT 运算',
    standard: '不支持',
    pro: '32 段实时硬件快速傅里叶声波频段运算 (<15ms 延迟)',
  },
  {
    parameter: '环境感知传感器',
    standard: '基础光敏电阻 (LDR)',
    pro: 'Sensirion SHT40 工业级温湿度 + BH1750 16-bit 光照计',
  },
  {
    parameter: '外壳工艺与材质',
    standard: 'PLA 环保 3D 打印磨砂外壳',
    pro: '6063 航空铝 CNC 阳极氧化机身 + 磁吸胡桃木实木背板',
  },
  {
    parameter: '光学滤镜配置',
    standard: '普通磨砂亚克力',
    pro: '2.5mm 光学级微珠漫反射防眩光亚克力 + 独立蜂窝隔离罩',
  },
  {
    parameter: '固件生态支持',
    standard: 'Awtrix-Light / ESPHome',
    pro: 'ESP-IDF 原生驱动 / Arduino / ESPHome / WLED 官方适配',
  },
  {
    parameter: '电源输入规格',
    standard: 'Type-C 5V / 1.5A',
    pro: 'Type-C 5V / 3.0A (支持 PD 诱骗快充协议与瞬态防浪涌)',
  },
];

export const SpecsTable: React.FC = () => {
  return (
    <section id="specs" className="py-20 bg-slate-50 dark:bg-[#0B101A] border-t border-slate-200 dark:border-white/10 relative transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#E60012] tracking-wider uppercase mb-3">
            <span>Hardware Specifications Comparison</span>
            <span aria-hidden="true">·</span>
            <span>硬件版本矩阵</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight font-display mb-4">
            精准规格参数与版本选型
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-300">
            无论是入门体验还是追求极致 60FPS 丝滑桌面信息站，提供满足不同场景与极客需求的硬件配置。
          </p>
        </div>

        {/* Specs Table */}
        <div className="bg-white dark:bg-[#090D14] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl transition-colors duration-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              
              {/* Table Head */}
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#0E1524]">
                  <th scope="col" className="py-4 px-6 font-semibold text-slate-700 dark:text-slate-300 w-1/4">
                    规格参数
                  </th>
                  <th scope="col" className="py-4 px-6 font-semibold text-slate-700 dark:text-slate-300 w-3/8">
                    <div className="text-slate-900 dark:text-white font-bold text-base">Standard 基础版</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal">适合轻量桌面时钟与天气</div>
                  </th>
                  <th scope="col" className="py-4 px-6 font-semibold text-slate-700 dark:text-slate-300 w-3/8 bg-[#E60012]/10 border-l border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="text-slate-900 dark:text-white font-bold text-base">Pro 极客旗舰版</div>
                      <span className="text-[11px] font-mono text-[#E60012] bg-[#E60012]/20 px-2 py-0.5 rounded border border-[#E60012]/40">
                        开发者首选
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal">ESP32-S3 双核 + 8×32 高刷 + 32段音频律动</div>
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 font-mono text-xs sm:text-sm">
                {SPEC_DATA.map((row, idx) => (
                  <tr 
                    key={idx} 
                    className={`hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors ${
                      row.highlight ? 'bg-slate-50/70 dark:bg-slate-900/20' : ''
                    }`}
                  >
                    <td className="py-3.5 px-6 text-slate-700 dark:text-slate-300 font-sans font-medium">
                      {row.parameter}
                    </td>
                    <td className="py-3.5 px-6 text-slate-600 dark:text-slate-400 tabular-nums">
                      {row.standard}
                    </td>
                    <td className="py-3.5 px-6 text-slate-900 dark:text-white font-medium bg-[#E60012]/5 border-l border-slate-200 dark:border-slate-800 tabular-nums">
                      {row.pro}
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        </div>

      </div>
    </section>
  );
};
