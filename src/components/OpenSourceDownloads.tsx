import React from 'react';
import { Download, FileCode, Box, Cpu, FileText, Github, ExternalLink, ShieldCheck, Star } from 'lucide-react';
import { useGitHubStar } from '../context/GitHubStarContext';

interface ResourceItem {
  title: string;
  category: string;
  size: string;
  desc: string;
  filename: string;
  icon: React.ReactNode;
}

const RESOURCES: ResourceItem[] = [
  {
    title: 'KiCad 8.0 原理图与 PCB 生产工程',
    category: '硬件电路 (EDACAD)',
    size: '14.2 MB',
    desc: '包含 4 层沉金阻抗控制 PCB 设计图、BOM 物料清单、SMT 坐标文件与 Gerber 打样文件。',
    filename: 'esp32_pixel_clock_v2.4_kicad.zip',
    icon: <Cpu className="w-5 h-5 text-[#E60012]" />,
  },
  {
    title: '3D 打印结构件与铝合金 CNC STEP 模型',
    category: '工业结构 (CAD)',
    size: '28.6 MB',
    desc: '包含防串光独立蜂窝光栅、倾角底座、磁吸背板 STL 与 STEP 格式高精度工业制造工程图。',
    filename: 'esp32_pixel_enclosure_cad.step',
    icon: <Box className="w-5 h-5 text-blue-400" />,
  },
  {
    title: '出厂预编译固件与分区镜像包',
    category: '固件镜像 (Firmware)',
    size: '4.8 MB',
    desc: '内含 bootloader.bin, partition-table.bin, nvs.bin 及全功能出厂校验固件，支持本地 esptool 烧录。',
    filename: 'esp_pixel_firmware_v2.4.0_release.bin',
    icon: <FileCode className="w-5 h-5 text-emerald-400" />,
  },
  {
    title: '硬件引脚定义与系统开发手册 (PDF)',
    category: '技术文档 (Datasheet)',
    size: '3.1 MB',
    desc: '详尽标注 ESP32-S3 GPIO 分配、I2S 音频时钟时序、HUB75 驱动时钟配置与常见故障排查指南。',
    filename: 'ESP-PixelMatrix_Hardware_Manual_v2.4.pdf',
    icon: <FileText className="w-5 h-5 text-amber-400" />,
  },
];

export const OpenSourceDownloads: React.FC = () => {
  const { formattedStars, isStarred, toggleStar } = useGitHubStar();

  const handleDownload = (filename: string) => {
    // Generate a simple simulated download trigger
    const blob = new Blob([`ESP-PixelMatrix Open Hardware Resource: ${filename}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="py-20 bg-[#F8FAFC] dark:bg-[#090D14] relative transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#E60012] tracking-wider uppercase mb-3">
              <span>Open Source Assets & CAD Resources</span>
              <span aria-hidden="true">·</span>
              <span>自由制造与二次开发</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight font-display mb-3">
              100% 开源硬件与工程文件下载
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-300 max-w-2xl">
              遵循 CERN-OHL-P 开源硬件许可协议。无论你想自制打样还是商业化二次开发，均可免费获取全套生产级工程资产。
            </p>
          </div>

          <a
            href="https://github.com/espressif"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 shadow-xs dark:text-white dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap group"
          >
            <Github className="w-4 h-4 text-slate-700 dark:text-slate-300 group-hover:scale-105 transition-transform" />
            <span>在 GitHub 上点亮 Star</span>
            <span className="inline-flex items-center gap-1 pl-2 border-l border-slate-300 dark:border-slate-700 font-mono text-xs tabular-nums text-slate-900 dark:text-white">
              <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-400 text-amber-400' : 'text-amber-500'}`} />
              {formattedStars}
            </span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>

        {/* Resources Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {RESOURCES.map((item, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-6 flex flex-col justify-between transition-all group shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                      {item.icon}
                    </div>
                    <div>
                      <span className="text-[11px] font-mono text-slate-500 block">
                        {item.category}
                      </span>
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        文件大小: {item.size}
                      </span>
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 font-display">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                  {item.desc}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500 truncate max-w-[200px]">
                  {item.filename}
                </span>

                <button
                  onClick={() => handleDownload(item.filename)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 dark:border-slate-700 dark:text-slate-200 dark:hover:text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>立即下载</span>
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
