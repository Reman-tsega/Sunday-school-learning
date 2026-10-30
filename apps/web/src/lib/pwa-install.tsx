'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PwaInstallContextValue {
  /** The app can be installed right now (native prompt available, or iOS manual install) */
  canInstall: boolean;
  /** Running as an installed app already */
  isInstalled: boolean;
  /** iOS Safari: install is manual (Share → Add to Home Screen) */
  isIOS: boolean;
  /** Triggers the native install prompt, or opens the iOS guide when no prompt is available */
  install: () => Promise<void>;
  iosGuideOpen: boolean;
  closeIosGuide: () => void;
}

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /iphone|ipad|ipod/i.test(ua) || iPadOS;
}

export function PwaInstallProvider({ children }: { children: React.ReactNode }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [iosGuideOpen, setIosGuideOpen] = useState(false);

  useEffect(() => {
    setIsInstalled(detectStandalone());
    setIsIOS(detectIOS());

    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // keep the event so we can show our own UI
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    // Offline support / installability: register the service worker in production builds only
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null); // a prompt event can only be used once
      if (choice.outcome === 'accepted') setIsInstalled(true);
      return;
    }
    if (isIOS) setIosGuideOpen(true);
  }, [deferred, isIOS]);

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      canInstall: !isInstalled && (deferred !== null || isIOS),
      isInstalled,
      isIOS,
      install,
      iosGuideOpen,
      closeIosGuide: () => setIosGuideOpen(false),
    }),
    [deferred, isInstalled, isIOS, install, iosGuideOpen]
  );

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
}

export function usePwaInstall(): PwaInstallContextValue {
  const ctx = useContext(PwaInstallContext);
  if (!ctx) throw new Error('usePwaInstall must be used inside PwaInstallProvider');
  return ctx;
}
