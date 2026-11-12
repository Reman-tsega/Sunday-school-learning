'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { InstallLink } from '@/components/InstallApp';

export function Footer() {
  const pathname = usePathname();
  
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 py-6 text-center text-xs border-t border-stone-200 dark:border-stone-800 transition-colors">
      <p>© {new Date().getFullYear()} ሰንበት ትምህርት ቤት ኮርስ መማርያ</p>
      <p className="mt-1 text-stone-500 dark:text-stone-400">Sunday School Course Learning — Offline-First Learning System</p>
      <p className="mt-1 text-stone-500 dark:text-stone-400">
        Developed by{' '}
        <a
          href="https://haile-dev-portifoli.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-amber-700 hover:underline dark:text-amber-400"
        >
          haile-dev-portifoli.vercel.app
        </a>
      </p>
      <div className="tg-hide mt-3 flex justify-center">
        <InstallLink />
      </div>
    </footer>
  );
}
