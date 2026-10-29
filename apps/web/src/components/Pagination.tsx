'use client';

import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  itemName?: string;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 25, 50],
  onPageChange,
  onPageSizeChange,
  itemName,
  className = '',
}: PaginationProps) {
  const { lang } = useLanguage();

  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safeTotalPages);

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate page numbers with smart ellipsis
  const visiblePages = useMemo(() => {
    if (safeTotalPages <= 7) {
      return Array.from({ length: safeTotalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];
    pages.push(1);

    if (safeCurrentPage > 3) {
      pages.push('...');
    }

    const start = Math.max(2, safeCurrentPage - 1);
    const end = Math.min(safeTotalPages - 1, safeCurrentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (safeCurrentPage < safeTotalPages - 2) {
      pages.push('...');
    }

    pages.push(safeTotalPages);
    return pages;
  }, [safeCurrentPage, safeTotalPages]);

  if (totalItems === 0) {
    return null;
  }

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl shadow-xs text-xs sm:text-sm select-none ${className}`}
    >
      {/* Items Count Summary & Page Size Selector */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <span className="text-stone-500 dark:text-slate-400 font-medium">
          {lang === 'am' ? (
            <>
              ከ <strong className="text-stone-900 dark:text-white font-bold">{startItem}</strong>–
              <strong className="text-stone-900 dark:text-white font-bold">{endItem}</strong> ከ{' '}
              <strong className="text-stone-900 dark:text-white font-bold">{totalItems}</strong>{' '}
              {itemName || 'ውስጥ'}
            </>
          ) : (
            <>
              Showing <strong className="text-stone-900 dark:text-white font-bold">{startItem}</strong>–
              <strong className="text-stone-900 dark:text-white font-bold">{endItem}</strong> of{' '}
              <strong className="text-stone-900 dark:text-white font-bold">{totalItems}</strong>{' '}
              {itemName || 'items'}
            </>
          )}
        </span>

        {/* Page Size Selector */}
        {onPageSizeChange && (
          <div className="flex items-center space-x-1.5 pl-2 border-l border-stone-200 dark:border-slate-800">
            <span className="text-[11px] text-stone-400 dark:text-slate-500 hidden sm:inline">
              {lang === 'am' ? 'በገጽ፦' : 'Per page:'}
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="py-1 px-2 rounded-lg bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-800 text-stone-800 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              aria-label="Items per page"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={safeCurrentPage === 1}
          className="p-1.5 rounded-lg border border-stone-200 dark:border-slate-800 hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition hidden sm:inline-flex"
          title={lang === 'am' ? 'የመጀመሪያ ገጽ' : 'First page'}
          aria-label="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage === 1}
          className="p-1.5 px-2.5 rounded-xl border border-stone-200 dark:border-slate-800 hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center space-x-1 font-semibold text-xs cursor-pointer"
          title={lang === 'am' ? 'ቀዳሚ ገጽ' : 'Previous page'}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{lang === 'am' ? 'ቀዳሚ' : 'Prev'}</span>
        </button>

        {/* Page Numbers (Tablet / Desktop) */}
        <div className="hidden sm:flex items-center gap-1 px-1">
          {visiblePages.map((page, idx) => {
            if (typeof page === 'string') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 py-1 text-stone-400 dark:text-slate-500 text-xs"
                >
                  •••
                </span>
              );
            }

            const isCurrent = page === safeCurrentPage;
            return (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                  isCurrent
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 border border-transparent hover:border-stone-200 dark:hover:border-slate-700'
                }`}
                aria-current={isCurrent ? 'page' : undefined}
              >
                {page}
              </button>
            );
          })}
        </div>

        {/* Mobile Page Indicator */}
        <div className="sm:hidden px-2 text-xs font-bold text-stone-700 dark:text-slate-200">
          {safeCurrentPage} / {safeTotalPages}
        </div>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage === safeTotalPages}
          className="p-1.5 px-2.5 rounded-xl border border-stone-200 dark:border-slate-800 hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center space-x-1 font-semibold text-xs cursor-pointer"
          title={lang === 'am' ? 'ቀጣይ ገጽ' : 'Next page'}
          aria-label="Next page"
        >
          <span className="hidden sm:inline">{lang === 'am' ? 'ቀጣይ' : 'Next'}</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(safeTotalPages)}
          disabled={safeCurrentPage === safeTotalPages}
          className="p-1.5 rounded-lg border border-stone-200 dark:border-slate-800 hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition hidden sm:inline-flex"
          title={lang === 'am' ? 'የመጨረሻ ገጽ' : 'Last page'}
          aria-label="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
