import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// `--mode mobile` (npm run dev:mobile) turns on HTTPS. Browsers expose the microphone only
// in a secure context, and "secure" excludes plain http:// on a LAN IP -- so voice input in
// the mobile chat (?page=mobile) is dead over http://<laptop-ip>:5173 no matter what
// permissions are granted. Serving the dev site over HTTPS with a self-signed cert is what
// makes the mic reachable from a phone. Off by default so plain `npm run dev` keeps working
// without certificate warnings. Mode is used rather than an env var so the flag behaves the
// same in cmd.exe, PowerShell and bash.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'mobile' ? [basicSsl()] : [])],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.jsx', '.js', '.ts', '.tsx', '.json'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      }
    }
  }
}));
