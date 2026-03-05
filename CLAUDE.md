# CLAUDE.md - Task 6: Airport Connectivity

## Project Overview
TxDOT IAC 2025-26 research project analyzing airport connectivity between Texas and Mexico using BTS (Bureau of Transportation Statistics) Air Carrier data. Part of a UNT System interagency contract with TxDOT.

## Directory Structure
```
01_Raw Data/           # Source data (BTS raw downloads, airport master lists)
02_Data_Staging/       # Database and extraction scripts
  BTS_Air_Carrier_Statistics/
    Database/          # SQLite DB (~4.5 GB), schema JSON, data-cleaning rules
    Script/            # Python extraction, cleaning & query scripts
03_Process_Data/       # Cleaned/aggregated outputs (CSV, GeoJSON) → fed to webapp
04_GIS/                # GIS analysis files
05_Stakeholder_Outreach/
06_Deliverables/
07_WebApp/             # React dashboard application
08_Ref_Documents/
```

## Database
- **File**: `02_Data_Staging/BTS_Air_Carrier_Statistics/Database/BTS_Air_Carrier_Statistics.db` (SQLite, ~4.5 GB)
- **Schema docs**: `Database/Database_Schema_README.md` and `Database_Schema.json`
- **Key tables**:
  - `BTS_MARKET` (~8.3M records, 41 cols) — market-level passenger/freight/mail data
  - `BTS_SEGMENT` (~11.4M records, 50 cols) — flight segment data (each leg)
  - `BORDER_AIRPORTS` (244 records) — TX border airports with WKT geometry
  - `TEMP_AIRPORTS` (366 records) — simple airport reference
- **Common filters**: `ORIGIN_STATE_ABR = 'TX'`, `DEST_COUNTRY_NAME = 'Mexico'`
- Market = passengers counted once per journey; Segment = each flight leg counted separately

## Data Pipeline
All Python scripts live under `02_Data_Staging/BTS_Air_Carrier_Statistics/Script/`.
Scripts use relative paths from their own location (`Path(__file__).parent`).

### Step 0: Database Creation (one-time setup)
- `raw-BTS-data-to-DB.py` — builds the SQLite database from raw BTS zip file downloads. Extracts CSVs from zip archives in `01_Raw Data/.../Raw BTS MARKET DATA/` and `Raw BTS SEGMENT DATA/`, loads them into `BTS_MARKET` and `BTS_SEGMENT` tables via `pandas.DataFrame.to_sql()`. Only needs to be re-run if rebuilding the database from scratch (e.g., adding new years of data). Paths are hardcoded in the class `__init__` — update before running.

### Step 1: Extraction
- `Extract_BTS_Data.py` — extracts & aggregates both BTS_MARKET and BTS_SEGMENT for TX/MX connectivity, outputs raw CSVs + airport GeoJSON to `Script/_temp/`
  - Filters: Origin/Dest State = TX OR Origin/Dest Country = Mexico
  - Aggregates monthly data to annual totals via GROUP BY
  - Segment extraction includes `AIRCRAFT_GROUP` in GROUP BY (via `SEGMENT_EXTRA_GROUP_BY`), preserving aircraft type categories per row
  - Year range: 2015-2024 (configurable via `START_YEAR`/`END_YEAR`)

### Step 2: Verification & Rule Discovery
- `Verify_Corrections.py` — runs against **raw** intermediate files in `_temp/` (before cleaning) to validate that documented rules match the data and scan for new anomalies. This step ensures rules are accurate and complete before cleaning is applied.
  - Default mode: comprehensive verification report (corrections, state names, self-flights, duplicates, departure outliers, GeoJSON alignment)
  - `--auto-update-rules`: additionally scans for candidate update rules and can append to `data-cleaning.csv`
  - `--scan-only`: runs only the auto-update scan (skips verification report)
  - `--strict`: exits with code 1 if any verification failures are detected (useful for CI/automation)
  - Safety features: preview-before-write, optional timestamped backup, write-to-temp-then-rename
- `_helper/Audit_GeoJSON.py` — comprehensive GeoJSON structural quality audit (coordinates, codes, closed airports, duplicates) — complements the rule-based verification in `Verify_Corrections.py`
- `_helper/Extract_Database_Schema.py` — generates schema JSON from the DB

### Step 3: Data Cleaning
- `Apply_Data_Cleaning.py` — reads rules from `Database/data-cleaning/data-cleaning.csv` and applies all corrections to raw data from `_temp/`, writes cleaned output to `03_Process_Data/BTS/`
- `Database/data-cleaning/data-cleaning.csv` — master list of all cleaning rules (CSV-driven, not hardcoded)
- `Database/data-cleaning/missing-states.csv` — lookup table for filling null state names (460 international airport/city pairs)

