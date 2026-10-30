const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const POLL_INTERVAL_MS = 20000;
const PING_TIMEOUT_MS = 4000;

/** The API lives on this machine (development): reaching it says nothing about the internet. */
function isLocalApi(): boolean {
  try {
    const host = new URL(API_BASE_URL).hostname;
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '[::1]' ||
      /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)
    );
  } catch {
    return false;
  }
}

/**
 * navigator.onLine only says a network interface is connected (e.g. Wi-Fi with no internet still reports
 * "online"), so reachability is confirmed with a real request:
 *  - remote API (production): the API health endpoint
 *  - local API (development): a tiny public endpoint, because localhost works with no internet at all
 */
export async function checkConnectivity(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  try {
    if (isLocalApi()) {
      // Opaque (no-cors) response is enough: any answer proves the internet is reachable
      await fetch('https://www.gstatic.com/generate_204', { mode: 'no-cors', cache: 'no-store', signal: controller.signal });
    } else {
      // Any HTTP answer (even an error status) proves the server is reachable
      await fetch(`${API_BASE_URL}/health`, { cache: 'no-store', signal: controller.signal });
    }
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Calls `onChange` immediately and whenever reachability changes. Returns an unsubscribe function. */
export function watchConnectivity(onChange: (online: boolean) => void): () => void {
  let stopped = false;
  let last: boolean | null = null;

  const run = async () => {
    const online = await checkConnectivity();
    if (stopped || online === last) return;
    last = online;
    onChange(online);
  };

  const onBrowserOffline = () => {
    last = false;
    onChange(false);
  };
  const onRecheck = () => {
    void run();
  };

  window.addEventListener('offline', onBrowserOffline);
  window.addEventListener('online', onRecheck);
  window.addEventListener('focus', onRecheck);
  document.addEventListener('visibilitychange', onRecheck);
  const interval = setInterval(() => {
    if (document.visibilityState === 'visible') void run();
  }, POLL_INTERVAL_MS);
  void run();

  return () => {
    stopped = true;
    clearInterval(interval);
    window.removeEventListener('offline', onBrowserOffline);
    window.removeEventListener('online', onRecheck);
    window.removeEventListener('focus', onRecheck);
    document.removeEventListener('visibilitychange', onRecheck);
  };
}
