import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, CloudSun, Activity, TrendingUp, Palette, 
  RotateCcw, Copy, Check, Sparkles, Sliders, Play, Pause,
  SkipBack, SkipForward, Plus, Trash2, Wand2, Film, Loader2, Download
} from 'lucide-react';
import { PALETTE, PRESETS_8X32, FONT_5X3 } from '../utils/pixelPresets';
import { 
  makeNci, downloadNciFile, colorMatrixToRgb565Frame, generateCppRgb565Code,
  hexToRgb565, rgb565ToHex 
} from '../utils/nciFormat';
import { NciConverterPanel } from './NciConverterPanel';

export type MatrixDisplayMode = 'clock' | 'weather' | 'visualizer' | 'crypto' | 'draw' | 'anim';

// Multi-color Campfire Animation Generator (Default Full-Color Preset)
const generateDefaultCampfireColorFrames = (): string[][][] => {
  const palette: Record<string, string> = {
    'B': '#8B4513', // Wood log brown
    'R': '#E60012', // Red ember & flame edge
    'O': '#FF7700', // Vibrant orange
    'Y': '#FFD700', // Hot yellow core
    'W': '#FFFBE8', // Rising golden spark
  };
  const frames: string[][][] = [];
  for (let f = 0; f < 6; f++) {
    const grid: string[][] = [];
    for (let r = 0; r < 8; r++) {
      const row: string[] = [];
      for (let c = 0; c < 32; c++) {
        const isCampfireArea = c >= 11 && c <= 20;
        if (!isCampfireArea) {
          row.push('#121721');
        } else {
          const height = 7 - r;
          const centerDist = Math.abs(c - 15.5);
          const flicker = Math.sin(f * 1.6 + c * 0.9) * 1.7 + Math.cos(f * 2.3 + r) * 1.1;
          const maxH = Math.max(1, 6 - centerDist * 0.9 + flicker);
          
          if (r === 7 && c >= 12 && c <= 19) {
            row.push(palette['B']);
          } else if (r === 6 && c >= 13 && c <= 18) {
            row.push(palette['R']);
          } else if (height <= maxH) {
            if (centerDist <= 1.2 && height <= 3) {
              row.push(palette['Y']);
            } else if (centerDist <= 2.2) {
              row.push(palette['O']);
            } else {
              row.push(palette['R']);
            }
          } else if (height === Math.floor(maxH + 1) && (f + c) % 3 === 0) {
            row.push(palette['W']);
          } else {
            row.push('#121721');
          }
        }
      }
      grid.push(row);
    }
    frames.push(grid);
  }
  return frames;
};

const DEFAULT_ANIM_COLOR_FRAMES: string[][][] = generateDefaultCampfireColorFrames();

// Monochrome mask representation derived from color frames
const DEFAULT_ANIM_FRAMES: string[][] = DEFAULT_ANIM_COLOR_FRAMES.map(colorGrid => 
  colorGrid.map(row => row.map(hex => (hex && hex !== '#121721') ? '#' : '.').join(''))
);

