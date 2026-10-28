'use client';

import React from 'react';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import type { PackageDownloadStatus } from '@eotc/shared';
import { useLanguage } from '@/lib/language-context';

interface OfflineBadgeProps {
  status: PackageDownloadStatus;
  showText?: boolean;
  className?: string;
}

export function OfflineBadge({ status, showText = false, className = '' }: OfflineBadgeProps) {
  const { lang } = useLanguage();

  if (status === 'AVAILABLE_OFFLINE') {
    return (
      <span
        title={lang === 'am' ? 'ከመስመር ውጭ ይገኛል' : 'Available Offline'}
        aria-label={lang === 'am' ? 'ከመስመር ውጭ ይገኛል' : 'Available Offline'}
        className={`inline-flex items-center justify-center p-1 sm:px-1.5 sm:py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs shrink-0 cursor-default ${className}`}
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        {showText && (
          <span className="hidden sm:inline text-[11px] ml-1">
            {lang === 'am' ? 'ከመስመር ውጭ' : 'Offline'}
          </span>
        )}
      </span>
    );
  }

  if (status === 'DOWNLOADING') {
    return (
      <span
        title={lang === 'am' ? 'በማውረድ ላይ...' : 'Downloading...'}
        aria-label={lang === 'am' ? 'በማውረድ ላይ...' : 'Downloading...'}
        className={`inline-flex items-center justify-center p-1 sm:px-1.5 sm:py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300 animate-pulse shrink-0 cursor-default ${className}`}
      >
        <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        {showText && (
          <span className="hidden sm:inline text-[11px] ml-1">
            {lang === 'am' ? 'በማውረድ ላይ' : 'Downloading'}
          </span>
        )}
      </span>
    );
  }

  if (status === 'FAILED' || status === 'PARTIALLY_DOWNLOADED') {
    return (
      <span
        title={lang === 'am' ? 'ያልተሟላ ማውረድ' : 'Incomplete Download'}
        aria-label={lang === 'am' ? 'ያልተሟላ ማውረድ' : 'Incomplete Download'}
        className={`inline-flex items-center justify-center p-1 sm:px-1.5 sm:py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300 shrink-0 cursor-default ${className}`}
      >
        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        {showText && (
          <span className="hidden sm:inline text-[11px] ml-1">
            {lang === 'am' ? 'ያልተሟላ' : 'Incomplete'}
          </span>
        )}
      </span>
    );
  }

  return null;
}
