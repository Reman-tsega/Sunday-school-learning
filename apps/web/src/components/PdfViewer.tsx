'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Loader2,
  Check,
  CheckCircle2,
} from 'lucide-react';
import { saveStudentProgress, getStudentProgress } from '@/lib/offline-db';
import type { TextbookAsset } from '@eotc/shared';
import { useLanguage } from '@/lib/language-context';

interface PdfViewerProps {
  chapterId: string;
  textbook: TextbookAsset;
  blob?: Blob | undefined;
  onReadingComplete?: (() => void) | undefined;
  onQuizClick?: (() => void) | undefined;
}

export function PdfViewer({
  chapterId,
  textbook,
  blob,
  onReadingComplete,
  onQuizClick,
}: PdfViewerProps) {
  const { lang } = useLanguage();

  // Document & Page state
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState<number>(textbook.totalPages || 1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [jumpPageInput, setJumpPageInput] = useState<string>('1');
  const [isLoadingDoc, setIsLoadingDoc] = useState<boolean>(true);
  const [isRenderingPage, setIsRenderingPage] = useState<boolean>(false);
  const [docError, setDocError] = useState<string | null>(null);

  // Reader Controls & View Modes
  // 'width' = fill comfortable width (ideal for reading lines)
  // 'page' = fit entire page within viewport height and width (ideal for overview / full view)
  const [fitMode, setFitMode] = useState<'width' | 'page'>('width');
  const [zoomLevel, setZoomLevel] = useState<number>(100); // 50% to 250%
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [showCompletionBanner, setShowCompletionBanner] = useState<boolean>(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);

  // References
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  // 1. Initialize PDF.js Document (Online or Offline Blob)
  useEffect(() => {
    let isCancelled = false;

    async function loadPdfDocument() {
      try {
        setIsLoadingDoc(true);
        setDocError(null);

        // Dynamically load pdfjs-dist in client
        const pdfjs = await import('pdfjs-dist');
        // Configure worker script to local public file for 100% offline support
        if (typeof window !== 'undefined') {
          pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        }

        let doc: any = null;

        if (blob) {
          // Offline mode: load directly from IndexedDB ArrayBuffer
          const arrayBuffer = await blob.arrayBuffer();
          const loadingTask = pdfjs.getDocument({
            data: arrayBuffer,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
            cMapPacked: true,
          });
          doc = await loadingTask.promise;
        } else {
          // Online mode: Stream from chapter-isolated PDF endpoint
          let url = textbook.chapterPdfUrl || textbook.fileUrl;
          if (url.includes('/uploads/')) {
            url = `/api/chapters/${chapterId}/pdf`;
          } else if (!url.startsWith('http') && !url.startsWith('/')) {
            url = `/api/chapters/${chapterId}/pdf`;
          }

          const loadingTask = pdfjs.getDocument({
            url,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
            cMapPacked: true,
          });
          doc = await loadingTask.promise;
        }

        if (isCancelled) return;

        setPdfDoc(doc);
        const docPageCount = doc.numPages;
        setTotalPages(docPageCount);

        // Restore saved reading progress
        const savedProgress = await getStudentProgress(chapterId);
        if (
          savedProgress &&
          savedProgress.lastReadPage >= 1 &&
          savedProgress.lastReadPage <= docPageCount
        ) {
          setCurrentPage(savedProgress.lastReadPage);
          setJumpPageInput(String(savedProgress.lastReadPage));
          if (savedProgress.isCompleted) {
            setIsCompleted(true);
          }
        } else {
          setCurrentPage(1);
          setJumpPageInput('1');
        }

        if (docPageCount === 1) {
          setShowCompletionBanner(true);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Failed to load chapter PDF document:', err);
          setDocError(
            err.message ||
              (lang === 'am' ? 'መጽሐፉን መጫን አልተቻለም' : 'Failed to load chapter PDF')
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingDoc(false);
        }
      }
    }

    loadPdfDocument();

    return () => {
      isCancelled = true;
    };
  }, [chapterId, textbook.fileUrl, textbook.chapterPdfUrl, blob, lang]);

  // 2. Render Page on Canvas with Robust Scaling
  const renderCurrentPage = useCallback(
    async (pageNumber: number) => {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        setIsRenderingPage(true);

        // Cancel previous page rendering task if still executing
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {
            // Task already completed or cancelled
          }
        }

        const page = await pdfDoc.getPage(pageNumber);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        // Measure available space from stage container or window
        const stage = stageRef.current;
        const stageWidth = stage?.clientWidth || containerRef.current?.clientWidth || 800;
        const stageHeight = stage?.clientHeight || 650;

        const unscaledViewport = page.getViewport({ scale: 1 });

        // Available dimensions with padding
        const paddingX = stageWidth < 640 ? 16 : 40;
        const paddingY = 32;
        const availableWidth = Math.max(260, stageWidth - paddingX);
        const availableHeight = Math.max(300, stageHeight - paddingY);

        const widthScale = availableWidth / unscaledViewport.width;
        const heightScale = availableHeight / unscaledViewport.height;

        let baseScale = widthScale;

        if (fitMode === 'page') {
          // Fit entire page (width and height) in the view area
          baseScale = Math.min(widthScale, heightScale);
        } else {
          // Fit width: constrain max width on wide monitors to ~900px for comfortable reading
          const readableWidth = Math.min(availableWidth, 920);
          baseScale = Math.max(0.4, readableWidth / unscaledViewport.width);
        }

        const zoomMultiplier = zoomLevel / 100;
        const effectiveCssScale = baseScale * zoomMultiplier;

        // High-DPI support (devicePixelRatio capped at 2.5 to save memory)
        const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2.5) : 1;
        const renderViewport = page.getViewport({ scale: effectiveCssScale * dpr });
        const cssViewport = page.getViewport({ scale: effectiveCssScale });

        // Set backing canvas pixel buffer
        canvas.width = Math.floor(renderViewport.width);
        canvas.height = Math.floor(renderViewport.height);

        // Set CSS display dimensions
        canvas.style.width = `${Math.floor(cssViewport.width)}px`;
        canvas.style.height = `${Math.floor(cssViewport.height)}px`;

        const renderContext = {
          canvasContext: ctx,
          viewport: renderViewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;

        // Preload adjacent pages for seamless page flips
        if (pageNumber < totalPages) {
          pdfDoc.getPage(pageNumber + 1).catch(() => {});
        }
        if (pageNumber > 1) {
          pdfDoc.getPage(pageNumber - 1).catch(() => {});
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn('Page render notice:', err);
        }
      } finally {
        setIsRenderingPage(false);
      }
    },
    [pdfDoc, zoomLevel, fitMode, totalPages]
  );

  // Trigger render when document is ready, or page / zoom / mode changes
  useEffect(() => {
    if (pdfDoc && !isLoadingDoc && currentPage >= 1 && currentPage <= totalPages) {
      renderCurrentPage(currentPage);
    }
  }, [pdfDoc, isLoadingDoc, currentPage, zoomLevel, fitMode, renderCurrentPage, totalPages]);

  // Handle Container Resize via ResizeObserver
  useEffect(() => {
    if (!stageRef.current) return;
    let timeoutId: any;

    const observer = new ResizeObserver(() => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (pdfDoc && !isLoadingDoc && currentPage) {
          renderCurrentPage(currentPage);
        }
      }, 120);
    });

    observer.observe(stageRef.current);

    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [pdfDoc, isLoadingDoc, currentPage, renderCurrentPage]);

  // 3. Page Turn & Progress Persistence
  const handlePageChange = (newPage: number, direction?: 'left' | 'right') => {
    if (newPage >= 1 && newPage <= totalPages) {
      setSlideDirection(direction || (newPage > currentPage ? 'left' : 'right'));
      setCurrentPage(newPage);
      setJumpPageInput(String(newPage));

      const reachedEnd = newPage === totalPages;
      if (reachedEnd) {
        setIsCompleted(true);
        setShowCompletionBanner(true);
        if (onReadingComplete) onReadingComplete();
      }

      saveStudentProgress({
        chapterId,
        lastReadPage: newPage,
        isCompleted: reachedEnd || isCompleted,
        lastStudiedAt: new Date().toISOString(),
        syncState: 'PENDING',
      });

      if (reachedEnd && typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('eotc:progress-updated', {
            detail: { chapterId, isCompleted: true },
          })
        );
      }

      setTimeout(() => setSlideDirection(null), 250);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1, 'right');
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1, 'left');
    }
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(jumpPageInput, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(1, Math.min(parsed, totalPages));
      handlePageChange(clamped);
    }
  };

  // 4. Keyboard Navigation (ArrowLeft / ArrowRight / PageUp / PageDown)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        handlePrevPage();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        handleNextPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages]);

  // 5. Touch Swipe Navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
    touchStartYRef.current = e.touches[0]?.clientY ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const touchEndX = e.changedTouches[0]?.clientX ?? 0;
    const touchEndY = e.changedTouches[0]?.clientY ?? 0;

    const diffX = touchEndX - touchStartXRef.current;
    const diffY = touchEndY - touchStartYRef.current;

    // Trigger swipe if horizontal motion dominates vertical scroll
    if (zoomLevel <= 100 && Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.3) {
      if (diffX < 0) {
        handleNextPage();
      } else {
        handlePrevPage();
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  // Fullscreen Management
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Sync fullscreen state if user exits via ESC key
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const progressPercent = Math.round((currentPage / totalPages) * 100);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`bg-stone-900 rounded-2xl shadow-xl border border-stone-800 overflow-hidden flex flex-col transition-all select-none ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none h-screen w-screen'
          : 'min-h-[650px] sm:min-h-[750px] w-full'
      }`}
    >
      {/* 1. Header Toolbar (Navigation & Controls) */}
      <div className="bg-eotc-navy text-white px-3 sm:px-5 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2.5 border-b border-amber-500/20 shrink-0">
        {/* Left: Book Title */}
        <div className="flex items-center space-x-2.5 min-w-0">
          <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-bold text-xs sm:text-sm truncate max-w-[160px] sm:max-w-xs md:max-w-md">
            {textbook.title}
          </span>
          {isCompleted && (
            <span className="hidden sm:inline-flex items-center text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-bold">
              <Check className="w-3 h-3 mr-1" />
              {lang === 'am' ? 'ተጠናቋል' : 'Completed'}
            </span>
          )}
        </div>

        {/* Center / Right: Zoom & Navigation Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5">
          {/* Fit Mode Toggle (Page vs Width) */}
          <div className="hidden sm:flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 mr-1">
            <button
              type="button"
              onClick={() => setFitMode('width')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                fitMode === 'width'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title={lang === 'am' ? 'ከስክሪኑ ስፋት ጋር አስተካክል' : 'Fit to Width'}
            >
              {lang === 'am' ? 'ስፋት' : 'Width'}
            </button>
            <button
              type="button"
              onClick={() => setFitMode('page')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                fitMode === 'page'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title={lang === 'am' ? 'ሙሉ ገጽ እይ' : 'Fit Full Page'}
            >
              {lang === 'am' ? 'ሙሉ ገጽ' : 'Full Page'}
            </button>
          </div>

          {/* Zoom controls */}
          <div className="hidden md:flex items-center space-x-1 border-r border-slate-700/80 pr-2 mr-0.5">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              title={lang === 'am' ? 'አሳንስ' : 'Zoom Out'}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono text-slate-300 w-11 text-center font-bold">
              {zoomLevel}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(250, z + 25))}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              title={lang === 'am' ? 'አሳድግ' : 'Zoom In'}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(100)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title={lang === 'am' ? 'መጠኑን መልስ' : 'Reset Zoom'}
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Previous Page Button (Desktop) */}
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1 || isLoadingDoc}
            className="hidden sm:inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
            title={lang === 'am' ? 'የቀደመው ገጽ' : 'Previous Page'}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page Jump Form */}
          <form onSubmit={handleJumpSubmit} className="flex items-center space-x-1">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpPageInput}
              onChange={(e) => setJumpPageInput(e.target.value)}
              className="w-12 bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-xs text-center text-white focus:outline-none focus:border-amber-500 font-mono font-bold"
            />
            <span className="text-xs text-slate-400">/ {totalPages}</span>
            <button
              type="submit"
              className="hidden sm:inline-block text-[11px] font-bold px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg border border-slate-700 transition"
            >
              {lang === 'am' ? 'ሂድ' : 'Go'}
            </button>
          </form>

          {/* Next Page Button (Desktop) */}
          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages || isLoadingDoc}
            className="hidden sm:inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
            title={lang === 'am' ? 'ቀጣይ ገጽ' : 'Next Page'}
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title={
              isFullscreen
                ? lang === 'am'
                  ? 'መደበኛ መጠን'
                  : 'Exit Fullscreen'
                : lang === 'am'
                ? 'ሙሉ ገጽ'
                : 'Fullscreen'
            }
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Reading Stage Container */}
      <div
        ref={stageRef}
        className="flex-1 bg-stone-950/90 relative overflow-auto flex flex-col items-center justify-start p-2 sm:p-6 min-h-[500px]"
      >
        {/* Loading Spinner Overlay */}
        {isLoadingDoc && (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 text-amber-400 bg-stone-950/95 z-20">
            <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
            <p className="text-sm font-semibold">
              {lang === 'am' ? 'የምዕራፉን መጽሐፍ በማዘጋጀት ላይ...' : 'Loading chapter textbook...'}
            </p>
          </div>
        )}

        {/* Error Display Overlay */}
        {docError && !isLoadingDoc && (
          <div className="absolute inset-0 flex items-center justify-center p-4 bg-stone-950/95 z-20">
            <div className="max-w-md p-6 bg-red-950/90 border border-red-800 rounded-2xl text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
              <h4 className="text-base font-bold text-white">
                {lang === 'am' ? 'መጽሐፉን መክፈት አልተቻለም' : "Couldn't open textbook"}
              </h4>
              <p className="text-xs text-red-200">{docError}</p>
            </div>
          </div>
        )}

        {/* Digital Book Page Rendering - Canvas is ALWAYS mounted to prevent null ref */}
        <div className="relative flex flex-col items-center justify-center w-full my-auto py-2">
          {/* Floating Left / Right Desktop Page Turn Arrows */}
          {currentPage > 1 && !isLoadingDoc && (
            <button
              onClick={handlePrevPage}
              className="hidden lg:flex absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/80 hover:bg-amber-500 text-slate-300 hover:text-slate-950 items-center justify-center backdrop-blur-sm border border-slate-700/60 shadow-xl transition z-10"
              title={lang === 'am' ? 'የቀደመው ገጽ' : 'Previous Page'}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {currentPage < totalPages && !isLoadingDoc && (
            <button
              onClick={handleNextPage}
              className="hidden lg:flex absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/80 hover:bg-amber-500 text-slate-300 hover:text-slate-950 items-center justify-center backdrop-blur-sm border border-slate-700/60 shadow-xl transition z-10"
              title={lang === 'am' ? 'ቀጣይ ገጽ' : 'Next Page'}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Page Transition & Shadow Container */}
          <div
            className={`transition-all duration-200 ease-out flex items-center justify-center shadow-2xl rounded-sm bg-white overflow-hidden ring-1 ring-black/20 ${
              slideDirection === 'left'
                ? '-translate-x-2 opacity-90'
                : slideDirection === 'right'
                ? 'translate-x-2 opacity-90'
                : 'translate-x-0 opacity-100'
            }`}
          >
            <canvas
              ref={canvasRef}
              className="block rounded-sm select-none cursor-default bg-white"
            />
          </div>

          {/* Rendering Indicator */}
          {isRenderingPage && (
            <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[11px] flex items-center space-x-1.5 shadow-md">
              <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
              <span>{lang === 'am' ? 'ገጹን በማዘጋጀት ላይ...' : 'Rendering...'}</span>
            </div>
          )}
        </div>

        {/* 3. Chapter Completion Celebratory Card */}
        {showCompletionBanner && (
          <div className="my-6 max-w-lg w-full bg-gradient-to-r from-emerald-950 via-slate-900 to-amber-950 border border-emerald-500/50 rounded-2xl p-4 sm:p-5 shadow-2xl text-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-white">
                    {lang === 'am'
                      ? 'እንኳን ደስ አለዎት! የምዕራፉን ንባብ አጠናቀዋል።'
                      : 'Congratulations! Chapter Reading Completed.'}
                  </h4>
                  <span className="text-xs text-emerald-300">
                    {lang === 'am'
                      ? `ሁሉንም ${totalPages} ገጾች አንብበው ጨርሰዋል።`
                      : `You have completed all ${totalPages} pages of this chapter.`}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowCompletionBanner(false)}
                className="text-slate-400 hover:text-white p-1 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800">
              {!isCompleted && (
                <button
                  onClick={async () => {
                    setIsCompleted(true);
                    await saveStudentProgress({
                      chapterId,
                      lastReadPage: currentPage,
                      isCompleted: true,
                      lastStudiedAt: new Date().toISOString(),
                      syncState: 'PENDING',
                    });
                    if (onReadingComplete) onReadingComplete();
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(
                        new CustomEvent('eotc:progress-updated', {
                          detail: { chapterId, isCompleted: true },
                        })
                      );
                    }
                    setShowCompletionBanner(false);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition shadow flex items-center space-x-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{lang === 'am' ? 'ትምህርቱን አጠናቅቅ' : 'Mark Completed'}</span>
                </button>
              )}
              {onQuizClick && (
                <button
                  onClick={onQuizClick}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition shadow flex items-center space-x-1.5"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{lang === 'am' ? 'የልምምድ ፈተና ጀምር' : 'Start Practice Quiz'}</span>
                </button>
              )}
              <button
                onClick={() => setShowCompletionBanner(false)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg transition"
              >
                {lang === 'am' ? 'ንባቡን ቀጥል' : 'Continue Reading'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Bottom Navigation & Mobile Toolbar */}
      <div className="bg-slate-950 border-t border-slate-800 px-3 sm:px-5 py-2.5 flex items-center justify-between gap-3 text-xs text-slate-300 shrink-0">
        {/* Mobile Page Prev Button (Touch Target >= 44px) */}
        <button
          onClick={handlePrevPage}
          disabled={currentPage <= 1 || isLoadingDoc}
          className="sm:hidden flex items-center justify-center min-w-[44px] min-h-[44px] px-3.5 rounded-xl bg-slate-800 active:bg-slate-700 text-white font-bold disabled:opacity-30 disabled:cursor-not-allowed shadow transition"
          aria-label={lang === 'am' ? 'የቀደመው ገጽ' : 'Previous Page'}
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          <span>{lang === 'am' ? 'ወደ ኋላ' : 'Back'}</span>
        </button>

        {/* Center Reading Progress & Information */}
        <div className="flex-1 flex flex-col items-center justify-center px-2">
          <div className="flex items-center space-x-2 text-xs font-semibold mb-1">
            <span className="text-white font-mono">
              {lang === 'am' ? 'ገጽ' : 'Page'} {currentPage} / {totalPages}
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-amber-400 font-mono">{progressPercent}%</span>
            {blob ? (
              <span className="text-emerald-400 hidden xs:inline font-mono">
                {lang === 'am' ? '(ከመስመር ውጭ)' : '(Offline)'}
              </span>
            ) : null}
          </div>

          {/* Thin Reading Progress Indicator */}
          <div className="w-full max-w-xs bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                isCompleted ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Mobile Page Next Button (Touch Target >= 44px) */}
        <button
          onClick={handleNextPage}
          disabled={currentPage >= totalPages || isLoadingDoc}
          className="sm:hidden flex items-center justify-center min-w-[44px] min-h-[44px] px-3.5 rounded-xl bg-amber-500 active:bg-amber-400 text-slate-950 font-bold disabled:opacity-30 disabled:cursor-not-allowed shadow transition"
          aria-label={lang === 'am' ? 'ቀጣይ ገጽ' : 'Next Page'}
        >
          <span>{lang === 'am' ? 'ቀጣይ' : 'Next'}</span>
          <ChevronRight className="w-5 h-5 ml-1" />
        </button>

        {/* Desktop Chapter Boundary Note */}
        <div className="hidden sm:flex items-center space-x-2 text-slate-400 text-[11px]">
          <span>
            {lang === 'am' ? 'የተከለለ የምዕራፍ መጽሐፍ' : 'Chapter-Isolated Textbook'}
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 font-mono">
            {currentPage} / {totalPages} {lang === 'am' ? 'ገጾች' : 'pages'}
          </span>
        </div>
      </div>
    </div>
  );
}