**Cleaning rules applied (in order):**
1. **Updates** — fix airport codes (JQF→USA, NZC→VQQ, T1X→GLE, T4X→AQO, SXF→BER) and city names (NLU Zumpango→Mexico City, T8X Dallas→McKinney)
2. **Corrections** — fix DEPARTURES_SCHEDULED outliers (data entry errors where sched/perf ratio > 100); fix charter carrier (Class P/L) DEPARTURES_SCHEDULED outliers (ratio > 10); cap PASSENGERS at SEATS where passengers exceed seats (segment only)
3. **Deletes** — remove rows for unidentifiable facilities (Austin TX ID 16706)
4. **Filters** — remove self-flights (ORIGIN=DEST), all-zero activity rows (PAX=0, FREIGHT=0, MAIL=0), exact duplicate rows
5. **State fill** — fill null state names from missing-states.csv lookup when a `fill` rule is present
6. **Re-aggregate CSVs** — collapse semantic duplicates introduced by normalization updates
7. **Derived flags** (segment only) — add `SCHED_REPORTED` column: 0 = schedule data unreported (IF/DF foreign carriers + DU/IU Class F missing-as-zero), 1 = reported/trustworthy
8. **GeoJSON** — filter to IS_LATEST=1, scope to airports in cleaned CSVs, strip to essential fields

### Known Data Characteristics (not errors)
- **Foreign carriers** (DATA_SOURCE=IF/DF) don't report DEPARTURES_SCHEDULED — always 0
- **US scheduled-service missing-as-zero** — ~14% of DU/F and ~13.5% of IU/F rows have DEPARTURES_PERFORMED > 0 but DEPARTURES_SCHEDULED = 0 (unreported schedule data). The `SCHED_REPORTED` flag marks these as 0
- **Charter/commuter service** (CLASS=L/P) has no scheduled departures by definition
- **AIRCRAFT_GROUP**: BTS aircraft group classification (0–8). Segment CSV includes this as a dimension column. Values: 1=Piston, 4=Turboprop, 5=Regional Jet, 6=Narrow-Body Jet (dominant, ~95%), 7=Wide-Body Jet, 8=Wide-Body (3+ Engine), 0=Unknown. Labels defined in `AIRCRAFT_GROUP_LABELS` (aviationHelpers.js)
- **Record granularity**: BTS_SEGMENT is split by aircraft group within each carrier/route/year
- **Market vs Segment**: Market counts passengers once per journey; Segment counts each flight leg separately
- **Self-flight filter uses code equality (ORIGIN == DEST), not airport ID** — this is correct. Within a single BTS record, ORIGIN and DEST are contemporaneous (same reporting period), and IATA/FAA codes are unique at any point in time. Code reassignment (e.g., T4X) is a cross-time concern, not a within-record concern, so `ORIGIN == DEST` always implies `ORIGIN_AIRPORT_ID == DEST_AIRPORT_ID` within the same row. No change to airport-ID-based comparison is needed.

### Other Scripts
- `Andrew_Sample_Code/` — example query, load, and GIS scripts
- `_Archive/` — superseded extraction scripts (Extract_TX_MX_Market_Data.py, Extract_TX_MX_Segment_Data.py)

## Web Application (`07_WebApp/`)

### Tech Stack
- **React 19** + Vite 7 — SPA with HashRouter (static-hosting friendly)
- **Zustand** — lightweight state management (aviationStore, chatStore)
- **D3.js** — chart rendering (bar, line, donut, stacked bar, treemap, diverging bar, heatmap table, scatter plot, lollipop, bar chart race)
- **Leaflet + React-Leaflet** — interactive airport maps with route arcs
- **Tailwind CSS 4** — utility-first styling with TxDOT brand tokens
- **Lucide React** — icon library

### Data Flow
1. App mounts → `aviationStore.loadData()` fetches 3 files from `/data/`:
   - `BTS_T-100_Market_2015-2024.csv` (market data)
   - `BTS_T-100_Segment_2015-2024.csv` (segment data)
   - `BTS_T-100_Airports_2015-2024.geojson` (airport locations)
2. Data normalized (types cast), GeoJSON → `airportIndex` Map (IATA → {name, lat, lng})
3. Every row enriched with airport names + coordinates via `enrichRow()`
4. Pages subscribe to store, filter data by route predicates, render charts/tables/maps

### Error Handling
- **Data load failure**: If `loadData()` fails, the store sets `error` with the message. `AppContent` in `App.jsx` reads `error` and renders a `DataLoadError` component (warning icon, error message, Retry button) instead of routes. The Retry button calls `loadData()` again. During retry, the button shows "Retrying…" with a spinning icon and is disabled to prevent double-clicks.
- **Render errors**: `ErrorBoundary` (class component) wraps routes and catches rendering/lifecycle errors. Its "Try again" button resets error state AND calls an optional `onRetry` callback prop — in `App.jsx` this is wired to `loadData()` so recovery also re-fetches data.
- **Empty filtered data**: `DashboardLayout` accepts a `filteredEmpty` prop. When `filteredEmpty && activeCount > 0`, it replaces page content with a "No data matches the current filters" message and a Clear-all button. All four data pages pass `filteredEmpty={!filtered.length}`.
- **Per-chart empty state**: Individual `ChartCard` instances use the `emptyState` prop with contextual messages (e.g., "Cargo flights do not carry passengers") via the `isEmptyOrAllZero()` helper from `aviationHelpers.js`.

