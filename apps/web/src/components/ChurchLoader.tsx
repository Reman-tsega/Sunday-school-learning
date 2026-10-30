import React from 'react';
import { Church } from 'lucide-react';

interface ChurchLoaderProps {
  label?: string;
  /** "block" fills a content area; "inline" is compact for small sections */
  size?: 'block' | 'inline';
  className?: string;
}

/** Church icon inside a spinning gold ring — the app-wide loading indicator. */
export function ChurchLoader({ label, size = 'block', className = '' }: ChurchLoaderProps) {
  const ring = size === 'block' ? 'w-20 h-20' : 'w-12 h-12';
  const icon = size === 'block' ? 'w-8 h-8' : 'w-5 h-5';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center ${size === 'block' ? 'py-20' : 'py-8'} text-stone-500 dark:text-slate-400 ${className}`}
    >
      <div className={`relative ${ring} flex items-center justify-center`}>
        <span className="absolute inset-0 rounded-full border-4 border-amber-200/70 dark:border-amber-900/60" />
        <span className="absolute inset-0 rounded-full border-4 border-transparent border-t-amber-500 dark:border-t-amber-400 animate-spin motion-reduce:animate-none" />
        <Church className={`${icon} text-eotc-navy dark:text-amber-300 animate-pulse motion-reduce:animate-none`} />
      </div>
      {label ? (
        <p className="mt-4 text-xs sm:text-sm font-semibold text-center">{label}</p>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </div>
  );
}
