# Setting Up This Project On a New Laptop

Complete path from a bare laptop to a fully running app: Node/npm packages, Python voice
services, PostgreSQL + the pgvector extension (semantic product search), and Ollama (AI
copilot chat). Follow in order — later steps depend on earlier ones.

Known-working versions on the original dev machine: **Node v24.18.1**, **npm 11.16.0**,
**Python 3.11.5**, **PostgreSQL 18.4**. Close versions should work fine; these aren't hard
requirements, just what's confirmed.

---

## 1. Install prerequisites

| Tool | Where to get it |
|---|---|
| Node.js | https://nodejs.org (LTS or current) |
| Python 3.11+ | https://python.org |
| PostgreSQL 18 | https://www.postgresql.org/download/windows/ (EDB installer — includes `psql`, `pg_config`, and the server) |
| Git | https://git-scm.com |
| Ollama | https://ollama.com |

During the PostgreSQL installer, **remember the password you set for the `postgres`
superuser** — you'll need it in step 5.

---

## 2. Clone the repo

```powershell
git clone git@github.com:abdullah12-cpu/Smart-Inventory-system-Node-project.git
cd Smart-Inventory-system-Node-project
```
If SSH isn't set up on the new machine, use HTTPS instead:
```powershell
git clone https://github.com/abdullah12-cpu/Smart-Inventory-system-Node-project.git
```

---

## 3. Install Node dependencies

This is an npm workspaces monorepo (`apps/api` = backend, `apps/web` = frontend). One
install at the repo root covers both — no need to `npm install` inside each app folder
separately:

```powershell
npm install
```

`apps/web` needs no `.env` file of its own — Vite proxies all `/api/*` requests straight
to `http://localhost:5001` (see `apps/web/vite.config.js`), so only the backend needs
configuring, in the next step.

---

## 4. Create the database

```powershell
psql -U postgres -c "CREATE DATABASE commerceiq;"
```
Enter the `postgres` superuser password you set during install when prompted.

---

## 5. Configure environment variables

```powershell
cd apps\api
copy .env.example .env
```

Open `.env` and set `DATABASE_URL` to match the database you just created and the
`postgres` password from step 1:
```env
DATABASE_URL=postgresql://postgres:<your-postgres-password>@localhost:5432/commerceiq
```

**This step is not optional** — if `DATABASE_URL` is left unset, the app silently falls
back to a hardcoded connection string tied to the original dev machine's password, which
will not match a fresh PostgreSQL install and the app will fail to connect.

The other variables (`OLLAMA_URL`, `TTS_SERVICE_URL`, etc.) already point at the shared
Office PC GPU tunnel and normally don't need to change — see step 7 for what depends on
that machine being reachable.

You do **not** need to run any migration or seed script — the app creates all tables
(`CREATE TABLE IF NOT EXISTS ...`) and seeds demo data automatically the first time it
starts (step 8). You'll see `Database initialized and seeded successfully!` in the
startup log confirming this happened.

---

## 6. Python voice services

```powershell
cd apps\api
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

This installs everything needed for:
- **`stt_service.py`** — Urdu/English speech-to-text (faster-whisper), port 8021. Powers
  the mic/voice-input button in the chat widgets.
- **`tts_service.py`** — local edge-tts fallback. Not currently called by the live app
  (voice output is XTTS-v2-only via the Office PC, see step 7) — kept installable in case
  it's ever wired back in.

**Windows-specific gotcha:** `requirements.txt` pins `av==13.1.0`. Do not let pip upgrade
this — version 18.0.0 (what pip installs by default) was outright blocked by Windows
Application Control Policy on the original dev machine the moment `faster-whisper` tried
to import it (`ImportError` / DLL load failure, not a normal Python error). If a future
machine blocks 13.1.0 too, try an older `1x.x` release rather than jumping to a newer
major version.

---

## 7. pgvector — enables semantic ("meaning-based") product search

Without this, product search still works via plain keyword matching — it's a real feature
upgrade, not something that blocks the app from running. Do this whenever convenient, not
necessarily before first launch.

As of PostgreSQL 18 there's no prebuilt Windows binary for pgvector — it has to be
compiled from source. One-time setup per machine:

### 7a. Install Visual Studio Build Tools (C++ workload)
```powershell
winget install --id Microsoft.VisualStudio.2022.BuildTools --silent --accept-package-agreements --accept-source-agreements --override "--wait --quiet --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

