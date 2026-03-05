# WCAG Accessibility & Responsive Design — Deep Check

**Date:** March 5, 2025  
**Scope:** Airport Connectivity Dashboard (`07_WebApp/`)  
**Standards:** WCAG 2.1 Level A & AA, responsive layout and touch targets.

---

## 1. WCAG 2.1 Compliance Check

### 1.1 Perceivable

| Criterion | Level | Status | Notes |
|-----------|--------|--------|------|
| **1.1.1 Non-text Content** | A | Pass | Images have `alt` (e.g. SiteHeader logo `alt="TxDOT"`). Decorative icons in buttons are paired with text or `title`/`aria-label`. Chart content is data-driven; consider a short `aria-label` or `role="img"` with `aria-label` on chart containers for screen readers if charts are critical. |
| **1.3.1 Info and Relationships** | A | Pass | Headings (h1/h2/h3), lists, labels (`htmlFor`/`id` on FilterSelect/FilterMultiSelect), tables (thead/tbody). Landmarks: `<main id="main-content">`, `<nav>`, `<header>`, `<aside>` (sidebar), `<footer>`. |
| **1.3.2 Meaningful Sequence** | A | Pass | DOM order and reading order match; flex/grid used for layout without reordering. |
| **1.4.1 Use of Color** | A | Pass | Information not conveyed by color alone (e.g. links are underlined on hover, buttons have text/labels, trend uses icon + label). |
| **1.4.3 Contrast (Minimum)** | AA | Verify | **Recommend verification:** Run contrast checker on: (1) `#333f48` (text-primary) on white, (2) `#5a6872` (text-secondary) on white, (3) `#0056a9` (brand-blue) on white for links/buttons. Design tokens suggest dark-on-light; likely ≥4.5:1 for normal text. White text on gradient blue (`text-white/80`, `text-white`) should be checked for large text (3:1). |
| **1.4.4 Resize Text** | AA | Pass | No fixed px for body text; root `font-size: 16px`; layout uses rem/relative units and scales. No `overflow: hidden` on text that would clip at 200% zoom; containers use `min-w-0` and overflow handling. |
| **1.4.10 Reflow** | AA | Pass | No horizontal scrolling at 320px width for main content; responsive breakpoints (`sm:`, `md:`, `lg:`) and `max-w-*`, `overflow-x-auto` on tables. |
| **1.4.12 Text Spacing** | AA | Not tested | No custom overrides for user-applied text spacing; if users set letter/word/line spacing, test that no content is clipped. |
| **1.4.13 Content on Hover/Focus** | AA | Partial | **Gap:** StatCard tooltip appears only on hover; keyboard focus does not trigger it. If the tooltip conveys critical info, expose it on focus or as visible text. Dismissable: tooltip is not a popover that would need Escape. |

### 1.2 Operable

| Criterion | Level | Status | Notes |
|-----------|--------|--------|------|
| **2.1.1 Keyboard** | A | Partial | **Gap:** DataTable column sort is click-only on `<th>`. No `tabindex="0"` or `<button>` and no key handler (Enter/Space) to sort. Keyboard users cannot change sort order. Fix: make header cells focusable (e.g. `<button>` inside `<th>` or `role="button"` + `tabindex="0"` + key handler). |
| **2.1.2 No Keyboard Trap** | A | Pass | Skip link, focus trap in Ask AI drawer (with Escape to close), Tab cycles correctly; no traps found. |
| **2.4.1 Bypass Blocks** | A | Pass | Skip to main content link at top of PageWrapper; targets `<main id="main-content">`. |
| **2.4.2 Page Titled** | A | Pass | `<title>` in index.html: "Airport Connectivity Dashboard \| TxDOT". |
| **2.4.3 Focus Order** | A | Pass | Logical tab order (skip → header → nav → main → footer); modals/drawer manage focus. |
| **2.4.4 Link Purpose** | A | Pass | Links use descriptive text ("Back to Overview", "Texas Domestic", etc.). |
| **2.4.5 Multiple Ways** | AA | Pass | Main nav, 404 "Or jump to" links, and routes provide multiple ways to reach content. |
| **2.4.6 Headings and Labels** | AA | Partial | **Gap:** Two pages use a second `<h1>` in the hero (Overview, About Data) while SiteHeader already has `<h1>Airport Connectivity Dashboard</h1>` on every page. Result: duplicate h1 and ambiguous hierarchy. Recommend: use a single h1 per page (e.g. keep h1 in header and use `<h2>` for page hero title on Overview and About Data). |
| **2.4.7 Focus Visible** | AA | Partial | Many controls have `focus:ring-2` or `focus:outline`; good. **Gaps:** (1) DownloadButton menu items use `focus:outline-none` and only `focus:bg-surface-alt` — no visible focus ring; (2) ChartCard icon buttons (PNG export, fullscreen, reset) have small hit area and rely on `title`; ensure focus ring is visible (e.g. `focus-visible:ring-2`). |
| **2.5.5 Target Size** | AAA | Partial | WCAG AAA suggests ≥44×44 CSS px for touch targets. ChartCard header buttons are `p-1.5` with 14px icons (~26px total); FilterSidebar collapse and "Back to top" are similar. Level AA has no target-size requirement; if targeting AAA or mobile-first, increase padding or tap area (e.g. `min-w-[44px] min-h-[44px]` or larger touch zone). |

