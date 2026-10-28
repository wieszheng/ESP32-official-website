import React from 'react';
import { Cpu, Wifi, Waves, Thermometer, ShieldCheck, ArrowUpRight } from 'lucide-react';

export const CapabilitiesBento: React.FC = () => {
  return (
    <section id="ecosystem" className="py-20 bg-[#F8FAFC] dark:bg-[#090D14] relative transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-14">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#E60012] tracking-wider uppercase mb-3">
            <span>Hardware Capabilities & Architecture</span>
            <span aria-hidden="true">·</span>
            <span>Espressif Edge Engine</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight font-display mb-4">
            工业级芯片算力，赋能方寸像素艺术
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            摒弃传统单片机点阵屏的卡顿与重影。基于 ESP32-S3 架构深度优化，融合硬件 DMA 显示引擎、端侧音频算法与主流智能家居协议。
          </p>
        </div>

        {/* Asymmetric Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Double-wide Marquee Capability (col-span-2) */}
          <div className="md:col-span-2 bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 shadow-sm transition-all">
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-mono text-slate-400 dark:text-slate-500">01. COMPUTING & GRAPHICS PIPELINE</span>
              <div className="w-10 h-10 rounded-xl bg-[#E60012]/15 border border-[#E60012]/30 flex items-center justify-center text-[#E60012]">
                <Cpu className="w-5 h-5" />
              </div>
            </div>

            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 font-display">
              双核 Xtensa® LX7 芯片与 DMA 零拷贝图形引擎
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6 max-w-xl">
              主频高达 240MHz，具备专用矢量扩展指令（AI 硬件加速）。矩阵屏幕数据通过专用直接内存访问（DMA）通道高速推流，CPU 占用率低于 5%，保证复杂动画与 Wi-Fi 联网传输同时稳定运行，绝无肉眼可见的频闪与画面撕裂。
            </p>

            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-500 dark:text-slate-400">
              <div>
                <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">240 MHz</div>
                <div className="text-slate-500 dark:text-slate-500 text-[11px] mt-0.5">双核主控峰值频率</div>
              </div>
              <div>
                <div className="text-lg font-bold text-[#30D158] tabular-nums">60 FPS</div>
                <div className="text-slate-500 dark:text-slate-500 text-[11px] mt-0.5">HUB75 硬件高刷新率</div>
              </div>
              <div>
                <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">&lt; 5%</div>
                <div className="text-slate-500 dark:text-slate-500 text-[11px] mt-0.5">显示总线 CPU 负载</div>
              </div>
            </div>
          </div>

          {/* Card 2: AIoT Smart Home Hub (col-span-1) */}
          <div className="bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex flex-col justify-between group hover:border-slate-300 dark:hover:border-slate-700 shadow-sm transition-all">
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-mono text-slate-400 dark:text-slate-500">02. IOT CONNECTIVITY</span>
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500 dark:text-blue-400">
                  <Wifi className="w-5 h-5" />
                </div>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 font-display">
                全域智能家居与云端数据看板
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                原生支持 Home Assistant 实体自动发现，MQTT 双向通讯与 ESP-NOW 本地私有无路由组网。时钟可直接作为智能家居通知屏或温湿度传感器节点。
              </p>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1.5 font-mono">
              <div className="flex items-center justify-between">
                <span>Home Assistant MQTT:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">自动组网</span>
              </div>
              <div className="flex items-center justify-between">
                <span>NTP 时钟校准精度:</span>
                <span className="text-slate-900 dark:text-white font-medium">±2ms</span>
              </div>
            </div>
          </div>

          {/* Card 3: Audio Spectrum FFT Visualizer (col-span-1) */}
          <div className="bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex flex-col justify-between group hover:border-slate-300 dark:hover:border-slate-700 shadow-sm transition-all">
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-mono text-slate-400 dark:text-slate-500">03. AUDIO SPECTRUM</span>
                <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-500 dark:text-orange-400">
                  <Waves className="w-5 h-5" />
                </div>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 font-display">
                I2S 双硅麦拾音与 32 段硬件 FFT 律动
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                内置 Knowles 驻极体数字 MEMS 硅麦克风与 MAX98357A 功放，利用 ESP32-S3 浮点协处理器实时计算声波频段，随桌面音乐或人声即时舞动。
              </p>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1.5 font-mono">
              <div className="flex items-center justify-between">
                <span>音频采样率:</span>
                <span className="text-slate-900 dark:text-white font-medium">44.1kHz 16-bit</span>
              </div>
              <div className="flex items-center justify-between">
                <span>律动延迟:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">&lt; 15ms</span>
              </div>
            </div>
          </div>

          {/* Card 4: Environmental Monitoring & Lifestyle Integration (col-span-2) */}
          <div className="md:col-span-2 bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden grid grid-cols-1 sm:grid-cols-12 group hover:border-slate-300 dark:hover:border-slate-700 shadow-sm transition-all">
            <div className="p-8 sm:col-span-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-mono text-slate-400 dark:text-slate-500">04. AMBIENT SENSING</span>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 dark:text-emerald-400">
                    <Thermometer className="w-5 h-5" />
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 font-display">
                  环境微气候监测与无感自适应调光
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                  集成工业级 Sensirion SHT40 温湿度探头与高动态范围 BH1750 环境光敏芯片。白天高亮清晰吸睛，深夜自动切换柔和微光夜灯，全天候守护桌面舒适度。
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-slate-500 dark:text-slate-400">
                <span className="text-slate-900 dark:text-white font-medium">测温精度 ±0.2°C</span>
                <span>·</span>
                <span className="text-slate-900 dark:text-white font-medium">湿度精度 ±1.8% RH</span>
                <span>·</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">无极调光</span>
              </div>
            </div>

            {/* Lifestyle Image in Card */}
            <div className="sm:col-span-5 relative min-h-[220px]">
              <img
                src="/src/assets/images/pixel_clock_lifestyle_1790659640775.jpg"
                alt="ESP32 像素时钟融入温馨现代极客书桌的实际场景"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-white dark:from-[#0E1524] via-transparent to-transparent opacity-80" />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
