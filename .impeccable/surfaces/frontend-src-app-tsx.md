---
version: 1
slug: "frontend-src-app-tsx"
primary_target: "frontend/src/App.tsx"
related_targets: []
---

# Surface Brief: MarsCare AI — Autonomous Deep-Space Personal Health Companion (`frontend/src/App.tsx`)

- **Scope:** Full 6-screen astronaut personal health companion (`Mission Overview` featuring centered `Interactive Human Body`, `Health Assessment`, `Spaceflight Hazards`, `AI Health Assistant`, `Health History`, `Communication Status`), preserving `TARSCARE AI` backend identifiers.
- **Mode:** Operate
- **Chosen Direction Sketch:** `.impeccable/mocks/decision/challenger-wayfinding.html` (`Crew Wayfinding Triage Bands`)
- **Build Path:** `code` (`buildPathFlipped: false`)

## Direction contract

THESIS: An autonomous deep-space personal health companion built around directional Crew Wayfinding Triage Bands that answer "How am I doing?", "What has changed?", and "Should I take any action?" on first glance, anchored by a luminous centered Interactive Human Body corridor that turns every physiological shift into calm, evidence-informed action without Earth dependency.

OWN-WORLD: Calm deep-space navy surfaces (`#0B0D1A` main background, `#121522` secondary cards with `16px` radius), crisp `#FAF9FA` primary text and `#E5E5E4` secondary text in `Host Grotesk`, soft `#A5D8FF` ambient radial illumination strictly reserved behind key companion focal elements (such as the centered Interactive Human Body and active triage band), `#EEF0F6` pill-shaped primary buttons with `#040404` ink, and green/amber/red used exclusively for `Normal`, `Warning`, and `Critical` health status and data-provenance badges (`Real Research Data`, `Simulated Data`, `User-Entered Data`). Refuses decorative sci-fi clutter, eyebrow kickers above headings, >1px left borders, gradient text, and emoji icons.

STORY: Opening Mission Overview immediately gives the astronaut plain-language triage answers across the horizontal wayfinding band alongside Mission Day (Sol), crew profile, and communication status; selecting any of the 7 body regions (`Head and Brain`, `Eyes`, `Heart`, `Lungs`, `Muscles`, `Bones`, `Whole Body`) highlights the anatomy, reveals linked measurements, 7-day trends, spaceflight risk context, and a pill `Start Health Assessment` CTA; drilling into any of the 5 hazards shows a unified 4-section brief (*What are we monitoring?*, *What has changed?*, *Why does it matter in space?*, *What should I do next?*); submitting measurements or categorized symptoms yields an explained assessment plus 4-tier Health Guidance; and the offline-first RAG assistant + Health History + 3-state Communication Status (`Connected`, `Delayed`, `Offline`) keep care continuous even without Earth contact.

FIRST VIEWPORT: Top horizontal bar (`MarsCare AI`, 6 pill-capable nav tabs, astronaut profile + Mission Sol + communication pill + provenance tag); directly underneath, the monumental Crew Wayfinding Triage Band (large Sol numeral + *How am I doing?*, *What has changed?*, *Should I take any action?* + `#EEF0F6` `Start Health Assessment` pill button); below that, the 3-column Interactive Human Body corridor (left 7-region selector wayfinding rail with live region status, centered glowing Interactive Human Body vector explorer, right Latest Telemetry vs. Personal Baseline card stack + selected organ insight); grounded by the 5-hazard wayfinding status strip above 7/14/30-day trend charts and recent alerts below the fold.

FORM: Crew Wayfinding Triage Bands (adopted challenger `wayfinding-cartography-signage-terminal-yellow-wayfinding` adapted to MarsCare AI navy palette, paired with anatomical landmark correspondence from `notation-diagram-systems-orienteering-map`), `seed:545159eea7949b0d`.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
