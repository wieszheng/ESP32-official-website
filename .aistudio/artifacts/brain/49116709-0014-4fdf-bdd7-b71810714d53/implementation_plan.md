# AI 智能生成 8×32 像素帧动画功能设计与实现方案

为 ESP-PixelMatrix 智能时钟落地页的 8×32 像素工作台扩展 AI 智能生成能力。用户只需输入一段自然语言描述（如“篝火微风跳动”、“小猫奔跑”、“赛博霓虹声波”），Gemini 3.8 Flash 模型即在服务器端智能构思并生成 4~8 帧连续的 8×32 像素动画序列，支持时间轴实时播放、逐帧擦碰编辑以及一键导出适用于 Arduino/FastLED 与 ESP-IDF 的多帧 C++ 固件数组。

### User Review & Critical Decisions

> [!IMPORTANT]
> 根据前序交互调研，已明确并锁定以下关键产品决策：
> - **功能承载入口**：直接嵌入在现有的 8×32 像素工作台（Pixel Studio）内，保持官网沉浸式交互一致性，无多余全屏弹窗打扰；
> - **动画生成规格**：标准生成 4~8 帧循环点阵动画（默认 6 帧），提供播放/暂停、播放速率（FPS）调节与时间轴帧缩略图；
> - **预览与硬件导出**：支持网页端实时 60FPS 平滑循环预览、逐帧点击微调，并支持导出包含 `uint32_t PROGMEM anim_frames[N][8]` 的多帧 C++ 代码数组。

---

### 1. Overview & Core Concept

- **What It Does**: 访问者在像素工作台顶部输入文字提示词（Prompt）并点击“AI 生成动画”，服务器通过 Gemini 3.8 Flash 结构化生成包含指定帧数（4~8 帧）的 8×32 点阵动画数据。前端通过时间轴控制器自动循环播放，并在时钟矩阵屏与编辑画板间无缝同步。
- **Target Audience / Persona**: 极客硬件玩家、开源时钟自制者、ESP32 固件开发者，希望快速获得生动、轻量且可直接烧录进单片机的 8×32 像素逐帧动画。
- **Key Value**: 告别单片机开发者手动一行行手绘点阵字模的繁琐，借助生成式 AI 秒级生成可直接运行在单片机 DMA/RMT 驱动上的高效 32-bit 位宽 C++ 动画资源。

---

### 2. User Experience & Visual Design

#### A. Key User Flows
1. **启发提示与输入**：
   - 在 8×32 像素工作台内展开“AI 动画生成器”交互条；
   - 提供 4 个快速激发灵感的预设 Chip（如 `🔥 篝火跃动`、`👾 太空入侵者`、`❤️ 机械心律`、`🐱 8-Bit 像素奔跑`），同时支持自定义中文或英文自由描述。
2. **AI 生成状态反馈**：
   - 点击“AI 智能生成”后，生成按钮进入呼吸渐变加载态，时钟矩阵呈现科技感扫描跑马流水光效，提升极客等待趣味性。
3. **时间轴交互与播放控制**：
   - 生成完毕后自动加载至“时间轴播放器（Timeline Player）”；
   - 包含播放/暂停切换、FPS 调速滑块（2 FPS ~ 15 FPS）、循环指示；
   - 提供 4~8 个小尺寸帧缩略卡片，点击任意帧即可将其调入下方的 8×32 主画布进行二次手工修改；修改后即刻同步更新回该帧。
4. **单片机 C++ 代码即时导出**：
   - 代码导出窗口从单帧位图自动升级为“多帧连续动画数组”；
   - 包含帧数宏定义、延时推荐及单片机循环播放示例代码，一键复制即可粘贴到 Arduino IDE 或 ESP-IDF 工程中。

