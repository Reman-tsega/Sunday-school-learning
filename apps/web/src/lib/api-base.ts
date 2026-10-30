/**
 * Base URL of the API, always ending without a trailing slash.
 *
 * NEXT_PUBLIC_API_URL is used when it is a real http(s) URL. If it is missing or still a placeholder
 * (for example "https://<your-render-api>.onrender.com/api"), production falls back to the same-origin
 * "/api" path, which the web server proxies to the backend (see API_ORIGIN in next.config.mjs).
 */
function resolveApiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || '').trim();
  if (/^https?:\/\/[^\s<>]+$/i.test(raw)) {
    try {
      new URL(raw);
      return raw.replace(/\/+$/, '');
    } catch {
      /* fall through to the default */
    }
  }
  return process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:4000/api';
}

export const API_BASE_URL = resolveApiBaseUrl();
