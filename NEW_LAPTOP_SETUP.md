# Setting Up This Project On a New Laptop

Everything needed to go from a fresh laptop to a fully running app: Node/npm packages,
Python voice services, PostgreSQL + the pgvector extension (for semantic product search),
and Ollama (for the AI copilot chat). Follow these in order — later steps depend on
earlier ones.

---

## 1. Prerequisites to install first

| Tool | Version used in dev | Check with |
|---|---|---|
| Node.js | 24.x | `node --version` |
| Python | 3.11.x | `python --version` |
| PostgreSQL | 18.x | `psql --version` |
| Git | any recent | `git --version` |
| Ollama | latest | `ollama --version` |

Install PostgreSQL via the official EDB installer (includes `psql`, `pg_config`, and the
server itself). Install Ollama from https://ollama.com. Node and Python installers are
standard from nodejs.org / python.org.

---

## 2. Clone the repo

```powershell
git clone git@github.com:abdullah12-cpu/Smart-Inventory-system-Node-project.git
cd Smart-Inventory-system-Node-project
```

---

## 3. Install Node dependencies

This is an npm workspaces monorepo (`apps/api` = backend, `apps/web` = frontend). One
install at the root covers both:

```powershell
npm install
```

---

## 4. Configure environment variables

```powershell
cd apps\api
copy .env.example .env
```

Edit `.env` and set `DATABASE_URL` to match whatever Postgres user/password you set up in
step 6 below. The `OLLAMA_URL` / `TTS_SERVICE_URL` values already point at the shared
Office PC GPU tunnel and normally don't need to change.

---

## 5. Python voice services

```powershell
cd apps\api
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

This installs everything needed for:
- `stt_service.py` — Urdu/English speech-to-text (faster-whisper), port 8021
- `tts_service.py` — local edge-tts fallback (currently not called by the live app, since
  TTS is XTTS-v2-only via the Office PC — see `requirements.txt` for why it's still kept
  installable)

**Windows-specific note:** `requirements.txt` pins `av==13.1.0`. Do not let pip upgrade
this — version 18.0.0 was outright blocked by Windows Application Control Policy on the
original dev machine when `faster-whisper` tried to import it. If a future machine blocks
13.1.0 too, try an older 1x.x release rather than a newer major version.

---

## 6. PostgreSQL database + pgvector extension

### 6a. Create the database
```powershell
psql -U postgres -c "CREATE DATABASE commerceiq;"
```
(Match whatever username/password you use here to `DATABASE_URL` in `.env` from step 4.)

### 6b. Install the pgvector extension
As of PostgreSQL 18, there is no prebuilt Windows binary for pgvector — it has to be
compiled from source. This is a one-time setup per machine:

1. **Install Visual Studio Build Tools** (C++ workload) — needed to compile the extension:
   ```powershell
   winget install --id Microsoft.VisualStudio.2022.BuildTools --silent --accept-package-agreements --accept-source-agreements --override "--wait --quiet --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
   ```

2. **Clone and build pgvector**, pointing `PGROOT` at your PostgreSQL install:
   ```powershell
   git clone --depth 1 https://github.com/pgvector/pgvector.git
   cd pgvector
   & "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
   $env:PGROOT = "C:\Program Files\PostgreSQL\18"
   nmake /f Makefile.win
   ```
   (Run this from the **x64 Native Tools Command Prompt for VS 2022** if `vcvars64.bat`
   sourcing from PowerShell gives you trouble — that's the officially supported route.)

3. **Install the built files** (requires an elevated/Administrator terminal, since it
   writes into `Program Files`):
   ```powershell
   nmake /f Makefile.win install
   ```

4. **Enable the extension on the database:**
   ```powershell
   psql -U postgres -d commerceiq -c "CREATE EXTENSION vector;"
   ```

You should not need to do this again once it's done — pgvector becomes a permanent part
of that PostgreSQL installation (survives reboots, service restarts, everything). Only
needed again if PostgreSQL itself gets reinstalled.

---

## 7. Ollama models

The app talks to Ollama for AI chat responses and product embeddings. By default it's
configured to use the shared Office PC GPU tunnel (`OLLAMA_URL` in `.env`), so **this step
is only needed if you want a local fallback** for when that tunnel is unreachable:

```powershell
ollama pull qwen2.5:14b
ollama pull nomic-embed-text
```

`nomic-embed-text` in particular is worth pulling locally even if you rely on the remote
chat model — it enables semantic product search to keep working if the Office PC's Ollama
ever goes down, since the app automatically falls back to whichever instance (remote or
local) actually has the model available.

---

## 8. Running everything

Each of these runs in its own terminal, left open:

```powershell
# Terminal 1 — API + web frontend together
npm run dev

# Terminal 2 — speech-to-text (only needed for the mic/voice-input feature)
cd apps\api
venv\Scripts\activate
python stt_service.py
```

PostgreSQL runs as a Windows service and starts automatically on boot — nothing to launch
manually there.

Voice **output** (TTS) requires the Office PC's XTTS v2 service to be reachable through the
tunnel in `.env` — there is no local TTS fallback wired into the app currently. If that
service is down, voice responses will fail with a clear error rather than silently using a
different voice.

### Verify it's all working
- API: `http://localhost:5001` should respond (any 404 on a GET is normal — it's a POST-based API)
- Frontend: `http://localhost:5173`
- STT health: `http://localhost:8021/health` → `{"status":"ok",...}`
- Startup log should show `[DB] pgvector extension enabled.` and an embeddings backfill
  completing — if it instead shows `pgvector extension not available`, go back to step 6b.