### 7b. Clone and build pgvector against this machine's PostgreSQL
Open the **x64 Native Tools Command Prompt for VS 2022** (Start menu, after step 7a
installs it) — this has the compiler environment pre-loaded, which avoids `vcvarsall.bat`
sourcing issues from a plain PowerShell window:
```cmd
git clone --depth 1 https://github.com/pgvector/pgvector.git
cd pgvector
set "PGROOT=C:\Program Files\PostgreSQL\18"
nmake /f Makefile.win
```

### 7c. Install the built files (requires Administrator)
Still in that same terminal, but **re-opened as Administrator** (writes into
`Program Files`):
```cmd
nmake /f Makefile.win install
```

### 7d. Enable the extension on the database
```powershell
psql -U postgres -d commerceiq -c "CREATE EXTENSION vector;"
```

That's it — permanent. pgvector stays part of this PostgreSQL install across reboots and
service restarts; you won't need to redo this unless PostgreSQL itself gets reinstalled.
The app auto-detects it, adds the vector column/index, and backfills embeddings for
existing products the next time it starts — watch for `[DB] pgvector extension enabled.`
in the startup log.

---

## 8. Ollama models (optional local fallback)

The app talks to Ollama for AI chat responses and product embeddings, and by default uses
the shared Office PC GPU tunnel (`OLLAMA_URL` in `.env`) — **this step is only needed if
you want a local fallback** for when that tunnel is unreachable:

```powershell
ollama pull qwen2.5:14b
ollama pull nomic-embed-text
```

`nomic-embed-text` in particular is worth pulling locally even if you rely on the remote
chat model — it keeps semantic product search working if the Office PC's Ollama goes down,
since the app automatically checks both the remote and local instances and uses whichever
actually has the model.

---

## 9. Run it

Two terminals, both left open:

```powershell
# Terminal 1 — API + web frontend together (from the repo root)
npm run dev
```
```powershell
# Terminal 2 — speech-to-text (only needed for the mic/voice-input feature)
cd apps\api
venv\Scripts\activate
python stt_service.py
```

PostgreSQL runs as a Windows service and starts automatically on boot — nothing to launch
manually there.

**Voice output (TTS) requires the Office PC's XTTS v2 service to be reachable** through
the tunnel configured in `.env`. There is currently no local TTS fallback wired into the
app — if that service is down, voice responses fail with a clear error rather than
silently switching to a different voice.

### Verify it's all working
- API: `http://localhost:5001` responds (a 404 on a plain GET is normal — it's a POST-based API)
- Frontend: `http://localhost:5173`
- STT health check: `http://localhost:8021/health` → `{"status":"ok",...}`
- Startup log shows `[DB] pgvector extension enabled.` and an embeddings backfill
  completing (if you did step 7). If it instead shows `pgvector extension not available`,
  go back and re-check step 7.
- Startup log shows `Database initialized and seeded successfully!`

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| App can't connect to the database at all | `DATABASE_URL` in `.env` doesn't match your actual PostgreSQL password (step 5) |
| `faster-whisper`/`av` import fails with a DLL or "blocked" error | Windows Application Control Policy blocking `av` 18.x — confirm `pip show av` says `13.1.0`, not a newer version |
| Product search returns nothing for descriptive/non-keyword queries | pgvector not installed (step 7) — check startup log for `pgvector extension not available` |
| AI chat responses fail or time out | Office PC's Ollama tunnel unreachable — check `OLLAMA_URL` in `.env` is still the current tunnel address, or pull local models (step 8) as a fallback |
| Voice responses fail | Office PC's XTTS service is down or the tunnel URL in `.env` (`TTS_SERVICE_URL`) is stale |
| "Port already in use" starting any service | Something's already bound to that port — `netstat -ano \| findstr :<port>` to find the PID, then `taskkill /PID <pid> /F` if it's safe to stop |
