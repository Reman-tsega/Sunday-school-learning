'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export function Footer() {
  const pathname = usePathname();
  
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 py-6 text-center text-xs border-t border-stone-200 dark:border-stone-800 transition-colors">
      <p>© {new Date().getFullYear()} የኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተ ክርስቲያን ሰንበት ትምህርት ቤቶች አንድነት</p>
      <p className="mt-1 text-stone-500 dark:text-stone-400">EOTC Sunday School Platform — Offline-First Learning System</p>
    </footer>
  );
}