### 1.3 Understandable

| Criterion | Level | Status | Notes |
|-----------|--------|--------|------|
| **3.1.1 Language of Page** | A | Pass | `<html lang="en">` in index.html. |
| **3.2.1 On Focus** | A | Pass | No change of context on focus alone. |
| **3.2.2 On Input** | A | Pass | No unexpected context change on input; form controls and buttons behave as expected. |
| **3.3.1 Error Identification** | A | N/A | No forms with validation errors in scope. |
| **3.3.2 Labels or Instructions** | A | Pass | Filters have visible labels and `htmlFor`/`id`; buttons have text or `aria-label`/`title`. |

### 1.4 Robust

| Criterion | Level | Status | Notes |
|-----------|--------|--------|------|
| **4.1.1 Parsing** | A | Pass | Valid HTML; React generates well-formed markup. |
| **4.1.2 Name, Role, Value** | A | Partial | Most controls have name/role/value. **Gap:** DataTable sortable column headers are plain `<th>` with `onClick` — they have no `role="button"` or equivalent, and no accessible name for "sort by this column" (e.g. `aria-sort` and button with `aria-label`). |
| **4.1.3 Status Messages** | AA | N/A | No dynamic status messages (e.g. live regions) in scope; loading/error states are visible on screen. |

---

## 2. Additional WCAG / Accessibility Notes

### 2.1 Reduced Motion

- **Gap:** No `prefers-reduced-motion` handling. Animations (e.g. `animate-spin`, `animate-fade-up`, typing dots, drawer transition) run for all users.  
- **Recommendation:** In `globals.css`, add a media query to tone down or disable non-essential motion for users who prefer reduced motion, e.g.  
  `@media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }`  
  or limit to specific classes so critical feedback (e.g. loading spinner) can remain.

### 2.2 Tab / Panel Association

- TabBar has `role="tablist"` and `role="tab"` with `aria-selected` and roving tabindex. Tab panels (content below) are not marked with `role="tabpanel"` or `aria-labelledby` linking to the active tab.  
- **Recommendation:** Add `role="tabpanel"` and `aria-labelledby` (pointing to the id of the active tab) on the panel container, and optionally `id` on each tab so panels can reference them. Improves screen reader navigation.

### 2.3 Small Font Sizes (Documented Exceptions)

- CLAUDE.md allows exceptions: filter chips/tags, FilterMultiSelect group headers (10–11px), Leaflet popup (13px), attribution (10px).  
- ActiveFilterTags uses `text-xs` (Tailwind); if that resolves to &lt;16px, it aligns with the "filter tags" exception. Leaflet popup and attribution are 13px and 10px per leaflet-overrides.css — documented.  
- **Recommendation:** Confirm Tailwind `text-xs` in this project (theme overrides may make it 1rem); if it is &lt;16px, keep only for the documented exceptions.

---

## 3. Responsive Design Check

### 3.1 Viewport and Base

| Check | Status | Notes |
|-------|--------|------|
| Viewport meta | Pass | `<meta name="viewport" content="width=device-width, initial-scale=1.0">` in index.html. |
| Root font size | Pass | `html { font-size: 16px }`; no zoom locking. |
| Container width | Pass | `container-chrome` max-width 1280px; content doesn’t overfill on large screens. |

### 3.2 Breakpoints and Layout

