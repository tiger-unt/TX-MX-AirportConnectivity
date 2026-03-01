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

### Extraction
- `Extract_BTS_Data.py` — extracts & aggregates both BTS_MARKET and BTS_SEGMENT for TX/MX connectivity, outputs raw CSVs + airport GeoJSON to `Script/_temp/`
  - Filters: Origin/Dest State = TX OR Origin/Dest Country = Mexico
  - Aggregates monthly data to annual totals via GROUP BY
  - Year range: 2015-2024 (configurable via `START_YEAR`/`END_YEAR`)

### Data Cleaning
- `Apply_Data_Cleaning.py` — reads rules from `Database/data-cleaning/data-cleaning.csv` and applies all corrections to raw data from `_temp/`, writes cleaned output to `03_Process_Data/BTS/`
- `Database/data-cleaning/data-cleaning.csv` — master list of all cleaning rules (CSV-driven, not hardcoded)
- `Database/data-cleaning/missing-states.csv` — lookup table for filling null state names (462 international airports)

**Cleaning rules applied (in order):**
1. **Updates** — fix airport codes (JQF→USA, NZC→VQQ, T1X→GLE, T4X→AQO, SXF→BER) and city names (NLU Zumpango→Mexico City)
2. **Corrections** — fix DEPARTURES_SCHEDULED outliers (data entry errors where sched/perf ratio > 100); cap PASSENGERS at SEATS where passengers exceed seats (segment only)
3. **Deletes** — remove rows for unidentifiable facilities (Austin TX ID 16706)
4. **Filters** — remove zero-distance self-flights (ORIGIN=DEST), all-zero activity rows (PAX=0, FREIGHT=0, MAIL=0), exact duplicate rows
5. **State fill** — fill null state names from missing-states.csv lookup
6. **GeoJSON** — filter to IS_LATEST=1, scope to airports in cleaned CSVs, strip to essential fields

### Verification & Audit
- `_helper/Verify_Corrections.py` — validates all cleaning rules were applied correctly; scans for new issues (multi-code airports, city name inconsistencies, negative values); reports structural data patterns (departure scheduled vs performed anomalies)
- `_helper/Audit_GeoJSON.py` — comprehensive GeoJSON quality audit (coordinates, codes, closed airports, duplicates)
- `_helper/Extract_Database_Schema.py` — generates schema JSON from the DB

### Known Data Characteristics (not errors)
- **Foreign carriers** (DATA_SOURCE=IF/DF) don't report DEPARTURES_SCHEDULED — always 0
- **Charter/commuter service** (CLASS=L/P) has no scheduled departures by definition
- **Record granularity**: BTS_SEGMENT is split by aircraft type within each carrier/route/year
- **Market vs Segment**: Market counts passengers once per journey; Segment counts each flight leg separately

### Other Scripts
- `Andrew_Sample_Code/` — example query, load, and GIS scripts
- `_Archive/` — superseded extraction scripts (Extract_TX_MX_Market_Data.py, Extract_TX_MX_Segment_Data.py)

## Web Application (`07_WebApp/`)

### Tech Stack
- **React 19** + Vite 7 — SPA with HashRouter (static-hosting friendly)
- **Zustand** — lightweight state management (aviationStore, chatStore)
- **D3.js** — chart rendering (bar, line, donut, stacked bar, treemap)
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

### Pages & Routes
| Route | Page | Data Filter |
|---|---|---|
| `/` | Overview | Hero + stat cards + nav cards to other pages |
| `/texas-domestic` | Texas Domestic | TX origin → US destination |
| `/texas-international` | Texas International | TX origin → non-US destination |
| `/us-mexico` | US-Mexico | Any US ↔ Mexico (national) |
| `/texas-mexico` | Texas-Mexico | TX ↔ Mexico (bidirectional) |
| `/about-data` | About Data | Static: pipeline docs, glossary, quality insights |

### Component Architecture
```
src/
├── pages/              # Route-level views (each applies a data predicate)
├── components/
│   ├── layout/         # SiteHeader, MainNav, DashboardLayout, PageWrapper, Footer
│   ├── ui/             # StatCard, ChartCard, DataTable, FullscreenChart, DownloadButton
│   ├── charts/         # BarChart, LineChart, DonutChart, StackedBarChart, TreemapChart
│   ├── maps/           # AirportMap (Leaflet markers + great-circle route arcs)
│   ├── filters/        # FilterSidebar, FilterBar, FilterSelect, ActiveFilterTags
│   └── ai/             # AskAIDrawer, ChatInput, ChatMessage, SuggestedQuestions
├── stores/             # aviationStore.js (data+filters), chatStore.js (AI chat)
├── lib/                # Utilities
│   ├── airportUtils.js     # GeoJSON indexing, row enrichment, route aggregation
│   ├── aviationHelpers.js  # Route predicates, formatters, schedule adherence
│   ├── chartColors.js      # TxDOT brand palette (9 colors) + formatters
│   ├── tokens.js           # Design tokens for D3 + dynamic styling
│   ├── aiClient.js         # Mock AI responder (local data-driven answers)
│   ├── pageContext.js       # Gathers current page state for AI chat
│   ├── useChartResize.js   # Responsive chart resize hook
│   ├── downloadCsv.js      # CSV export helper
│   └── exportPng.js        # Chart-to-PNG screenshot utility
├── contexts/           # FilterContext (React Context for filter state)
└── styles/             # globals.css (Tailwind + tokens), leaflet-overrides.css
```

### Key Patterns
- **Data-agnostic components**: Charts, tables, and cards receive data as props — no hardcoded field names
- **Route predicates**: `isTxDomestic()`, `isTxIntl()`, `isTxMx()`, `isUsMx()` etc. in `aviationHelpers.js`
- **Memoization**: Heavy use of `useMemo()` for filtered data and aggregations
- **TxDOT brand colors**: Primary #0056a9, defined in `chartColors.js` and `globals.css`
- **Fonts**: IBM Plex Sans (primary), IBM Plex Sans Condensed, IBM Plex Mono

### Running the WebApp
```bash
cd 07_WebApp
npm install
npm run dev          # Vite dev server
npm run build        # Production build
```
Data files must be in `07_WebApp/public/data/` (copied from `03_Process_Data/BTS/`).

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

## Git
- `.gitignore` excludes all numbered data folders (01–08) — only config and root files are tracked
- Data files are too large for git; the DB alone is ~4.5 GB
- WebApp source (`07_WebApp/src/`) IS tracked
