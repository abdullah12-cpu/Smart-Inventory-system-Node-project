# Native Mobile App (Android + iOS)

The CommerceIQ Assistant ships to phones as a **Capacitor** app: the same React chat UI that
runs at `?page=mobile` in the browser, packaged as a native binary for the App Store and
Play Store.

Capacitor was chosen because the chat's voice pipeline — `MediaRecorder` → voice-activity
detection via `AnalyserNode` → speech-to-text, plus streaming raw-PCM playback scheduled
through `AudioBufferSourceNode` — is built on Web Audio APIs. A WebView runs all of that
unchanged. React Native or Flutter would each require rebuilding that pipeline against a
different audio stack.

---

## 1. Prerequisites

| Target | Needs |
|---|---|
| Android | [Android Studio](https://developer.android.com/studio) (bundles the SDK + emulator) |
| iOS | A **Mac** with Xcode + CocoaPods — iOS apps cannot be built on Windows |

The Android project is already generated and committed at `apps/web/android/`.

---

## 2. Point the app at your backend (required)

This is the step people miss. In the browser, Vite proxies `/api` to `localhost:5001`. The
packaged app has **no proxy** — it is served from `https://localhost` inside the WebView, so
relative `/api` paths resolve against the WebView itself and every request fails.

Create `apps/web/.env.production`:

```env
VITE_API_BASE_URL=https://api.yourdomain.com
```

`src/lib/apiBase.js` reads this at build time and rewrites every `/api/...` call to it, so no
individual call site had to change.

**The URL must be reachable from a phone on mobile data** — `localhost` and `192.168.x.x`
are not. For testing, tunnel the API:

```powershell
ngrok http 5001
```

and paste the printed `https://` URL. Note this is **not** the Office PC TTS/Ollama tunnel;
that machine serves speech and the LLM, not this app's API.

Without this set, the app still builds and runs, and logs a clear warning at startup —
but every API call fails.

---

## 3. Build and run — Android

```powershell
cd apps\web
npm run build:mobile      # vite build + cap sync
npm run open:android      # opens Android Studio
```

In Android Studio press **Run** with a device or emulator selected.

For a distributable build: **Build → Generate Signed Bundle / APK**.

---

## 4. Build and run — iOS (Mac only)

```bash
cd apps/web
npm install @capacitor/ios
npx cap add ios
npm run build:mobile
npm run open:ios          # opens Xcode
```

In Xcode, set a Signing Team under **Signing & Capabilities**, then press **Run**.

**Add the microphone permission string** — iOS rejects the app at runtime without it. In
`ios/App/App/Info.plist`:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>CommerceIQ uses your microphone so you can ask questions by voice.</string>
```

(The Android equivalents are already in `AndroidManifest.xml`.)

---

## 5. After any code change

```powershell
npm run build:mobile
```

`cap sync` copies the fresh `dist/` into the native projects. Skipping it means the app keeps
running the previous bundle.

---

## What the app does on launch

It detects the native shell (`Capacitor.isNativePlatform()`) and boots straight into the
mobile chat — no `?page=mobile` needed, and the desktop admin/buyer/distributor portals are
not part of what ships to a phone. Users sign in with the same accounts as the web portal and
get answers scoped to their own account.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| Every request fails / empty screens after login | `VITE_API_BASE_URL` unset, wrong, or not reachable from mobile data (step 2). Check the device log for the `[apiBase]` warning |
| Mic button does nothing on Android | Permission denied — uninstall and reinstall to be re-prompted. `RECORD_AUDIO` is already declared in the manifest |
| Mic button does nothing on iOS | `NSMicrophoneUsageDescription` missing from `Info.plist` (step 4) |
| Voice replies never play on iOS | iOS blocks audio until a user gesture. The first playback must follow a tap — tapping send or the mic satisfies this |
| App shows an old version after changes | `npm run build:mobile` was not re-run — `cap sync` is what copies the new bundle |
| Login works in browser but not in the app | The API host is HTTP-only or has an invalid certificate. `cleartext` is disabled by design; the backend must serve valid HTTPS |
