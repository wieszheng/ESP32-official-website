import React, { useState } from 'react';
import { Layers, Cpu, Eye, Radio, Sparkles, HardDrive, CheckCircle2 } from 'lucide-react';
import explodedChassisImg from '../assets/images/exploded_hardware_chassis_1790659650678.jpg';
import hardwarePcbImg from '../assets/images/hardware_pcb_esp32_1790659625320.jpg';

interface ComponentDetail {
  id: string;
  name: string;
  shortName: string;
  specs: string;
  pins: string;
  description: string;
  category: string;
}

const HARDWARE_COMPONENTS: ComponentDetail[] = [
  {
    id: 'soc',
    name: 'ESP32-S3-WROOM-1 模组',
    shortName: 'ESP32-S3',
    specs: '双核 240MHz / 16MB SPI Flash / 8MB Octal PSRAM',
    pins: 'GPIO 0-48, 专用 I2S, QSPI, TWAI(CAN), USB-OTG',
    description: '核心算力基石。搭载乐鑫专为 AIoT 与多媒体设计的双核 Xtensa® LX7 芯片，内置专用向量加速指令集，为点阵平滑变换算法与快速傅里叶变换提供澎湃算力。',
    category: '核心处理器',
  },
  {
    id: 'display',
    name: '8×32 黄金比例全彩 LED 点阵屏',
    shortName: '8×32 RGB 矩阵',
    specs: '256 颗独立全彩 LED / 8×32 标准条屏 / 高刷驱动',
    pins: 'DIN (GPIO 4), CLK, VCC 5V, GND (支持级联扩展至 8×64)',
    description: '采用高对比度黑面封装工艺，点间距 3.0mm，由 8 行 × 32 列共 256 颗高亮 RGB 像素组成。配合 ESP32-S3 专用 DMA 显示引擎，支持每秒 60 帧无闪烁硬件刷新，色彩过渡自然温润。',
    category: '显示子系统',
  },
  {
    id: 'optics',
    name: '多层光学扩散与蜂窝防串光滤镜',
    shortName: '光学滤镜',
    specs: '2.5mm 雾面哑光熏黑亚克力 + 3D 打印独立像素隔离格栅',
    pins: '物理光学隔绝结构',
    description: '解决传统点阵屏刺眼与像素泛光问题。定制光学级微珠漫反射亚克力将点状高亮发光点均匀雾化为温润方块像素，蜂窝格栅实现 0 串光边缘。',
    category: '光学工程',
  },
  {
    id: 'sensors',
    name: 'Sensirion SHT40 工业级温湿度探头',
    shortName: '微气候感知',
    specs: '测温精度 ±0.2°C / 测湿精度 ±1.8% RH / I2C 接口',
    pins: 'SDA (GPIO 41), SCL (GPIO 42)',
    description: '来自瑞士原装高精度数字温湿度芯片，外加 BH1750 环境光敏芯片，为桌面环境提供精准无误的微气象数据与无级自适应背光调节。',
    category: '传感器矩阵',
  },
  {
    id: 'audio',
    name: 'I2S 音频架构与 3W 腔体扬声器',
    shortName: '音频子系统',
    specs: 'MAX98357A Class-D 功放 + Knowles MEMS 硅麦',
    pins: 'BCLK (GPIO 14), LRC (GPIO 15), DOUT (GPIO 16)',
    description: '真正硬件级数字音频路径。内置驻极体微机电麦克风用于桌面拾音律动，独立低阻抗高保真音腔提供清脆的番茄钟整点报时与自然白噪音。',
    category: '音频与交互',
  },
  {
    id: 'power',
    name: 'USB-C 全功能供电与自动烧录电路',
    shortName: '供电与接口',
    specs: 'Type-C 5V/3A 稳压输入 + CH343P 高速串口 + TVS 静电防护',
    pins: 'CC1/CC2 5.1k 下拉, D+/D- USB 2.0 Full Speed',
    description: '完备的电源瞬态抑制与自恢复保险丝设计。集成 DTR/RTS 自动电平切换电路，插上电脑即可通过 Chrome / Edge 浏览器一键烧录，免按按键即可自动重启。',
    category: '电源与通信',
  },
];

