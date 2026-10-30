'use client';

import React, { useEffect, useRef, useState } from 'react';

/** Fades/slides its children in once when scrolled into view. Respects reduced-motion (via CSS) and works without JS observers. */
export function Reveal({ children, delayMs = 0, className = '' }: { children: React.ReactNode; delayMs?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: shown ? `${delayMs}ms` : '0ms' }}
      className={`transition duration-500 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 motion-reduce:opacity-100'
      } ${className}`}
    >
      {children}
    </div>
  );
}

/** Quiet ornamental divider: gold rules around a small cross. */
export function CrossDivider() {
  return (
    <div className="flex items-center justify-center gap-3 text-amber-500/80 dark:text-amber-400/70" aria-hidden="true">
      <span className="h-px w-16 sm:w-28 bg-gradient-to-r from-transparent to-amber-500/60" />
      <span className="text-base leading-none">✞</span>
      <span className="h-px w-16 sm:w-28 bg-gradient-to-l from-transparent to-amber-500/60" />
    </div>
  );
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  subtitle,
  align = 'center',
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'center' | 'left';
}) {
  return (
    <div className={`space-y-2 ${align === 'center' ? 'text-center mx-auto' : ''} max-w-2xl`}>
      {eyebrow && (
        <p className="text-[11px] sm:text-xs uppercase tracking-widest font-bold text-amber-700 dark:text-amber-400">{eyebrow}</p>
      )}
      <h2 id={id} className="text-xl sm:text-3xl font-extrabold text-stone-900 dark:text-white leading-snug">{title}</h2>
      {subtitle && <p className="text-sm sm:text-base text-stone-600 dark:text-slate-300 leading-relaxed">{subtitle}</p>}
    </div>
  );
}
