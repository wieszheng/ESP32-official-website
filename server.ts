import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Determine port: control-plane-api and AI Studio guidelines require port 3000 in dev
function getPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    return parseInt(process.argv[portArgIndex + 1], 10);
  }
  if (process.env.NODE_ENV !== 'production') {
    return 3000;
  }
  return Number(process.env.PORT) || 3000;
}

const PORT = getPort();

app.use(express.json());

// Initialize GoogleGenAI client with telemetry header
const getGenAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Algorithmic Fallback Multi-color Animations for 8x32
const generateFallbackAnimation = (prompt: string, requestedFrames: number = 6) => {
  const count = Math.min(8, Math.max(4, requestedFrames));
  const lower = prompt.toLowerCase();

  // 1. Fire / Campfire animation (Multi-color: Logs, Embers, Flame, Core, Sparks)
  if (lower.includes('火') || lower.includes('fire') || lower.includes('flame') || lower.includes('burn')) {
    const palette: Record<string, string> = {
      '.': '#000000',
      'B': '#8B4513', // Wood log brown
      'R': '#FF1A26', // Outer red flame
      'O': '#FF7700', // Mid orange flame
      'Y': '#FFD700', // Core golden yellow
      'W': '#FFFBE8', // Spark white/pale yellow
    };
    const frames: string[][] = [];
    for (let f = 0; f < count; f++) {
      const grid: string[] = [];
      for (let r = 0; r < 8; r++) {
        let rowStr = '';
        for (let c = 0; c < 32; c++) {
          const isCampfireArea = c >= 11 && c <= 20;
          if (!isCampfireArea) {
            rowStr += '.';
          } else {
            const height = 7 - r;
            const centerDist = Math.abs(c - 15.5);
            const flicker = Math.sin(f * 1.6 + c * 0.9) * 1.7 + Math.cos(f * 2.3 + r) * 1.1;
            const maxH = Math.max(1, 6 - centerDist * 0.9 + flicker);
            
            if (r === 7 && c >= 12 && c <= 19) {
              rowStr += 'B'; // log
            } else if (r === 6 && c >= 13 && c <= 18) {
              rowStr += 'R'; // hot embers base
            } else if (height <= maxH) {
              if (centerDist <= 1.2 && height <= 3) {
                rowStr += 'Y'; // core hot yellow
              } else if (centerDist <= 2.2) {
                rowStr += 'O'; // vibrant orange
              } else {
                rowStr += 'R'; // red flame edge
              }
            } else if (height === Math.floor(maxH + 1) && (f + c) % 3 === 0) {
              rowStr += 'W'; // floating spark
            } else {
              rowStr += '.';
            }
          }
        }
        grid.push(rowStr);
      }
      frames.push(grid);
    }

    const colorFrames = frames.map(fr => fr.map(row => row.split('').map(ch => ch === '.' ? '' : (palette[ch] || ''))));

    return {
      title: '流光跃动篝火 (Multi-Color Campfire)',
      recommendedFps: 6,
      palette,
      frames,
      colorFrames,
    };
  }

  // 2. Heartbeat rhythm (Multi-color: Ruby heart, Neon pink border, Cyan ECG wave)
  if (lower.includes('心') || lower.includes('heart') || lower.includes('love') || lower.includes('pulse')) {
    const palette: Record<string, string> = {
      '.': '#000000',
      'R': '#E60012', // Heart ruby red
      'P': '#FF4081', // Outer glow pink
      'W': '#FFFFFF', // Heart highlight white
      'C': '#00E5FF', // Cyan pulse wave
      'G': '#00FF88', // Green lead dot
    };
    const frames: string[][] = [];
    for (let f = 0; f < count; f++) {
      const pulse = f % 2 === 0;
      const heart = [
        '................................',
        pulse ? '..PP...PP.......................' : '................................',
        pulse ? '.PRRR.PRRP......................' : '...PP...PP......................',
        pulse ? '.PRWRPPRRP......................' : '..PRRPPRRP......................',
        pulse ? '..PRRRRRRP......................' : '...PRRRRRP......................',
        pulse ? '...PRRRRP.......................' : '....PRRRP.......................',
        pulse ? '....PRRP........................' : '.....PRP........................',
        '................................',
      ];
      // ECG trace wave moving across cols 17..31
      const offset = (f * 3) % 15;
      for (let r = 0; r < 8; r++) {
        const chars = heart[r].split('');
        for (let c = 16; c < 32; c++) {
          const ecgCol = c - 16;
          if (ecgCol === offset) {
            if (r === 2 || r === 5) chars[c] = 'G';
            if (r === 3 || r === 4) chars[c] = 'C';
          } else if (r === 4 && ecgCol >= 0 && ecgCol < 16) {
            chars[c] = 'C';
          }
        }
        heart[r] = chars.join('');
      }
      frames.push(heart);
    }

    const colorFrames = frames.map(fr => fr.map(row => row.split('').map(ch => ch === '.' ? '' : (palette[ch] || ''))));

    return {
      title: '赛博全彩机械心跳 (Neon Heart Pulse)',
      recommendedFps: 6,
      palette,
      frames,
      colorFrames,
    };
  }

  // 3. Default: Multi-Color Retro Arcade Pac-Man & Blinky
  const palette: Record<string, string> = {
    '.': '#000000',
    'Y': '#FFE600', // Pac-man yellow
    'R': '#FF0033', // Ghost red body
    'W': '#FFFFFF', // Ghost eye white
    'B': '#0044FF', // Ghost pupil blue
    'C': '#00E5FF', // Ghost cyan
    'O': '#FFA500', // Food pellet orange
  };
  const frames: string[][] = [];
  for (let f = 0; f < count; f++) {
    const grid: string[] = [];
    const shift = (f * 4) % 24;
    for (let r = 0; r < 8; r++) {
      let row = '';
      for (let c = 0; c < 32; c++) {
        const pacX = shift + 4;
        const dist = Math.sqrt((c - pacX) ** 2 + (r - 3.5) ** 2);
        
        // Pacman
        if (dist <= 3) {
          const isMouth = (f % 2 === 1) && (c >= pacX) && Math.abs(r - 3.5) <= 1.2;
          row += isMouth ? '.' : 'Y';
        }
        // Ghost behind pacman
        else if (c >= pacX - 9 && c <= pacX - 5 && r >= 1 && r <= 6) {
          // eyes
          if ((r === 2 || r === 3) && (c === pacX - 8 || c === pacX - 6)) {
            row += 'W';
          } else if (r === 3 && (c === pacX - 8 || c === pacX - 6)) {
            row += 'B';
          } else {
            row += (f % 2 === 0) ? 'R' : 'C';
          }
        }
        // Pellets in front of pacman
        else if (r === 3 && c > pacX + 2 && (c - pacX) % 3 === 0) {
          row += 'O';
        } else {
          row += '.';
        }
      }
      grid.push(row);
    }
    frames.push(grid);
  }

  const colorFrames = frames.map(fr => fr.map(row => row.split('').map(ch => ch === '.' ? '' : (palette[ch] || ''))));

  return {
    title: '全彩像素电玩吃豆人 (Multi-Color Arcade Pac-Man)',
    recommendedFps: 6,
    palette,
    frames,
    colorFrames,
  };
};

