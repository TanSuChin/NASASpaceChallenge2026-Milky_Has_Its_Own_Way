# TARSCARE — Your Personal Health Companion in Deep Space
**NASA Space Apps Challenge 2026 · Team Milky Has Its Own Way**

**TARSCARE** is a calm, offline-first autonomous health-monitoring and self-assessment web application designed for astronauts on long-duration deep-space missions, particularly Mars missions. Built atop the **TARSCARE** FastAPI + SQLite + local RAG backend (`backend/`, `tarscare_local.db`, `/api/*`), TARSCARE enables astronauts to answer three urgent questions at a glance — **How am I doing?**, **What has changed?**, and **Should I take any action?** — explore their body systems interactively, monitor NASA's five human-spaceflight hazards, run self-assessments with dual manual/symptom entry, and consult offline NASA & CSA research without relying on Earth connectivity.

---

## 1. System Architecture

```mermaid
flowchart TD
    subgraph Frontend["TARSCARE Frontend (React + TypeScript + Tailwind + Host Grotesk + Recharts)"]
        V1["1. Mission Overview & Interactive Human Body"]
        V2["2. Health Assessment (Manual + Symptoms + Behavioral Check-In)"]
        V3["3. Spaceflight Hazards (5 Four-Step Modules)"]
        V4["4. AI Health Assistant (Offline NASA/CSA RAG Chat)"]
        V5["5. Health History (7/14/30-Sol Logs & Export Reports)"]
        V6["6. Communication Status (Connected / Delayed / Offline + Stack)"]
    end

    subgraph Backend["TARSCARE AI Autonomous Backend (Python + FastAPI + Pydantic)"]
        API["REST API (/api/state, /api/assessment/evaluate, /api/rag/query, /api/ai/status, /api/ai/config, /api/ai/warmup, /api/comm/mode, /api/reports/generate)"]
        ENG["Integrated 5-Hazard Assessment Engine & Companion Enhancer"]
        RAG["Full-Corpus Hybrid RAG Engine (BM25/TF-IDF + Cached Sentence-Transformers + Local Ollama /api/chat + Safety Verifier)"]
        SF["Simulated Store-and-Forward Earth Sync Queue"]
        EMG["Zero-Latency Onboard Emergency Escalation Checklist"]
    end

    subgraph Storage["Local Persistence & Scientific Knowledge"]
        DB[("SQLite Database (tarscare_local.db, 30-Sol Baseline + User Logs)")]
        CORPUS[("15 NASA HRP, OSDR, RadLab, NLSP, EDA & CSA Research Docs")]
    end

    Frontend <--> API
    API --> ENG
    ENG --> RAG
    API --> SF
    API --> EMG
    ENG <--> DB
    SF <--> DB
    RAG <--> CORPUS
```

---

## 2. Quick-Start Installation & How to Run

### Prerequisites
- **Python 3.10+** (`fastapi`, `uvicorn`, `pydantic`, plus optional local `sentence-transformers` or local `ollama` if available)
- **Node.js 18+** and `npm`

