'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

interface ParsedOption {
  value: string;
  label: string;
  disabled: boolean;
}

function textOf(node: React.ReactNode): string {
  return React.Children.toArray(node)
    .map((c) => (typeof c === 'string' || typeof c === 'number' ? String(c) : React.isValidElement(c) ? textOf((c.props as { children?: React.ReactNode }).children) : ''))
    .join('');
}

function parseOptions(children: React.ReactNode): ParsedOption[] {
  const out: ParsedOption[] = [];
  const walk = (nodes: React.ReactNode) => {
    React.Children.forEach(nodes, (child) => {
      if (!React.isValidElement(child)) return;
      const props = child.props as { value?: string | number; children?: React.ReactNode; disabled?: boolean };
      if (child.type === 'option') {
        const label = textOf(props.children);
        out.push({ value: props.value !== undefined ? String(props.value) : label, label, disabled: !!props.disabled });
      } else if (props.children) {
        walk(props.children); // fragments / optgroups
      }
    });
  };
  walk(children);
  return out;
}

export interface SelectProps {
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  id?: string;
  title?: string;
  required?: boolean;
  'aria-label'?: string;
}

/**
 * Drop-in replacement for a native <select>: same value/onChange(e.target.value)/<option> API,
 * but the list is rendered by the app so it matches the trigger width and stays inside the screen on mobile.
 */
export function Select({ value, onChange, children, className = '', disabled, id, title, required, 'aria-label': ariaLabel }: SelectProps) {
  const options = useMemo(() => parseOptions(children), [children]);
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ left: number; top: number; width: number; maxHeight: number; above: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const current = String(value);
  const selected = options.find((o) => o.value === current);

  const measure = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margin = 8;
    const width = Math.min(Math.max(r.width, 112), window.innerWidth - margin * 2);
    const left = Math.min(Math.max(r.left, margin), window.innerWidth - width - margin);
    const spaceBelow = window.innerHeight - r.bottom - margin;
    const spaceAbove = r.top - margin;
    const above = spaceBelow < 180 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(120, Math.min(280, above ? spaceAbove : spaceBelow));
    setRect({ left, top: above ? r.top : r.bottom, width, maxHeight, above });
  }, []);

  useLayoutEffect(() => {
    if (open) measure();
  }, [open, measure]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onScroll = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return; // scrolling inside the list
      measure();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, measure]);

  const choose = (v: string) => {
    setOpen(false);
    if (v === current) return;
    onChange({ target: { value: v }, currentTarget: { value: v } } as unknown as React.ChangeEvent<HTMLSelectElement>);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        title={title}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        style={{ paddingRight: '2rem' }}
        className={`relative text-left truncate disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        <span className="block truncate">{selected?.label ?? ''}</span>
        <ChevronDown
          className={`w-4 h-4 text-stone-400 dark:text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open &&
        rect &&
        typeof document !== 'undefined' &&
        createPortal(
          <ul
            ref={menuRef}
            role="listbox"
            style={{
              position: 'fixed',
              left: rect.left,
              width: rect.width,
              maxHeight: rect.maxHeight,
              ...(rect.above ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.top + 6 }),
            }}
            className="z-[100] overflow-y-auto bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl shadow-xl p-1 animate-in fade-in duration-100"
          >
            {options.map((o) => {
              const active = o.value === current;
              return (
                <li key={o.value} role="option" aria-selected={active} aria-disabled={o.disabled}>
                  <button
                    type="button"
                    disabled={o.disabled}
                    onClick={() => choose(o.value)}
                    className={`w-full flex items-center justify-between gap-2 px-3 min-h-[40px] rounded-lg text-xs font-semibold text-left transition disabled:opacity-40 ${
                      active
                        ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300'
                        : 'text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate">{o.label}</span>
                    {active && <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </>
  );
}
