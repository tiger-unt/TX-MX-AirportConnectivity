# Web App Critical Review: Findings and Recommendations

Date: 2026-03-03  
Project: TxDOT Airport Connectivity Dashboard (`07_WebApp`)

## Review Goal

Provide an honest, critical review of:
- where the dashboard can improve
- how to strengthen the story flow
- where first-time users may feel confused

## Review Scope and Method

- Live walkthrough of all major routes:
  - `/#/`
  - `/#/texas-domestic`
  - `/#/texas-international`
  - `/#/us-mexico`
  - `/#/texas-mexico` (all 5 tabs)
  - `/#/about-data`
- Interaction checks:
  - filter behavior across pages
  - tab navigation
  - "Ask AI" panel behavior
  - visual density and above-the-fold clarity
- Source review of key files for root causes:
  - `src/pages/USMexico/index.jsx`
  - `src/pages/TexasDomestic/index.jsx`
  - `src/pages/Overview/index.jsx`
  - `src/components/layout/SiteHeader.jsx`
  - `src/components/filters/FilterSidebar.jsx`
  - `src/components/ai/SuggestedQuestions.jsx`
  - `src/stores/aviationStore.js`

## Executive Summary

The dashboard is visually strong and data-rich, but first-time trust and orientation are the main risks.  
The biggest issues are:
1) inconsistent metric logic in one key page,  
2) identity/scope ambiguity across pages, and  
3) high cognitive load before users can form a clear narrative.

If these are fixed, the dashboard will feel significantly clearer and more authoritative for new users.

## Critical Findings (Prioritized)

## 1) [Critical] Inconsistent Texas-share logic on `U.S.-Mexico` page

### What happens
Two Texas share values are calculated from different denominators, which can produce conflicting numbers in the same view.

### Why this matters
When percentages disagree in one page, users question data credibility immediately.

### Where
- `src/pages/USMexico/index.jsx`
  - KPI share path uses total U.S.->Mexico denominator from filtered latest-year rows
  - Insight/rank path uses top-15-ranked subset for denominator in one branch

### Recommendation
- Use one canonical denominator for all Texas share outputs on this page:
  - total U.S.->Mexico passengers for the active filter context (full set, not truncated rankings)
- Create one memoized helper and reuse it for KPI, insight callout, and rank card.

---

## 2) [High] Product identity is inconsistent

### What happens
The browser title and in-app naming use different frames:
- browser title references "U.S.-Mexico Trade Dashboard"
- header/home hero references "Texas-Mexico Air Connectivity"

### Why this matters
New users need immediate clarity on "what this product is." Mixed naming causes scope uncertainty from the first 5 seconds.

### Where
- `07_WebApp/index.html`
- `src/components/layout/SiteHeader.jsx`
- `src/pages/Overview/index.jsx`

### Recommendation
- Define one primary product name and one subtitle taxonomy.
- Example:
  - Product: "TxDOT Air Connectivity Dashboard"
  - Scope descriptors per page: Texas Domestic, Texas International, U.S.-Mexico, Texas-Mexico.

---

## 3) [High] Global filters persist across pages without strong disclosure

### What happens
Filters are globally stored and carry between route changes, but users can miss that state transfer.

### Why this matters
Users may assume each page starts clean, then misread numbers as incorrect when they are actually filtered.

### Where
- `src/stores/aviationStore.js` (`filters` shared globally)
- `src/components/filters/FilterSidebar.jsx` (state shown only in sidebar context)

### Recommendation
- Add a top-of-content "Active Global Filters" banner on analysis pages.
- Add a small "Filters persist across pages" info note near filter header.
- Optional: page-level "Reset on page load" toggle for presentations.

---

## 4) [High] Scope overlap is not explained enough for first-time users

### What happens
`Texas International` includes Mexico, while `Texas-Mexico` is also a dedicated chapter.  
This is valid analytically but not obvious to new users.

### Why this matters
Users may think pages duplicate each other or that one page is "wrong."

### Where
- `src/pages/TexasInternational/index.jsx`
- `src/pages/TexasMexico/index.jsx`

### Recommendation
- Add explicit "scope guardrails" directly under each hero:
  - "Includes Mexico + all non-U.S. countries"
  - "Texas-Mexico only, bidirectional"
- Add a one-line "When to use this page" hint in each hero area.

---

## 5) [Medium] AI suggestions are not context-aware by page

### What happens
Suggested prompts focus on Texas-Mexico regardless of current page context.

### Why this matters
AI feels generic and less trustworthy if prompts do not match the active page.

### Where
- `src/components/ai/SuggestedQuestions.jsx`

### Recommendation
- Make suggestions route-aware (domestic prompts on domestic page, etc.).
- Add 1-2 "explainer prompts" per page to guide first-time interpretation.

---

