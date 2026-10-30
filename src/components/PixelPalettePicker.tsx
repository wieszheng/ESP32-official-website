import React, { useState, useEffect, useRef } from 'react';
import { 
  Palette, Plus, Trash2, Check, Copy, RotateCcw, 
  Sparkles, Pipette, Sliders, Eraser, Heart
} from 'lucide-react';
import { hexToRgba, rgb565 } from '../utils/nciFormat';

export interface PaletteTheme {
  id: string;
  name: string;
  colors: string[];
}

export const PRESET_THEMES: PaletteTheme[] = [
  {
    id: 'classic',
    name: '硬件经典',
    colors: [
      '#E60012', // 乐鑫红 Espressif Red
      '#FF453A', // 珊瑚红 Coral
      '#FF9F0A', // 琥珀橙 Amber
      '#FFD60A', // 金黄色 Gold
      '#30D158', // 矩阵绿 Matrix Green
      '#66D4CF', // 薄荷青 Mint Cyan
      '#0A84FF', // 极客蓝 Geek Blue
      '#5E5CE6', // 靛蓝 Indigo
      '#BF5AF2', // 霓虹紫 Purple
      '#FF375F', // 桃粉 Pink
      '#FFFFFF', // 纯白 Pure White
      '#8E8E93', // 铝灰 Silver
      '#48484A', // 碳黑 Charcoal
      '#2C0B0E', // 枣红 Deep Wine
    ],
  },
  {
    id: 'cyberpunk',
    name: '赛博霓虹',
    colors: [
      '#FF0055', // Neon Crimson
      '#FF00AA', // Hyper Pink
      '#B000FF', // Electric Violet
      '#7000FF', // Cyber Indigo
      '#0055FF', // Cobalt Blue
      '#00F0FF', // Cyan Glow
      '#00FF9D', // Acid Green
      '#CCFF00', // Neon Lime
      '#FFE600', // Laser Yellow
      '#FF5500', // Plasma Orange
      '#FFFFFF', // Strobe White
      '#1A0033', // Void Violet
    ],
  },
  {
    id: 'arcade',
    name: '复古街机',
    colors: [
      '#E70012', // Mario Red
      '#F878F8', // Bubble Pink
      '#0078F8', // Megaman Blue
      '#A4E4FC', // Sky Cyan
      '#00A800', // Pipe Green
      '#F8B800', // Coin Yellow
      '#E45C10', // Goomba Orange
      '#885818', // Brick Brown
      '#FCFCFC', // Arcade White
      '#7C7C7C', // CRT Gray
      '#444444', // Dark Metal
      '#000000', // Shadow Black
    ],
  },
  {
    id: 'flame',
    name: '热烈篝火',
    colors: [
      '#FFFBE8', // Rising Spark
      '#FFD700', // Golden Flame Core
      '#FFAA00', // Bright Amber
      '#FF7700', // Vibrant Orange
      '#FF3B00', // Hot Ember
      '#E60012', // Crimson Flame
      '#A30006', // Deep Ember
      '#660000', // Wine Red
      '#8B4513', // Burning Wood
      '#4A2306', // Charred Log
      '#1E1E24', // Ash Black
    ],
  },
  {
    id: 'nature',
    name: '森林原野',
    colors: [
      '#1B4332', // Deep Pine
      '#2D6A4F', // Forest Green
      '#40916C', // Grass Green
      '#74C69D', // Fresh Sprout
      '#B7E4C7', // Pale Mint
      '#8D6E63', // Rich Bark
      '#5D4037', // Earth Brown
      '#0288D1', // Stream Blue
      '#4FC3F7', // Dew Water
      '#F48FB1', // Wild Flower
      '#FFF3E0', // Sunlight
    ],
  },
];

const DEFAULT_USER_COLORS = [
  '#E60012', // Espressif Red
  '#FF9F0A', // Amber
  '#FFD60A', // Yellow
  '#30D158', // Green
  '#66D4CF', // Cyan
  '#0A84FF', // Blue
  '#BF5AF2', // Purple
  '#FFFFFF', // White
];