export const HardwareDeepDive: React.FC = () => {
  const [activeComponent, setActiveComponent] = useState<ComponentDetail>(HARDWARE_COMPONENTS[0]);

  return (
    <section id="hardware" className="py-20 bg-slate-50 dark:bg-[#0B101A] border-t border-slate-200 dark:border-white/10 relative transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#E60012] tracking-wider uppercase mb-3">
            <span>Hardware Teardown & Schematics</span>
            <span aria-hidden="true">·</span>
            <span>乐鑫硬件开源解构</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight font-display mb-4">
            精密硬件拓扑，层层通透可见
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-300">
            从 PCB 走线、双核计算引擎到多层物理光学扩散层。点击下方模块即可查看其电气指标与引脚映射。
          </p>
        </div>

        {/* Visual Showcase: Exploded CAD view and PCB Macro shot */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-12">
          
          {/* Left: Exploded Chassis CAD visual */}
          <div className="lg:col-span-7 bg-white dark:bg-[#090D14] rounded-2xl border border-slate-200 dark:border-slate-800 p-3 relative overflow-hidden shadow-xl">
            <div className="relative rounded-xl overflow-hidden aspect-[16/10]">
              <img
                src={explodedChassisImg}
                alt="ESP32 像素时钟硬件爆炸图 CAD 渲染，展示亚克力面板、蜂窝格栅、LED 点阵板与铝合金机身"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 text-xs font-mono text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#E60012]" />
                <span>分层光学与结构解构图 · 铝合金 CNC 阳极机身</span>
              </div>
            </div>
          </div>

          {/* Right: Macro PCB close-up */}
          <div className="lg:col-span-5 bg-white dark:bg-[#090D14] rounded-2xl border border-slate-200 dark:border-slate-800 p-3 relative overflow-hidden shadow-xl">
            <div className="relative rounded-xl overflow-hidden aspect-[4/3]">
              <img
                src={hardwarePcbImg}
                alt="ESP32-S3 核心控制板沉金 PCB 高清微距实拍，元器件焊点工整，工业美感"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 text-xs font-mono text-slate-200 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#E60012]" />
                <span>沉金 ENIG 4 层高频阻抗控制 PCB</span>
              </div>
            </div>
          </div>

        </div>

        {/* Interactive Component Inspector Box */}
        <div className="bg-white dark:bg-[#0E1524] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm transition-colors duration-200">
          
          {/* Segmented Selectors */}
          <div className="mb-6 flex flex-wrap gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
            {HARDWARE_COMPONENTS.map(comp => (
              <button
                key={comp.id}
                onClick={() => setActiveComponent(comp)}
                className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                  activeComponent.id === comp.id
                    ? 'bg-[#E60012] text-white shadow-md shadow-red-950/20 dark:shadow-red-950/40'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-900/90 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
                }`}
              >
                {comp.shortName}
              </button>
            ))}
          </div>

          {/* Active Component Detail View */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-8">
              <div className="flex items-center gap-2 text-xs font-mono text-[#E60012] mb-1">
                <span>{activeComponent.category}</span>
                <span>/</span>
                <span>HARDWARE VERIFIED</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 font-display">
                {activeComponent.name}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                {activeComponent.description}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 font-mono text-xs">
                <div>
                  <div className="text-slate-500 dark:text-slate-500 mb-1 text-[11px]">关键电气指标:</div>
                  <div className="text-slate-900 dark:text-white font-medium">{activeComponent.specs}</div>
                </div>
                <div>
                  <div className="text-slate-500 dark:text-slate-500 mb-1 text-[11px]">ESP32-S3 核心管脚定义:</div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-medium">{activeComponent.pins}</div>
                </div>
              </div>
            </div>

            <div className="md:col-span-4 bg-slate-50 dark:bg-slate-950/80 rounded-xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white mb-3">工程标准与认证</div>
                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2.5 font-mono">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <span>RoHS 2.0 环保无铅焊接工艺</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <span>ESD ±15kV 接触放电防护</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <span>4 层阻抗匹配 RF 射频微带线</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <span>完全遵循开源硬件 (OSHW) 准则</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
                支持在 KiCad 8.0 中直接打开完整原理图与布线工程。
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