| Area | Implementation | Status |
|------|----------------|--------|
| Main nav | Desktop: horizontal bar; mobile: hamburger + slide-down (`hidden md:flex`, `md:hidden`) | Pass |
| Page hero | Padding `py-10 md:py-14`, title `text-3xl md:text-4xl` | Pass |
| Stat cards / grids | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` (or 5 on Texas–Mexico) | Pass |
| Sidebar | `hidden lg:block` for filter sidebar; mobile/tablet use FilterBar above content | Pass |
| Padding | `px-4 sm:px-6`, `container-chrome` padding 1.5rem | Pass |
| TabBar | Horizontal scroll on small screens (`overflow-x-auto scrollbar-hide`) | Pass |

### 3.3 Overflow and Scrolling

| Area | Implementation | Status |
|------|----------------|--------|
| DataTable | `overflow-x-auto` on scroll wrapper; `max-w-full` / `w-fit` so table doesn’t force full width | Pass |
| About Data tables | `overflow-x-auto` wrapper around tables | Pass |
| Long content | Main content in flex column with `min-w-0` to avoid overflow; sidebar `overflow-y-auto` | Pass |

### 3.4 Touch and Input

| Check | Status | Notes |
|-------|--------|------|
| Tap targets | Partial | Many buttons are &lt;44px (e.g. ChartCard icons, some filter chips). Acceptable for AA; for AAA or better mobile UX, increase size. |
| Form controls | Pass | Filter inputs and dropdowns are full-width in sidebar; FilterBar on mobile provides access. |
| No hover-only actions | Pass | All actions can be triggered by keyboard or tap; no critical hover-only behavior. |

### 3.5 Typography and Readability

| Check | Status | Notes |
|-------|--------|------|
| Minimum body text | Pass | Project rule: 16px minimum with documented exceptions (filter UI, map popup, attribution). |
| Line height | Pass | `line-height: 1.6` on body; headings `1.2`. |
| Responsive type | Pass | Headings scale (e.g. `text-2xl md:text-3xl`); StatCard value `text-2xl md:text-3xl`. |

---

## 4. Summary and Priority Fixes

### 4.1 WCAG — Recommended Fixes (Level A/AA)

| Priority | Issue | Fix |
|----------|--------|-----|
| High | **DataTable sort not keyboard accessible** | Put a `<button>` inside each sortable `<th>` (or use `role="button"` + `tabindex="0"`), add `aria-sort` and `aria-label` (e.g. "Sort by Year ascending"), handle Enter/Space to toggle sort. |
| High | **Duplicate h1 on Overview and About Data** | Change page hero on Overview and About Data from `<h1>` to `<h2>` so the only h1 is "Airport Connectivity Dashboard" in SiteHeader. |
| Medium | **Focus visible on DownloadButton menu items** | Add a visible focus ring (e.g. `focus-visible:ring-2 focus-visible:ring-brand-blue`) and avoid relying only on `focus:bg-surface-alt` so keyboard users see focus. |
| Medium | **DataTable header semantics** | Expose sort state and column name to assistive tech (`aria-sort="ascending"` / `"descending"` / `"none"`, and button label that includes column name and state). |
| Low | **StatCard tooltip on focus** | If tooltip content is important, make it available on focus (e.g. show on `:focus-within`) or duplicate as visible text. |
| Low | **Tab panels** | Add `role="tabpanel"` and `aria-labelledby` (and optional `id` on tabs) for Texas–Mexico tab content. |

### 4.2 Responsive Design — Recommendations

| Priority | Issue | Fix |
|----------|--------|-----|
| Low | **Touch target size (AAA)** | Where possible, increase tap area for ChartCard actions and small icon buttons to at least 44×44px (e.g. `min-w-[44px] min-h-[44px]` and `flex items-center justify-center`). |
| Low | **Contrast verification** | Run WCAG contrast checker (e.g. WebAIM, axe DevTools) on text-primary, text-secondary, brand-blue on white, and white on gradient blue to confirm ≥4.5:1 (normal) and ≥3:1 (large). |

### 4.3 Optional Enhancements

- **Reduced motion:** Respect `prefers-reduced-motion: reduce` for animations and transitions.
- **Chart accessibility:** For key charts, add a brief `aria-label` or `role="img"` with `aria-label` describing the chart (e.g. "Line chart of passengers from 2015 to 2024") so screen reader users get a summary.

---

## 5. What’s Already in Good Shape

- Skip link, landmarks, and focus trap in Ask AI drawer.  
- Filter controls: labels, ARIA (FilterMultiSelect listbox, DownloadButton menu), keyboard support.  
- Mobile nav: focus management and `aria-expanded`.  
- Map: `role="region"` and `aria-label`.  
- Viewport, responsive grid, and overflow handling.  
- No reliance on color alone; link and button purposes are clear.  
- Page title and language set; no unexpected context changes.

This document can be used as a checklist for remediation and for re-testing after changes (e.g. with axe DevTools or Lighthouse Accessibility).
