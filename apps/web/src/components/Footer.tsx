'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export function Footer() {
  const pathname = usePathname();
  
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="bg-stone-900 text-stone-400 py-6 text-center text-xs border-t border-stone-800">
      <p>© {new Date().getFullYear()} የኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተ ክርስቲያን ሰንበት ትምህርት ቤቶች አንድነት</p>
      <p className="mt-1 text-stone-500">EOTC Sunday School Platform — Offline-First Learning System</p>
    </footer>
  );
}
