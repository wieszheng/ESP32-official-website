import React from 'react';
import { Cpu, Terminal, Github, Sun, Moon, Star } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useGitHubStar } from '../context/GitHubStarContext';

interface NavbarProps {
  onOpenFlasher: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenFlasher }) => {
  const { theme, toggleTheme } = useTheme();
  const { formattedStars, isStarred, toggleStar } = useGitHubStar();

  return (
    <header className="sticky top-0 z-50 w-full bg-white/85 dark:bg-[#090D14]/90 backdrop-blur-md border-b border-slate-200 dark:border-white/10 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Zone 1: Brand Wordmark (Single element) */}
        <a href="#" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-[#E60012]/15 border border-[#E60012]/40 flex items-center justify-center text-[#E60012] group-hover:bg-[#E60012] group-hover:text-white transition-colors duration-200">
            <Cpu className="w-4 h-4" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white font-display">
            ESP-PixelMatrix
          </span>
        </a>

        {/* Zone 2: Navigation Links (Text with hover states) */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
          <a href="#overview" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            产品总览
          </a>
          <a href="#simulator" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            像素模拟器
          </a>
          <a href="#hardware" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            硬件解构
          </a>
          <a href="#ecosystem" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            AIoT生态
          </a>
          <a href="#developer" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            固件与开发
          </a>
          <a href="#specs" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            规格参数
          </a>
        </nav>

        {/* Zone 3: Primary Actions + Theme Switcher */}
        <div className="flex items-center gap-2.5">
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? '切换至亮色模式' : '切换至暗色模式'}
            title={theme === 'dark' ? '切换至亮色主题' : '切换至暗色主题'}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {/* GitHub Star Badge Button */}
          <a
            href="https://github.com/espressif"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap group"
          >
            <Github className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 group-hover:scale-105 transition-transform" />
            <span>Star</span>
            <span className="inline-flex items-center gap-1 pl-1.5 border-l border-slate-300 dark:border-slate-700 font-mono text-[11px] font-semibold text-slate-900 dark:text-slate-200 tabular-nums">
              <Star className={`w-3 h-3 ${isStarred ? 'fill-amber-400 text-amber-400' : 'text-amber-500 dark:text-amber-400'}`} />
              {formattedStars}
            </span>
          </a>

          <button
            onClick={onOpenFlasher}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#E60012] hover:bg-[#CC0010] active:scale-95 rounded-lg shadow-sm shadow-red-950/20 dark:shadow-red-950/50 transition-all duration-150 whitespace-nowrap"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>网页一键烧录</span>
          </button>
        </div>
      </div>
    </header>
  );
};