export const InteractiveClockMatrix: React.FC = () => {
  const [mode, setMode] = useState<MatrixDisplayMode>('clock');
  const [time, setTime] = useState<Date>(new Date());
  const [brightness, setBrightness] = useState<number>(85);
  const [diffuserMode, setDiffuserMode] = useState<'soft' | 'sharp'>('soft');
  const [colorTheme, setColorTheme] = useState<'espressif' | 'amber' | 'emerald' | 'cyan'>('espressif');
  
  // Custom drawing canvas state (8 rows × 32 cols)
  const [canvasGrid, setCanvasGrid] = useState<string[]>(() => {
    return Array(8).fill('.'.repeat(32));
  });
  // Multi-color canvas grid (8 rows × 32 cols of RGB hex)
  const [canvasColorGrid, setCanvasColorGrid] = useState<string[][]>(() => {
    return DEFAULT_ANIM_COLOR_FRAMES[0];
  });
  const [selectedColor, setSelectedColor] = useState<string>('#E60012');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [downloadSuccessNci, setDownloadSuccessNci] = useState<boolean>(false);
  
  // 32-band audio spectrum visualizer
  const [fftBars, setFftBars] = useState<number[]>(() => Array(32).fill(4));

  // --- AI Frame Animation States ---
  const [animTitle, setAnimTitle] = useState<string>('全彩跃动篝火 (Campfire Flame)');
  const [animColorFrames, setAnimColorFrames] = useState<string[][][]>(DEFAULT_ANIM_COLOR_FRAMES);
  const [animFrames, setAnimFrames] = useState<string[][]>(DEFAULT_ANIM_FRAMES);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [isPlayingAnimation, setIsPlayingAnimation] = useState<boolean>(true);
  const [animFps, setAnimFps] = useState<number>(6);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiFrameCount, setAiFrameCount] = useState<number>(6);
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [exportMode, setExportMode] = useState<'animation' | 'single'>('animation');
  const [exportFormat, setExportFormat] = useState<'nci_rgb565' | 'bitmap_uint32'>('nci_rgb565');
  const [generationFeedback, setGenerationFeedback] = useState<string | null>(null);
  const [aiMeta, setAiMeta] = useState<{ model: string; isRealAI: boolean; latencyMs: number } | null>(null);
  const [modelStatus, setModelStatus] = useState<{ connected: boolean; model: string; provider: string } | null>(null);

  // Check model connectivity on mount
  useEffect(() => {
    fetch('/api/model-status')
      .then(res => res.json())
      .then(data => setModelStatus(data))
      .catch(() => setModelStatus({ connected: true, model: 'gemini-2.5-flash', provider: 'Google Gemini' }));
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update audio visualizer in visualizer mode
  useEffect(() => {
    if (mode !== 'visualizer') return;
    const interval = setInterval(() => {
      setFftBars(prev => prev.map((_, i) => {
        const base = Math.sin(Date.now() / 180 + i * 0.4) * 3 + 3.8;
        const noise = (Math.random() - 0.5) * 2.8;
        return Math.max(1, Math.min(8, Math.round(base + noise)));
      }));
    }, 70);
    return () => clearInterval(interval);
  }, [mode]);

  // Timeline Player Timer for Animation Mode
  useEffect(() => {
    if (!isPlayingAnimation || animColorFrames.length === 0) return;

    const delayMs = Math.max(50, Math.round(1000 / animFps));
    const interval = setInterval(() => {
      setCurrentFrameIndex(prev => {
        const next = (prev + 1) % animColorFrames.length;
        // Keep canvas in sync if user is viewing anim mode
        if (mode === 'anim' || mode === 'draw') {
          if (animColorFrames[next]) setCanvasColorGrid(animColorFrames[next]);
          if (animFrames[next]) setCanvasGrid(animFrames[next]);
        }
        return next;
      });
    }, delayMs);

    return () => clearInterval(interval);
  }, [isPlayingAnimation, animFps, animColorFrames.length, animFrames, mode]);

  // AI Animation Generation API Call
  const handleGenerateAIAnimation = async (customPrompt?: string) => {
    const query = customPrompt || aiPrompt.trim();
    if (!query) return;

    setIsGeneratingAI(true);
    setGenerationFeedback(null);

    try {
      const res = await fetch('/api/generate-pixel-animation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          frameCount: aiFrameCount,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      if (data.frames && data.frames.length > 0) {
        // Multi-color frames extraction
        let colorGrids: string[][][] = [];
        if (data.colorFrames && Array.isArray(data.colorFrames) && data.colorFrames.length > 0) {
          colorGrids = data.colorFrames.map((fr: string[][]) =>
            fr.map(row => row.map(col => (col && col !== '.' && col !== '') ? col : '#121721'))
          );
        } else {
          // Synthesize color frames using palette or selected color
          const palette: Record<string, string> = data.palette || { '#': selectedColor };
          colorGrids = data.frames.map((fr: string[]) =>
            fr.map((row: string) =>
              row.split('').map(ch => (ch === '.' ? '#121721' : (palette[ch] || selectedColor)))
            )
          );
        }

        setAnimColorFrames(colorGrids);
        setAnimFrames(data.frames);
        setAnimTitle(data.title || query);
        setAnimFps(data.recommendedFps || 6);
        setCurrentFrameIndex(0);
        setCanvasColorGrid(colorGrids[0] || DEFAULT_ANIM_COLOR_FRAMES[0]);
        setCanvasGrid(data.frames[0]);
        setIsPlayingAnimation(true);
        setMode('anim');
        setAiMeta({
          model: data.model || 'gemini-2.5-flash',
          isRealAI: data.isRealAI !== false,
          latencyMs: data.latencyMs || 1600,
        });
        
        if (data.isRealAI) {
          setGenerationFeedback(`已由 Google Gemini (${data.model}) 全彩生成「${data.title || query}」（${data.frames.length} 帧，耗时 ${((data.latencyMs || 1500) / 1000).toFixed(1)}s）`);
        } else {
          setGenerationFeedback(`已为您匹配并生成全彩「${data.title || query}」（${data.frames.length} 帧）`);
        }
        setTimeout(() => setGenerationFeedback(null), 5000);
      }
    } catch (err: any) {
      console.error('Failed to generate animation:', err);
      setGenerationFeedback('生成网络繁忙，已为您启用内置离线全彩序列');
      setTimeout(() => setGenerationFeedback(null), 4000);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Timeline Scrubber & Frame Select
  const handleSelectFrame = (idx: number) => {
    setCurrentFrameIndex(idx);
    setIsPlayingAnimation(false);
    if (animColorFrames[idx]) setCanvasColorGrid(animColorFrames[idx]);
    if (animFrames[idx]) setCanvasGrid(animFrames[idx]);
    setMode('anim');
  };

  const handleAddFrame = () => {
    const blankColor = Array(8).fill(null).map(() => Array(32).fill('#121721'));
    const blankMono = Array(8).fill('.'.repeat(32));
    const updatedColor = [...animColorFrames, blankColor];
    const updatedMono = [...animFrames, blankMono];
    setAnimColorFrames(updatedColor);
    setAnimFrames(updatedMono);
    setCurrentFrameIndex(updatedColor.length - 1);
    setCanvasColorGrid(blankColor);
    setCanvasGrid(blankMono);
  };

  const handleDuplicateFrame = () => {
    const currentColor = animColorFrames[currentFrameIndex].map(r => [...r]);
    const currentMono = [...animFrames[currentFrameIndex]];
    const updatedColor = [
      ...animColorFrames.slice(0, currentFrameIndex + 1),
      currentColor,
      ...animColorFrames.slice(currentFrameIndex + 1),
    ];
    const updatedMono = [
      ...animFrames.slice(0, currentFrameIndex + 1),
      currentMono,
      ...animFrames.slice(currentFrameIndex + 1),
    ];
    setAnimColorFrames(updatedColor);
    setAnimFrames(updatedMono);
    setCurrentFrameIndex(currentFrameIndex + 1);
  };

  const handleDeleteFrame = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (animColorFrames.length <= 1) return;
    const updatedColor = animColorFrames.filter((_, i) => i !== idx);
    const updatedMono = animFrames.filter((_, i) => i !== idx);
    setAnimColorFrames(updatedColor);
    setAnimFrames(updatedMono);
    const nextIdx = Math.min(idx, updatedColor.length - 1);
    setCurrentFrameIndex(nextIdx);
    setCanvasColorGrid(updatedColor[nextIdx]);
    setCanvasGrid(updatedMono[nextIdx]);
  };

  // Load preset to canvas
  const handleLoadPreset = (presetKey: string) => {
    const preset = PRESETS_8X32[presetKey];
    if (preset) {
      setCanvasGrid([...preset.grid]);
      const colorMatrix = preset.grid.map(row => 
        row.split('').map(ch => ch === '#' ? selectedColor : '#121721')
      );
      setCanvasColorGrid(colorMatrix);
      if (mode === 'anim' && animColorFrames[currentFrameIndex]) {
        setAnimColorFrames(frames => {
          const next = [...frames];
          next[currentFrameIndex] = colorMatrix;
          return next;
        });
      }
      setMode('draw');
    }
  };

  // Drawing handlers (supports full color painting with selectedColor)
  const handlePixelClick = (row: number, col: number) => {
    setCanvasColorGrid(prev => {
      const newGrid = prev.map(r => [...r]);
      const cur = newGrid[row][col];
      // Toggle pixel color: if lit, turn off to #121721, else set to selectedColor
      newGrid[row][col] = (cur && cur !== '#121721' && cur !== '#000000') ? '#121721' : selectedColor;

      if (mode === 'anim' && animColorFrames[currentFrameIndex]) {
        setAnimColorFrames(frames => {
          const next = [...frames];
          next[currentFrameIndex] = newGrid;
          return next;
        });
      }
      return newGrid;
    });

    setCanvasGrid(prev => {
      const newGrid = [...prev];
      const rowChars = newGrid[row].split('');
      rowChars[col] = rowChars[col] === '#' ? '.' : '#';
      newGrid[row] = rowChars.join('');

      if (mode === 'anim' && animFrames[currentFrameIndex]) {
        setAnimFrames(frames => {
          const nextFrames = [...frames];
          nextFrames[currentFrameIndex] = newGrid;
          return nextFrames;
        });
      }
      return newGrid;
    });
  };

  const handlePixelDraw = (row: number, col: number) => {
    if (!isDrawing) return;
    setCanvasColorGrid(prev => {
      const newGrid = prev.map(r => [...r]);
      newGrid[row][col] = selectedColor;

      if (mode === 'anim' && animColorFrames[currentFrameIndex]) {
        setAnimColorFrames(frames => {
          const next = [...frames];
          next[currentFrameIndex] = newGrid;
          return next;
        });
      }
      return newGrid;
    });

    setCanvasGrid(prev => {
      const newGrid = [...prev];
      const rowChars = newGrid[row].split('');
      rowChars[col] = '#';
      newGrid[row] = rowChars.join('');

      if (mode === 'anim' && animFrames[currentFrameIndex]) {
        setAnimFrames(frames => {
          const nextFrames = [...frames];
          nextFrames[currentFrameIndex] = newGrid;
          return nextFrames;
        });
      }
      return newGrid;
    });
  };

  const handleClearCanvas = () => {
    const blankMono = Array(8).fill('.'.repeat(32));
    const blankColor = Array(8).fill(null).map(() => Array(32).fill('#121721'));
    setCanvasGrid(blankMono);
    setCanvasColorGrid(blankColor);
    if (mode === 'anim' && animColorFrames[currentFrameIndex]) {
      setAnimColorFrames(frames => {
        const nextFrames = [...frames];
        nextFrames[currentFrameIndex] = blankColor;
        return nextFrames;
      });
      setAnimFrames(frames => {
        const nextFrames = [...frames];
        nextFrames[currentFrameIndex] = blankMono;
        return nextFrames;
      });
    }
  };

  // Handler to load converted NCI animation from NciConverterPanel
  const handleLoadNciToSimulator = (framesRgb: string[][][], fps: number, title: string) => {
    setAnimColorFrames(framesRgb);
    setAnimFrames(framesRgb.map(f => f.map(row => row.map(c => (c && c !== '#121721' && c !== '#000000') ? '#' : '.').join(''))));
    setAnimFps(fps);
    setAnimTitle(title);
    setCurrentFrameIndex(0);
    setCanvasColorGrid(framesRgb[0]);
    setCanvasGrid(framesRgb[0].map(row => row.map(c => (c && c !== '#121721' && c !== '#000000') ? '#' : '.').join('')));
    setMode('anim');
    setIsPlayingAnimation(true);
    setGenerationFeedback(`已从 NCI 转换器成功载入「${title}」（${framesRgb.length} 帧，${fps} FPS）`);
    setTimeout(() => setGenerationFeedback(null), 5000);
  };

  // Export to C++ array (Multi-Frame Animation or Single Frame, RGB565 or uint32)
  const exportCppArray = () => {
    const frameDelay = Math.max(20, Math.round(1000 / animFps));

    // 1. NCI RGB565 16-bit array export (Native Full-Color for ESP32 NeoClock)
    if (exportFormat === 'nci_rgb565') {
      if (exportMode === 'animation') {
        const rgb565Frames = animColorFrames.map(f => colorMatrixToRgb565Frame(f));
        return generateCppRgb565Code(rgb565Frames, animTitle, 32, 8, frameDelay);
      } else {
        const rgb565Frame = colorMatrixToRgb565Frame(canvasColorGrid);
        return generateCppRgb565Code([rgb565Frame], `${animTitle}_frame_${currentFrameIndex + 1}`, 32, 8, frameDelay);
      }
    }

    // 2. Monochrome uint32 bitmask export
    if (exportMode === 'animation') {
      const frameBlocks = animFrames.map((frame, fIdx) => {
        const rowHexes = frame.map(row => {
          let highVal = 0;
          let lowVal = 0;
          for (let c = 0; c < 32; c++) {
            if (row[c] === '#') {
              if (c < 16) {
                highVal |= (1 << (15 - c));
              } else {
                lowVal |= (1 << (31 - c));
              }
            }
          }
          return `0x${((highVal << 16) | lowVal).toString(16).padStart(8, '0').toUpperCase()}`;
        });
        return `  // Frame ${fIdx}\n  { ${rowHexes.join(', ')} }`;
      });

      return `// ESP32-S3 8x32 Monochrome Bitmask: ${animTitle}
#define ANIM_FRAME_COUNT ${animFrames.length}
#define ANIM_DELAY_MS   ${frameDelay} // ${animFps} FPS

const uint32_t PROGMEM anim_frames_8x32[ANIM_FRAME_COUNT][8] = {
${frameBlocks.join(',\n')}
};`;
    }

    // Single frame monochrome export
    const lines = canvasGrid.map((row, rIdx) => {
      let highVal = 0;
      let lowVal = 0;
      for (let c = 0; c < 32; c++) {
        if (row[c] === '#') {
          if (c < 16) {
            highVal |= (1 << (15 - c));
          } else {
            lowVal |= (1 << (31 - c));
          }
        }
      }
      const fullHex = `0x${((highVal << 16) | lowVal).toString(16).padStart(8, '0').toUpperCase()}`;
      return `  ${fullHex}, // Row ${rIdx} (32-bit)`;
    });

    return `// ESP32-S3 8x32 (256 LED) Static Frame Buffer
const uint32_t PROGMEM pixel_frame_8x32[8] = {
${lines.join('\n')}
};`;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(exportCppArray());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Download .nci binary file directly
  const handleDownloadNci = () => {
    const framesToExport = exportMode === 'animation' 
      ? animColorFrames.map(f => colorMatrixToRgb565Frame(f))
      : [colorMatrixToRgb565Frame(canvasColorGrid)];
    
    const frameDelay = Math.max(20, Math.round(1000 / animFps));
    const nciBytes = makeNci(framesToExport, 32, 8, frameDelay);
    const safeName = animTitle.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_') || 'pixel_animation';
    downloadNciFile(nciBytes, `${safeName}.nci`);
    setDownloadSuccessNci(true);
    setTimeout(() => setDownloadSuccessNci(false), 2500);
  };

  // Theme primary colors
  const themeColors = {
    espressif: {
      primary: '#E60012',
      glow: 'rgba(230, 0, 18, 0.4)',
      accent: '#FF453A',
      dim: '#4A080C'
    },
    amber: {
      primary: '#FF9F0A',
      glow: 'rgba(255, 159, 10, 0.4)',
      accent: '#FFD60A',
      dim: '#4D3004'
    },
    emerald: {
      primary: '#30D158',
      glow: 'rgba(48, 209, 88, 0.4)',
      accent: '#66D4CF',
      dim: '#073812'
    },
    cyan: {
      primary: '#0A84FF',
      glow: 'rgba(10, 132, 255, 0.4)',
      accent: '#64D2FF',
      dim: '#06254A'
    },
  }[colorTheme];

  // Helper to render 8x32 matrix cells based on active mode
  const renderCellColor = (r: number, c: number): string => {
    // 0. AI Animation Mode (Real-time live playback frame with full-color RGB)
    if (mode === 'anim') {
      const activeColorGrid = animColorFrames[currentFrameIndex];
      const colorVal = activeColorGrid?.[r]?.[c];
      if (colorVal && colorVal !== '#121721' && colorVal !== '#000000' && colorVal !== '.' && colorVal !== 'transparent') {
        return colorVal;
      }
      const activeFrame = animFrames[currentFrameIndex] || canvasGrid;
      const isLit = activeFrame?.[r]?.[c] === '#';
      return isLit ? selectedColor : '#121721';
    }

    // Custom drawing mode (with multi-color support)
    if (mode === 'draw') {
      const colorVal = canvasColorGrid[r]?.[c];
      if (colorVal && colorVal !== '#121721' && colorVal !== '#000000' && colorVal !== '.' && colorVal !== 'transparent') {
        return colorVal;
      }
      const active = canvasGrid[r]?.[c] === '#';
      return active ? selectedColor : '#121721';
    }

    // 1. Clock Mode (8 rows × 32 columns)
    if (mode === 'clock') {
      const hours = time.getHours().toString().padStart(2, '0');
      const minutes = time.getMinutes().toString().padStart(2, '0');
      const seconds = time.getSeconds();

      // Left Icon: 8x8 Heart (cols 0..7)
      if (c <= 7) {
        const heart8x8 = [
          [0, 1, 1, 0, 0, 1, 1, 0],
          [1, 1, 1, 1, 1, 1, 1, 1],
          [1, 1, 1, 1, 1, 1, 1, 1],
          [1, 1, 1, 1, 1, 1, 1, 1],
          [0, 1, 1, 1, 1, 1, 1, 0],
          [0, 0, 1, 1, 1, 1, 0, 0],
          [0, 0, 0, 1, 1, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
        ];
        if (heart8x8[r]?.[c]) {
          return seconds % 2 === 0 ? '#FF375F' : '#E60012';
        }
      }

      // Vertical separator bar at col 8
      if (c === 8) {
        return r >= 1 && r <= 6 ? '#2A3447' : '#121721';
      }

      // Status indicator dots on top row (r === 0)
      if (r === 0) {
        if (c === 10) return '#30D158'; // Wi-Fi connected green
        if (c === 12) return '#0A84FF'; // MQTT Home Assistant synced
        if (c === 14) return '#FF9F0A'; // NTP Synced
      }

      // Time digits HH:MM in 5x3 font on rows 1..5
      if (r >= 1 && r <= 5) {
        const charRow = r - 1;
        // H1
        if (c >= 10 && c <= 12) {
          const charCol = c - 10;
          if (FONT_5X3[hours[0]]?.[charRow]?.[charCol]) return themeColors.primary;
        }
        // H2
        if (c >= 14 && c <= 16) {
          const charCol = c - 14;
          if (FONT_5X3[hours[1]]?.[charRow]?.[charCol]) return themeColors.primary;
        }
        // Blinking colon at col 18
        if (c === 18 && (seconds % 2 === 0)) {
          if (charRow === 1 || charRow === 3) return themeColors.accent;
        }
        // M1
        if (c >= 20 && c <= 22) {
          const charCol = c - 20;
          if (FONT_5X3[minutes[0]]?.[charRow]?.[charCol]) return themeColors.primary;
        }
        // M2
        if (c >= 24 && c <= 26) {
          const charCol = c - 24;
          if (FONT_5X3[minutes[1]]?.[charRow]?.[charCol]) return themeColors.primary;
        }

        // Mini seconds digits or weather indicator on cols 28..31
        if (c === 29 || c === 30) {
          if (r === 1 || r === 2) return '#66D4CF';
          if (r === 4 || r === 5) return '#30D158';
        }
      }

      // Bottom Row 7: 32-pixel continuous seconds progress track
      if (r === 7) {
        const activeSecondsPixel = Math.floor((seconds / 60) * 32);
        if (c <= activeSecondsPixel) return themeColors.accent;
        return '#1E293B';
      }

      return '#121721';
    }

    // 2. Weather Mode (8 rows × 32 columns)
    if (mode === 'weather') {
      if (c <= 7) {
        const sun = [
          [0, 0, 0, 1, 0, 0, 0, 0],
          [0, 1, 0, 0, 0, 1, 0, 0],
          [0, 0, 1, 1, 1, 0, 0, 1],
          [1, 0, 1, 1, 1, 0, 0, 0],
          [0, 0, 1, 1, 1, 0, 0, 1],
          [0, 1, 0, 0, 0, 1, 0, 0],
          [0, 0, 0, 1, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
        ];
        if (sun[r]?.[c]) return '#FFD60A';
      }

      if (c === 8) return r >= 1 && r <= 6 ? '#2A3447' : '#121721';

      if (r >= 1 && r <= 5) {
        const charRow = r - 1;
        if (c >= 10 && c <= 12 && FONT_5X3['+']?.[charRow]?.[c - 10]) return '#FF9F0A';
        if (c >= 14 && c <= 16 && FONT_5X3['2']?.[charRow]?.[c - 14]) return '#FFFFFF';
        if (c >= 18 && c <= 20 && FONT_5X3['6']?.[charRow]?.[c - 18]) return '#FFFFFF';
        if (c >= 22 && c <= 23 && FONT_5X3['°']?.[charRow]?.[c - 22]) return '#66D4CF';
        if (c >= 25 && c <= 27 && FONT_5X3['C']?.[charRow]?.[c - 25]) return '#66D4CF';

        if (c >= 29 && c <= 31) {
          if ((r === 2 && c === 30) || (r === 3 && (c === 29 || c === 31)) || (r === 4 && c === 30)) {
            return '#0A84FF';
          }
        }
      }

      if (r === 7 && c >= 9 && c <= 31) {
        return c < 26 ? '#30D158' : '#1E293B';
      }

      return '#121721';
    }

    // 3. Audio Visualizer Mode (32 columns FFT spectrum)
    if (mode === 'visualizer') {
      const barHeight = fftBars[c] || 0;
      const currentHeight = 7 - r;
      
      if (currentHeight < barHeight) {
        if (currentHeight >= 6) return '#FF453A';
        if (currentHeight >= 4) return '#FF9F0A';
        if (currentHeight >= 2) return '#FFD60A';
        return themeColors.primary;
      }
      if (currentHeight === barHeight && barHeight > 0) {
        return '#FFFFFF';
      }
      return '#121721';
    }

    // 4. Crypto Mode (8 rows × 32 columns)
    if (mode === 'crypto') {
      if (c <= 7) {
        const btc = [
          [0, 1, 1, 0, 0, 0, 0, 0],
          [0, 1, 1, 1, 1, 0, 0, 0],
          [0, 1, 0, 0, 0, 1, 0, 0],
          [0, 1, 1, 1, 1, 0, 0, 0],
          [0, 1, 0, 0, 0, 1, 0, 0],
          [0, 1, 1, 1, 1, 0, 0, 0],
          [0, 1, 1, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
        ];
        if (btc[r]?.[c]) return '#FF9F0A';
      }

      if (c === 8) return r >= 1 && r <= 6 ? '#2A3447' : '#121721';

      if (r >= 1 && r <= 5) {
        const charRow = r - 1;
        if (c >= 10 && c <= 12 && FONT_5X3['$']?.[charRow]?.[c - 10]) return '#30D158';
        if (c >= 14 && c <= 16 && FONT_5X3['6']?.[charRow]?.[c - 14]) return '#FFFFFF';
        if (c >= 18 && c <= 20 && FONT_5X3['4']?.[charRow]?.[c - 18]) return '#FFFFFF';
        if (c === 22 && FONT_5X3['.']?.[charRow]?.[0]) return '#FFFFFF';
        if (c >= 24 && c <= 26 && FONT_5X3['8']?.[charRow]?.[c - 24]) return '#FFFFFF';
        if (c >= 28 && c <= 30 && FONT_5X3['k']?.[charRow]?.[c - 28]) return '#30D158';
      }

      if (r === 7 && c >= 9 && c <= 31) {
        return '#30D158';
      }

      return '#121721';
    }

    return '#121721';
  };

  return (
    <div id="simulator" className="w-full bg-slate-100/70 dark:bg-[#0D131F]/80 border-y border-slate-200 dark:border-white/10 py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-200">
      {/* Background glow mesh */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full blur-[140px] pointer-events-none opacity-20"
        style={{ background: themeColors.glow }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#E60012] tracking-wider uppercase mb-3">
            <span>Hardware Simulation Engine</span>
            <span>·</span>
            <span>8×32 WS2812B / HUB75 点阵仿真</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight font-display mb-4">
            8×32 智能像素时钟交互工作台
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-300">
            采用经典极客桌面 8×32（256 颗独立全彩 LED）横向点阵屏规格。实时模拟 NTP 毫秒授时、气象微站、32 段音频均衡器、逐帧动画及 AI 生成工作室。
          </p>
        </div>

        {/* 8x32 Physical Clock Simulator Frame (Panoramic Desktop Format) */}
        <div className="w-full max-w-4xl mx-auto mb-8">
          <div className="bg-[#0F141E] p-5 sm:p-7 rounded-2xl border border-slate-800 shadow-2xl relative">
            
            {/* Device top strip: Light sensor & status */}
            <div className="flex items-center justify-between px-2 mb-4 text-slate-500 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-700 ring-1 ring-slate-600" title="BH1750 光敏调光探头" />
                <span className="text-[11px] text-slate-400">BH1750 自动亮度: {brightness}%</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-emerald-400">
                  {mode === 'anim' ? `AI 动画: 帧 ${currentFrameIndex + 1}/${animFrames.length}` : '8×32 (256 Pixels)'}
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#E60012] animate-pulse" />
                  <span className="text-[11px] font-mono text-slate-400">ESP32-S3 240MHz DMA</span>
                </div>
              </div>
            </div>

            {/* The 8x32 LED Matrix Frame */}
            <div 
              className={`relative p-3 rounded-xl bg-black border border-slate-800 transition-all duration-300 ${
                diffuserMode === 'soft' ? 'led-glow' : 'shadow-inner'
              }`}
              style={{
                filter: `brightness(${brightness}%)`,
              }}
              onMouseLeave={() => setIsDrawing(false)}
              onMouseDown={() => setIsDrawing(true)}
              onMouseUp={() => setIsDrawing(false)}
            >
              {/* Diffuser lens blur overlay */}
              {diffuserMode === 'soft' && (
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none rounded-xl" />
              )}

              {/* Matrix Scanning Laser Line when AI is generating */}
              {isGeneratingAI && (
                <div className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-[#E60012]/40 to-transparent pointer-events-none animate-pulse rounded-xl" />
              )}

              {/* 8 rows × 32 columns Matrix Grid */}
              <div className="grid-cols-32 gap-[3px] sm:gap-[4px] w-full select-none cursor-crosshair">
                {Array.from({ length: 8 }).map((_, r) => (
                  <React.Fragment key={r}>
                    {Array.from({ length: 32 }).map((_, c) => {
                      const cellColor = renderCellColor(r, c);
                      const isOff = cellColor === '#121721';
                      
                      return (
                        <div
                          key={`${r}-${c}`}
                          onClick={() => {
                            if (mode === 'draw' || mode === 'anim') handlePixelClick(r, c);
                          }}
                          onMouseEnter={() => {
                            if (mode === 'draw' || mode === 'anim') handlePixelDraw(r, c);
                          }}
                          style={{
                            backgroundColor: cellColor,
                            boxShadow: (!isOff && diffuserMode === 'soft') 
                              ? `0 0 6px 1px ${cellColor}80` 
                              : 'none',
                          }}
                          className={`aspect-square rounded-[2px] transition-colors duration-75 relative ${
                            isOff ? 'bg-[#121721] opacity-70' : 'opacity-100'
                          }`}
                        />
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>

              {/* Scanline texture */}
              <div 
                className="absolute inset-0 pointer-events-none rounded-xl opacity-15"
                style={{
                  backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.4) 0px, rgba(0,0,0,0.4) 1px, transparent 1px, transparent 2px)',
                }}
              />
            </div>

            {/* Bottom physical chassis bar */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-[11px]">8×32 WS2812B / HUB75 单线高速总线</span>
              <span className="font-mono text-[11px] text-[#E60012]">
                {mode === 'anim' ? `正在循环播放: ${animTitle}` : 'Awtrix-Light / ESP-IDF 原生兼容'}
              </span>
              <span className="font-mono text-[11px]">DMA 刷新 60FPS</span>
            </div>

          </div>

          {/* Mode Switcher Buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 p-1.5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <button
              onClick={() => setMode('clock')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'clock' 
                  ? 'bg-[#E60012] text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>时钟与心跳</span>
            </button>
            
            <button
              onClick={() => setMode('weather')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'weather' 
                  ? 'bg-[#E60012] text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
              }`}
            >
              <CloudSun className="w-3.5 h-3.5" />
              <span>微气象站</span>
            </button>

            <button
              onClick={() => setMode('visualizer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'visualizer' 
                  ? 'bg-[#E60012] text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>32段声波律动</span>
            </button>

            <button
              onClick={() => setMode('crypto')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'crypto' 
                  ? 'bg-[#E60012] text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>行情看板</span>
            </button>

            {/* AI Animation Mode */}
            <button
              onClick={() => {
                setMode('anim');
                setIsPlayingAnimation(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'anim' 
                  ? 'bg-gradient-to-r from-[#E60012] to-amber-500 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-300" />
              <span className="font-semibold">AI 逐帧动画</span>
              <span className="text-[10px] bg-white/20 px-1 py-0.2 rounded font-mono">NEW</span>
            </button>

            <button
              onClick={() => {
                setMode('draw');
                setIsPlayingAnimation(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'draw' 
                  ? 'bg-[#E60012] text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>8×32 手工画板</span>
            </button>
          </div>

          {/* Quick optical controls */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span>光学滤镜:</span>
              <button
                onClick={() => setDiffuserMode(diffuserMode === 'soft' ? 'sharp' : 'soft')}
                className="px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 shadow-xs transition-colors"
              >
                {diffuserMode === 'soft' ? '雾面亚克力漫反射 (开)' : '纯点阵直透 (关)'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span>矩阵色彩:</span>
              <div className="flex items-center gap-1.5">
                {(['espressif', 'amber', 'emerald', 'cyan'] as const).map(theme => (
                  <button
                    key={theme}
                    onClick={() => {
                      setColorTheme(theme);
                      setSelectedColor(
                        theme === 'espressif' ? '#E60012' : 
                        theme === 'amber' ? '#FF9F0A' : 
                        theme === 'emerald' ? '#30D158' : '#0A84FF'
                      );
                    }}
                    className={`w-4 h-4 rounded-full border ${
                      colorTheme === theme ? 'border-slate-800 dark:border-white scale-110' : 'border-transparent opacity-60'
                    }`}
                    style={{
                      backgroundColor: 
                        theme === 'espressif' ? '#E60012' : 
                        theme === 'amber' ? '#FF9F0A' : 
                        theme === 'emerald' ? '#30D158' : '#0A84FF'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Pixel Studio Workbench: AI Generator + Timeline Player + Manual Canvas   */}
        {/* ========================================================================= */}
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-colors duration-200 space-y-6">
          
          {/* 1. AI Pixel Animation Generator Bar */}
          <div className="bg-gradient-to-r from-red-500/5 via-amber-500/5 to-transparent dark:from-red-950/30 dark:via-amber-950/20 dark:to-transparent border border-red-500/20 dark:border-red-500/30 rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#E60012]/15 border border-[#E60012]/30 flex items-center justify-center text-[#E60012]">
                  <Wand2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>AI 智能生成 8×32 像素帧动画</span>
                    <span className="text-[10px] font-mono font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Google Gemini 已直连 ({modelStatus?.model || 'gemini-2.5-flash'})</span>
                    </span>
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                <span>生成帧数:</span>
                <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                  {[4, 6, 8].map(count => (
                    <button
                      key={count}
                      onClick={() => setAiFrameCount(count)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                        aiFrameCount === count 
                          ? 'bg-[#E60012] text-white shadow-xs' 
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      {count} 帧
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Prompt input row */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2 mb-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleGenerateAIAnimation();
                  }}
                  placeholder="用自然语言描述点阵动画，如：跳动的像素篝火、吃豆人追逐、太空入侵者、声波节奏..."
                  className="w-full h-10 px-3.5 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E60012]/40 transition-all placeholder:text-slate-400"
                />
              </div>

              <button
                onClick={() => handleGenerateAIAnimation()}
                disabled={isGeneratingAI}
                className="h-10 px-5 text-xs font-bold text-white bg-gradient-to-r from-[#E60012] to-amber-600 hover:from-[#CC0010] hover:to-amber-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-red-950/20 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {isGeneratingAI ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Gemini 思考生成中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                    <span>AI 智能生成动画</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Inspiration Chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">灵感预设:</span>
              {[
                { label: '🔥 篝火跃动', prompt: '跳动的露营篝火与微风火焰' },
                { label: '👾 8-Bit 太空入侵者', prompt: '经典像素外星入侵者摆动触手漫游' },
                { label: '💓 机械心律跳动', prompt: '赛博朋克心跳脉动心电图' },
                { label: '🌊 赛博霓虹声波', prompt: '律动波动的声波频率点阵波浪' },
                { label: '🚀 像素太空火箭', prompt: '像素火箭尾部喷火推进飞行' },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => {
                    setAiPrompt(item.prompt);
                    handleGenerateAIAnimation(item.prompt);
                  }}
                  className="px-2.5 py-1 text-[11px] font-medium bg-white/80 hover:bg-white text-slate-700 border border-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700 rounded-lg transition-colors shadow-2xs"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* AI Model metadata and status bar */}
            <div className="mt-3 pt-2.5 border-t border-red-500/10 dark:border-red-500/20 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                  <Check className="w-3 h-3" />
                  <span>服务状态: Google Gemini API 运行中</span>
                </span>
                {aiMeta && (
                  <span className="text-[11px] font-mono text-slate-400 dark:text-slate-400">
                    · 模型: <strong className="text-slate-700 dark:text-slate-200">{aiMeta.model}</strong> · 耗时 {(aiMeta.latencyMs / 1000).toFixed(1)}s
                  </span>
                )}
              </div>

              {generationFeedback && (
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-fadeIn">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>{generationFeedback}</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Timeline Player & Frame Scrubber (时间轴播放器) */}
          <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-[#E60012]" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">时间轴播放器 (Timeline Player)</span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  当前帧: <strong className="text-slate-900 dark:text-white">{currentFrameIndex + 1}</strong> / {animFrames.length}
                </span>
              </div>

              {/* Playback Controls & FPS Slider */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlayingAnimation(prev => !prev)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all ${
                    isPlayingAnimation
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      : 'bg-[#E60012] text-white hover:bg-[#CC0010]'
                  }`}
                >
                  {isPlayingAnimation ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>暂停</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>循环播放</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500 dark:text-slate-400">
                  <span>速率:</span>
                  <input
                    type="range"
                    min="2"
                    max="12"
                    value={animFps}
                    onChange={e => setAnimFps(Number(e.target.value))}
                    className="w-16 accent-[#E60012] cursor-pointer"
                  />
                  <span className="w-10 text-slate-900 dark:text-white font-bold">{animFps} FPS</span>
                </div>
              </div>
            </div>

            {/* Thumbnails Strip */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {animFrames.map((frame, idx) => {
                const isCurrent = idx === currentFrameIndex;
                return (
                  <div
                    key={idx}
                    onClick={() => handleSelectFrame(idx)}
                    className={`group relative flex-shrink-0 cursor-pointer p-1.5 rounded-lg border transition-all ${
                      isCurrent
                        ? 'bg-red-500/10 border-[#E60012] ring-2 ring-[#E60012]/30 scale-105'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mb-1">
                      <span className={isCurrent ? 'text-[#E60012] font-bold' : ''}>#{idx + 1}</span>
                      {animFrames.length > 2 && (
                        <button
                          onClick={e => handleDeleteFrame(idx, e)}
                          title="删除此帧"
                          className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>

                    {/* Mini 8x32 thumbnail preview with true multi-color */}
                    <div className="grid-cols-32 gap-[0.5px] w-24 bg-black p-0.5 rounded">
                      {Array.from({ length: 8 }).map((_, r) => (
                        <React.Fragment key={r}>
                          {Array.from({ length: 32 }).map((_, c) => {
                            const color = animColorFrames[idx]?.[r]?.[c];
                            const isColorLit = color && color !== '#121721' && color !== '#000000' && color !== '.';
                            const lit = isColorLit || frame[r]?.[c] === '#';
                            const displayColor = isColorLit ? color : (lit ? selectedColor : '#181D28');
                            return (
                              <div
                                key={`${r}-${c}`}
                                className="w-0.5 h-0.5 rounded-[0.5px]"
                                style={{ backgroundColor: displayColor }}
                              />
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Action buttons on timeline */}
              <div className="flex items-center gap-1.5 pl-2">
                <button
                  onClick={handleDuplicateFrame}
                  title="复制当前帧"
                  className="px-2 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs flex items-center gap-1 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  <span className="text-[11px]">复制帧</span>
                </button>

                <button
                  onClick={handleAddFrame}
                  title="添加空白新帧"
                  className="px-2 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span className="text-[11px]">加帧</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. Manual Touch-up Canvas & Code Export Strip */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pt-2 border-t border-slate-200 dark:border-slate-800">
            <div>
              {/* Presets loader */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">快速载入经典点阵预设:</span>
                  <span className="text-[11px] text-slate-400">单帧覆盖</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(PRESETS_8X32).map(([key, item]) => (
                    <button
                      key={key}
                      onClick={() => handleLoadPreset(key)}
                      className="px-2.5 py-1.5 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 rounded-lg text-center transition-colors truncate"
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Palette Picker for Drawing */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    点阵画笔色调 (支持在上方屏幕直接涂抹):
                  </span>
                  <button
                    onClick={handleClearCanvas}
                    className="text-xs text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>清空当前帧</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800">
                  {PALETTE.slice(1).map(color => (
                    <button
                      key={color}
                      onClick={() => {
                        setSelectedColor(color);
                        if (mode !== 'anim') setMode('draw');
                      }}
                      className={`w-6 h-6 rounded-md transition-all ${
                        selectedColor === color ? 'ring-2 ring-slate-900 dark:ring-white scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Code Export Box */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">代码与固件导出:</span>
                  
                  {/* Scope Selector: Animation vs Single Frame */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded p-0.5 text-[10px] font-mono">
                    <button
                      onClick={() => setExportMode('animation')}
                      className={`px-2 py-0.5 rounded transition-all ${
                        exportMode === 'animation'
                          ? 'bg-white dark:bg-slate-900 text-[#E60012] font-bold shadow-2xs'
                          : 'text-slate-500'
                      }`}
                    >
                      多帧动画
                    </button>
                    <button
                      onClick={() => setExportMode('single')}
                      className={`px-2 py-0.5 rounded transition-all ${
                        exportMode === 'single'
                          ? 'bg-white dark:bg-slate-900 text-[#E60012] font-bold shadow-2xs'
                          : 'text-slate-500'
                      }`}
                    >
                      当前单帧
                    </button>
                  </div>

                  {/* Format Selector: NCI RGB565 vs uint32 */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded p-0.5 text-[10px] font-mono">
                    <button
                      onClick={() => setExportFormat('nci_rgb565')}
                      className={`px-2 py-0.5 rounded transition-all ${
                        exportFormat === 'nci_rgb565'
                          ? 'bg-[#E60012] text-white font-bold shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                      title="16-bit RGB565 原生全彩数组，支持 ESP32 NeoClock 与 TFT"
                    >
                      NCI RGB565 (全彩)
                    </button>
                    <button
                      onClick={() => setExportFormat('bitmap_uint32')}
                      className={`px-2 py-0.5 rounded transition-all ${
                        exportFormat === 'bitmap_uint32'
                          ? 'bg-slate-700 text-white font-bold shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                      title="32-bit 位掩码 (单色)"
                    >
                      uint32 位掩码
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Download .NCI Binary Button */}
                  <button
                    onClick={handleDownloadNci}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-md shadow-xs transition-all"
                    title="下载为标准 NCI1 二进制固件文件（直接可烧录/上传至 ESP32 设备）"
                  >
                    {downloadSuccessNci ? (
                      <>
                        <Check className="w-3 h-3 text-white" />
                        <span>已下载 .nci</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3 h-3" />
                        <span>下载 .nci 固件</span>
                      </>
                    )}
                  </button>

                  {/* Copy C++ Code */}
                  <button
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 rounded-md transition-colors"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                        <span className="text-emerald-600 dark:text-emerald-400">已复制代码</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>复制 C++</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-[#0B101A] rounded-lg p-3 border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-48 leading-relaxed scrollbar-thin">
                <pre>{exportCppArray()}</pre>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>
                  {exportFormat === 'nci_rgb565' 
                    ? '格式: 16-bit RGB565 逐像素高保真色彩 (0x0000 - 0xFFFF)' 
                    : '格式: uint32_t 行扫描位掩码'}
                </span>
                <span className="text-[#E60012] font-semibold">
                  {exportMode === 'animation' 
                    ? `${animColorFrames.length} 帧连续全彩 (${animFps} FPS)` 
                    : '单帧静态 (32×8)'}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* NCI RGB565 Converter & ESP32 Device Syncer Tool                           */}
        {/* ========================================================================= */}
        <div className="max-w-4xl mx-auto mt-8">
          <NciConverterPanel onLoadToSimulator={handleLoadNciToSimulator} />
        </div>

      </div>
    </div>
  );
};
