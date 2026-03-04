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

## Closing Note

The dashboard already has strong data depth and visual polish.  
The next leap is not "more charts" - it is stronger narrative scaffolding, consistent metric semantics, and clearer scope communication for first-time users.
