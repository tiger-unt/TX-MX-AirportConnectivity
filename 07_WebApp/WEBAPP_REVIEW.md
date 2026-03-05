# Web App Review — Improvements & Concerns

**Date:** March 5, 2025  
**Scope:** Airport Connectivity Dashboard (`07_WebApp/`)

---

## Critical: Data Load Failure Has No UI

**Issue:** The aviation store sets `error` and `loading: false` when `loadData()` fails (e.g. missing CSV/GeoJSON or network error), but **no component reads `error`**. Users see loading finish and then empty charts/tables with no explanation.

**Recommendation:** Surface the store’s `error` in the app shell (e.g. in `PageWrapper` or `AppContent`): when `error` is set, show a clear message and a “Retry” button that calls `loadData()` again. Keep existing per-page loading spinners; add this so failed loads are visible and recoverable.

---

## Other Improvements & Concerns

### 1. Ask AI drawer — focus trap

The drawer closes on Escape and uses `role="dialog"` and `aria-label`, but there’s no focus trap or “focus on open” behavior. When the drawer is open, focus can tab to the page behind it. Consider trapping focus inside the drawer while open and moving focus to the first focusable element when it opens (and restoring it on close).

### 2. Favicon path in `index.html`

The favicon is hardcoded as `/Data-Dashboard-Boilerplate/assets/Logos/...`. With Vite `base: './'`, that path can 404 depending on deployment. Prefer a path that respects your build output (e.g. put the logo under `public/` and reference it relative to the app root or use a path that works with your deploy URL).

### 3. Error boundary “Try again”

The ErrorBoundary “Try again” button only clears local error state; it doesn’t re-run data loading or navigation. For errors that might be fixed by reloading data, consider also calling `loadData()` (and/or scrolling to top / navigating home) when the user clicks “Try again,” so recovery is one click.

### 4. Empty state after load

When load succeeds but data is empty (e.g. filters remove everything), some views might only show blank charts. You already use `emptyState` on ChartCard in places; extending that pattern everywhere (and a single “No data for current filters” message for the main content area when filtered data is empty) would make behavior consistent.

### 5. SEO / meta

`index.html` has a good title and viewport; there’s no meta description. Adding a short `<meta name="description" content="...">` would help when the app is linked or indexed.

### 6. Unicode

The only `\uXXXX` in the app is the BOM in `downloadCsv.js`, which is intentional. No change needed.

---

## What’s Already in Good Shape

- **Error boundary** wraps routes and shows a clear fallback.
- **Loading state** is handled per page with a consistent spinner.
- **Null/empty data** is guarded in memos (`if (!marketData) return []`), so failed load doesn’t crash the app.
- **Ask AI drawer** has Escape-to-close and solid ARIA on the panel.
- **Chart height** rules are documented and the ChartCard footnote pattern avoids the recurring bug.
- **Data flow** (store → filters → memos → charts) is clear and consistent.
