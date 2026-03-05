# Web App Deep-Dive Review — Further Improvements

**Date:** March 5, 2025  
**Scope:** Airport Connectivity Dashboard (`07_WebApp/`)  
**Context:** Follow-up to the initial review; the six items from that review are assumed fixed.

---

## Status

The following deep-dive items have been **implemented** (March 2025). See `FIXES_VERIFICATION.md` for line-by-line verification.

- **1.1** FilterMultiSelect ARIA + keyboard — `FilterMultiSelect.jsx`
- **1.2** Skip link — `PageWrapper.jsx`
- **1.3** Mobile nav focus — `MainNav.jsx`
- **2.1** Retry loading state — `App.jsx`
- **4.2** Map accessibility — `AirportMap.jsx`
- **7.1** Ask AI aria-label — `SiteHeader.jsx`
- **7.2** 404 nav links — `NotFound/index.jsx`
- **7.3** DownloadButton ARIA + keyboard — `DownloadButton.jsx`
- **8.1** WEBAPP_REVIEW.md status — done
- **8.2** CLAUDE.md Accessibility — updated

Not yet implemented (optional): **5.1** Unit tests for helpers/utils.

---

## Summary

The app is in solid shape: clear data flow, error handling and empty states in place, focus trap on the AI drawer, and no unsafe HTML. The items below are **optional improvements** and **nice-to-haves**, not blockers.

---

## 1. Accessibility

### 1.1 Filter multi-select (FilterMultiSelect)

- **Current:** Trigger is a `<button>` with a `<label>`; dropdown is a plain `<div>` with option `<button>`s. No arrow-key navigation within the list.
- **Gap:** Screen-reader users get limited semantics (no `aria-expanded`, `aria-haspopup`, `aria-controls` on the trigger; list not exposed as `listbox`/`option`). Keyboard users cannot move through options with Arrow Up/Down or select with Enter/Space in a standard combobox way.
- **Suggestion:** Add `aria-expanded={open}`, `aria-haspopup="listbox"`, and `id`/`aria-controls` linking trigger to the list. Give the options container `role="listbox"` and each option `role="option"` and `aria-selected`. Implement arrow-key movement and Enter to toggle selection (and optionally Escape to close without committing). This aligns with the [ARIA combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/).

### 1.2 Skip link

- **Current:** No “Skip to main content” link. Keyboard users must tab through header and full nav before reaching page content.
- **Suggestion:** Add a skip link at the very start of the page (e.g. in `PageWrapper` or `SiteHeader`) that is focusable and visible on focus, and that targets the main content (`<main>` or a dedicated `id="main-content"`). Hide it off-screen and show it when focused (e.g. with a `.sr-only.focus:not-sr-only` pattern).

### 1.3 Mobile nav

- **Current:** Hamburger button has `aria-label="Toggle navigation"`. The expandable menu is a `<div>` that appears below; when open, focus is not moved into the menu.
- **Suggestion:** When the mobile menu opens, move focus to the first nav link (or the first link in the expanded region) so keyboard/screen-reader users don’t have to tab from the hamburger through the whole list. When the menu closes, restore focus to the hamburger button.

---

## 2. Data Load & Retry UX

### 2.1 Retry loading state

- **Current:** When the user clicks “Retry” on `DataLoadError`, `loadData()` runs and the store sets `loading: true` and `error: null`, so the app switches to showing routes and each page shows its loading spinner. That works, but the transition can feel abrupt.
- **Suggestion:** Optionally keep the user on the error view during retry: e.g. pass a “retrying” flag from the store (or derive it from `loading && previousError`) and show “Retrying…” and a disabled Retry button until the request completes. Then either show success (routes) or leave them on the error screen with the new message. This is a polish item, not required for correctness.

---

## 3. Performance & Scale

### 3.1 Large data in memory

- **Current:** All market and segment CSVs are loaded once, parsed, normalized, and enriched in memory. Filtering and aggregation are done in React (useMemo) over these arrays. For the current dataset size this is fine.
- **Note:** If the pipeline later adds many more years or routes, watch for slow first load (parsing/enrichment) and slow re-renders when filters change. If it ever becomes an issue, consider: (a) server-side or worker-based filtering/aggregation, or (b) virtualizing long lists (e.g. in filter dropdowns or tables). No change recommended right now.

### 3.2 Table pagination

- **Current:** `DataTable` uses pagination with a fixed or dynamic page size; only the current page is rendered. No virtualization.
- **Verdict:** Adequate for the current row counts. If you ever show very large tables (e.g. thousands of rows) in one view, consider virtualized scrolling; otherwise this is fine.

---

## 4. Map & External Services

### 4.1 Tile layer

- **Current:** CARTO Light basemap (`https://{s}.basemaps.cartocdn.com/light_all/...`) with attribution. Loaded over HTTPS.
- **Note:** If the app is ever used in strict offline or high-restriction environments, tiles will fail; that’s acceptable for a typical dashboard. No change needed unless you have an offline requirement.

