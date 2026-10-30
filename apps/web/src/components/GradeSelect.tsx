'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface GradeSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface GradeSelectProps {
  value: string;
  options: GradeSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
}

/** Touch-friendly listbox that matches the trigger width (replaces the native OS picker). */
export function GradeSelect({ value, options, onChange, ariaLabel }: GradeSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex-1 min-w-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="w-full flex items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 text-stone-900 dark:text-white text-xs font-bold py-2.5 pl-3 pr-2.5 rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
      >
        <span className="flex items-center gap-2 min-w-0">
          {selected?.icon}
          <span className="truncate">{selected?.label}</span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-stone-400 dark:text-slate-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-64 overflow-y-auto bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl shadow-xl p-1 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <li key={o.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 min-h-[44px] rounded-lg text-xs font-semibold text-left transition ${
                    active
                      ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300'
                      : 'text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {o.icon}
                    <span className="truncate">{o.label}</span>
                  </span>
                  {active && <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