## 6) [Medium] Labeling can trigger credibility doubt ("52 states")

### What happens
`Texas Domestic` shows "Connected U.S. States (2024): 52."

### Why this matters
Most users will read this as a mistake unless territories/DC are explicitly indicated.

### Where
- `src/pages/TexasDomestic/index.jsx`

### Recommendation
- Relabel as "Connected U.S. States/Territories" or revise counting logic to states-only.
- Add tooltip note with counting rule.

---

## 7) [Medium] Above-the-fold cognitive load is heavy on analysis pages

### What happens
Hero + intro + callouts + KPI row + persistent filter stack + many chart actions all compete for attention before the first core chart.

### Why this matters
New users need a clearer "read order" to form a mental model quickly.

### Recommendation
- Use a stricter narrative hierarchy:
  1) one-sentence takeaway
  2) 3 KPI cards max
  3) first anchor chart
  4) secondary diagnostics below fold
- Keep detailed callouts, but reduce initial density.

---

## 8) [Low/Medium] Repetitive chart action controls add visual noise

### What happens
Repeated control clusters (download/png/fullscreen) appear in every card.

### Why this matters
Power users benefit; new users can feel overwhelmed.

### Where
- `src/components/ui/ChartCard.jsx`

### Recommendation
- Keep controls, but consider:
  - icon grouping simplification
  - reveal-on-hover for less-used actions
  - global "Download section data" on selected sections

## Storytelling Improvement Opportunities

## A) Add a "Start Here (2 minutes)" guided path on Home

Recommended 3-click flow:
1. `Home`: key corridor takeaway  
2. `Texas-Mexico` Overview tab: trend and corridor mechanics  
3. `U.S.-Mexico`: Texas national rank and context

## B) Use explicit section intent labels

Examples:
- "What happened?" (trends)
- "Where is it concentrated?" (routes/airports)
- "How healthy is service?" (capacity/load factor)
- "What does this imply?" (insight callout)

## C) Make About page dual-mode

- Quick mode: interpretation cheat-sheet for stakeholders
- Technical appendix: current deep details for analysts

## D) Standardize metric definitions in-place

Add micro-tooltips on key KPIs (share, load factor, schedule adherence) with exact formula in plain language.

## What a New User Is Most Likely to Feel

1. "This is impressive, but where do I start?"  
2. "Are these pages overlapping?"  
3. "Why did this percentage change from one section to another?"  
4. "Are my filters still active from another page?"  

## Recommended Action Plan

## Phase 1: Fast trust fixes (1-3 days)

1. Unify U.S.-Mexico Texas-share logic everywhere on the page  
2. Normalize dashboard naming across title/header/home  
3. Add active global filter disclosure banner  
4. Fix "52 states" wording or counting logic  
5. Make AI suggested prompts route-aware

## Phase 2: Story clarity improvements (1-2 weeks)

1. Add "When to use this page" scope labels in each hero  
2. Add Home "Start Here" guided path  
3. Reduce above-the-fold density on long pages  
4. Convert U.S.-Mexico into chaptered/tab narrative (similar to Texas-Mexico)

## Phase 3: UX polish and governance (ongoing)

1. Standard metric-definition tooltips for all headline KPIs  
2. Evaluate chart-action simplification for novice users  
3. Add a lightweight "new user smoke test" checklist before releases

## Success Metrics to Track After Changes

- Time to first meaningful interaction (first chart/tab/filter use)
- Bounce rate from non-home pages entered directly
- Frequency of filter reset usage
- Frequency of "About Data" visits from analysis pages
- Stakeholder-reported confusion points during demos

## Addendum: Missing Areas (Now Covered)

The following requested gaps were audited with direct measurements and spot-checks.

## 1) Performance Observations

### What was measured
- Web app source data payload actually loaded in-browser:
  - `BTS_T-100_Market_2015-2024.csv`: 13,501,966 bytes
  - `BTS_T-100_Segment_2015-2024.csv`: 15,774,286 bytes
  - `BTS_T-100_Airports_2015-2024.geojson`: 280,681 bytes
- Row volume loaded by the web app:
  - Market: 94,115 rows
  - Segment: 96,321 rows
  - Total: 190,436 rows

### Interaction timing benchmarks (Playwright, desktop 1440x900)
- Home ready: ~1,560 ms
- `U.S.-Mexico` ready: ~1,265 ms
- `Texas-Mexico` ready: ~1,334 ms
- Filter update (`Carrier Type -> Domestic` on `U.S.-Mexico`): ~597 ms
- Tab switches (`Texas-Mexico`):
  - Overview -> Cargo: ~185 ms
  - Cargo -> Border: ~170 ms

