/**
 * Routes the app's relative `/api/...` calls to an absolute backend when there is no dev
 * proxy in front of them.
 *
 * In the browser, Vite proxies `/api` to http://localhost:5001, so every call site can use a
 * relative path. Inside the native Capacitor shell there is no proxy: the WebView is served
 * from `https://localhost`, so a relative `/api/orders` resolves against that origin and
 * fails. Rather than rewriting the ~50 scattered `fetch("/api/...")` call sites (and having
 * to remember the rule for every new one), the base URL is applied once here by wrapping
 * fetch. Behaviour is unchanged when VITE_API_BASE_URL is unset, which is the web build.
 *
 * Set it at build time:
 *     apps/web/.env.production   ->   VITE_API_BASE_URL=https://api.yourdomain.com
 */

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim();
export const API_BASE_URL = RAW_BASE.replace(/\/+$/, '');

/** True when running inside the native Capacitor shell rather than a normal browser tab. */
export function isNativeApp() {
  return Boolean(globalThis.Capacitor?.isNativePlatform?.());
}

function absolutise(url) {
  return typeof url === 'string' && url.startsWith('/api') ? API_BASE_URL + url : url;
}

export function installApiBaseUrl() {
  if (!API_BASE_URL) {
    // No base configured. Fine for the web build (Vite proxies /api); a problem only for a
    // native build, where every API call would otherwise hit the WebView's own origin.
    if (isNativeApp()) {
      console.warn(
        '[apiBase] Running natively with no VITE_API_BASE_URL set — API calls will fail. ' +
        'Rebuild with VITE_API_BASE_URL pointing at your hosted backend.'
      );
    }
    return;
  }

  const nativeFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (input, init) => {
    if (typeof input === 'string') return nativeFetch(absolutise(input), init);
    if (input instanceof URL) return nativeFetch(absolutise(input.toString()), init);
    // Request objects carry an already-resolved absolute .url, so rebuild only when the
    // resolved path is one of ours and points at the WebView's own origin.
    if (typeof Request !== 'undefined' && input instanceof Request) {
      try {
        const parsed = new URL(input.url);
        if (parsed.pathname.startsWith('/api') && parsed.origin === globalThis.location?.origin) {
          return nativeFetch(new Request(API_BASE_URL + parsed.pathname + parsed.search, input), init);
        }
      } catch { /* fall through to the untouched request */ }
    }
    return nativeFetch(input, init);
  };

  console.info(`[apiBase] API calls routed to ${API_BASE_URL}`);
}