### Step 1: Start the Local Backend Server (`http://127.0.0.1:8000`)
```powershell
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```
On startup, `backend/database.py` initializes `backend/tarscare_local.db` with 30 Sols of realistic synthetic Mars mission telemetry (`Sol 155–184`) and indexes 15 pre-bundled NASA/CSA research documents.
- **Offline Semantic RAG & Local Ollama LLM (`127.0.0.1:11434`):**
  - Install [Ollama](https://ollama.com) locally and pull an offline chat model (for example `ollama pull qwen2.5:3b` or `ollama pull llama3.2:3b`), plus optional embedding model `ollama pull nomic-embed-text`.
  - `backend/local_ai_rag.py` probes `http://127.0.0.1:11434/api/tags` (filtering out embedding-only models), runs full-corpus hybrid retrieval blending TF-IDF lexical relevance with locally cached `all-MiniLM-L6-v2` embeddings (`HF_HUB_OFFLINE=1` — zero cloud requests), injects live telemetry and personal baseline comparisons for `SuChai`, synthesizes grounded answers via `/api/chat` (`keep_alive: 15m`), and verifies `[DOC-ID]` citations and medication safety constraints before returning responses.
  - If Ollama is stopped or toggled off (`POST /api/ai/config`), TARSCARE falls back automatically to deterministic offline RAG (`OFFLINE_SENTENCE_TRANSFORMERS` or `DETERMINISTIC_OFFLINE_RAG`).

### Step 2: Start the TARSCARE Frontend (`http://127.0.0.1:5173`)
In a second terminal:
```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```
Open **http://localhost:5173** in your browser. Vite proxies `/api/*` requests to `http://127.0.0.1:8000`.

---

## 3. Six Core Navigation Views

1. **Mission Overview** — Opens immediately with a **3-question crew wayfinding triage band** (*How am I doing?*, *What has changed?*, *Should I take any action?*), the centered **Interactive Human Body** (`Head and Brain`, `Eyes`, `Heart`, `Lungs`, `Muscles`, `Bones`, `Whole Body`) with 7-Sol sparklines and baseline comparisons, **Vital Signs vs. Personal Baseline** (`BPM`, `mmHg`, `SpO₂`, `°C`, sleep, mood/stress), **Five Spaceflight Hazard** cards, interactive **7 / 14 / 30-Sol Health Trends**, and **Important Alerts & Actions**.
2. **Health Assessment** — Dual-method onboarding: **Method 1** manual metric inputs (`Heart Rate`, `BP`, `SpO₂`, `Resp. Rate`, `Temp`, `Sleep`, `Mood`, `Stress`, `Absorbed Dose mGy`, `Equivalent Rate mSv/d`, `Cabin CO₂`) across `1g`, `0g`, and `0.38g`, plus **Method 2** body-system symptom pills and an optional private **Behavioral & Sleep Check-In**. Produces a 5-part structured explanation (`What was detected`, `Contributing measurements`, `Associated factors`, `Relevant hazard`, `Recommended next steps`) and **4-tier Health Guidance** (`Immediate action`, `Preventive action`, `Further assessment`, `Medical escalation`).
3. **Spaceflight Hazards** — Detailed modules for **Space Radiation**, **Isolation & Confinement**, **Distance from Earth**, **Gravity Fields** (with `1g` / `0g` / `0.38g` explorer), and **Hostile and Closed Environments**. Each follows four consistent steps (*1. What are we monitoring?*, *2. What has changed?*, *3. Why does it matter in space?*, *4. What should I do next?*) plus live configured warning threshold controls.
4. **AI Health Assistant** — Offline-first companion chatbot backed by `/api/rag/query`, live Ollama model selector & `Local LLM` toggle (`/api/ai/config`), model warmup trigger (`/api/ai/warmup`), multi-turn conversation history, suggested astronaut prompts, real scientific source library drawer (`NASA-HRP-*`, `NASA-RDP-ARMAS-01`, `NASA-RADLAB-01`, `NASA-OSDR-01`, `NASA-LSP-01`, `NASA-EDA-01`, `CSA-TBONE-01`, `CSA-VASCULAR-01`), and pre/post-generation medication-prescribing refusal safeguards.
5. **Health History** — Filter longitudinal logs (`7d` / `14d` / `30d`, `All Data` / `Simulated` / `User-Entered`), inspect historical alert flags, generate queued autonomous health summary reports (`POST /api/reports/generate`), and export Markdown reports locally.
6. **Communication Status** — Switch between **Connected**, **Delayed (Mars Nominal)**, and **Offline (Blackout)** via `/api/comm/mode`, monitor the simulated Store-and-Forward deep-space telemetry queue, launch the zero-latency Emergency Escalation Checklist, and configure live Local Ollama + Offline RAG diagnostics (`/api/ai/status`, `/api/ai/config`, `/api/ai/warmup`).

---

## 4. Scientific Accuracy, Provenance & Medical Safety Guardrails

- **Radiation Unit Separation:** Always preserves and separates physical **absorbed dose (`Gy` / `mGy`)** from biologically weighted **equivalent/effective dose (`Sv` / `mSv`)**; never invents NASA-approved flight limits (user-configurable alert thresholds are explicitly labeled non-NASA prototype defaults).
- **NASA RDP / ARMAS Context:** Explicitly states that the NASA Radiation Data Portal (ARMAS) represents Earth high-altitude aircraft measurements, not direct Martian surface dosimetry.
- **Non-Diagnostic & Non-Prescribing:** Tracks mood, stress, sleep, and cabin environment trends without automatically diagnosing depression/anxiety or infections, and refuses medication prescription requests while directing crew to Flight Surgeon / CMO checklists.
- **Explicit Data Provenance:** Distinguishes `Simulated Data`, `User-Entered Data`, `Simulated Env`, and `Real Research Data` throughout UI, SQLite persistence, and exported reports.
