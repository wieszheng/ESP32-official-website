import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: '为什么选用 ESP32-S3 双核芯片，而不是老款 ESP8266 或经典 ESP32？',
    a: '64×64 RGB 点阵屏拥有多达 4096 颗独立全彩 LED。若采用传统单核单片机，在 60FPS 高刷推流时会导致 CPU 占用率接近 100%，极易造成 Wi-Fi 断连或动画掉帧。ESP32-S3 拥有专用的 DMA（直接内存访问）通道与 240MHz 双核 Xtensa LX7 处理器，能够由硬件 DMA 独立负责向 HUB75 屏幕灌送像素流，双核核心得以全速处理 MQTT 消息、声波 FFT 音频解算与传感器数据采集。',
  },
  {
    q: '时钟屏幕肉眼观看是否会有刺眼或频闪（PWM 闪烁）现象？',
    a: '完全不会。硬件层搭载了定制的 2.5mm 光学级微珠漫反射熏黑亚克力透镜与 3D 打印单像素防串光隔离格栅，将刺眼的点光源转化为柔和温润的方形方块像元；驱动固件采用 I2S/DMA 高频调制，刷新率稳定在 60Hz~120Hz，即便使用手机慢动作相机录制也不会产生水波纹与扫描条纹。',
  },
  {
    q: '如何与现有的 Home Assistant 智能家居系统或 Node-RED 联动？',
    a: '固件内置 Home Assistant MQTT 实体自动发现协议（MQTT Auto-Discovery）。时钟在初次连入局域网 MQTT Broker 后，会自动在 Home Assistant 中注册为一个可调光/调色的 RGB Light 实体，以及若干个传感器实体（当前温度、湿度、环境亮度）。你可以通过自动化脚本将门铃通知、洗衣机洗完提醒或家庭用电功率直接投屏显示。',
  },
  {
    q: '遇到网络断开或没有 Wi-Fi 路由器的场景，时钟还能正常走时吗？',
    a: '可以。ESP32-S3 内部集成精准的 32.768kHz RTC 时钟晶振，在初次联网成功完成 NTP 毫秒级授时对时后，若网络发生波动或断线，硬件 RTC 协处理器会自动接管走时计数，结合温漂补偿算法，每月时钟误差小于 15 秒。',
  },
  {
    q: '如何自行设计或修改固件？是否需要专用烧录器？',
    a: '不需要专用下载器或 JTAG 工具。板载集成了高集成度 CH343P USB-UART 转换芯片与 DTR/RTS 自动下载电路。只需使用一根标准 Type-C 数据线连入电脑，便可在 Chrome / Edge 浏览器中使用本站的 WebSerial 页面一键刷机，或者在 VSCode 中通过 PlatformIO / ESP-IDF 插件直接进行断点调试与编译。',
  },
];

export const FAQSection: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section className="py-20 bg-slate-50 dark:bg-[#0B101A] border-t border-slate-200 dark:border-white/10 relative transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#E60012] tracking-wider uppercase mb-3">
            <span>Frequently Asked Questions</span>
            <span aria-hidden="true">·</span>
            <span>答疑与技术细节</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight font-display mb-3">
            常见问题与硬件解答
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-300">
            涵盖芯片选型、光学设计、智能家居自动化与开发者刷机指南。
          </p>
        </div>

        {/* Accordions */}
        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="bg-white dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition-colors"
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full py-4 px-6 text-left flex items-center justify-between text-sm sm:text-base font-semibold text-slate-900 dark:text-white hover:text-[#E60012] transition-colors"
                >
                  <span className="pr-4">{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180 text-[#E60012]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200 dark:border-slate-800/60 font-sans">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