### Pages & Routes
| Route | Page | Data Filter |
|---|---|---|
| `/` | Overview | Hero + stat cards + nav cards to other pages |
| `/texas-domestic` | Texas Domestic | TX origin → US destination |
| `/texas-international` | Texas International | TX origin → non-US destination |
| `/us-mexico` | US-Mexico | Any US ↔ Mexico (national). Includes seat capacity & load factor analysis |
| `/texas-mexico` | Texas-Mexico | TX ↔ Mexico (bidirectional). Tabbed sub-navigation with 5 chapters (see below) |
| `/about-data` | About Data | Static: pipeline docs, glossary, quality insights, "When to Use Which" table |

### Component Architecture
```
src/
├── pages/              # Route-level views (each applies a data predicate)
│   └── TexasMexico/
│       ├── index.jsx   # Parent orchestrator (data hooks, filters, tab state)
│       └── tabs/       # Tab sub-components (receive data as props)
│           ├── OverviewTab.jsx          # Map + 4 trend charts
│           ├── PassengersRoutesTab.jsx  # Routes, airports, carriers, states, table
│           ├── OperationsCapacityTab.jsx # Seats, departures, load factor, service class, aircraft
│           ├── CargoTradeTab.jsx        # Freight/mail trends, imbalance, intensity, Class G payload util, scatter
│           └── BorderAirportsTab.jsx    # Border intro, donut charts, scatter, heatmap
├── components/
│   ├── layout/         # SiteHeader, MainNav, DashboardLayout, PageWrapper, Footer, UtilityBar
│   ├── ui/             # StatCard, ChartCard, DataTable, FullscreenChart, DownloadButton, PageHeader, SectionBlock, TabBar, InsightCallout, ErrorBoundary, MapPlaceholder
│   ├── charts/         # BarChart, LineChart, DonutChart, StackedBarChart, TreemapChart, DivergingBarChart, HeatmapTable, ScatterPlot, LollipopChart, BoxPlotChart, BarChartRace
│   ├── maps/           # AirportMap (Leaflet markers + great-circle route arcs)
│   ├── filters/        # FilterSidebar, FilterBar, FilterSelect, FilterMultiSelect, ActiveFilterTags
│   └── ai/             # AskAIDrawer, ChatInput, ChatMessage, SuggestedQuestions
├── stores/             # aviationStore.js (data+filters), chatStore.js (AI chat)
├── lib/                # Utilities
│   ├── airportUtils.js     # GeoJSON indexing, row enrichment, route aggregation (metric-parameterized)
│   ├── aviationHelpers.js  # Route predicates, formatters, schedule adherence, BORDER_AIRPORTS, MAP_METRIC_OPTIONS, AIRCRAFT_GROUP_LABELS
│   ├── chartColors.js      # TxDOT brand palette (9 colors) + formatters
│   ├── tokens.js           # Design tokens for D3 + dynamic styling
│   ├── aiClient.js         # Mock AI responder (local data-driven answers)
│   ├── pageContext.js       # Gathers current page state for AI chat
│   ├── useCascadingFilters.js # Cross-filter hook for interdependent dropdowns
│   ├── useChartResize.js   # Responsive chart resize hook
│   ├── downloadCsv.js      # CSV export helper (supports column renaming via `columns` map)
│   ├── downloadColumns.js  # Reusable column-rename maps for chart + page-level CSV downloads
│   └── exportPng.js        # Chart-to-PNG screenshot utility
├── contexts/           # FilterContext (React Context for filter state)
└── styles/             # globals.css (Tailwind + tokens), leaflet-overrides.css
```

### Unicode Escapes in JSX — NEVER USE `\uXXXX` (RECURRING BUG)
**This is a recurring bug that has appeared multiple times during development.** JSX string attributes (`prop="..."`) do NOT interpret `\uXXXX` escape sequences — they render as literal text (e.g., the user sees `\u2013` instead of an en-dash). This is because JSX attribute strings follow the JSX spec, not JavaScript string literal rules.

