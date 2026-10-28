'use client';

import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import { useLanguage } from '@/lib/language-context';

interface ThemeToggleProps {
  variant?: 'pill' | 'compact' | 'icon';
  className?: string;
}

export function ThemeToggle({ variant = 'pill', className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const { lang } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render placeholder with same dimensions to prevent layout shift before hydration
    return (
      <div
        className={
          variant === 'icon' || variant === 'compact'
            ? 'w-7 h-7 rounded-full bg-slate-800/50'
            : 'h-7 w-16 rounded-full bg-slate-800/50'
        }
      />
    );
  }

  const isDark = theme === 'dark';
  const labelAm = isDark ? 'ቀን' : 'ሌሊት';
  const labelEn = isDark ? 'Day' : 'Night';
  const tooltip = isDark
    ? (lang === 'am' ? 'ወደ የቀን እይታ ቀይር (Switch to Day Mode)' : 'Switch to Day Mode')
    : (lang === 'am' ? 'ወደ የሌሊት እይታ ቀይር (Switch to Night Mode)' : 'Switch to Night Mode');

  if (variant === 'compact' || variant === 'icon') {
    return (
      <button
        onClick={toggleTheme}
        className={`p-1.5 rounded-full text-amber-300 hover:text-amber-200 bg-slate-800/90 hover:bg-slate-750 border border-amber-500/30 hover:border-amber-400/60 transition shadow-xs cursor-pointer flex items-center justify-center ${className}`}
        title={tooltip}
        aria-label={tooltip}
      >
        {isDark ? (
          <Sun className="w-3.5 h-3.5 text-amber-400 animate-in spin-in-180 duration-300" />
        ) : (
          <Moon className="w-3.5 h-3.5 text-amber-300 animate-in spin-in-180 duration-300" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800/90 hover:bg-slate-750 text-amber-300 border border-amber-500/30 hover:border-amber-400/60 shadow-xs transition cursor-pointer shrink-0 ${className}`}
      title={tooltip}
      aria-label={tooltip}
    >
      {isDark ? (
        <Sun className="w-3.5 h-3.5 text-amber-400 animate-in spin-in-180 duration-300 shrink-0" />
      ) : (
        <Moon className="w-3.5 h-3.5 text-amber-300 animate-in spin-in-180 duration-300 shrink-0" />
      )}
      <span className="font-bold text-[11px] sm:text-xs">
        {lang === 'am' ? labelAm : labelEn}
      </span>
    </button>
  );
}