### 4.2 Map accessibility

- **Current:** Leaflet map is interactive (pan, zoom, markers, popups). Keyboard access to map controls is limited by default in Leaflet.
- **Suggestion:** Ensure the map container or a visible “Map” heading has an `aria-label` (or that the surrounding ChartCard title is associated) so screen-reader users know what the region is. If you add custom keyboard shortcuts (e.g. zoom in/out), document them in the UI or in an “About”/help section.

---

## 5. Testing & Maintainability

### 5.1 Unit tests

- **Current:** No unit tests (no Vitest/Jest in `package.json`). There are Playwright-based scripts for functional, visual, and responsive checks.
- **Suggestion:** For long-term maintainability, consider adding a small unit-test suite for:
  - **Route predicates and helpers** (`aviationHelpers.js`): e.g. `isTxMx`, `isUsToMx`, filters by state/country.
  - **Aggregation and formatting** (`airportUtils.js`, `chartColors.js`): e.g. `aggregateRoutes`, `aggregateAirportVolumes`, formatters with known inputs.
  - **Store behavior** (optional): e.g. normalization and enrichment produce expected keys and types; filter reset clears state.
  That would catch regressions when refactoring data or filters without running the full Playwright suite every time.

### 5.2 Error boundary coverage

- **Current:** A single `ErrorBoundary` wraps all routes. A render error in one page takes down the whole route tree and shows the generic “Try again” UI.
- **Verdict:** Acceptable. If you ever want to isolate a heavy or experimental section (e.g. one tab or one chart), you could wrap only that section in another `ErrorBoundary` so the rest of the page stays usable.

---

## 6. Security & Content

### 6.1 User and AI content

- **Current:** Chat messages render `content` as React children (`{content}`), so no HTML is interpreted. No `dangerouslySetInnerHTML` in chat. Chart tooltips use safe DOM APIs (noted in LineChart, TreemapChart, StackedBarChart).
- **Verdict:** No XSS risk from chat or chart data as implemented.

### 6.2 Data files

- **Current:** Data is loaded from same-origin (`BASE_URL` + `data/...`). No user input is used in URLs.
- **Verdict:** No change needed for typical deployment.

---

## 7. Small UX / Consistency Items

### 7.1 Ask AI button

- **Current:** Visible text is “Ask AI”; no extra `aria-label`. Fine for most users.
- **Optional:** Add `aria-label="Open Ask AI assistant"` (or similar) if you want to be explicit for assistive tech without changing the visible label.

### 7.2 404 page

- **Current:** Clear message and “Back to Overview” link. No link to the sitemap or nav.
- **Optional:** Add a short list of main nav links (e.g. Home, Texas–Mexico, About the Data) so users who land on a bad URL can jump to known pages without going back to Home first.

### 7.3 Download button dropdown

- **Current:** DownloadButton closes on outside click (pointerdown). No keyboard support to open/close the dropdown or move between Summary/Detail.
- **Optional:** Add `aria-expanded`, `aria-haspopup="menu"`, and keyboard support (Enter/Space to open, Arrow keys to move, Enter to choose, Escape to close) for consistency with other dropdowns.

---

## 8. Documentation & Conventions

### 8.1 WEBAPP_REVIEW.md

- **Suggestion:** Add a short “Status” or “Implemented” section at the top of `WEBAPP_REVIEW.md` noting that the six original items have been implemented (with a date or PR reference), so future readers don’t treat them as open work.

### 8.2 CLAUDE.md

- **Current:** Project rules and patterns are documented (Error Handling, Accessibility, etc.).
- **Verdict:** Keep updating CLAUDE.md when you add new patterns (e.g. skip link, FilterMultiSelect ARIA) so the next developer or AI has a single place to check.

---

## Priority Overview

| Priority | Area | Effort | Impact |
|----------|------|--------|--------|
| High | FilterMultiSelect ARIA + keyboard | Medium | Accessibility for keyboard/screen-reader users |
| Medium | Skip link | Low | Accessibility for keyboard users |
| Medium | Mobile nav focus on open/close | Low | Consistency and accessibility on mobile |
| Low | Retry loading state on DataLoadError | Low | Polish |
| Low | Unit tests for helpers/utils | Medium | Regressions and refactors |
| Low | 404 page nav links | Low | UX for bad URLs |
| Low | DownloadButton keyboard/ARIA | Low | Consistency |

---

## What’s Already in Good Shape

- Data load error UI and ErrorBoundary retry.
- Empty state when filters remove all data.
- AI drawer focus trap and aria-modal.
- Favicon and meta description.
- No unsafe HTML; chart tooltips use safe DOM.
- StrictMode, clear store structure, and consistent filter/data patterns.
- Playwright-based checks for functional, visual, and responsive behavior.

No critical issues turned up in this pass; the suggestions above are incremental improvements you can schedule as needed.
