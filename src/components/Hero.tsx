import React from 'react';
import { Terminal, Cpu, Sparkles, ArrowRight, ShieldCheck, Flame, Radio, Github, Star, ExternalLink } from 'lucide-react';
import { useGitHubStar } from '../context/GitHubStarContext';

interface HeroProps {
  onOpenFlasher: () => void;
  onExploreSimulator: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenFlasher, onExploreSimulator }) => {
  const { formattedStars, isStarred, toggleStar } = useGitHubStar();

  return (
    <section id="overview" className="relative min-h-[90vh] flex items-center pt-8 pb-16 overflow-hidden bg-tech-grid">
      {/* Background radial gradient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-[#E60012]/15 via-transparent to-transparent blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Product Positioning & Headlines */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            
            {/* Unboxed Metadata Kicker (Anti-slop zero-pill discipline) */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#E60012] tracking-wider uppercase mb-4">
              <span>Espressif AIoT Open Hardware</span>
              <span aria-hidden="true">·</span>
              <span>ESP32-S3 旗舰智能底座</span>
              <span aria-hidden="true">·</span>
              <span>v2.4.0 稳定发行版</span>
            </div>

            {/* Display Headline (Compact elegant sizing) */}
            <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.2] font-display text-balance mb-6">
              不止于时间，<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E60012] via-[#EA580C] to-[#F59E0B]">
                桌面上的流光点阵艺术
              </span>
            </h1>

            {/* Value Proposition */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed mb-6 max-w-xl">
              以乐鑫 ESP32-S3 双核高算力芯片为心脏，搭载经典 8×32（256 颗独立全彩 LED）横向点阵屏。支持 NTP 毫秒级无线授时、Home Assistant 智能家居中枢联动、32 段音频频谱律动与全功能开源 Web 固件生态。
            </p>

            {/* Social Proof & Community Metrics Strip */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600 dark:text-slate-400 mb-8 font-mono">
              <a
                href="https://github.com/espressif"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors group"
              >
                <Github className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                <span className="font-bold text-slate-900 dark:text-white tabular-nums flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  {formattedStars}
                </span>
                <span className="text-slate-500 dark:text-slate-400 group-hover:underline">GitHub Stars</span>
              </a>

              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>

              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">480+</span>
                <span>Forks</span>
              </div>

              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>

              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">1,200+</span>
                <span>活跃在线设备</span>
              </div>
            </div>

            {/* Primary Action Row */}
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto mb-8">
              <button
                onClick={onOpenFlasher}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#E60012] hover:bg-[#CC0010] active:scale-95 rounded-xl shadow-lg shadow-red-950/20 dark:shadow-red-950/60 transition-all duration-150 whitespace-nowrap"
              >
                <Terminal className="w-4 h-4" />
                <span>WebSerial 固件一键烧录</span>
              </button>

              <button
                onClick={onExploreSimulator}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 shadow-sm dark:text-slate-200 dark:hover:text-white dark:bg-slate-800/90 dark:hover:bg-slate-700/90 dark:border-slate-700 rounded-xl transition-all duration-150 whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4 text-[#E60012]" />
                <span>在线体验像素工作台</span>
              </button>

              {/* Interactive GitHub Star Action Button */}
              <button
                onClick={toggleStar}
                title={isStarred ? "已在 GitHub 点亮 Star（点击取消）" : "在 GitHub 为 ESP-PixelMatrix 点亮 Star"}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-xl border transition-all duration-150 whitespace-nowrap ${
                  isStarred
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-400 shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800/90 dark:hover:bg-slate-700/90 dark:border-slate-700 dark:text-slate-200 shadow-xs'
                }`}
              >
                <Github className="w-4 h-4" />
                <span className="font-semibold">{isStarred ? 'Starred' : 'Star'}</span>
                <span className="inline-flex items-center gap-1 pl-2 border-l border-slate-300 dark:border-slate-700 font-mono text-xs tabular-nums font-bold">
                  <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-400 text-amber-400' : 'text-amber-500'}`} />
                  {formattedStars}
                </span>
              </button>
            </div>

            {/* Unboxed Hardware Specifications Strip (Zero-Pill clean typography) */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800/80 w-full flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <span className="text-slate-900 dark:text-slate-200 font-semibold">ESP32-S3 双核 240MHz</span>
              <span aria-hidden="true" className="text-slate-400 dark:text-slate-600">/</span>
              <span>16MB Flash + 8MB PSRAM</span>
              <span aria-hidden="true" className="text-slate-400 dark:text-slate-600">/</span>
              <span>DMA 硬件双缓冲 60FPS</span>
              <span aria-hidden="true" className="text-slate-400 dark:text-slate-600">/</span>
              <span>Wi-Fi 4 + BLE 5.0 Mesh</span>
            </div>

          </div>

          {/* Right Column: Hero Hardware Presentation Visual */}
          <div className="lg:col-span-6 relative">
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl bg-slate-900 group">
              
              {/* Product Photo Generated via generate_image */}
              <img
                src="/src/assets/images/hero_esp32_pixel_clock_1790659606194.jpg"
                alt="ESP32 智能像素时钟在桌面环境的实物展示，64x64彩色像素矩阵透射出温润柔和的光泽"
                className="w-full h-auto object-cover aspect-[16/10] transition-transform duration-700 group-hover:scale-[1.02]"
                referrerPolicy="no-referrer"
              />

              {/* Scrim Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#090D14] via-transparent to-transparent opacity-80" />

              {/* Floating Engineering Badges */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs font-mono text-slate-300">
                <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-700/80 backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>NTP 同步: 实时 100% 毫秒锁相</span>
                </div>
                <div className="bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-700/80 backdrop-blur-md text-slate-300">
                  <span>8×32 WS2812B · 雾面亚克力</span>
                </div>
              </div>
            </div>

            {/* Subtle glow behind card */}
            <div className="absolute -inset-1 bg-gradient-to-r from-[#E60012]/20 to-orange-500/10 rounded-2xl blur-xl -z-10" />
          </div>

        </div>
      </div>
    </section>
  );
};