const STORAGE_KEY = 'neoclock_custom_user_palette_v1';

export interface PixelPalettePickerProps {
  selectedColor: string;
  onSelectColor: (color: string) => void;
  className?: string;
  variant?: 'compact' | 'full';
  onClearCanvas?: () => void;
}

export const PixelPalettePicker: React.FC<PixelPalettePickerProps> = ({
  selectedColor,
  onSelectColor,
  className = '',
  variant = 'full',
  onClearCanvas,
}) => {
  // Custom user-defined colors list loaded from localStorage
  const [userColors, setUserColors] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_USER_COLORS;
  });

  // Current active preset theme tab
  const [activeThemeId, setActiveThemeId] = useState<string>('user');
  
  // Custom color input controls
  const [customInputHex, setCustomInputHex] = useState<string>(selectedColor);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [isEditorExpanded, setIsEditorExpanded] = useState<boolean>(false);

  const nativeColorInputRef = useRef<HTMLInputElement | null>(null);

  // Synchronize custom input when selectedColor changes
  useEffect(() => {
    setCustomInputHex(selectedColor);
  }, [selectedColor]);

  // Save user-defined colors to localStorage
  const saveUserColors = (colors: string[]) => {
    setUserColors(colors);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
    } catch {
      // ignore
    }
  };

  // Add a new color to user-defined palette
  const handleAddColor = (hexToAdd: string) => {
    const formatted = formatHex(hexToAdd);
    if (!formatted) return;

    if (!userColors.includes(formatted)) {
      const next = [formatted, ...userColors];
      saveUserColors(next);
    }
    onSelectColor(formatted);
    setActiveThemeId('user');
  };

  // Delete a color from user-defined palette
  const handleDeleteColor = (hexToDelete: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = userColors.filter(c => c.toLowerCase() !== hexToDelete.toLowerCase());
    if (next.length === 0) {
      saveUserColors(DEFAULT_USER_COLORS);
    } else {
      saveUserColors(next);
    }
  };

  // Reset user-defined colors to default
  const handleResetUserColors = () => {
    saveUserColors(DEFAULT_USER_COLORS);
  };

  // Eyedropper API (supported in Chromium/Edge)
  const handleEyeDropper = async () => {
    if (typeof window !== 'undefined' && 'EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          const picked = formatHex(result.sRGBHex);
          onSelectColor(picked);
          setCustomInputHex(picked);
        }
      } catch {
        // User canceled or failed
      }
    } else {
      // Trigger native color picker
      nativeColorInputRef.current?.click();
    }
  };

  // Helper: Format hex string cleanly
  function formatHex(val: string): string {
    let clean = val.trim().replace(/^#/, '');
    if (clean.length === 3) {
      clean = clean.split('').map(c => c + c).join('');
    }
    if (/^[0-9A-Fa-f]{6}$/.test(clean)) {
      return '#' + clean.toUpperCase();
    }
    return '';
  }

  // Calculate RGB and RGB565 info for the active color
  const [r, g, b] = hexToRgba(selectedColor);
  const rgb565Val = rgb565(r, g, b);
  const rgb565Hex = '0x' + rgb565Val.toString(16).padStart(4, '0').toUpperCase();
  const isOffPixel = selectedColor === '#121721' || selectedColor === '#000000';

  // Copy helper
  const handleCopy = (text: string, format: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 1500);
  };

  // --------------------------------------------------------------------------
  // COMPACT VARIANT: Sleek horizontal bar rendered right below the LED Matrix
  // --------------------------------------------------------------------------
  if (variant === 'compact') {
    return (
      <div className={`w-full flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs shadow-md ${className}`}>
        
        {/* Left: Active swatch & quick values */}
        <div className="flex items-center gap-2.5">
          <div className="relative group">
            <div 
              className="w-7 h-7 rounded-lg border-2 border-white/20 shadow-sm transition-transform active:scale-95 cursor-pointer flex items-center justify-center"
              style={{ 
                backgroundColor: isOffPixel ? '#121721' : selectedColor,
                boxShadow: isOffPixel ? 'none' : `0 0 10px 2px ${selectedColor}60`
              }}
              onClick={() => nativeColorInputRef.current?.click()}
              title="点击打开原生拾色器"
            >
              {isOffPixel && <Eraser className="w-3.5 h-3.5 text-slate-500" />}
            </div>
            <input 
              ref={nativeColorInputRef}
              type="color" 
              value={isOffPixel ? '#000000' : selectedColor}
              onChange={e => {
                const hex = e.target.value.toUpperCase();
                onSelectColor(hex);
              }}
              className="sr-only"
            />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-white">
              <span>{isOffPixel ? '熄灭 (橡皮擦)' : selectedColor}</span>
              {!isOffPixel && (
                <span className="text-[10px] text-slate-400 font-normal">({rgb565Hex})</span>
              )}
            </div>
            <span className="text-[10px] text-slate-400">
              {isOffPixel ? '点击点阵将擦除像素' : `RGB(${r}, ${g}, ${b})`}
            </span>
          </div>
        </div>

        {/* Center: Quick Swatches (User defined + classic) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Eraser button */}
          <button
            onClick={() => onSelectColor('#121721')}
            className={`px-2 py-1 rounded-lg border flex items-center gap-1 font-mono text-[11px] transition-all cursor-pointer ${
              isOffPixel 
                ? 'bg-slate-800 text-white border-[#E60012] ring-1 ring-[#E60012]' 
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
            title="橡皮擦：将点击或涂抹的点阵像素熄灭"
          >
            <Eraser className="w-3 h-3 text-slate-400" />
            <span>橡皮</span>
          </button>

          {/* Quick User-defined / Favorite swatches */}
          {userColors.slice(0, 10).map((c, i) => (
            <button
              key={`${c}-${i}`}
              onClick={() => onSelectColor(c)}
              className={`w-6 h-6 rounded-md transition-all cursor-pointer relative ${
                selectedColor.toLowerCase() === c.toLowerCase() 
                  ? 'scale-110 ring-2 ring-white z-10' 
                  : 'hover:scale-105 opacity-90 hover:opacity-100'
              }`}
              style={{ backgroundColor: c }}
              title={`选中常用色彩: ${c}`}
            />
          ))}

          {/* Add current color to favorites */}
          {!isOffPixel && !userColors.some(c => c.toLowerCase() === selectedColor.toLowerCase()) && (
            <button
              onClick={() => handleAddColor(selectedColor)}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 text-[11px] flex items-center gap-1 transition-all cursor-pointer"
              title="将当前画笔颜色保存到我的常用调色板"
            >
              <Plus className="w-3 h-3 text-[#E60012]" />
              <span>存入常用</span>
            </button>
          )}

          {/* Native picker trigger button */}
          <button
            onClick={() => nativeColorInputRef.current?.click()}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            title="打开色轮选取任意颜色"
          >
            <Palette className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    );
  }

  // --------------------------------------------------------------------------
  // FULL VARIANT: Complete Palette Manager for Workbench
  // --------------------------------------------------------------------------
  const activePreset = PRESET_THEMES.find(t => t.id === activeThemeId);
  const activeColorList = activeThemeId === 'user' ? userColors : (activePreset?.colors || []);

  return (
    <div className={`bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-colors ${className}`}>
      
      {/* 1. Header Bar: Active Color Status & Quick Conversion */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800 mb-3.5">
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div 
              className="w-10 h-10 rounded-xl border-2 border-slate-300 dark:border-slate-700 shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center overflow-hidden"
              style={{ 
                backgroundColor: isOffPixel ? '#121721' : selectedColor,
                boxShadow: isOffPixel ? 'none' : `0 0 14px 2px ${selectedColor}50`
              }}
              onClick={() => nativeColorInputRef.current?.click()}
              title="点击打开系统调色盘"
            >
              {isOffPixel && <Eraser className="w-5 h-5 text-slate-500" />}
            </div>
            <input 
              ref={nativeColorInputRef}
              type="color" 
              value={isOffPixel ? '#000000' : selectedColor}
              onChange={e => {
                const hex = e.target.value.toUpperCase();
                onSelectColor(hex);
                setCustomInputHex(hex);
              }}
              className="sr-only"
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-[#E60012]" />
                <span>点阵调色板</span>
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold">
                {isOffPixel ? '熄灭 (暗色遮罩)' : selectedColor}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
              <span>RGB: <strong>{r}, {g}, {b}</strong></span>
              <span>·</span>
              <span>16-bit: <strong className="text-amber-600 dark:text-amber-400">{rgb565Hex}</strong></span>
            </div>
          </div>
        </div>

        {/* Action Tools */}
        <div className="flex items-center gap-2">
          {/* Eyedropper if supported */}
          {typeof window !== 'undefined' && 'EyeDropper' in window && (
            <button
              onClick={handleEyeDropper}
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
              title="屏幕吸管拾色"
            >
              <Pipette className="w-3 h-3 text-[#E60012]" />
              <span>吸管</span>
            </button>
          )}

          {/* Copy Hex */}
          <button
            onClick={() => handleCopy(selectedColor, 'hex')}
            className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
            title="复制 Hex 颜色值"
          >
            {copiedFormat === 'hex' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span>{copiedFormat === 'hex' ? '已复制' : '复制 Hex'}</span>
          </button>

          {/* Copy RGB565 */}
          <button
            onClick={() => handleCopy(rgb565Hex, '565')}
            className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
            title="复制嵌入式 C++ 16-bit RGB565 颜色值"
          >
            {copiedFormat === '565' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span>{copiedFormat === '565' ? '已复制' : '复制 565'}</span>
          </button>

          {/* Clear canvas if callback provided */}
          {onClearCanvas && (
            <button
              onClick={onClearCanvas}
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:text-red-500 dark:hover:text-red-400 text-slate-600 dark:text-slate-300 text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
              title="清空当前帧画布所有像素"
            >
              <RotateCcw className="w-3 h-3" />
              <span>清空画布</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Theme Category Tabs & My Custom Palette Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
          
          {/* User defined palette tab */}
          <button
            onClick={() => setActiveThemeId('user')}
            className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeThemeId === 'user'
                ? 'bg-[#E60012] text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Heart className="w-3 h-3" />
            <span>我的常用预定义 ({userColors.length})</span>
          </button>

          {/* Preset themed palettes */}
          {PRESET_THEMES.map(theme => (
            <button
              key={theme.id}
              onClick={() => setActiveThemeId(theme.id)}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                activeThemeId === theme.id
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-medium shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {theme.name}
            </button>
          ))}
        </div>

        {/* Toggle color input drawer */}
        <button
          onClick={() => setIsEditorExpanded(!isEditorExpanded)}
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Sliders className="w-3 h-3 text-[#E60012]" />
          <span>{isEditorExpanded ? '收起自定义取色' : '精确输入 RGB / Hex'}</span>
        </button>
      </div>

      {/* 3. Detailed Color Editor Drawer (Exact Hex, RGB, Add to favorites) */}
      {isEditorExpanded && (
        <div className="mb-3.5 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-fadeIn">
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Hex Direct Input */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">色号 Hex:</span>
              <div className="relative">
                <input
                  type="text"
                  maxLength={7}
                  value={customInputHex}
                  onChange={e => {
                    setCustomInputHex(e.target.value);
                    const formatted = formatHex(e.target.value);
                    if (formatted) onSelectColor(formatted);
                  }}
                  placeholder="#E60012"
                  className="w-24 px-2 py-1 text-xs font-mono uppercase bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-[#E60012]"
                />
              </div>
            </div>

            {/* Quick Picker Swatch Trigger */}
            <button
              onClick={() => nativeColorInputRef.current?.click()}
              className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Palette className="w-3 h-3 text-blue-500" />
              <span>系统拾色器</span>
            </button>

            {/* Add to my predefined palette */}
            <button
              onClick={() => handleAddColor(selectedColor)}
              disabled={isOffPixel || userColors.some(c => c.toLowerCase() === selectedColor.toLowerCase())}
              className="px-3 py-1 text-xs font-semibold bg-[#E60012] hover:bg-[#CC0010] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-md flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
            >
              <Plus className="w-3 h-3" />
              <span>存入常用预定义</span>
            </button>

            {/* Reset favorites button */}
            {activeThemeId === 'user' && (
              <button
                onClick={handleResetUserColors}
                className="text-[11px] text-slate-400 hover:text-red-500 ml-auto transition-colors cursor-pointer"
                title="恢复为默认常用色彩列表"
              >
                重置预定义
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. Swatch Matrix Grid */}
      <div className="flex flex-wrap items-center gap-2 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800/80 min-h-[52px]">
        
        {/* Special Eraser / Dark Pixel Swatch */}
        <button
          onClick={() => onSelectColor('#121721')}
          className={`h-7 px-2.5 rounded-lg border flex items-center gap-1.5 font-mono text-xs transition-all cursor-pointer ${
            isOffPixel 
              ? 'bg-slate-800 text-white border-[#E60012] ring-2 ring-[#E60012]/30 scale-105' 
              : 'bg-slate-950 text-slate-400 border-slate-700 hover:text-white'
          }`}
          title="橡皮擦：点击擦除点阵像素 (熄灭)"
        >
          <Eraser className="w-3.5 h-3.5 text-slate-400" />
          <span>熄灭 (橡皮)</span>
        </button>

        {/* Palette Swatches */}
        {activeColorList.map((colorHex, idx) => {
          const isSelected = selectedColor.toLowerCase() === colorHex.toLowerCase();
          const [cr, cg, cb] = hexToRgba(colorHex);
          const c565 = '0x' + rgb565(cr, cg, cb).toString(16).padStart(4, '0').toUpperCase();

          return (
            <div key={`${colorHex}-${idx}`} className="relative group">
              <button
                onClick={() => onSelectColor(colorHex)}
                className={`w-7 h-7 rounded-lg transition-all cursor-pointer relative flex items-center justify-center ${
                  isSelected 
                    ? 'scale-115 ring-2 ring-slate-900 dark:ring-white z-10 shadow-md' 
                    : 'hover:scale-108 hover:shadow-xs'
                }`}
                style={{ 
                  backgroundColor: colorHex,
                  boxShadow: isSelected ? `0 0 10px 2px ${colorHex}80` : undefined
                }}
                title={`${colorHex} · 16-bit: ${c565}`}
              >
                {isSelected && (
                  <Check className={`w-3.5 h-3.5 ${
                    (cr * 0.299 + cg * 0.587 + cb * 0.114) > 160 ? 'text-black' : 'text-white'
                  }`} />
                )}
              </button>

              {/* Delete button on hover (only for user custom list) */}
              {activeThemeId === 'user' && userColors.length > 1 && (
                <button
                  onClick={e => handleDeleteColor(colorHex, e)}
                  title="从预定义调色板中移除此颜色"
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:scale-110 z-20 cursor-pointer"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          );
        })}

        {/* Add custom color quick swatch in 'user' tab */}
        {activeThemeId === 'user' && (
          <button
            onClick={() => {
              if (!isOffPixel) {
                handleAddColor(selectedColor);
              } else {
                nativeColorInputRef.current?.click();
              }
            }}
            className="w-7 h-7 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#E60012] text-slate-400 hover:text-[#E60012] flex items-center justify-center transition-colors cursor-pointer"
            title="添加新颜色到预定义常用色"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}

      </div>

      {/* 5. Helpful tip footer */}
      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>预定义色彩已自动保存在浏览器本地，点击色块即可在上方 8×32 屏幕直接涂抹。</span>
        </span>
        {activeThemeId === 'user' && (
          <span className="text-[10px] text-slate-400">
            悬停色块右上角可移除不需要的色彩
          </span>
        )}
      </div>

    </div>
  );
};
