'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChurchLoader } from '@/components/ChurchLoader';
import { useLanguage } from '@/lib/language-context';

const MIN_VISIBLE_MS = 350;
const SAFETY_TIMEOUT_MS = 10000;

/**
 * Page-transition overlay: appears as soon as an in-app link is clicked and
 * disappears once the new route has rendered.
 */
export function NavigationLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();
  const [navigating, setNavigating] = useState(false);
  const startedAt = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const routeKey = `${pathname}?${searchParams?.toString() ?? ''}`;

  // Start: any click on an internal link that leads to a different URL
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest?.('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      startedAt.current = Date.now();
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setNavigating(true);
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
      safetyTimer.current = setTimeout(() => setNavigating(false), SAFETY_TIMEOUT_MS);
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // Finish: the route changed, so the new page is rendering
  useEffect(() => {
    if (!navigating) return;
    const elapsed = Date.now() - startedAt.current;
    hideTimer.current = setTimeout(() => setNavigating(false), Math.max(0, MIN_VISIBLE_MS - elapsed));
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  useEffect(
    () => () => {
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
    },
    []
  );

  if (!navigating) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 top-14 sm:top-16 z-40 bg-stone-50/80 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-150"
      aria-hidden="true"
    >
      <ChurchLoader label={lang === 'am' ? 'በመጫን ላይ...' : 'Loading...'} />
    </div>
  );
}
