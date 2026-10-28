import React, { useState } from 'react';
import { Terminal, Code, Copy, Check, ExternalLink, Cpu, BookOpen } from 'lucide-react';

interface CodeSnippet {
  id: string;
  name: string;
  lang: string;
  filename: string;
  code: string;
}

const SNIPPETS: CodeSnippet[] = [
  {
    id: 'idf',
    name: 'ESP-IDF (C/C++)',
    lang: 'c',
    filename: 'main/esp_pixel_matrix_dma.c',
    code: `// Espressif IoT Development Framework (ESP-IDF v5.4+)
#include "esp_log.h"
#include "led_strip.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#define MATRIX_WIDTH   32
#define MATRIX_HEIGHT  8
#define TOTAL_PIXELS   (MATRIX_WIDTH * MATRIX_HEIGHT) // 256 LEDs

static const char *TAG = "ESP_8X32_PIXEL";

void app_main(void)
{
    ESP_LOGI(TAG, "Initializing 8x32 WS2812B/HUB75 Matrix via ESP32-S3 DMA RMT...");
    
    // Allocate framebuffer for 256 RGB pixels
    led_strip_handle_t led_strip;
    led_strip_config_t strip_config = {
        .strip_gpio_num = 4,
        .max_leds = TOTAL_PIXELS,
    };
    led_strip_rmt_config_t rmt_config = {
        .resolution_hz = 10 * 1000 * 1000, // 10MHz
    };
    ESP_ERROR_CHECK(led_strip_new_rmt_device(&strip_config, &rmt_config, &led_strip));

    ESP_LOGI(TAG, "8x32 DMA Matrix running at 60 FPS. Starting NTP Sync Task...");
    xTaskCreatePinnedToCore(ntp_clock_task, "ntp_task", 4096, NULL, 5, NULL, 1);
}`,
  },
  {
    id: 'arduino',
    name: 'Arduino (C++)',
    lang: 'cpp',
    filename: 'Esp32PixelClock.ino',
    code: `#include <WiFi.h>
#include <FastLED.h>
#include <time.h>

#define NUM_LEDS 256
#define DATA_PIN 4
#define MATRIX_WIDTH 32
#define MATRIX_HEIGHT 8

CRGB leds[NUM_LEDS];

void setup() {
  Serial.begin(115200);
  
  // Initialize FastLED for 8x32 WS2812B Matrix
  FastLED.addLeds<WS2812B, DATA_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(85);

  // NTP Time Synchronization
  configTime(8 * 3600, 0, "pool.ntp.org", "time.asia.apple.com");
  Serial.println("ESP32-S3 8x32 Pixel Matrix Initialized!");
}

void loop() {
  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) {
    // Render 8x32 time & animated status icon
    drawClockFrame(timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
    FastLED.show();
  }
  delay(50);
}`,
  },
  {
    id: 'ha',
    name: 'Home Assistant',
    lang: 'yaml',
    filename: 'configuration.yaml',
    code: `# Home Assistant MQTT Integration
mqtt:
  light:
    - name: "ESP32 像素时钟主屏"
      unique_id: "esp32_pixel_matrix_screen"
      command_topic: "esp_pixel/matrix/set"
      state_topic: "esp_pixel/matrix/state"
      brightness_command_topic: "esp_pixel/matrix/brightness/set"
      brightness_state_topic: "esp_pixel/matrix/brightness/state"
      rgb_command_topic: "esp_pixel/matrix/rgb/set"
      rgb_state_topic: "esp_pixel/matrix/rgb/state"
      schema: json
      optimistic: false

  sensor:
    - name: "桌面环境温度"
      unique_id: "esp32_pixel_temp"
      state_topic: "esp_pixel/sensor/sht40"
      unit_of_measurement: "°C"
      value_template: "{{ value_json.temperature }}"
    - name: "桌面环境湿度"
      unique_id: "esp32_pixel_humidity"
      state_topic: "esp_pixel/sensor/sht40"
      unit_of_measurement: "%"
      value_template: "{{ value_json.humidity }}"`,
  },
  {
    id: 'mqtt',
    name: 'REST / MQTT API',
    lang: 'json',
    filename: 'api_payload.json',
    code: `// POST http://esp-pixel.local/api/notify
// 或发布至 MQTT Topic: esp_pixel/notify
{
  "event": "notification",
  "priority": "high",
  "duration_sec": 5,
  "vibrate": false,
  "sound": "ding_8bit",
  "display": {
    "icon": "github_commit",
    "text": "PR #42 Merged!",
    "color": "#30D158",
    "background": "#000000",
    "transition": "slide_left",
    "speed_ms": 30
  }
}`,
  },
];

interface DeveloperHubProps {
  onOpenFlasher: () => void;
}

export const DeveloperHub: React.FC<DeveloperHubProps> = ({ onOpenFlasher }) => {
  const [activeTab, setActiveTab] = useState<string>('idf');
  const [copied, setCopied] = useState<boolean>(false);

  const activeSnippet = SNIPPETS.find(s => s.id === activeTab) || SNIPPETS[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeSnippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="developer" className="py-20 bg-[#F8FAFC] dark:bg-[#090D14] relative transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#E60012] tracking-wider uppercase mb-3">
              <span>Developer SDK & Firmware Ecosystem</span>
              <span aria-hidden="true">·</span>
              <span>Open Source SDK</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight font-display mb-3">
              多平台固件与低代码开发生态
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-300 max-w-2xl">
              提供原厂 ESP-IDF 高性能固件、Arduino 极简示例库以及 WebSerial 网页免驱动一键在线烧录。无缝接入已有 IoT 资产。
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenFlasher}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#E60012] hover:bg-[#CC0010] rounded-lg transition-colors shadow-sm whitespace-nowrap"
            >
              <Terminal className="w-4 h-4" />
              <span>启动 WebSerial 烧录器</span>
            </button>
          </div>
        </div>

        {/* Code Tabs Container */}
        <div className="bg-[#0B101A] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl">
          
          {/* Tabs Header */}
          <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 gap-4">
            <div className="flex items-center gap-1.5">
              {SNIPPETS.map(snippet => (
                <button
                  key={snippet.id}
                  onClick={() => setActiveTab(snippet.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === snippet.id
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  {snippet.name}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-400 hidden sm:inline">
                {activeSnippet.filename}
              </span>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">已复制代码</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>复制代码</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Code Body */}
          <div className="p-6 font-mono text-xs sm:text-sm text-slate-300 overflow-x-auto leading-relaxed max-h-[460px] scrollbar-thin bg-black/40">
            <pre>
              <code>{activeSnippet.code}</code>
            </pre>
          </div>

          {/* Footer of code card */}
          <div className="px-6 py-3 bg-slate-900/90 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>官方支持: ESP-IDF v5.1+, Arduino-ESP32 v3.0+, MicroPython v1.23+</span>
            </div>
            <a
              href="https://github.com/espressif"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white flex items-center gap-1 text-[#E60012]"
            >
              <span>查看完整 GitHub 固件源码</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

        </div>

      </div>
    </section>
  );
};
