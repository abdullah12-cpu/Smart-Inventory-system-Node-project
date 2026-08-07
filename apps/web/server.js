/**
 * Single-origin production server: serves the built web app AND proxies /api to the
 * backend, so the whole product is reachable through one host and one port.
 *
 * Why this matters for mobile: with the app and its API on the same origin, exposing this
 * one server (a tunnel, or a real deploy) yields a single HTTPS URL that works everywhere --
 * mobile browsers on iOS and Android, "Add to Home Screen" installs, and the Capacitor
 * native shells. Without the proxy the frontend and API are two different hosts, which means
 * two public URLs, a build-time base URL, and CORS to configure.
 *
 *   npm run build && node server.js       -> http://localhost:3000
 */

const express = require('express');
const http = require('http');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_TARGET = process.env.API_TARGET || 'http://localhost:5001';

const { hostname: apiHost, port: apiPort } = new URL(API_TARGET);

// ── API proxy ───────────────────────────────────────────────────────────────
// Hand-rolled with http.request rather than a proxy library specifically so responses are
// piped through untouched: the TTS endpoint streams audio chunks as they are generated, and
// any buffering here would reintroduce the very latency that streaming exists to remove.
// Registered before the static handler so /api never falls through to the SPA fallback.
app.use('/api', (req, res) => {
  const proxyReq = http.request(
    {
      hostname: apiHost,
      port: apiPort || 80,
      // req.url is already stripped of the '/api' mount point by express.
      path: '/api' + req.url,
      method: req.method,
      headers: { ...req.headers, host: `${apiHost}:${apiPort || 80}` },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (err) => {
    console.error(`[proxy] ${req.method} ${req.url} -> ${err.message}`);
    if (!res.headersSent) {
      res.status(502).json({ success: false, error: `API unreachable: ${err.message}` });
    } else {
      res.destroy();
    }
  });

  // Abandon the upstream request if the client hangs up, so a closed tab or a phone
  // dropping off Wi-Fi mid-response doesn't leave the socket open.
  res.on('close', () => { if (!res.writableEnded) proxyReq.destroy(); });

  req.pipe(proxyReq);
});

// ── Static assets ───────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist')));

// ── Two apps, two entry points ──────────────────────────────────────────────
// /mobile serves the assistant-only bundle; everything else serves the website. They are
// separate builds (see vite.config.js), so this is a genuine fork, not a route inside one
// app -- a request under /mobile can never resolve to the website's HTML and vice versa.
//
// Written as middleware rather than app.get('*') because Express 5 removed the bare '*'
// path pattern -- it throws "Missing parameter name" at startup, which stopped this server
// from booting at all. Limited to GET so a mis-pathed POST still surfaces as a 404.
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();

  const entry = req.path === '/mobile' || req.path.startsWith('/mobile/')
    ? 'mobile.html'
    : 'index.html';

  res.sendFile(path.join(__dirname, 'dist', entry));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`CommerceIQ server running on http://localhost:${PORT}`);
  console.log(`  /api  ->  ${API_TARGET}`);
  console.log(`  website:      http://localhost:${PORT}/`);
  console.log(`  mobile app:   http://localhost:${PORT}/mobile`);
});
