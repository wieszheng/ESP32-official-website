import React from 'react';
import { Cpu, Github, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-100 dark:bg-[#06090F] border-t border-slate-200 dark:border-slate-800/80 py-12 text-slate-600 dark:text-slate-400 text-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          {/* Brand Col */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-[#E60012]/15 border border-[#E60012]/40 flex items-center justify-center text-[#E60012]">
                <Cpu className="w-3.5 h-3.5" />
              </div>
              <span className="text-base font-bold text-slate-900 dark:text-white font-display">
                ESP-PixelMatrix
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed mb-4">
              基于乐鑫 ESP32-S3 双核架构的高性能开源智能像素时钟平台。为极客桌面与 AIoT 开发者打造。
            </p>
            <div className="text-[11px] text-slate-500 font-mono">
              Designed with Espressif Systems IoT Spirit
            </div>
          </div>

          {/* Col 2: Firmware & SDK */}
          <div>
            <div className="text-slate-900 dark:text-white font-semibold text-xs mb-3 font-display">固件与开发</div>
            <ul className="space-y-2">
              <li>
                <a href="#simulator" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  像素画板与模拟器
                </a>
              </li>
              <li>
                <a href="#developer" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  ESP-IDF 原生驱动
                </a>
              </li>
              <li>
                <a href="#developer" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  Arduino & FastLED 示例
                </a>
              </li>
              <li>
                <a href="#developer" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  Home Assistant MQTT 接入
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Hardware Resources */}
          <div>
            <div className="text-slate-900 dark:text-white font-semibold text-xs mb-3 font-display">硬件资源</div>
            <ul className="space-y-2">
              <li>
                <a href="#hardware" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  KiCad 原理图与 PCB 资料
                </a>
              </li>
              <li>
                <a href="#hardware" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  3D 打印与 CNC 结构图纸
                </a>
              </li>
              <li>
                <a href="#specs" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  硬件引脚管脚定义表
                </a>
              </li>
              <li>
                <a href="#specs" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  版本选型指南
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Community & Links */}
          <div>
            <div className="text-slate-900 dark:text-white font-semibold text-xs mb-3 font-display">生态社区</div>
            <ul className="space-y-2">
              <li>
                <a 
                  href="https://vision.espressif.com" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1 text-slate-700 dark:text-slate-300"
                >
                  <span>乐鑫官方 ESP-Vision</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                </a>
              </li>
              <li>
                <a 
                  href="https://github.com/espressif" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1"
                >
                  <span>GitHub 开源主页</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                </a>
              </li>
              <li>
                <a 
                  href="https://www.espressif.com/zh-hans/products/socs/esp32-s3" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1"
                >
                  <span>ESP32-S3 官方技术文档</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                </a>
              </li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-slate-200 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-4">
          <div>
            © 2026 ESP-PixelMatrix Community Project · Open Hardware Under CERN-OHL-P License
          </div>
          <div className="flex items-center gap-6">
            <span>Powered by ESP32-S3 Dual-Core LX7</span>
            <span>·</span>
            <span>NTP Synced ±2ms</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