// API Endpoint: Check Gemini Model Status
app.get('/api/model-status', (_req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    connected: hasKey,
    model: 'gemini-2.5-flash',
    provider: 'Google Gemini AI',
    status: hasKey ? 'online' : 'no_key',
  });
});

// API Endpoint: Generate 8x32 Multi-Color Pixel Animation using Gemini
app.post('/api/generate-pixel-animation', async (req, res) => {
  const startTime = Date.now();
  try {
    const { prompt, frameCount = 6 } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const numFrames = Math.min(8, Math.max(4, Number(frameCount) || 6));
    const ai = getGenAIClient();

    // If Gemini client is unavailable (e.g. key missing), use fallback
    if (!ai) {
      console.warn('GEMINI_API_KEY not found. Using algorithmic generator.');
      const fallback = generateFallbackAnimation(prompt, numFrames);
      return res.json({
        ...fallback,
        isRealAI: false,
        model: 'algorithmic-fallback',
        latencyMs: Date.now() - startTime,
      });
    }

    const systemInstruction = `You are an elite retro 8x32 RGB LED matrix pixel artist and animator for the ESP32-S3 Pixel Clock.
The display matrix has EXACTLY 8 rows and 32 columns (Width = 32, Height = 8, 256 RGB pixels total).
You must generate a smooth, continuous looping pixel animation consisting of exactly ${numFrames} frames based on the user's prompt.

CRITICAL DESIGN REQUIREMENT:
- CANNOT BE MONOCHROME! MUST BE RICH MULTI-COLOR RGB PIXEL ART!
- Define a color palette of at least 4 to 8 distinct, vibrant HEX colors (#RRGGBB) specifically matching the prompt theme.
- Map each color to a unique single-character key (e.g. 'R' for #FF1A26, 'Y' for #FFD700, 'O' for #FF7700, 'G' for #00FF66, 'C' for #00E5FF, 'W' for #FFFFFF, 'B' for #8B4513, 'P' for #E040FB).
- '.' MUST ALWAYS represent unlit/background black (#000000).
- In each frame, use the palette characters to draw vibrant figures, highlights, shadows, and animated details across all 8 rows and 32 columns.
- Each frame MUST have EXACTLY 8 strings of EXACTLY 32 characters.
- Recommended FPS between 4 and 10.`;

    // Try reliable production models in priority order
    const candidateModels = ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    let lastError: any = null;
    let successfulModel = '';
    let parsed: any = null;

    for (const modelName of candidateModels) {
      try {
        console.log(`[Gemini] Attempting multi-color generation with model ${modelName} for: "${prompt}"...`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: `Design a vivid MULTI-COLOR (not monochrome!) 8x32 pixel animation with ${numFrames} sequential looping frames for: "${prompt}"`,
          config: {
            systemInstruction,
            temperature: 0.7,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: {
                  type: Type.STRING,
                  description: 'Vivid title of the multi-color animation in Chinese or English',
                },
                recommendedFps: {
                  type: Type.INTEGER,
                  description: 'Recommended playback FPS (between 4 and 10)',
                },
                palette: {
                  type: Type.ARRAY,
                  description: 'Palette mapping single character keys to RGB hex colors. MUST contain 3 to 8 distinct colors.',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      key: { type: Type.STRING, description: 'Single character key, e.g. R, Y, G, O, W, B' },
                      color: { type: Type.STRING, description: 'Hex color string e.g. #FF1A26' }
                    },
                    required: ['key', 'color']
                  }
                },
                frames: {
                  type: Type.ARRAY,
                  description: `Array of ${numFrames} frames. Each frame has 8 strings of 32 characters.`,
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.STRING,
                    },
                  },
                },
              },
              required: ['title', 'recommendedFps', 'palette', 'frames'],
            },
          },
        });

        const textOutput = response.text;
        if (textOutput) {
          parsed = JSON.parse(textOutput);
          successfulModel = modelName;
          console.log(`[Gemini] Multi-color generation succeeded with model ${modelName} in ${Date.now() - startTime}ms`);
          break;
        }
      } catch (err: any) {
        console.warn(`[Gemini] Model ${modelName} failed or unavailable:`, err.message || err);
        lastError = err;
      }
    }

    if (!parsed || !parsed.frames || parsed.frames.length === 0) {
      throw lastError || new Error('All Gemini models failed to generate response');
    }

    // Convert palette array to dictionary
    const paletteMap: Record<string, string> = { '.': '#000000' };
    if (Array.isArray(parsed.palette)) {
      for (const item of parsed.palette) {
        if (item.key && item.color) {
          paletteMap[item.key] = item.color.startsWith('#') ? item.color : `#${item.color}`;
        }
      }
    } else if (parsed.palette && typeof parsed.palette === 'object') {
      Object.assign(paletteMap, parsed.palette);
    }

    // Fallback default colors if palette is too sparse
    if (Object.keys(paletteMap).length <= 2) {
      paletteMap['#'] = '#E60012';
      paletteMap['R'] = '#FF1A26';
      paletteMap['Y'] = '#FFD700';
      paletteMap['O'] = '#FF7700';
      paletteMap['G'] = '#00FF66';
      paletteMap['C'] = '#00E5FF';
      paletteMap['W'] = '#FFFFFF';
    }

    // Sanitize frames and generate full RGB color matrix
    const sanitizedFrames: string[][] = [];
    const colorFrames: string[][][] = [];

    for (const frame of parsed.frames) {
      const rows: string[] = [];
      const colorRows: string[][] = [];

      for (let r = 0; r < 8; r++) {
        let rowStr = (frame && frame[r]) ? String(frame[r]) : '.'.repeat(32);
        if (rowStr.length < 32) {
          rowStr = rowStr.padEnd(32, '.');
        } else if (rowStr.length > 32) {
          rowStr = rowStr.substring(0, 32);
        }
        rows.push(rowStr);

        const colorCells: string[] = [];
        for (let c = 0; c < 32; c++) {
          const char = rowStr[c];
          const hex = (char === '.' || !paletteMap[char]) ? '' : paletteMap[char];
          colorCells.push(hex);
        }
        colorRows.push(colorCells);
      }

      sanitizedFrames.push(rows);
      colorFrames.push(colorRows);
    }

    return res.json({
      title: parsed.title || prompt,
      recommendedFps: parsed.recommendedFps || 6,
      palette: paletteMap,
      frames: sanitizedFrames,
      colorFrames,
      isRealAI: true,
      model: successfulModel,
      latencyMs: Date.now() - startTime,
    });
  } catch (err: any) {
    console.error('Error in /api/generate-pixel-animation:', err);
    const fallback = generateFallbackAnimation(req.body?.prompt || 'pixel animation', 6);
    return res.json({
      ...fallback,
      isRealAI: false,
      model: 'fallback-cache',
      error: err.message,
      latencyMs: Date.now() - startTime,
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT} (dev server on http://0.0.0.0:${PORT})`);
  });
}

startServer();
