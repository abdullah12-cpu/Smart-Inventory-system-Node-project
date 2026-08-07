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

// ─── Session token ──────────────────────────────────────────────────────────
// Privileged endpoints derive the caller's role from this signed token rather than from
// anything in the request body, so it has to travel with every API call. Attaching it
// centrally (like the base URL above) means no call site has to remember to.

const TOKEN_KEY = 'ciq_auth_token';

export function setAuthToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* private mode / storage disabled */ }
}

export function getAuthToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function clearAuthToken() {
  setAuthToken(null);
}

function withAuthHeader(init, url) {
  const token = getAuthToken();
  // Only attach to our own API. Sending it to third parties would leak the session.
  const isOurApi = typeof url === 'string' && (url.startsWith('/api') || (API_BASE_URL && url.startsWith(API_BASE_URL + '/api')));
  if (!token || !isOurApi) return init;
  const headers = new Headers(init?.headers || {});
  if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  return { ...init, headers };
}

/**
 * Wraps fetch once to do two things for every API call: apply the base URL (native builds
 * only) and attach the session token (always). Installed unconditionally, because the token
 * is needed even in the plain web build where Vite proxies /api and no base URL is set.
 */
export function installApiBaseUrl() {
  if (!API_BASE_URL && isNativeApp()) {
    console.warn(
      '[apiBase] Running natively with no VITE_API_BASE_URL set — API calls will fail. ' +
      'Rebuild with VITE_API_BASE_URL pointing at your hosted backend.'
    );
  }

  const nativeFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (input, init) => {
    if (typeof input === 'string') {
      return nativeFetch(absolutise(input), withAuthHeader(init, input));
    }
    if (input instanceof URL) {
      const asString = input.toString();
      return nativeFetch(absolutise(asString), withAuthHeader(init, asString));
    }
    // Request objects carry an already-resolved absolute .url, so rebuild only when the
    // resolved path is one of ours and points at this page's own origin.
    if (typeof Request !== 'undefined' && input instanceof Request) {
      try {
        const parsed = new URL(input.url);
        if (parsed.pathname.startsWith('/api') && parsed.origin === globalThis.location?.origin) {
          const target = (API_BASE_URL || parsed.origin) + parsed.pathname + parsed.search;
          const token = getAuthToken();
          const req = new Request(target, input);
          if (token && !req.headers.has('Authorization')) req.headers.set('Authorization', `Bearer ${token}`);
          return nativeFetch(req, init);
        }
      } catch { /* fall through to the untouched request */ }
    }
    return nativeFetch(input, init);
  };

  if (API_BASE_URL) console.info(`[apiBase] API calls routed to ${API_BASE_URL}`);
}
