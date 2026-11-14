---
name: TARSCARE AI
description: Autonomous Astronaut Health Monitoring and Decision Support System
colors:
  primary-cyan: "#38bdf8"
  primary-cyan-deep: "#0284c7"
  status-normal: "#10b981"
  status-warning: "#f59e0b"
  status-critical: "#ef4444"
  space-ground: "#070b14"
  panel-surface: "#0d1424"
  panel-elevated: "#131d33"
  rule-hairline: "#1e2d4a"
  text-alabaster: "#f8fafc"
  text-slate: "#cbd5e1"
  text-muted-blue: "#a8b8d0"
typography:
  headline:
    fontFamily: "Public Sans, Segoe UI, -apple-system, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: "Public Sans, Segoe UI, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Public Sans, Segoe UI, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Fira Code, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "4px"
  md: "8px"
spacing:
  xs: "6px"
  sm: "12px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary-cyan}"
    textColor: "{colors.space-ground}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-cyan-deep}"
  card-panel:
    backgroundColor: "{colors.panel-surface}"
    textColor: "{colors.text-alabaster}"
    rounded: "{rounded.md}"
    padding: "20px"
---

# Design System: TARSCARE AI

## Overview

**Creative North Star: "The Mars Transit Bio-Astronautics Clinical Command Ledger"**

TARSCARE AI is an operational spacecraft medical workstation designed for deep-space habitats under low ambient light and up to 22-minute one-way communication delays from Earth. The interface fuses NASA Flight Surgeon console scanability with flight-data cue-card precision: every physiological measurement is anchored to the astronaut's personal baseline, current gravitational environment (`0g`, `0.38g`, `1.0g`), and explicit data provenance (`REAL_RESEARCH_REF`, `SYNTHETIC_DEMO`, `SIMULATED_ENV`, `USER_ENTERED`).

The visual world rejects decorative sci-fi HUD chrome, neon halos, gradient text, and generic terrestrial clinic templates in favor of 1px structural hairlines, high-contrast tabular numerals, and unambiguous semantic state coding (`NORMAL`, `WARNING`, `CRITICAL`).

**Key Characteristics:**
- Deep orbital navy ground (`#070b14`) paired with layered slate-navy instrument panels (`#0d1424` and `#131d33`).
- Strict 1px structural borders (`#1e2d4a`) and keyed provenance/citation badges derived from ruled technical ledgers.
- High-salience directional alert and emergency protocol strips when physiological or environmental metrics breach configured thresholds.
- Tabular numeric alignment (`font-variant-numeric: tabular-nums`) across all dosimetry (`mGy` vs. `mSv`), cardiovascular, and ECLSS atmospheric tables.

## Colors

A restrained dark-workstation palette where saturated color is reserved strictly for primary actions, active selection, and three-tier operational health states.

### Primary
- **Orbital Telemetry Cyan** (`#38bdf8`): Used for primary action buttons, active screen/region selection borders, baseline reference lines, and scientific citation identifiers.
- **Deep Telemetry Cyan** (`#0284c7`): Hover and active state for primary controls.

### Secondary
- **Bio-Nominal Emerald** (`#10b981`): Indicates `NORMAL` hazard assessments, synchronized store-and-forward packets (`SYNCHRONIZED_ACK`), and parameters within personal baseline tolerance.
- **Caution Excursion Amber** (`#f59e0b`): Indicates `WARNING` baseline deviations, queued store-and-forward buffers (`QUEUED_LOCAL_BUFFER`), and solar conjunction blackout status.
- **Autonomous Emergency Crimson** (`#ef4444`): Indicates `CRITICAL` threshold exceedances (e.g., acute Solar Particle Events or orthostatic presyncope) and triggers the zero-latency Crew Medical Officer emergency checklist.

### Neutral
- **Deep Habitat Void** (`#070b14`): Primary application background and input well fill.
- **Instrument Panel Navy** (`#0d1424`): Primary container surface for telemetry tables, charts, and assessment forms.
- **Elevated Console Slate** (`#131d33`): Secondary surface for callouts, active table headers, and sub-panels.
- **Structural Rule Hairline** (`#1e2d4a`): 1px structural dividers and panel borders.
- **Telemetry Alabaster** (`#f8fafc`): Primary heading and numeric readout foreground.
- **Instrument Slate** (`#cbd5e1`): Primary body prose and table cell text.
- **Tinted Steel Blue** (`#a8b8d0`): Secondary labels, units, and baseline reference captions (tinted from the navy hue rather than neutral gray, maintaining ≥ 7:1 contrast).

### Named Rules
**The Semantic State Exclusivity Rule.** Emerald, Amber, and Crimson appear only when encoding `NORMAL`, `WARNING`, or `CRITICAL` medical/environmental states—never as decorative card accents.

## Typography

**Display & UI Font:** Public Sans (with Segoe UI and system-ui fallbacks)
**Label/Mono Font:** Fira Code (with Consolas fallback)

