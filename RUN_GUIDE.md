# How to Run CommerceIQ

Three ways to run the product, from quickest to most involved:

| # | What you get | Needs installing |
|---|---|---|
| **A** | Website on your laptop (all portals) | nothing |
| **B** | App on your phone — installable, with voice | nothing (cloudflared already installed) |
| **C** | Installable Android APK | Android Studio *or* a cloud build |

iOS as a compiled app requires a Mac — see the end.

---

## A. Website on your laptop

```powershell
# Terminal 1 — API + web together (from the repo root)
npm run dev
```
```powershell
# Terminal 2 — voice input (only needed for the mic button)
cd apps\api
python stt_service.py
```

Open **http://localhost:5173**

PostgreSQL runs as a Windows service and starts on boot — nothing to launch.

**Verify:** startup log shows `[DB] pgvector extension enabled.` and
`Database initialized and seeded successfully!`. STT health: <http://localhost:8021/health>.

---

## B. App on your phone (recommended for testing)

This serves the app and the API on **one origin**, then exposes it over public HTTPS. A valid
certificate is what makes the microphone work — browsers block it on plain `http://`.

Four terminals, all left open:

```powershell
# Terminal 1 — API
cd apps\api
node index.js
```
```powershell
# Terminal 2 — build once, then serve app + API on one port
cd apps\web
npm run build
node server.js
```
```powershell
# Terminal 3 — public HTTPS URL
cloudflared tunnel --url http://localhost:3000
```
```powershell
# Terminal 4 — voice input
cd apps\api
python stt_service.py
```

Terminal 3 prints a URL like `https://something-random.trycloudflare.com`.
**On your phone, open that URL with `/?page=mobile` appended:**

```
https://<printed-url>/?page=mobile
```

Sign in with the same accounts as the web portal (e.g. `asim@commerceiq.com` /
`demopassword` as Distributor).

**Install it as an app** (optional):
- Android/Chrome: ⋮ → *Install app*
- iOS/Safari: Share → *Add to Home Screen*

It then launches full-screen with its own icon and no browser chrome.

### Notes
- The free tunnel URL **changes every run** and dies when you stop `cloudflared`.
- While the tunnel is open, anyone with the URL can reach your app and database. **Stop it
  when you're done.**
- If `cloudflared` is "not recognized", your terminal predates its install — open a new
  terminal, or use the full path:
  `& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:3000`

---

## C. Installable Android APK

The Capacitor project is ready at `apps/web/android/`, but this machine has **no JDK and no
Android SDK**, so it cannot compile yet. Pick one:

### C1. Android Studio (easiest)
```powershell
winget install --id Google.AndroidStudio
```
Then:
```powershell
cd apps\web
npm run build:mobile      # vite build + cap sync
npm run open:android      # opens Android Studio -> press Run
```
~8 GB on disk, includes an emulator.

### C2. Command line only (~600 MB)
```powershell
winget install --id Microsoft.OpenJDK.17
```
Install the Android command-line tools, set `ANDROID_HOME`, accept licences
(`sdkmanager --licenses`), then:
```powershell
cd apps\web
npm run build:mobile
cd android
.\gradlew assembleDebug
```
APK appears at `android\app\build\outputs\apk\debug\app-debug.apk` — copy to the phone and
install (enable "Install unknown apps").

### C3. Cloud build — nothing installed locally
GitHub Actions can build the APK and give you a downloadable artifact. Workflow not written
yet; ask if you want it.

### Required before any APK will work
An installed app has no dev proxy, so it needs the API at a public HTTPS address. Either:

- **Bundle mode** — set `apps/web/.env.production`:
  ```env
  VITE_API_BASE_URL=https://your-public-api-host
  ```
- **Live mode** — in `apps/web/capacitor.config.json`, rename `_url` to `url` and point it at
  the hosted site. Both native shells then load the live app, and web changes ship without
  rebuilding the apps.

---

## D. iOS

Requires a **Mac with Xcode**; there is no supported way to build iOS apps on Windows.

```bash
cd apps/web
npm install @capacitor/ios
npx cap add ios
npm run build:mobile
npm run open:ios
```

Add to `ios/App/App/Info.plist`, or the mic is refused at runtime:
```xml
<key>NSMicrophoneUsageDescription</key>
<string>CommerceIQ uses your microphone so you can ask questions by voice.</string>
```

Installing on a real device needs an Apple Developer account ($99/yr).

**Option B already covers iOS** — the same URL installs to the home screen and runs
full-screen with working voice, with no Mac and no developer account.

---

## Ports used

| Port | Process | Started by |
|---|---|---|
| 5173 | Vite dev server | `npm run dev` |
| 3000 | Built app + API proxy | `node server.js` |
| 5001 | API | `npm run dev` or `node index.js` |
| 8021 | Speech-to-text | `python stt_service.py` |

Free them all if something is stuck:
```powershell
foreach ($port in 3000,5001,5173,8021) {
  Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
}
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force
```
