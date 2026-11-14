# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React, TypeScript, Tailwind CSS, Recharts, Host Grotesk typography (Frontend); Python, FastAPI, Pydantic, SQLite (`tarscare_local.db` backend identifiers preserved), Sentence-Transformers + optional local Ollama LLM inference with deterministic offline RAG fallback (Backend).

## Users

Astronaut crew members on long-duration deep-space missions (Earth 1g, Interplanetary Microgravity 0g, Mars surface ~0.38g) operating millions of kilometres from Earth under communication delays or blackouts.

## Product Purpose

**MarsCare AI — Your Personal Health Companion in Deep Space** is an autonomous astronaut health-monitoring and self-assessment web application. It helps astronauts answer "How am I doing?", "What has changed?", and "Should I take any action?", explore their body systems via an interactive human anatomy centerpiece, assess risks across NASA's five human-spaceflight hazards, ask a local RAG-powered AI Health Assistant grounded in NASA & CSA research, and maintain full autonomy offline with queued Earth synchronization.

## Positioning

Unlike terrestrial telemedicine or generic smartwatch/hospital dashboards that assume 1g norms and continuous Earth internet connectivity, MarsCare AI acts as a calm, reassuring, astronaut-specific onboard companion. It compares readings against each astronaut's personal baseline and current gravity phase (`0g`, `0.38g`, `1.0g`), explicitly tags data provenance (`Real Research Data`, `Simulated Data`, `User-Entered Data`), and operates seamlessly across Connected, Delayed, and Offline states.

## Operating Context

Operated aboard a deep-space habitat or spacecraft tablet/workstation in dark ambient conditions (`#0B0D1A` / `#121522`) with one-way light delays up to 22 minutes or conjunction blackouts.

## Capabilities and Constraints

- **Main Navigation (6 items):**
  1. `Mission Overview` (3-question health glance, overall status + explanation, 6 vital signs with baseline comparison & timestamp, **Interactive Human Body** centerpiece with 7 regions [`Head and Brain`, `Eyes`, `Heart`, `Lungs`, `Muscles`, `Bones`, `Whole Body`], 5 hazard overview cards, 7/14/30-day interactive trend charts, and important alerts)
  2. `Health Assessment` (Dual-method check-in: Manual measurement input + Selectable symptom checklists organized by category, followed by immediate assessment summary)
  3. `Spaceflight Hazards` (5 connected modules — Space Radiation, Isolation and Confinement, Distance from Earth, Gravity Fields, Hostile and Closed Environments — each structured in 4 sections: *What are we monitoring?*, *What has changed?*, *Why does it matter in space?*, *What should I do next?*)
  4. `AI Health Assistant` (Conversational RAG companion backed by NASA HRP, OSDR, Life Sciences Portal, Radiation Data Portal / RadLab, Environmental Data Application, and CSA CCISS, CARDIOBREATH, C-STARS, TBone, Vascular; auto-detects local Ollama/Sentence-Transformers with deterministic offline fallback; explicitly states when evidence is insufficient; never prescribes meds or overrides emergency procedures)
  5. `Health History` (Date-filtered 7/14/30-day longitudinal review of daily vitals, assessments, baseline shifts, historical alerts, radiation logs, psychological check-ins, exercise/sleep logs, and local report generation with Earth sync status)
  6. `Communication Status` (Mission distance, one-way delay, Connected/Delayed/Offline simulation toggle, last sync timestamp, pending reports queue, and local AI availability indicator)
- **Four-Tier Health Guidance (`Immediate action`, `Preventive action`, `Further assessment`, `Medical escalation`)** displayed after every health assessment and in dedicated guidance views.
- **Safety & Scientific Integrity:** Preserve physical units (`Gy` vs `Sv`, `mmHg`, `%`, `°C`), do not invent NASA-approved exposure limits, do not diagnose psychological disorders or infections from environmental data alone, and do not claim clinical validation.
- **Backend Identifier Continuity:** Keep existing `TARSCARE AI` backend identifiers, database schema compatibility (`tarscare_local.db`), and REST API structure while upgrading payloads and UI branding to **MarsCare AI**.

## Brand Commitments

- Frontend Brand: **MarsCare AI — Your Personal Health Companion in Deep Space**.
- Pinned Visual Palette:
  - Main background: `#0B0D1A`
  - Secondary background: `#121522`
  - Primary text: `#FAF9FA`
  - Secondary text: `#E5E5E4`
  - Accent glow: `#A5D8FF` (subtle glow behind key product elements)
  - Main button: `#EEF0F6` (pill-shaped) with `#040404` button text
  - Status colours (status indicators only): Green (`Normal`), Amber (`Warning`), Red (`Critical`)
- Typography & Shapes: `Host Grotesk` (self-hosted/local fallback), large readable headings, pill-shaped primary buttons, ~16px rounded cards, desktop + spacecraft tablet + mobile responsive layouts.

## Evidence on Hand

- Local curated corpus in `backend/knowledge_base.py` covering NASA HRP, OSDR, Life Sciences Portal, Radiation Data Portal / RadLab, Environmental Data Application, and CSA radiation monitoring, CCISS, CARDIOBREATH, C-STARS, TBone, and Vascular research.
- 30-day realistic synthetic astronaut demonstration dataset clearly labeled as simulated vs. real research reference vs. user-entered.

## Product Principles

1. **Calm, reassuring companion under stress:** Clear answers to *How am I doing?*, *What has changed?*, and *Should I take any action?* without overwhelming clinical clutter.
2. **Anatomical clarity without medical jargon:** The centered Interactive Human Body lets any crew member explore risks, measurements, and trends intuitively.
3. **Baseline, gravity, and provenance honesty:** Compare against personal baseline across `0g`, `0.38g`, and `1g`, and distinguish real, simulated, and user-entered data.
4. **Offline-first resilience:** Every assessment, RAG query, report archive, and emergency protocol works with zero internet connectivity.

## Accessibility & Inclusion

- High-contrast `#FAF9FA` and `#E5E5E4` typography on `#0B0D1A` and `#121522` surfaces, and `#040404` on `#EEF0F6` pill buttons.
- Tabular numerals (`font-variant-numeric: tabular-nums`) on all physiological and dosimetric readouts.
- Full keyboard navigation across all 6 main screens, 7 human body regions, and 5 hazard modules.
