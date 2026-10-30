'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import { usePwaInstall } from '@/lib/pwa-install';

const SEEN_KEY = 'eotc_install_prompt_seen';

/** Labeled "Install app" link for the footer. Hidden when the app is already installed or cannot be installed. */
export function InstallLink({ className = '' }: { className?: string }) {
  const { canInstall, install } = usePwaInstall();
  const { lang } = useLanguage();
  if (!canInstall) return null;

  return (
    <button
      type="button"
      onClick={() => void install()}
      className={`inline-flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 transition hover:bg-amber-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer ${className}`}
    >
      <Download className="w-3.5 h-3.5" aria-hidden="true" />
      {lang === 'am' ? 'መተግበሪያውን ጫን' : 'Install app'}
    </button>
  );
}

/** First-visit, skippable invitation to install + the iOS "Add to Home Screen" guide. */
export function InstallPrompt() {
  const { canInstall, install, iosGuideOpen, closeIosGuide, isIOS } = usePwaInstall();
  const { lang } = useLanguage();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!canInstall || pathname?.startsWith('/admin')) {
      setVisible(false);
      return undefined;
    }
    let seen = false;
    try {
      seen = localStorage.getItem(SEEN_KEY) === '1';
    } catch {
      /* storage unavailable: still show once per session */
    }
    if (seen) return undefined;
    const timer = setTimeout(() => setVisible(true), 3500);
    return () => clearTimeout(timer);
  }, [canInstall, pathname]);

  const markSeen = () => {
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  const handleInstall = async () => {
    markSeen();
    await install();
  };

  return (
    <>
      {visible && (
        <div
          role="dialog"
          aria-label={lang === 'am' ? 'መተግበሪያውን ጫን' : 'Install app'}
          className="fixed z-[60] inset-x-3 bottom-3 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 shadow-2xl p-4 animate-in slide-in-from-bottom-4 fade-in duration-300"
        >
          <button
            type="button"
            onClick={markSeen}
            aria-label={lang === 'am' ? 'ዝጋ' : 'Close'}
            className="absolute top-2.5 right-2.5 p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start gap-3 pr-5">
            <div className="w-11 h-11 rounded-xl bg-eotc-navy text-amber-300 flex items-center justify-center text-xl font-bold shrink-0">
              ✞
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-stone-900 dark:text-white">
                {lang === 'am' ? 'መተግበሪያውን ይጫኑ' : 'Install the app'}
              </h3>
              <p className="text-xs text-stone-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                {lang === 'am'
                  ? 'ፈጣን መዳረሻ እና ያለ ኢንተርኔት ለማጥናት ወደ መነሻ ገጽዎ ያክሉት።'
                  : 'Get quick access from your home screen and study offline.'}
              </p>
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={markSeen}
              className="px-3.5 py-2 rounded-lg text-xs font-bold text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              {lang === 'am' ? 'አሁን አይደለም' : 'Not now'}
            </button>
            <button
              type="button"
              onClick={() => void handleInstall()}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{lang === 'am' ? 'ጫን' : 'Install'}</span>
            </button>
          </div>
        </div>
      )}

      {iosGuideOpen && isIOS && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-3 bg-slate-950/60 backdrop-blur-xs" onClick={closeIosGuide}>
          <div
            role="dialog"
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 shadow-2xl p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-stone-900 dark:text-white">
                {lang === 'am' ? 'ወደ መነሻ ገጽ ያክሉ' : 'Add to Home Screen'}
              </h3>
              <button type="button" onClick={closeIosGuide} aria-label="Close" className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <ol className="space-y-3 text-xs text-stone-700 dark:text-slate-200">
              <li className="flex items-center gap-2.5">
                <Share className="w-5 h-5 text-blue-500 shrink-0" />
                <span>{lang === 'am' ? 'በSafari ታችኛው ክፍል ያለውን «አጋራ» ቁልፍ ይንኩ' : 'Tap the Share button in Safari’s toolbar'}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <PlusSquare className="w-5 h-5 text-stone-700 dark:text-slate-200 shrink-0" />
                <span>{lang === 'am' ? '«ወደ መነሻ ገጽ አክል» ይምረጡ' : 'Choose “Add to Home Screen”'}</span>
              </li>
            </ol>
            <button
              type="button"
              onClick={closeIosGuide}
              className="w-full py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer"
            >
              {lang === 'am' ? 'ገባኝ' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
