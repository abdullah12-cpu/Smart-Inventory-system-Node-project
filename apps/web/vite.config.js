import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// `--mode mobile` (npm run dev:mobile) turns on HTTPS. Browsers expose the microphone only
// in a secure context, and "secure" excludes plain http:// on a LAN IP -- so voice input in
// the mobile chat (?page=mobile) is dead over http://<laptop-ip>:5173 no matter what
// permissions are granted. Serving the dev site over HTTPS with a self-signed cert is what
// makes the mic reachable from a phone. Off by default so plain `npm run dev` keeps working
// without certificate warnings. Mode is used rather than an env var so the flag behaves the
// same in cmd.exe, PowerShell and bash.
// In dev there is no server.js in front of Vite, so /mobile has to be mapped to the second
// entry's HTML here. Without it `npm run dev` would 404 on /mobile while the production
// server served it fine -- exactly the kind of dev/prod divergence that hides bugs until
// after a deploy.
function serveMobileEntryInDev() {
  return {
    name: 'serve-mobile-entry-in-dev',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const [pathname] = (req.url || '').split('?');
        if (pathname === '/mobile' || pathname === '/mobile/') req.url = '/mobile.html';
        next();
      });
    },
  };
}

// Capacitor's WebView always boots `index.html` from the bundle -- there is no "start file"
// setting. Left alone that means the native app would launch the WEBSITE, which is the exact
// thing splitting the entry points was meant to make impossible. So for the capacitor build
// the mobile entry becomes index.html and the website's HTML is dropped: the APK then
// contains only the assistant, with no way to reach the desktop site.
function makeMobileTheEntryForCapacitor(mode) {
  return {
    name: 'capacitor-mobile-entry',
    apply: 'build',
    closeBundle() {
      if (mode !== 'capacitor') return;
      const dist = path.resolve(__dirname, 'dist');
      const mobileHtml = path.join(dist, 'mobile.html');
      const indexHtml = path.join(dist, 'index.html');
      if (!fs.existsSync(mobileHtml)) {
        throw new Error('[capacitor-mobile-entry] dist/mobile.html missing — cannot build the native app.');
      }
      fs.copyFileSync(mobileHtml, indexHtml);
      fs.rmSync(mobileHtml, { force: true });
      console.log('\n[capacitor-mobile-entry] mobile.html -> index.html (native app ships the assistant only)');
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    serveMobileEntryInDev(),
    makeMobileTheEntryForCapacitor(mode),
    ...(mode === 'mobile' ? [basicSsl()] : []),
  ],

  // Two independent entry points, deliberately not one app with internal routing:
  //   index.html  -> the website (landing page + admin/buyer/distributor portals)
  //   mobile.html -> the phone assistant, and nothing else
  //
  // Rollup follows each entry's own import graph, so the website's portals never end up in
  // the mobile bundle. That is the point: the mobile app cannot render the website because
  // the website's code is not there to render, regardless of URL, cache or storage state.
  // The capacitor build compiles ONLY the mobile entry. Building both would copy the
  // website's ~950 KB chunk into the APK where nothing can ever load it -- dead weight in
  // the download, and a copy of the admin/distributor portals sitting inside an app that is
  // handed to individual partners. The web build still emits both.
  build: {
    rollupOptions: {
      input: mode === 'capacitor'
        ? { mobile: path.resolve(__dirname, 'mobile.html') }
        : {
            main: path.resolve(__dirname, 'index.html'),
            mobile: path.resolve(__dirname, 'mobile.html'),
          },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.jsx', '.js', '.ts', '.tsx', '.json'],
  },
  server: {
    // Vite rejects requests whose Host header it doesn't recognize (DNS-rebinding
    // protection), which is exactly what ngrok sends through unchanged -- so the mobile
    // app's live tunnel gets a 403 "Blocked request" from Vite itself unless the reserved
    // domain is allow-listed here.
    allowedHosts: ['lilac-aluminum-resume.ngrok-free.dev'],

    // Directories the dev server must not watch. The Capacitor native project and the build
    // output hold thousands of files that are never imported by the app, and leaving them in
    // the watch set kept the dev server burning ~15% CPU while completely idle -- which on an
    // 8-core laptop is enough to noticeably slow the CPU-bound speech-to-text service running
    // alongside it. Excluding them costs nothing: changes there never require an HMR reload.
    watch: {
      ignored: [
        '**/android/**',
        '**/ios/**',
        '**/dist/**',
        '**/.gradle/**',
        '**/node_modules/**',
      ],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      }
    }
  }
}));
