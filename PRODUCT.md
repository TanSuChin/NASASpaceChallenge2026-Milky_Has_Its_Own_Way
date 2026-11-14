# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React, TypeScript, Tailwind CSS, Recharts, Three.js (Frontend); Python, FastAPI, Pydantic, SQLite, local vector/embedding retrieval + RAG with deterministic offline fallback (Backend) — explicitly specified in Master Development Prompt.

## Users

Astronaut crew members on long-duration deep-space missions (specifically Mars transit, Mars surface ~0.38g operations, and Earth return 1g re-adaptation) operating under intermittent or delayed communication with Earth Flight Surgeons.

## Product Purpose

TARSCARE AI is an autonomous astronaut health monitoring and decision-support system that enables astronauts to independently collect health telemetry, compare against personal baselines, assess physical and psychological risks across NASA's five human-spaceflight hazards, retrieve evidence-informed medical guidance via local RAG over NASA/CSA research, and execute store-and-forward telemetry synchronization and local emergency escalation without continuous Earth connectivity.

## Positioning

Unlike terrestrial telemedicine or generic health dashboards that assume fixed 1g reference ranges and continuous cloud/clinician connectivity, TARSCARE AI evaluates longitudinal changes against individual astronaut baselines conditioned on mission gravity phase (microgravity, 0.38g Mars surface, 1g Earth return), explicit data provenance (real research reference, synthetic demo telemetry, simulated environmental telemetry, or user-entered reading), and NASA's five spaceflight hazard domains with 100% offline-resilient RAG and emergency protocols.

## Operating Context

Used aboard a deep-space habitat or spacecraft medical workstation (dark ambient lighting to preserve circadian and instrument legibility) where one-way light time to Earth ranges from 3 to 22 minutes or complete solar conjunction blackout. Astronauts perform routine check-ins, investigate anomalies across body systems and spacecraft environmental sensors, query onboard NASA/CSA scientific literature (HRP, OSDR, ARMAS/RDP context, CCISS, CARDIOBREATH, C-STARS), and queue encrypted medical packages for store-and-forward Deep Space Network synchronization.

## Capabilities and Constraints

- Five functional hazard modules:
  1. Space Radiation (Gy absorbed vs. Sv equivalent/effective dose distinction, GCR vs. SPE, mission-configured thresholds, explicit note that NASA RDP/ARMAS is Earth high-altitude/aircraft data rather than direct Mars surface data).
  2. Isolation and Confinement (mood, stress, fatigue, workload, sleep duration/quality/irregularities, self-assessment questionnaire, non-diagnostic behavioural guidance).
  3. Distance from Earth & Autonomous Medical Support (communication status, one-way delay, store-and-forward report queue, local sync simulation, offline-first medical procedures & emergency escalation).
  4. Gravity Fields & Physiological Adaptation (microgravity, 0.38g Mars, 1g Earth return; cardiovascular, musculoskeletal, and sensorimotor/SANS monitoring; ARED/treadmill/balance countermeasure guidance).
  5. Hostile and Closed Environments (cabin temperature, pressure, O2, CO2, humidity, air quality, warning events, correlate with respiratory/fatigue/temp symptoms without auto-diagnosing infection).
- Integrated Astronaut Health Assessment Engine classifying into NORMAL, WARNING, or CRITICAL using personal baselines, trends, mission phase, and configurable prototype thresholds.
- Local RAG engine indexing curated NASA HRP and CSA scientific documents with chunking, dense/hybrid vector retrieval, source citations, and local LLM or deterministic synthesis fallback.
- Seven accessible screens: Mission Health Dashboard, Interactive Human Body Map, Five Hazard Monitoring, Health Assessment Input, AI Health Analysis, Health Guidance & Recommendations, and Health History & Reports.
- Strict safety boundaries: no clinical diagnosis, no unsupported medication prescriptions, no fabricated NASA citations or invented clinical thresholds, and explicit data provenance tags on every record.

## Brand Commitments

- Name: TARSCARE AI – Autonomous Astronaut Health Monitoring and Decision Support System.
- Pinned aesthetic brief: Dark navy and space-inspired visual theme, clean medical dashboard, modern typography, consistent visual hierarchy, interactive charts, clear medical status indicators (NORMAL / WARNING / CRITICAL), responsive desktop and tablet layouts.

## Evidence on Hand

- Curated NASA Human Research Program (HRP) five hazards documentation, CSA radiation monitoring (2026), CCISS, CARDIOBREATH, C-STARS, and NASA Radiation Data Portal (ARMAS context) reference corpus stored locally in the repository for RAG retrieval.
- Synthetic astronaut demonstration telemetry dataset clearly labeled as `SYNTHETIC_DEMO` / `SIMULATED_ENV` / `USER_ENTERED` / `REAL_RESEARCH_REF`.

## Product Principles

1. **Autonomy under delay:** Every critical assessment, protocol lookup, and RAG explanation works locally with zero dependency on external cloud APIs.
2. **Baseline and gravity awareness:** Interpret physiological metrics relative to the individual astronaut's pre-flight/in-flight baseline and current gravitational environment rather than static terrestrial norms.
3. **Radical scientific and data honesty:** Preserve exact physical units (mGy vs. mSv, mmHg, %, ppm), label synthetic vs. user vs. research data on every record, and cite retrieved NASA/CSA sources without clinical overclaim.
4. **Operational clarity under stress:** High-contrast telemetry, unambiguous NORMAL/WARNING/CRITICAL state indicators, and immediate emergency escalation workflows.

## Accessibility & Inclusion

- High contrast ratios (≥ 4.5:1 for body text, ≥ 3:1 for large telemetry numerals) against dark navy spacecraft workstation surfaces.
- Tabular numerals (`font-variant-numeric: tabular-nums`) for all telemetry readouts, timestamps, and dosages.
- Clear keyboard focus states and semantic form labels across all assessment checklists and body map regions.