### CPU profile findings (live interaction profile)
- Profile duration: 128.10s
- Total samples: 55,120 (validated from raw profile JSON)
- Active CPU: 17.1%, idle: 82.9%
- Highest self-time contributors:
  - garbage collector (largest single bucket)
  - D3 CSV tokenization/parsing (`token`, `parseRows`, `parse`, `autoType`)
- Interpretation:
  - Main cost is startup parse/typing of CSV plus GC churn, not sustained chart interaction jank.
  - Ongoing interactions are generally responsive, but startup parse cost is real.

### Performance recommendation
- Replace `d3.autoType` with explicit column typing for known fields to reduce parse overhead.
- Consider pre-typed JSON/Parquet or chunked loading for first render.
- Consider moving heavy parse/enrichment to a Web Worker.

## 2) Mobile/Responsive Assessment

### Viewport checks (`Texas-Mexico`)
- Mobile (390x844):
  - mobile nav toggle visible
  - desktop filter sidebar hidden
  - no horizontal overflow
  - tab row overflows horizontally (scroll expected/works)
- Tablet (768x1024):
  - desktop nav active (mobile toggle hidden)
  - desktop filter sidebar hidden
  - no horizontal overflow
  - tab row still overflow-scroll
- Desktop (1280x800):
  - desktop nav + filter sidebar visible
  - no horizontal overflow

### Map sizing across viewports (`AirportMap` first map in `Texas-Mexico`)
- Mobile: 282 x 381
- Tablet: 660 x 409
- Desktop: 884 x 437
- Zoom controls present in all tested viewports.

### Responsive interpretation
- Core responsiveness is working and no horizontal overflow bug was observed in Playwright.
- Tablet layout is functional but can feel dense (desktop nav + no right filter panel + many controls).

## 3) Accessibility Audit

### Lighthouse (Texas-Mexico route)
- Accessibility score: 0.92
- Failing audits:
  - `color-contrast`: insufficient contrast on at least one body text block
  - `select-name`: unlabeled `<select>` controls (3 instances)

### Keyboard navigation check
- Tab order reaches major controls (header nav, tabs, chart actions, map controls).
- However, ARIA tablist keyboard behavior is incomplete:
  - Arrow key did **not** switch active tab in testing.
  - Tabs are clickable and tab-focusable, but expected left/right arrow navigation is missing.
- No skip-link observed in early tab order (first focus target starts on header controls).

### Accessibility recommendation
- Add programmatic labels (`aria-label` or `<label htmlFor>`) to chart header selects.
- Implement arrow-key behavior on `TabBar` to match tablist accessibility pattern.
- Add a visible skip link (`Skip to main content`).
- Re-check text contrast tokens on low-emphasis paragraph styles.

## 4) Data Accuracy Spot-Checks (CSV Cross-Reference)

Displayed metrics were cross-checked against `07_WebApp/public/data/*.csv`.

### Matches confirmed
- Texas Domestic Passengers (2024): 164.0M
- Texas International Passengers (2024): 27.0M
- U.S.-Mexico Passengers (2024): 40.3M
- Texas-Mexico Passengers (2024): 11.0M
- U.S.-Mexico Texas share (latest-year all-states method): 27.5%
- U.S.-Mexico top route (latest year): LAX-GDL
- Border share callout:
  - passengers: 0.3%
  - cargo: 28.5%

### Important nuance verified
- `Connected U.S. States = 52` is mathematically true under current logic because it includes:
  - Puerto Rico
  - U.S. Virgin Islands

### Confirmed inconsistency source
- The `U.S.-Mexico` 28.1% figure comes from a **top-15 all-years ranking denominator**.
- The 27.5% KPI comes from a **latest-year all-states denominator**.
- Both are internally consistent to their own formulas, but inconsistent with each other in presentation context.

## 5) AirportMap-Specific Review

### What works well
- Strong visual centerpiece with clear geospatial context.
- Good interaction design for wheel-zoom guarding ("click map to enable zooming").
- Border-airport highlighting is effective and understandable.
- Supports fit-to-bounds and fullscreen reuse.

### Confusion/risk points
- Marker-size meaning is implicit; there is no explicit bubble-size legend.
- Reset behavior for selected airport is discoverable by experience, but not explicit in controls text.
- Selection can change arc density dramatically; users may not understand why map complexity suddenly increases.
- Accessibility: circle markers are mouse-first interactions; keyboard/screen-reader discoverability is limited.

### Map recommendations
- Add a compact "Marker size = metric volume" legend cue.
- Add explicit helper text near map title: "Click airport to filter routes; click map background to clear."
- Add a keyboard-accessible airport list control synchronized with map selection (especially for accessibility).
- Consider clustering or optional density mode for high-point maps (`U.S.-Mexico`) to reduce visual clutter.

## Closing Note

The dashboard already has strong data depth and visual polish.  
The next leap is not "more charts" - it is stronger narrative scaffolding, consistent metric semantics, and clearer scope communication for first-time users.
