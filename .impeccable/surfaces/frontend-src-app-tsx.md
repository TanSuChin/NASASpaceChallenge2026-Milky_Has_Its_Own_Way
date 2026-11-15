---
version: 1
slug: "frontend-src-app-tsx"
primary_target: "frontend/src/App.tsx"
related_targets:
  - "frontend/src/index.css"
  - "frontend/src/components/ui/*"
  - "frontend/src/components/*"
---

# Surface Brief: TARSCARE — NASA Orbital Calm Redesign (`frontend/src/App.tsx`)

- **Scope:** Full 11-section astronaut personal health, supplies, environment, communication, and wellbeing support platform (`Mission Overview`, `Health Monitoring`, `AI Health Assessment`, `Physical Activity`, `Nutrition & Food Supplies`, `Psychological Wellbeing`, `AI Companion`, `Mission Environment`, `Personal Journal`, `Reports & History`, `Settings`), preserving all `TARSCARE` backend routes and safety boundaries.
- **Mode:** Operate
- **Chosen Direction:** `NASA Orbital Calm` (`assigned`, user-confirmed via structured selection)
- **Build Path:** `code` (`buildPathFlipped: false`)

## Direction contract

THESIS: An autonomous deep-space personal health and astronaut wellbeing companion designed around NASA Orbital Calm — combining NASA Johnson biomedical flight-deck legibility with Apple Health's breathing whitespace, dual Dark (`#0B1120` / `#111827` / `#172033`) and Daylight Light operational modes, and a single inline **Condition & Drift Horizon** baseline bar so every astronaut knows at a glance whether they are stable, what drifted, and what to do next without cognitive clutter.

OWN-WORLD: Matte deep-space navy surfaces (`#0B1120` canvas, `#111827` panel, `#172033` elevated focus) paired with calm daylight cabin mode (`#F8FAFC` canvas, `#FFFFFF` panel, `#F1F5F9` elevated surface), crisp `Inter` UI prose paired with tabular `IBM Plex Sans` numeric readouts, restrained `#64748B` / `#CBD5E1` neutrals, and Green/Amber/Red/Blue reserved strictly for semantic status paired with icon + text label. Refuses overcrowded card grids, decorative neon gradients, glow shadows, pulsing rings, eyebrow kickers above headings, >1px left stripes, and emoji icons.

STORY: Opening **Mission Overview** surfaces only Mission Context (`Mission Name`, `Astronaut Profile`, `MET / Sol`, `Overall Status`, `Last Health Sync`), 4 calm essential health summaries (`Heart Rate`, `SpO2`, `Sleep Status`, `Physical Activity`), and conditional alerts strictly when intervention is needed; **Health Monitoring** cleanly separates `Cardiovascular`, `Respiratory`, and `Physical Condition` with expandable 7/14/30-day trend drawers and on-demand Connected Hardware probes; **AI Health Assessment** centers on one `"Run Health Assessment"` CTA that auto-gathers verified connected sensor readings + telemetry, exposes confidence, timestamp, and plain-language evidence, and tucks manual overrides into a collapsible drawer; **Physical Activity**, **Nutrition & Food Supplies**, **Psychological Wellbeing**, **AI Companion**, **Mission Environment**, **Personal Journal**, **Reports & History**, and **Settings** each breathe on one consistent spatial rhythm with progressive disclosure.

FIRST VIEWPORT: Collapsible 11-item left sidebar on desktop (responsive compact header/drawer on tablet and phone) framing a quiet top operational bar (Mission, Astronaut selector, Sol/MET, Comm/Sync status badge, Theme switcher, Emergency Help link), directly above a spacious Overall Condition header + primary `Run Health Assessment` action, followed by 4 clean tabular-numeral summary metrics anchored by horizontal **Condition & Drift Horizon** baseline ticks and a conditional Attention strip rendered only when alerts exist.

FORM: `NASA Orbital Calm` (assigned direction #5 refined with calibrated horizon ticks, aligned tabular columns, 12-track layout rhythm, scale contrast, and focus progressive disclosure), `seed:bb96b30e3cc017d3`.

FINISH: unreviewed and undocumented is unfinished; this build ends with `impeccable detect --json`, desktop + mobile dark/light visual inspection, `impeccable-finish-reviewer`, verified pytest + Vite build, and updated `DESIGN.md` + `.impeccable/design.json`.