#### B. Visual Identity & Theme
- **色彩与风格**：延续经典的乐鑫绯红（`#E60012`）、琥珀暖金（`#F59E0B`）与暗夜极客黑（`#090D14` / `#0E1524`），配合亮色模式自适应柔和边框。
- **排版与控件**：时间轴缩略帧卡片采用精致像素边框与等宽数字编号；播放控制条紧凑嵌入画板操作区上方，严守抗 AI 浮夸设计的克制风格。

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: 全栈架构与服务端 Gemini API 代理**
  - *Chosen Approach*: 遵循系统安全规范与 `@google/genai` SDK 准则，使用 Express + Vite 中间件全栈服务（`server.ts`），由 `/api/generate-pixel-animation` 代理 Gemini 3.8 Flash 调用，API Key 严禁泄露至浏览器端。
  - *Why*: 保证 API 凭据绝对安全，同时可在服务端约束输出的 JSON Schema，防止模型输出格式溢出。
  - *Alternatives Considered*: 浏览器前端直连 Gemini API（严重违反 API Key 隔离与系统约束，坚决弃用）。

- **Decision 2: 8×32 位图数据契约（Bitmask Representation）**
  - *Chosen Approach*: 服务端让 Gemini 输出每帧 8 行、每行恰好 32 个字符的二值字符点阵串（`#` 代表亮起，`.` 代表熄灭），由前端解码为 32 位无符号整数（`uint32_t`）。
  - *Why*: 字符点阵不仅方便在前端画布中即时修改与渲染，且能够 100% 无损转换为单片机硬件常用的 32-bit 位宽宏数组，内存占用仅为 32 字节/帧，极度契合 ESP32-S3 的 SRAM 架构。

- **Decision 3: 时间轴与手工画板的双向绑定机制**
  - *Chosen Approach*: 时间轴播放器与现有 8×32 画板保持单向数据流与双向响应：播放时主屏随帧跳动；暂停或选中某帧时，该帧被激活为手工编辑帧，画笔绘制实时反映到该缩略帧中。

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Browser Frontend (React 19)                           │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │               InteractiveClockMatrix Component                      │   │
│   │                                                                     │   │
│   │  ┌───────────────────────┐         ┌─────────────────────────────┐  │   │
│   │  │ 8x32 Physical Display │ <───────│ Animation Timeline Player   │  │   │
│   │  │ (WS2812B/HUB75 Sim)   │         │ (Play/Pause, FPS, Scrubber) │  │   │
│   │  └───────────────────────┘         └─────────────────────────────┘  │   │
│   │             ▲                                     ▲                 │   │
│   │             │                                     │                 │   │
│   │  ┌───────────────────────┐         ┌─────────────────────────────┐  │   │
│   │  │ 8x32 Pixel Draw Grid  │ ◀───────┤ AI Prompt Generator Bar     │  │   │
│   │  │ (Manual touch-up)     │         │ (Prompt chips & Input)      │  │   │
│   │  └───────────────────────┘         └─────────────────────────────┘  │   │
│   │             │                                     │                 │   │
│   │             ▼                                     ▼                 │   │
│   │  ┌───────────────────────────────────────────────────────────────┐  │   │
│   │  │ Multi-Frame C++ Exporter (Arduino FastLED & ESP-IDF PROGMEM)  │  │   │
│   │  └───────────────────────────────────────────────────────────────┘  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼ POST /api/generate-pixel-animation   │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┼──────────────────────────────────────┐
│                                      ▼                                      │
│                       Express Full-Stack Server (server.ts)                 │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  POST /api/generate-pixel-animation                                 │   │
│   │  - Validates user prompt & frame count (4..8)                       │   │
│   │  - Instantiates GoogleGenAI with telemetry headers                  │   │
│   │  - Calls 'gemini-3.8-flash' with strict responseSchema JSON         │   │
│   │  - Returns { title, fps, frames: string[][] }                       │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### A. Data Model
```typescript
export interface AnimationTimelineData {
  title: string;
  fps: number;
  frames: string[][]; // Array of frames; each frame contains 8 strings of 32 characters ('.' or '#')
}
```

#### B. Server-Side Gemini API Request Strategy
- **模型选择**：选用 `gemini-3.8-flash`（高响应速率与出色的结构化代码/空间排布能力）；
- **JSON Schema**：强制约束返回格式：
  ```json
  {
    "title": "Animation Title",
    "recommendedFps": 6,
    "frames": [
      ["row0_32chars", "row1_32chars", ..., "row7_32chars"],
      ...
    ]
  }
  ```
- **内置 Fallback**：若网络离线或无 API Key 环境下，自动回退到内置的算法生成高保真动画序列（如“赛博像素篝火”或“脉动心率”），确保演示绝对可靠不崩溃。
