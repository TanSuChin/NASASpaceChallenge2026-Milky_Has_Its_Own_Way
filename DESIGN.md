---
name: MarsCare AI
description: Your Personal Health Companion in Deep Space (built on the TARSCARE AI autonomous backend)
colors:
  accent-glow: "#A5D8FF"
  cta-fill: "#EEF0F6"
  cta-ink: "#040404"
  status-normal: "#10B981"
  status-warning: "#F59E0B"
  status-critical: "#EF4444"
  space-ground: "#0B0D1A"
  surface-panel: "#121522"
  surface-elevated: "#181C2E"
  rule-hairline: "rgba(255, 255, 255, 0.08)"
  text-primary: "#FAF9FA"
  text-secondary: "#E5E5E4"
typography:
  display:
    fontFamily: "'Host Grotesk Variable', 'Host Grotesk', 'Segoe UI', system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
  headline:
    fontFamily: "'Host Grotesk Variable', 'Host Grotesk', 'Segoe UI', system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "'Host Grotesk Variable', 'Host Grotesk', 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "'Host Grotesk Variable', 'Host Grotesk', 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  card: "16px"
  inner: "12px"
  pill: "9999px"
spacing:
  xs: "6px"
  sm: "12px"
  md: "16px"
  lg: "20px"
components:
  button-primary:
    backgroundColor: "{colors.cta-fill}"
    textColor: "{colors.cta-ink}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
  button-secondary:
    backgroundColor: "{colors.surface-panel}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  card-panel:
    backgroundColor: "{colors.surface-panel}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.card}"
    padding: "20px"
---

# Design System: MarsCare AI

## Overview

**Creative Direction: "Crew Wayfinding Triage Bands"** (`seed:545159eea7949b0d`)

**MarsCare AI** is a calm, human-centered deep-space health companion powered autonomously by the preserved **TARSCARE AI** FastAPI + SQLite + local RAG engine. Designed for crew members operating weeks or minutes out of synchronous Earth contact, the interface immediately answers three questions above the fold — **How am I doing?**, **What has changed?**, and **Should I take any action?** — while placing an interactive anatomical body explorer (`Head and Brain`, `Eyes`, `Heart`, `Lungs`, `Muscles`, `Bones`, `Whole Body`) directly in the centerpiece of `Mission Overview`.

**Key Characteristics:**
- Deep navy canvas (`#0B0D1A`) paired with calm slate surfaces (`#121522`) and `16px` rounded containers.
- Soft sky-blue illumination (`#A5D8FF`) reserved strictly for subtle atmospheric halo behind the Interactive Human Body centerpiece and active selection outlines.
- Neutral off-white pill primary buttons (`#EEF0F6` fill with `#040404` ink) so interactive actions never compete visually with medical warning states.
- Semantic Green (`#10B981`), Amber (`#F59E0B`), and Red (`#EF4444`) used exclusively to communicate health assessment or communication link status.
- Self-hosted `Host Grotesk Variable` typeface (`@fontsource-variable/host-grotesk`) with `font-variant-numeric: tabular-nums` across Sol readouts, dosimetry (`mGy` vs. `mSv`), vitals, and trend charts.

## Colors

### Neutrals & Atmospheric Surfaces
- **Deep Space Background** (`#0B0D1A`): Primary application background and inset measurement rows.
- **Secondary Habitat Surface** (`#121522`): Primary `16px` rounded card container background.
- **Primary Foreground** (`#FAF9FA`): High-contrast headings, numeric values, and critical narrative text.
- **Secondary Foreground** (`#E5E5E4`): Supporting copy, unit labels, and baseline context.
- **Primary CTA Fill / Ink** (`#EEF0F6` / `#040404`): Pill-shaped primary buttons and active top-level navigation pills.

### Illumination & Semantic Status
- **Accent Glow** (`#A5D8FF`): Active body-region rings, sparkline stroke, focus outlines, and radial hero glow behind the anatomical SVG.
- **Normal Status** (`#10B981` / Emerald): Parameters within personal baseline or direct Earth link active.
- **Warning Status** (`#F59E0B` / Amber): Baseline drift, elevated solar particle flux / CO₂, or delayed Earth communication.
- **Critical Status** (`#EF4444` / Red): Acute threshold exceedance or communication blackout requiring onboard escalation protocols.

### Named Rules
**The Neutral Chrome / Semantic Status Exclusivity Rule.** Neutral controls (`#EEF0F6`) stay neutral; Green, Amber, and Red appear only when communicating health status or Earth communication readiness.

## Typography

**Primary Typeface:** `'Host Grotesk Variable'`, `'Host Grotesk'`, `'Segoe UI'`, `system-ui`, `sans-serif`

### Hierarchy
- **Sol / Triage Anchor** (`700` weight, `2.25rem–3rem`, `tabular-nums`): Immediate Sol indicator on the triage band.
- **Page / Modal Headings** (`700` weight, `1.5rem–1.875rem`, `line-height: 1.2`): Screen titles without uppercase eyebrow labels above headings.
- **Card / Section Titles** (`600` weight, `1.0625rem–1.25rem`): Anatomical inspector headers, triage prompts, and guidance tiers.
- **Body & Guidance Copy** (`400` weight, `0.875rem`, `line-height: 1.6`): Clear, reassuring medical explanations and recommended next steps.

## Layout & Navigation

- **Six Top-Level Navigation Pills:** `Mission Overview`, `Health Assessment`, `Spaceflight Hazards`, `AI Health Assistant`, `Health History`, and `Communication Status`.
- **Top Status Header:** MarsCare AI brand mark, astronaut profile (`SuChai`), current `Sol`, active communication state pill (`Connected` / `Delayed` / `Offline`), overall status trigger for Emergency Protocol, and Demo Dataset reset button.
- **Interactive Human Body Staging:** 3-column wayfinding corridor (`270px` numbered region rail → central illuminated SVG human body → live region readings + `7-Sol Trend` sparkline + `Spaceflight Context` + `Start Health Assessment` CTA).

## Shapes & Elevation

- **Cards:** `border-radius: 16px`, subtle `1px solid rgba(255,255,255,0.08)` hairlines, and grounded dark shadow (`0 12px 32px -8px rgba(4, 6, 16, 0.72)`).
- **Buttons:** Pill geometry (`border-radius: 9999px`) for top navigation pills, primary CTAs, hazard filters, and symptom chips.

## Do's and Don'ts

### Do:
- **Do** distinguish physical absorbed radiation dose (`mGy`) from biologically weighted equivalent/effective dose (`mSv`) wherever radiation is shown.
- **Do** preserve explicit provenance tags (`Simulated Data`, `User-Entered Data`, `Real Research Data`, `Simulated Env`) across telemetry, alerts, and reports.
- **Do** state clearly that MarsCare AI provides autonomous prototype decision support without diagnosing psychiatric conditions, diagnosing infections from sensors, or prescribing medications.

### Don't:
- **Don't** place small uppercase kicker/eyebrow labels above headings or wrap cards in thick `border-left` stripes (`> 1px`).
- **Don't** represent NASA Radiation Data Portal (ARMAS) aviation/atmospheric measurements as Mars surface data or invent unapproved NASA exposure limits.
- **Don't** block autonomous operation when Earth communication is delayed or offline.