**Character:** Clean, US-government/NASA-heritage technical humanist sans (`Public Sans`) for rapid legibility under stress, paired with `Fira Code` exclusively for provenance codes, report UIDs, and physical unit identifiers.

### Hierarchy
- **Headline** (600 weight, `1.5rem`, `1.25` line-height): Screen titles and primary operational headers.
- **Title** (600 weight, `1rem`, `1.4` line-height): Panel headings and organ-system subheaders.
- **Body** (400 weight, `0.875rem`, `1.6` line-height, `65–70ch` max measure): RAG research explanations, clinical rationales, and protocol steps.
- **Label** (500 weight, `0.75rem`, `1.4` line-height): Provenance tags (`SYNTHETIC_DEMO`, `REAL_RESEARCH_REF`), procedure codes (`PROC-RAD-SPE-01`), and table headers.

### Named Rules
**The Tabular Telemetry Rule.** Every numeric readout, baseline delta, timestamp, and dosimetric table enforces `font-variant-numeric: tabular-nums` so digits align vertically across longitudinal Sol comparisons.

## Layout

The interface uses a persistent top command header (Astronaut Profile, Sol badge, Demo Scenario loader, Earth One-Way Light Time indicator, Overall Status pill, and CMO Emergency trigger) over a 12-column responsive grid (`max-width: 1600px`): a 2-to-3 column left navigation rail for the 7 required screens and a 9-to-10 column operational workspace.

## Elevation & Depth

Depth is established primarily through tonal surface layering (`#070b14` ground → `#0d1424` panel → `#131d33` elevated sub-panel) reinforced by 1px `#1e2d4a` borders and soft offset shadows.

### Shadow Vocabulary
- **Panel Rest Elevation** (`box-shadow: 0 8px 24px -4px rgba(2, 6, 23, 0.65)`): Applied to primary instrument panels.
- **Elevated Sub-Panel** (`box-shadow: 0 10px 28px -6px rgba(2, 6, 23, 0.75)`): Applied to active overlays and protocol drawers.

### Named Rules
**The Zero-Halo Rule.** Never use zero-offset colored neon glows (`0 0 15px`); all shadows carry a downward vertical offset and soft dark-navy blur.

## Shapes

- **Panel Corners:** `8px` (`rounded-lg`) for primary containers; `4px` (`rounded`) for buttons, inputs, status badges, and data tables.
- **Borders:** Strictly `1px solid` (`#1e2d4a` at rest, `#38bdf8` when selected). No thick colored `border-left` stripes above `1px`.

## Components

### Buttons
- **Shape:** Subtle technical radius (`4px`).
- **Primary:** Orbital Telemetry Cyan (`#38bdf8`) background with dark navy (`#070b14`) semibold text (`8px 16px` padding).
- **Hover / Focus:** Transitions to Deep Telemetry Cyan (`#0284c7`) on hover; `2px solid #38bdf8` focus-visible outline with `2px` offset.
- **Emergency Action:** Deep crimson fill (`#450a0a`) with `1px solid rgba(239, 68, 68, 0.7)` border and `#fee2e2` label.

### Chips
- **Style:** Compact `4px` radius badges with `1px` semantic borders and monospace/tabular typography for risk classifications (`NORMAL`, `WARNING`, `CRITICAL`) and data provenance (`SYNTHETIC_DEMO`, `USER_ENTERED`, `REAL_RESEARCH_REF`).

### Cards / Containers
- **Corner Style:** `8px` radius.
- **Background:** `#0d1424` with `#131d33` inner wells.
- **Border:** `1px solid #1e2d4a`.
- **Internal Padding:** `20px` (`p-5`).

### Inputs / Fields
- **Style:** `1px solid #263859` over `#070b14` background, `4px` radius, `#f8fafc` text.
- **Focus:** `2px solid #38bdf8` outline.

### Navigation
- **Style:** Left vertical 7-screen rail with SVG iconography (`1.75px` stroke), `#162440` active surface fill, and `1px solid #38bdf8` active border.

## Do's and Don'ts

### Do:
- **Do** distinguish physical absorbed radiation dose (`mGy`) from biologically weighted equivalent/effective dose (`mSv`) in every radiation readout.
- **Do** display an explicit provenance badge (`SYNTHETIC_DEMO`, `USER_ENTERED`, `SIMULATED_ENV`, `REAL_RESEARCH_REF`) on every telemetry record and citation.
- **Do** compare physiological measurements against the astronaut's personal baseline and current gravity regime (`0g`, `0.38g`, `1.0g`).

### Don't:
- **Don't** place small uppercase kicker or eyebrow labels above headings; let headings carry their own hierarchy.
- **Don't** use thick colored left borders (`border-left > 1px`), gradient text, or decorative glassmorphism.
- **Don't** represent NASA Radiation Data Portal (ARMAS) Earth aviation measurements as direct Martian surface telemetry, or claim clinical validation for prototype decision rules.