**Rules:**
1. **NEVER use `\uXXXX` escape sequences** anywhere in JSX/JS source files (e.g., `\u2013`, `\u2014`, `\u2019`, `\u2026`, `\u2192`). Always use the actual Unicode character instead (–, —, ', …, →).
2. **For JSX text children**, prefer HTML entities: `&ndash;`, `&mdash;`, `&rsquo;`, `&hellip;`, `&rarr;`.
3. **For JSX string attributes** (`prop="..."`), use actual Unicode characters directly: `title="Texas–Mexico"` not `title="Texas\u2013Mexico"`.
4. **For JavaScript strings** inside `{}` expressions, actual characters work fine: `` label={`Texas–Mexico`} ``.
5. **Exception**: `\uFEFF` (BOM) in `downloadCsv.js` is legitimate — it's a non-display encoding marker inside a JS string literal.
6. **After any feature addition that includes UI text**, run `/unicode-check` to scan for accidental `\uXXXX` escapes.

### Chart Height Feedback Loop — NEVER USE `containerHeight` IN NORMAL MODE (RECURRING BUG)
**This is a recurring bug that has appeared multiple times during development.** When a D3 chart component reads its container's height via `useChartResize()` and uses it to set the SVG height, it creates a feedback loop inside CSS grid/flex layouts where ChartCard has `h-full`:

1. ChartCard `h-full` → fills CSS grid cell height
2. Chart container `h-full` → fills ChartCard flex area
3. Chart reads `containerHeight` → sets SVG to that height
4. Taller SVG → taller container → ResizeObserver fires → repeat
5. Charts grow to 8000+ px, rendering only gridlines with data invisible

**Rules:**
1. **NEVER use `containerHeight` for SVG height in normal (non-fullscreen) mode.** Always use a computed default height (e.g., `300 + legendSpace`).
2. **In fullscreen mode**, use `containerHeight` to fill the overlay: `isFullscreen ? Math.max(defaultH, containerHeight) : defaultH`.
3. **Horizontal BarChart** already uses its own bar-count-based height — do not change this.
4. **When adding a new chart component**, follow this pattern for height computation:
   ```js
   const height = isFullscreen
     ? Math.max(defaultH, containerHeight > 100 ? containerHeight : defaultH)
     : defaultH
   ```
5. **After any chart modification**, visually verify charts inside CSS grid layouts (e.g., Texas-Mexico Operations tab's 3-column grid) to ensure no height explosion.

### ChartCard Footnote — NEVER PUT `<p>` OR TEXT INSIDE ChartCard CHILDREN (RECURRING BUG)
**This is a recurring bug that has appeared during development.** Chart components (LineChart, BarChart, LollipopChart) use `h-full` on their container divs to fill the ChartCard's chart area. When annotation `<p>` elements are placed as siblings inside ChartCard's `children`, the chart fills 100% of the parent height, pushing the text below the visible area. ChartCard's `overflow-hidden` (needed for rounded corners) clips it, but the tops of text characters peek through as faint "lines" at the bottom of the card.

**Rules:**
1. **NEVER place `<p>`, `<div>`, or any annotation/footnote text as children of ChartCard** alongside a chart component. ChartCard children should be chart components ONLY.
2. **Use the `footnote` prop** for annotation text that should appear below the chart but inside the card: `<ChartCard footnote={<p className="...">text</p>}>`.
3. **ChartCard emits a dev-time console warning** if `<p>` elements are detected in children — fix these immediately.
4. For methodology notes that are NOT inside a ChartCard, place them below the ChartCard or below the grid container (see Class G Freight Payload Utilization pattern).

### Design Rules
- **Minimum font size**: 16px throughout the entire site. No text should be smaller than 16px. **Exceptions** (approved below-16px usage):
  - Filter selection chips/tags (e.g., active filter indicators above the filter bar) — space-constrained UI chrome
  - FilterMultiSelect dropdown group/subgroup headers (10–11px uppercase labels) — structural dividers inside compact dropdown menus
  - Leaflet map popup content (13px) — small overlay convention for map popups
  - Leaflet map attribution text (10px) — third-party credit line, universally tiny by mapping convention
- **DataTable sizing**: Tables must NOT be full-width. Use `w-fit max-w-full mx-auto` on the root container so columns size to their content and the table is centered. Do NOT add `w-full` to the DataTable root or the `<table>` element. **Exception**: when any column has `wrap: true`, `w-fit` is dropped so the table fills its container and text can reflow naturally.
- **DataTable column wrapping**: Columns accept `wrap: true` and optional `minWidth` (default 80px). Long-text columns (airport names, carrier names) should use `wrap: true` to allow multi-line text and avoid horizontal scrolling. Wrap cells use `overflow-wrap: anywhere` so the browser can break mid-word when needed to fit the container. Numeric and short columns keep `whitespace-nowrap`. When wrapping columns are present, the table uses `w-full` (auto layout) instead of fixed-layout column stabilization, and the table fills its container width.
- **Paginated table column stability**: For multi-page tables without wrapping columns, measure the maximum column width needed across ALL pages, then apply that width to every page. This prevents the table from shifting/resizing when the user clicks next/previous.
- **StatCard latest-year labeling**: When a StatCard displays a metric that is specific to a single year (e.g., passengers, flights, destinations served, top destination), its label should include `(${latestYear})` to indicate the year. This uses the latest year available in the (filtered) dataset, computed dynamically. Only omit the year suffix for metrics that are inherently time-independent.
- **Year filter and full-range trend charts**: Charts that display a trend across the full time series (e.g., 2015–2024 line charts showing passenger, freight, or flight trends over time) should NOT be filtered by the year filter. Their purpose is to show the complete historical trend, which would be defeated by narrowing to a single year. The year filter should only apply to point-in-time visualizations (stat cards, rankings, donut charts, bar charts showing a single year's breakdown, maps, tables). When building or modifying a page, ensure that trend LineCharts receive unfiltered-by-year data (or the full dataset filtered only by non-year filters), while snapshot visualizations use the year-filtered dataset.

### CSV Download Column Naming
Chart-level and page-level CSV downloads use `downloadCsv(data, filename, columns)` from `downloadCsv.js`. The optional `columns` parameter is an object map `{ dataKey: 'CSV Header Name' }` that renames columns and filters out internal-only fields (e.g., `color`). When `columns` is omitted, all keys export as-is (backward compatible).

**Reusable column maps** are defined in `downloadColumns.js`:
- **`DL`** — chart-level maps (e.g., `DL.paxTrend`, `DL.adherence`, `DL.routesPax`, `DL.boxPlotPct`)
- **`PAGE_MARKET_COLS`** — page-level market data columns (Year, Origin Code, Origin Airport, ..., Passengers, Freight, Mail, Distance)
- **`PAGE_SEGMENT_COLS`** — page-level segment data columns (all market cols + Departures, Seats, Payload, Aircraft Group, etc.)

**Rules:**
1. **Always pass `columns`** in `downloadData` for chart-level downloads — never export generic "label"/"value" headers or internal "color" fields.
2. **Page-level downloads** use `pageDownload` prop on `DashboardLayout` → `FilterSidebar`. Shape: `{ market: { data, filename, columns }, segment: { data, filename, columns } }`. Buttons appear below filter controls in the sidebar.
3. When adding a new chart with `downloadData`, pick the appropriate `DL.*` constant or create a new one in `downloadColumns.js`.

### Chart Value Formatting (IMPORTANT)
All chart components accept a `formatValue` prop that controls how numeric values are displayed in **both** tooltips and axis labels. The page passing data to a chart is responsible for choosing the correct formatter based on the metric being displayed.

**Available formatters:**
| Formatter | Location | Output example | Use for |
|---|---|---|---|
| `formatCompact` | `chartColors.js` | `5.3M`, `42.1K` | Default — counts, passengers, flights, seats, generic numbers |
| `fmtCompact` | `aviationHelpers.js` | `5.3M`, `42.1K` | Same as formatCompact (aviation-specific alias) |
| `fmtLbs` | `aviationHelpers.js` | `5.3M lbs`, `42.1K lbs` | Freight and mail (weight in pounds) |
| `formatCurrency` | `chartColors.js` | `$5.3M`, `$42.1K` | **Only** for actual monetary/currency values |
| Inline `(v) => \`${v}%\`` | — | `85.2%` | Percentages (load factor, adherence) |

**Rules:**
1. **Never use `formatCurrency` (or `$` prefix) for non-monetary data.** Passengers, flights, seats, freight, and mail are NOT currency — use `fmtCompact` or `fmtLbs`.
2. **Always pass `formatValue` explicitly** when rendering a chart. Do not rely on the default formatter — be explicit about units.
3. **Y-axis ticks use `formatValue` directly** — LineChart and StackedBarChart call `formatValue(v)` for each Y-axis tick label. This ensures the axis shows the same units as the tooltip (e.g., "1.5M lbs" for mail, "3.0M" for passengers). The helper `getAxisFormatter(maxValue, prefix, suffix)` in `chartColors.js` is available for custom axis formatting if needed.
4. **BTS data units**: PASSENGERS = count, DEPARTURES = count, SEATS = count, FREIGHT = pounds (lbs), MAIL = pounds (lbs). None of these are currency.

### Accessibility
- **Skip link**: `PageWrapper` renders a visually hidden "Skip to main content" link at the top of the page. It becomes visible on focus (Tab) and targets `<main id="main-content">`.
- **AskAIDrawer**: Focus trap keeps Tab cycling within the drawer while open. On open, focus moves to the first focusable element after the slide-in transition. On close, focus restores to the previously focused element. Uses `aria-modal="true"` and `role="dialog"`. The "Ask AI" button in `SiteHeader` has `aria-label="Open Ask AI assistant"`.
- **FilterMultiSelect**: Follows ARIA combobox/listbox pattern — trigger button has `aria-expanded`, `aria-haspopup="listbox"`, `aria-controls`; dropdown container has `role="listbox"` with `aria-multiselectable="true"`; each option has `role="option"` and `aria-selected`. Keyboard navigation: Arrow Up/Down to move focus, Enter/Space to toggle selection, Escape to close, Home/End to jump.
- **DownloadButton**: When dropdown mode is active, trigger has `aria-expanded` and `aria-haspopup="menu"`; dropdown has `role="menu"` with `role="menuitem"` on options. Keyboard: Arrow Up/Down to navigate, Enter to select, Escape to close and restore focus.
- **MainNav (mobile)**: Hamburger button has `aria-expanded`. On open, focus moves to the first nav link; on close, focus restores to the hamburger button.
- **AirportMap**: Map container has `role="region"` and `aria-label` describing the current metric (e.g. "Airport map showing passengers").

### Key Patterns
- **Data-agnostic components**: Charts, tables, and cards receive data as props — no hardcoded field names
- **Route predicates**: `isTxDomestic()`, `isTxIntl()`, `isTxMx()`, `isUsMx()` etc. in `aviationHelpers.js`
- **Single-select vs multi-select filters**: Filters with only 2 options (e.g., Direction, Carrier Type) use `FilterSelect` (single-select radio-style). Filters with many possible values use `FilterMultiSelect` (checkbox-style, multiple selections). **Rule of thumb**: if a filter has only 2 mutually exclusive options, always use `FilterSelect`; if it has 3+ options where multiple selections make sense, use `FilterMultiSelect`. Filter state in `aviationStore`: string (`''` = all) for single-select; arrays (`[]` = all) for multi-select. Filtering logic: `filters.key === 'VALUE'` for strings; `filters.key.length` guard + `.includes()` for arrays. Active tags: single-select generates one tag with `onRemove → setFilter(key, '')`; multi-select generates one tag per value with individual removal.
- **Cascading/interdependent filters**: Filter dropdown options are interdependent via `useCascadingFilters` hook (`lib/useCascadingFilters.js`). For each filter key, a "pool" is computed by applying all OTHER active filters except that key — so dropdown options only show contextually valid values (e.g. selecting Year=2023 narrows carrier/airport options to 2023 data; selecting Dest State=Florida narrows dest airports to Florida airports). Each page defines a module-level `buildApplicators(filters)` function (maps filter keys to single-filter applicators) and an `EXTRACTORS` object (maps filter keys to row→value extractors for auto-pruning). The hook also auto-prunes stale selected values via `useEffect` + batch `setFilters()` store method. The `filtered`/`filteredSegment` memos (applying ALL filters for charts/stats) remain unchanged.
- **Direction filter sanitization**: The `direction` filter is a global string in the store, but each page uses different direction values (e.g. `TX_TO_US` vs `TX_TO_MX`). Each page includes a `useEffect` that resets `direction` to `''` if the current value doesn't match that page's valid options, preventing stale/misleading direction filters when navigating between pages.
- **Counterpart-state logic**: On the Texas Domestic page, bidirectional state rankings use "counterpart state" logic: for TX→US rows the dest state is used, for US→TX rows the origin state is used. This avoids double-counting Texas when both directions are active.
- **Memoization**: Heavy use of `useMemo()` for filtered data and aggregations
- **TxDOT brand colors**: Primary #0056a9, defined in `chartColors.js` and `globals.css`
- **Fonts**: IBM Plex Sans (primary), IBM Plex Sans Condensed, IBM Plex Mono
- **LineChart annotations**: `LineChart` accepts an optional `annotations` prop (array of objects). Each annotation can render a vertical line (`{ x }`) or a shaded band (`{ x, x2 }`), with optional `label`, `color`, and `labelColor`. Used for COVID-19 bands on trend charts.
- **BORDER_AIRPORTS constant**: `aviationHelpers.js` exports `BORDER_AIRPORTS` (Set) and `BORDER_AIRPORT_LIST` (array of `{code, city}`) — the six Texas border airports, defined as airports located within a TxDOT border district: ELP (El Paso), LRD (Laredo), MFE (McAllen), HRL (Harlingen), BRO (Brownsville), DRT (Del Rio). Used on the Overview page (sidebar card + map highlighting), and the Texas-Mexico page (intro section with mini-map, border vs non-border analysis, O-D route matrix). AirportMap accepts a `highlightAirports` prop (Set of IATA codes) to render those markers with a thick white halo stroke.
- **DivergingBarChart**: Bilateral horizontal bar chart (left/right from center axis). Props: `data`, `labelKey`, `leftKey`, `rightKey`, `leftLabel`, `rightLabel`, `leftColor`, `rightColor`, `formatValue`, `maxBars`, `animate`. Used for freight import/export imbalance.
- **HeatmapTable**: Color-intensity HTML grid table. Props: `data` (with `rowLabels`, `colLabels`, `cells` 2D array), `formatValue`. Cell background alpha scales with value. Used for border airport O-D route matrices.
- **LollipopChart**: Horizontal lollipop chart (thin stem + dot) for ranked data with long labels. Props: `data`, `xKey`, `yKey`, `color`, `formatValue`, `maxBars`, `animate`, `dotRadius`. Route labels auto-split on " → " for two-line display (origin / destination). Subtle guide lines and animated entrance.
- **BoxPlotChart**: Vertical box-and-whisker chart showing statistical distributions per category. Props: `data` (pre-computed five-number summaries), `xKey`, `color`, `formatValue`, `animate`, `annotations`. Data shape: array of `{ [xKey], min, q1, median, q3, max, outliers: [{value, label}], count }`. Visual: filled box (Q1–Q3) with median line, whiskers (min–max), red outlier dots. HTML tooltip showing all statistics. Supports annotation bands (same format as LineChart). Used for route-level passenger load factor distribution by year on US-Mexico and Texas-Mexico pages.
- **ScatterPlot**: Scatter/bubble chart with two numeric axes. Props: `data`, `xKey`, `yKey`, `labelKey`, `colorKey`, `sizeKey`, `formatX`, `formatY`, `colorMap`, `labelThreshold`, `scaleType` (`'symlog'`/`'linear'`/`'log'`), `animate`. Supports `d3.scaleSymlog()` for data with extreme skew and zero values. Optional bubble sizing via `scaleSqrt`. Permanent labels on top-N points, tooltip on hover for all. Used on Texas-Mexico Cargo & Trade tab for Passengers vs Freight airport activity (uniform dot size — no `sizeKey` — to avoid mixing incompatible units).
- **BarChartRace**: Animated horizontal bar chart race that transitions between yearly frames (`components/charts/BarChartRace.jsx`). Props: `frames` (array of `{year, routes: [{route, value, origin}]}`), `currentYear`, `globalMax`, `maxBars` (default 12), `formatValue`, `originColors` (`{airportCode: '#hex'}`). Uses persistent SVG elements with D3 keyed data joins for smooth enter/update/exit transitions (750ms). Bars reorder vertically and grow/shrink horizontally as years change. New routes enter from below; dropped routes exit downward. Large year watermark in bottom-right. Height is bar-count-based (never uses `containerHeight` in normal mode). Used on Texas-Mexico Border Airports tab for route network evolution animation.
- **Route Network Evolution**: Texas-Mexico Border Airports tab includes an animated section with shared playback controls (play/pause, skip, year slider) that drives two synchronized visualizations: (1) an AirportMap showing border airport route arcs that appear/disappear per year, and (2) a BarChartRace showing top routes ranked by volume. Data uses `filteredNoYear` (respects all filters except year) to compute per-year frames. The `matrixMetric` state (passengers/freight) is shared with the heatmap route matrix. Playback state (`currentYearIdx`, `isPlaying`) is local to `BorderAirportsTab`. Color-coding is by origin border airport (6 airports → 6 colors from `CHART_COLORS`).
- **Map metric selector**: Each page's AirportMap has a `<select>` dropdown (via ChartCard `headerRight`) letting users switch between Passengers, Freight (lbs), Mail (lbs), and Flights. Configuration is centralized in `MAP_METRIC_OPTIONS` (aviationHelpers.js). Each option specifies the CSV field, data source (market/segment), formatter, and unit label. The map metric is page-local state (`useState`), not global store state, since it only affects map visualization. `aggregateRoutes(data, airportIndex, field)` and `aggregateAirportVolumes(data, field)` accept an optional field parameter (default `'PASSENGERS'`). AirportMap accepts `formatValue` and `metricLabel` props for popup formatting.
- **AIRCRAFT_GROUP_LABELS constant**: `aviationHelpers.js` exports `AIRCRAFT_GROUP_LABELS` mapping BTS aircraft group codes (0–8) to readable names. Used on the Texas-Mexico page for Aircraft Mix donut chart and trend line. The segment CSV includes `AIRCRAFT_GROUP` as a dimension column (added to `SEGMENT_EXTRA_GROUP_BY` in Extract_BTS_Data.py).
- **Service class analysis**: Texas-Mexico page includes a Service Class Breakdown section showing flight share by CLASS (F/G/L/P) as a donut chart and multi-series trend line. Uses `CLASS_LABELS` for readable names.
- **Freight intensity**: Texas-Mexico page includes a "Freight Intensity by Route" bar chart showing average freight per departure (lbs/flight) from segment data. Only routes with ≥10 departures are included to avoid statistical noise.
- **Payload Weight Utilization**: Texas-Mexico Operations & Capacity tab includes a bidirectional trend chart showing estimated total carried weight ÷ payload capacity (%). Formula: `(PASSENGERS × 200 lbs + FREIGHT + MAIL) ÷ PAYLOAD × 100%`. The 200 lb/passenger figure is the FAA standard average including carry-on baggage. Uses segment data (which has the PAYLOAD field). Displayed with detailed methodology footnotes explaining the assumption and interpretation guidelines.
- **Class G Freight Payload Utilization**: Texas-Mexico Cargo & Trade tab includes a dedicated section for all-cargo (Class G) flights showing `(FREIGHT + MAIL) ÷ PAYLOAD × 100%`. Includes: InsightCallout with aggregate stats, trend chart, and top-route bar chart (≥5 departures). Methodology notes are placed BELOW the 2-column grid (not inside ChartCards) to avoid a LineChart height feedback loop where `h-full` containers inside CSS grid expand unboundedly when footnotes push content taller.
- **TabBar component**: Reusable horizontal tab navigation (`components/ui/TabBar.jsx`). Props: `tabs` (array of `{key, label, icon?}`), `activeTab`, `onChange`. Active tab styled with `bg-brand-blue text-white`; mobile-friendly with horizontal scroll via `scrollbar-hide` utility. Uses `role="tablist"` and `aria-selected` for accessibility.
- **InsightCallout component**: Inline narrative callout for dynamic data-driven findings (`components/ui/InsightCallout.jsx`). Props: `finding` (string, required — main insight sentence), `context` (string, optional — muted explanation), `icon` (Lucide component, default `Lightbulb`), `variant` (`'default'`/`'highlight'`/`'warning'`, default `'default'`), `className`. Visual: 3px left border accent + icon badge + text. Variants: `default` = brand-blue, `highlight` = brand-green (use for positive findings like COVID recovery), `warning` = brand-orange (use for concentration/risk findings). NOT a card — sits inline within SectionBlock content. Computation logic lives in page-level `useMemo`; InsightCallout is purely presentational.
- **Page storytelling pattern**: Every data page includes (1) a narrative intro paragraph in the first SectionBlock, (2) 1-2 dynamically computed InsightCallouts surfacing key findings, and (3) italic chart annotations (`<p className="text-base text-text-secondary mt-3 italic">`) below key charts explaining what to look for. The Overview page includes a "Key Findings" section with InsightCallouts linking to detail pages.
- **Texas-Mexico tabbed sub-navigation**: The Texas-Mexico page uses `TabBar` to split 25+ visualizations into 5 narrative chapters. KPI stat cards stay above the tab bar (always visible). All `useMemo` data hooks remain in the parent `index.jsx`; tab components receive data as props. Tab state is local (`useState`), not in URL or store. On tab switch, the page scrolls to the tab bar position. Each tab begins with a narrative intro paragraph providing context.

### Texas-Mexico Tab Structure
| Tab | Key | Content |
|---|---|---|
| Overview | `overview` | Route map (metric selector) + 4 bidirectional trend charts (passengers, flights, freight, mail) |
| Passengers & Routes | `passengers` | Top 10 routes, TX/MX airport rankings, Mexico states, carrier market share, route details table |
| Operations & Capacity | `operations` | Seat capacity, scheduled vs performed departures, schedule adherence, load factor (trend + distribution box plot), payload weight utilization (200 lb/pax estimate), service class breakdown, aircraft mix |
| Cargo & Trade | `cargo` | Freight/mail trends, freight imbalance by airport (diverging bar), freight intensity by route, Class G (all-cargo) freight payload utilization (trend + route rankings), passengers-vs-freight scatter |
| Border Airports | `border` | Border airport intro (mini-map + buttons), border vs non-border share (donut), route network evolution (animated map + bar chart race with shared playback controls), O-D route matrix (heatmap) |

### Running the WebApp
```bash
cd 07_WebApp
npm install
npm run dev          # Vite dev server
npm run build        # Production build
```
- Data files must be in `07_WebApp/public/data/` (copied from `03_Process_Data/BTS/`).
- **Build path**: Always run Vite from the `C:` drive path (not `X:`) due to mapped-drive path resolution bugs.

### Visual Verification
After code changes that affect the UI, run the `/visual-check` skill to verify the modification works correctly. Be **targeted** — only verify the components/pages that were actually changed, not the entire site.

**When to run:**
- After modifying or creating React components, charts, maps, or layout
- After changing CSS/Tailwind styles
- After modifying data loading, filtering, or transformation logic that affects displayed content

**Scope appropriately:**
- Small change (e.g., filter menu tweak) → verify only the affected component/area
- Single visualization change → screenshot/verify only that chart and its surroundings
- Layout or navigation change → verify affected pages

**Cleanup:** Delete ALL screenshot files and temporary artifacts generated during visual verification once the check is complete. Do not leave them in the repo.

### Unicode Escape Check
After any feature addition or modification that includes UI text (narrative paragraphs, chart titles, stat labels, insight findings, tooltips, direction labels), run `/unicode-check` to scan for accidental `\uXXXX` escape sequences. See the "Unicode Escapes in JSX" section above for the full rules.

## GeoJSON Usage
- GeoJSON files are used to extract only two pieces of information: **airport display names** and **lat/lng coordinates**
- All other airport data comes from the database; GeoJSON serves purely as the spatial reference for mapping

## Conventions
- Python scripts use `Path(__file__).parent` for relative path resolution
- Output files include year range in filename (e.g., `BTS_T-100_Market_2015-2024.csv`)
- SQL queries use f-strings or `.format()` for parameterization
- Print statements with `[SUCCESS]`/`[ERROR]`/`[WARNING]` prefixes for status logging
- Year range configured via `START_YEAR` / `END_YEAR` constants at top of scripts
- React components use PascalCase; utility functions use camelCase
- Use `python` from `C:\Users\UNT\AppData\Local\Programs\Python\Python313\python.exe` (has pandas, numpy, etc.)

## Documentation Maintenance (MANDATORY)
Whenever you make changes to code, scripts, data pipeline logic, components, or configuration, you **MUST** also update the relevant documentation in the same session. Do not defer documentation updates to a future task.

**Files to keep in sync:**
- **`CLAUDE.md`** (this file) — update whenever project structure, conventions, component lists, data pipeline steps, cleaning rules, or webapp architecture change
- **`02_Data_Staging/BTS_Air_Carrier_Statistics/Script/Data Pipeline README.md`** — comprehensive data pipeline documentation; update whenever extraction, cleaning, or verification scripts change (new columns, new flags, new steps, changed behavior), or when data quality rules change
- **`02_Data_Staging/BTS_Air_Carrier_Statistics/Database/data-cleaning/data-cleaning.md`** — update whenever `data-cleaning.csv` rules change (new corrections, new filters, changed thresholds, new anomaly documentation)
- **`07_WebApp/Dashboard_Design_Playbook.md`** — comprehensive dashboard design reference; update whenever UI components, chart features, layout patterns, filter behavior, animation, download/export, or visual design decisions change

**Rules:**
1. After modifying a Python script in `Script/`, check if `Data Pipeline README.md` describes the changed behavior and update it if needed
2. After adding/removing/renaming React components, update the component tree in this file
3. After adding/modifying cleaning rules in `data-cleaning.csv`, update both `data-cleaning.md` and the detailed cleaning section in `Data Pipeline README.md`
4. After changing webapp routes, stores, or lib utilities, update the relevant sections in this file
5. After changing the data pipeline (new columns, changed aggregation, new filters), update both `CLAUDE.md` and `Data Pipeline README.md`
6. After modifying UI components, chart features, layout patterns, filter behavior, animation, or design decisions, update `Dashboard_Design_Playbook.md`

## Git
- `.gitignore` excludes all numbered data folders (01–08) — only config and root files are tracked
- Data files are too large for git; the DB alone is ~4.5 GB
- WebApp source (`07_WebApp/src/`) IS tracked
