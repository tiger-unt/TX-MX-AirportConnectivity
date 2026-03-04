# Web App Implementation Backlog

Date: 2026-03-03  
Scope: `07_WebApp`

## Purpose

This backlog turns the review findings into a practical execution plan with clear priorities.

Reference report:
- `07_WebApp/WebApp-Critical-Review-Findings-and-Recommendations.md`

## Priority Levels

- **P0**: Trust, correctness, and high-impact clarity fixes
- **P1**: Storytelling and UX improvements
- **P2**: Performance hardening and structural improvements

## P0 - Trust and Correctness

- [ ] **Unify Texas share calculation in `U.S.-Mexico`**
  - **Why:** Prevent conflicting percentages in the same view
  - **Files:** `src/pages/USMexico/index.jsx`
  - **Done when:** KPI, insight callout, and ranking card use one canonical denominator

- [ ] **Fix "52 states" wording ambiguity**
  - **Why:** Avoid credibility confusion for first-time viewers
  - **Files:** `src/pages/TexasDomestic/index.jsx`
  - **Done when:** Label clearly states states/territories, or logic is changed to states-only

- [ ] **Add global filter persistence disclosure**
  - **Why:** Users currently miss that filters carry between pages
  - **Files:** `src/components/layout/DashboardLayout.jsx`, `src/components/filters/FilterSidebar.jsx`
  - **Done when:** Visible banner/chip line shows active global filters and persistence behavior

- [ ] **Add scope guardrails under page heroes**
  - **Why:** Reduce overlap confusion between Texas International and Texas-Mexico
  - **Files:** `src/pages/TexasInternational/index.jsx`, `src/pages/TexasMexico/index.jsx`, `src/pages/USMexico/index.jsx`
  - **Done when:** Each page says exactly what is included/excluded and when to use it

- [ ] **Accessibility quick fix: labeled select controls**
  - **Why:** Lighthouse flagged unlabeled selects
  - **Files:** `src/components/filters/FilterSelect.jsx`, `src/components/filters/FilterMultiSelect.jsx`, chart-header selects in page files
  - **Done when:** All interactive selects have programmatic labels

## P1 - Storytelling and UX

- [ ] **Add "Start Here (2 min)" guided path on Home**
  - **Why:** Give first-time users a clear read order
  - **Files:** `src/pages/Overview/index.jsx`
  - **Done when:** Home has a 3-step exploration flow with links

- [ ] **Make AI suggested prompts page-aware**
  - **Why:** Generic prompts reduce trust on non Texas-Mexico pages
  - **Files:** `src/components/ai/SuggestedQuestions.jsx`, `src/lib/pageContext.js`, `src/stores/chatStore.js`
  - **Done when:** Prompt set changes by current route/context

- [ ] **Improve AirportMap interpretability**
  - **Why:** Map is a centerpiece and needs stronger onboarding cues
  - **Files:** `src/components/maps/AirportMap.jsx`
  - **Done when:** Marker-size meaning is explicit and map interaction help is always clear

- [ ] **Improve keyboard behavior for tab navigation**
  - **Why:** Current tablist behavior does not support arrow-key tab switching
  - **Files:** `src/components/ui/TabBar.jsx`
  - **Done when:** Left/right arrows move active tab and update `aria-selected`

- [ ] **Reduce visual control noise in chart headers**
  - **Why:** Repeated action icons increase cognitive load
  - **Files:** `src/components/ui/ChartCard.jsx`, `src/components/ui/DownloadButton.jsx`
  - **Done when:** Actions are simplified (grouped or progressively revealed) without losing function

## P2 - Performance Hardening

- [ ] **Replace broad auto-typing with explicit parsing**
  - **Why:** CPU profile shows parse/token/GC startup costs
  - **Files:** `src/stores/aviationStore.js`
  - **Done when:** CSV parse cost is reduced and data typing is deterministic

- [ ] **Move heavy parse/enrichment off main thread**
  - **Why:** Avoid startup blocking on slower stakeholder machines
  - **Files:** new worker module + `src/stores/aviationStore.js`
  - **Done when:** Data load/enrich work executes in worker with same outputs

- [ ] **Add lightweight runtime performance instrumentation**
  - **Why:** Track real-world regressions over time
  - **Files:** `src/stores/aviationStore.js`, key page components
  - **Done when:** Load and interaction timings are logged in dev mode

## Acceptance Criteria by Priority

### P0 acceptance
- No contradictory percentage statements on `U.S.-Mexico`
- No ambiguous "states" terminology
- Users can clearly see if filters are globally active
- Scope boundaries are explicit on all major analysis pages
- Lighthouse a11y no longer reports unlabeled select controls

### P1 acceptance
- First-time user can follow a documented 3-step path from Home
- AI prompt relevance matches current page
- Map intent and interaction model are explicit without trial-and-error
- Tab keyboard navigation follows expected ARIA behavior

### P2 acceptance
- Measurable reduction in startup parse CPU/GC pressure
- Main-thread responsiveness is maintained during initial data load
- Dev instrumentation provides stable baseline timings

## Suggested Delivery Sequence

1. **Sprint 1:** Complete all P0 items
2. **Sprint 2:** Complete P1 storytelling + accessibility UX polish
3. **Sprint 3:** Complete P2 performance refactor and instrumentation

## Validation Checklist

- [ ] Manual route walkthrough: Home, Texas Domestic, Texas International, U.S.-Mexico, Texas-Mexico, About
- [ ] Filter persistence behavior is obvious and understandable
- [ ] Keyboard-only pass for navigation, tabs, filters, and map-adjacent controls
- [ ] Data spot-check of key KPIs vs CSV outputs
- [ ] Performance spot-check (load + filter + tab switching)
