# Migration Plan: Static CSVs → Turso Cloud Database

## 1. Overview

### Why Migrate?
The current pipeline pre-aggregates data to yearly CSVs, losing monthly granularity. The webapp loads all data into the browser at startup (~94K + ~94K rows). Moving to a cloud database enables on-demand queries, preserves full granularity, and simplifies adding new years of data.

### Why Turso?
- **Cloud SQLite** — our database is already SQLite, so SQL queries work as-is with minimal migration
- **Free tier** — 9 GB storage, 500M row reads/month, no credit card required
- **No auto-pausing** — unlike Supabase free tier, Turso stays live regardless of traffic
- **Edge replicas** — data replicated to locations near users for fast reads
- **Commercial use allowed** on free tier

### Current Architecture
```
Raw BTS ZIPs
     │
     ▼
raw-BTS-data-to-DB.py → Raw SQLite DB (4.5 GB, 19.7M rows)
     │
     ▼
Extract_BTS_Data.py → Intermediate CSVs (_temp/, ~215K rows, yearly aggregated)
     │
     ▼
Verify_Corrections.py → Anomaly detection & rule validation
     │
     ▼
Apply_Data_Cleaning.py → Cleaned CSVs (03_Process_Data/, ~188K rows)
     │
     ▼
React WebApp (GitHub Pages) loads 3 static files into browser memory:
  - BTS_T-100_Market_2015-2024.csv
  - BTS_T-100_Segment_2015-2024.csv
  - BTS_T-100_Airports_2015-2024.geojson
```

### Proposed Architecture
```
Raw BTS ZIPs
     │
     ▼
raw-BTS-data-to-DB.py → Raw SQLite DB (unchanged)
     │
     ▼
Extract_BTS_Data.py → Intermediate CSVs (unchanged)
     │
     ▼
Verify_Corrections.py → Anomaly detection (unchanged)
     │
     ▼
Apply_Data_Cleaning.py → Cleaned CSVs (unchanged)
     │
     ▼
Upload_to_Turso.py (NEW) → Turso Cloud SQLite DB
     │
     ▼
Serverless API (Cloudflare Worker) ← queries Turso, returns JSON
     │
     ▼
React WebApp (GitHub Pages) ← fetches from API instead of static CSVs
```

**Key change:** The Python pipeline stays identical. We add one new script at the end that uploads cleaned CSVs to Turso. The webapp switches from loading static files to calling an API.

---

## 2. Turso Database Schema

### 2.1 `market` Table (from Market CSV)

17 columns matching the current cleaned CSV output:

```sql
CREATE TABLE market (
  year              INTEGER NOT NULL,
  origin_airport_id INTEGER NOT NULL,
  origin            TEXT NOT NULL,
  origin_city_name  TEXT,
  origin_state_nm   TEXT,
  origin_country_name TEXT,
  dest_airport_id   INTEGER NOT NULL,
  dest              TEXT NOT NULL,
  dest_city_name    TEXT,
  dest_state_nm     TEXT,
  dest_country_name TEXT,
  carrier_name      TEXT,
  class             TEXT,
  passengers        INTEGER DEFAULT 0,
  freight           INTEGER DEFAULT 0,
  mail              INTEGER DEFAULT 0,
  data_source       TEXT
);

-- Indexes for common query patterns
CREATE INDEX idx_market_year ON market(year);
CREATE INDEX idx_market_origin_state ON market(origin_state_nm);
CREATE INDEX idx_market_dest_country ON market(dest_country_name);
CREATE INDEX idx_market_origin_dest ON market(origin, dest);
```

### 2.2 `segment` Table (from Segment CSV)

22 columns matching the current cleaned CSV output:

```sql
CREATE TABLE segment (
  year                  INTEGER NOT NULL,
  origin_airport_id     INTEGER NOT NULL,
  origin                TEXT NOT NULL,
  origin_city_name      TEXT,
  origin_state_nm       TEXT,
  origin_country_name   TEXT,
  dest_airport_id       INTEGER NOT NULL,
  dest                  TEXT NOT NULL,
  dest_city_name        TEXT,
  dest_state_nm         TEXT,
  dest_country_name     TEXT,
  carrier_name          TEXT,
  class                 TEXT,
  aircraft_group        INTEGER,
  departures_scheduled  INTEGER DEFAULT 0,
  departures_performed  INTEGER DEFAULT 0,
  payload               INTEGER DEFAULT 0,
  seats                 INTEGER DEFAULT 0,
  passengers            INTEGER DEFAULT 0,
  freight               INTEGER DEFAULT 0,
  mail                  INTEGER DEFAULT 0,
  data_source           TEXT,
  sched_reported        INTEGER DEFAULT 1
);

CREATE INDEX idx_segment_year ON segment(year);
CREATE INDEX idx_segment_origin_state ON segment(origin_state_nm);
CREATE INDEX idx_segment_dest_country ON segment(dest_country_name);
CREATE INDEX idx_segment_origin_dest ON segment(origin, dest);
```

### 2.3 `airports` Table (from GeoJSON)

4 columns matching the cleaned GeoJSON properties:

```sql
CREATE TABLE airports (
  airport       TEXT PRIMARY KEY,  -- IATA code (e.g., 'DFW')
  airport_name  TEXT NOT NULL,     -- Display name (e.g., 'Dallas/Fort Worth International')
  latitude      REAL NOT NULL,
  longitude     REAL NOT NULL
);
```

### Storage Estimate

| Table | Rows | Est. Size |
|---|---|---|
| market | ~94K | ~15 MB |
| segment | ~94K | ~20 MB |
| airports | ~1,275 | <1 MB |
| Indexes | — | ~5 MB |
| **Total** | | **~40 MB** |

Well within Turso's 9 GB free tier.

---

## 3. Data Pipeline Changes

### Existing Scripts — No Changes

All existing scripts (`raw-BTS-data-to-DB.py`, `Extract_BTS_Data.py`, `Verify_Corrections.py`, `Apply_Data_Cleaning.py`) remain unchanged. The cleaned CSVs and GeoJSON continue to be written to `03_Process_Data/BTS/` as before.

### New Script: `Upload_to_Turso.py`

A new script added after `Apply_Data_Cleaning.py` that:

1. Reads the 3 cleaned output files from `03_Process_Data/BTS/`
2. Connects to Turso using the `libsql-experimental` Python SDK
3. Creates/recreates the tables (`market`, `segment`, `airports`)
4. Bulk-inserts data from CSVs and GeoJSON
5. Verifies row counts match

```python
# Pseudocode for Upload_to_Turso.py
import libsql_experimental as libsql
import pandas as pd
import json

# Connect to Turso
conn = libsql.connect(
    "libsql://<your-db>.turso.io",
    auth_token="<your-token>"
)

# Read cleaned files
market_df = pd.read_csv("03_Process_Data/BTS/BTS_T-100_Market_2015-2024.csv")
segment_df = pd.read_csv("03_Process_Data/BTS/BTS_T-100_Segment_2015-2024.csv")
with open("03_Process_Data/BTS/BTS_T-100_Airports_2015-2024.geojson") as f:
    airports_geo = json.load(f)

# Create tables (DROP + CREATE)
conn.executescript(CREATE_TABLE_SQL)

# Bulk insert market data
for chunk in pd.read_csv(..., chunksize=5000):
    conn.executemany("INSERT INTO market VALUES (?, ?, ...)", chunk.values.tolist())

# Bulk insert segment data (same pattern)
# Insert airports from GeoJSON features
# Verify counts
conn.commit()
```

### Updated Pipeline Diagram
```
Step 0: raw-BTS-data-to-DB.py     → Raw SQLite DB        (unchanged)
Step 1: Extract_BTS_Data.py       → _temp/ CSVs          (unchanged)
Step 2: Verify_Corrections.py     → Anomaly reports       (unchanged)
Step 3: Apply_Data_Cleaning.py    → 03_Process_Data/BTS/  (unchanged)
Step 4: Upload_to_Turso.py (NEW)  → Turso Cloud DB        (new step)
```

---

## 4. API Layer (Serverless Functions)

Turso doesn't auto-generate a REST API like Supabase. We need a thin serverless function layer between the browser and Turso.

### Recommended: Cloudflare Workers (free tier)

- **Free:** 100K requests/day, 10ms CPU per request
- **Global edge:** runs close to users
- **Native Turso support:** `@libsql/client` works in Workers

### Alternative: Vercel Serverless Functions (free tier)

- **Free:** 100K invocations/month
- **Pairs with GitHub:** auto-deploys from a repo
- **Node.js runtime:** `@libsql/client` works natively

### API Endpoints

The webapp currently makes 3 fetch calls on startup. The API replaces these with query endpoints:

| Endpoint | Replaces | What It Returns |
|---|---|---|
| `GET /api/market?filters...` | `BTS_T-100_Market_2015-2024.csv` | Filtered market rows as JSON |
| `GET /api/segment?filters...` | `BTS_T-100_Segment_2015-2024.csv` | Filtered segment rows as JSON |
| `GET /api/airports` | `BTS_T-100_Airports_2015-2024.geojson` | All airports as JSON array |

### Example: Cloudflare Worker

```javascript
// worker.js — Cloudflare Worker querying Turso
import { createClient } from '@libsql/client/web'

const turso = createClient({
  url: 'libsql://<your-db>.turso.io',
  authToken: '<your-token>',  // stored as Worker secret
})

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    // CORS headers for GitHub Pages
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://<your-username>.github.io',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': 'application/json',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    if (url.pathname === '/api/airports') {
      const result = await turso.execute('SELECT * FROM airports')
      return new Response(JSON.stringify(result.rows), { headers: corsHeaders })
    }

    if (url.pathname === '/api/market') {
      // Build WHERE clause from query parameters
      const year = url.searchParams.get('year')
      const originState = url.searchParams.get('origin_state')
      const destCountry = url.searchParams.get('dest_country')

      let sql = 'SELECT * FROM market WHERE 1=1'
      const args = []

      if (year) { sql += ' AND year = ?'; args.push(parseInt(year)) }
      if (originState) { sql += ' AND origin_state_nm = ?'; args.push(originState) }
      if (destCountry) { sql += ' AND dest_country_name = ?'; args.push(destCountry) }

      const result = await turso.execute({ sql, args })
      return new Response(JSON.stringify(result.rows), { headers: corsHeaders })
    }

    // Similar for /api/segment
    return new Response('Not found', { status: 404 })
  }
}
```

### Security

- Turso auth token stored as a Worker/Vercel environment secret (never exposed to browser)
- CORS restricted to your GitHub Pages domain
- API is read-only (no INSERT/UPDATE/DELETE endpoints)
- Rate limiting available via Cloudflare (built-in) or Vercel middleware

---

## 5. WebApp Changes

### 5.1 Install Dependency

No new npm dependencies needed in the React app — it just calls `fetch()` to the API.

### 5.2 Update `aviationStore.js`

Replace static file fetches with API calls:

```javascript
// BEFORE (current):
const [market, segment, airportGeo] = await Promise.all([
  d3.csv(`${base}data/BTS_T-100_Market_2015-2024.csv`, d3.autoType),
  d3.csv(`${base}data/BTS_T-100_Segment_2015-2024.csv`, d3.autoType),
  d3.json(`${base}data/BTS_T-100_Airports_2015-2024.geojson`),
])

// AFTER (with Turso API):
const API = import.meta.env.VITE_API_URL  // e.g., 'https://your-worker.workers.dev'
const [market, segment, airports] = await Promise.all([
  fetch(`${API}/api/market`).then(r => r.json()),
  fetch(`${API}/api/segment`).then(r => r.json()),
  fetch(`${API}/api/airports`).then(r => r.json()),
])
```

### 5.3 Update `buildAirportIndex()`

Currently parses GeoJSON FeatureCollection format. With the API returning a flat array, simplify to:

```javascript
// BEFORE: parses GeoJSON features
export function buildAirportIndex(geojson) {
  const index = new Map()
  for (const f of geojson.features) {
    const p = f.properties
    index.set(p.AIRPORT, { name: p.DISPLAY_AIRPORT_NAME, lat: p.LATITUDE, lng: p.LONGITUDE })
  }
  return index
}

// AFTER: parses flat JSON array from API
export function buildAirportIndex(airports) {
  const index = new Map()
  for (const a of airports) {
    index.set(a.airport, { name: a.airport_name, lat: a.latitude, lng: a.longitude })
  }
  return index
}
```

### 5.4 Everything Else — No Changes

- `enrichRow()` — unchanged (still enriches rows with airport names/coords)
- `normalizeRow()` — unchanged (still casts types, trims strings)
- Route predicates — unchanged (still filter client-side)
- All chart components — unchanged (still receive data as props)
- All page components — unchanged (still use `useMemo` for filtering)
- Filter logic — unchanged (still client-side)

### 5.5 Environment Variable

Add API URL to `.env`:
```
VITE_API_URL=https://your-worker.workers.dev
```

---

## 6. Turso Setup Steps

### 6.1 Install Turso CLI

```bash
# macOS / Linux
curl -sSfL https://get.tur.so/install.sh | bash

# Windows (via scoop)
scoop install turso
```

### 6.2 Sign Up & Authenticate

```bash
turso auth signup    # or 'turso auth login' if already have account
```

### 6.3 Create Database

```bash
turso db create bts-airport-connectivity
```

### 6.4 Get Connection URL & Token

```bash
turso db show bts-airport-connectivity --url
# → libsql://bts-airport-connectivity-<your-username>.turso.io

turso db tokens create bts-airport-connectivity
# → eyJhbGciOi... (save this securely)
```

### 6.5 Create Tables

```bash
turso db shell bts-airport-connectivity
```

Then run the CREATE TABLE statements from Section 2.

### 6.6 Upload Data

Run the new `Upload_to_Turso.py` script (Section 3).

---

## 7. GitHub Pages Compatibility

**GitHub Pages stays as-is.** The React app is still a static SPA deployed to GitHub Pages. The only difference is that instead of fetching local CSV/GeoJSON files from `/data/`, it fetches JSON from the Cloudflare Worker API.

```
Browser (GitHub Pages)  →  HTTPS  →  Cloudflare Worker  →  Turso DB
     static HTML/JS                    serverless function     cloud SQLite
```

- No server to manage on the GitHub Pages side
- CORS configured on the Worker to allow requests from your GitHub Pages domain
- The `/public/data/` folder with CSV/GeoJSON files can be kept as a fallback or removed

---

## 8. Migration Execution Checklist

### Phase 1: Turso Setup (no disruption to current site)
- [ ] Install Turso CLI
- [ ] Create account and database
- [ ] Run CREATE TABLE statements
- [ ] Write `Upload_to_Turso.py` script
- [ ] Upload cleaned data to Turso
- [ ] Verify row counts match current CSVs

### Phase 2: API Layer (no disruption to current site)
- [ ] Create Cloudflare account (or Vercel)
- [ ] Write Worker with `/api/market`, `/api/segment`, `/api/airports` endpoints
- [ ] Store Turso auth token as Worker secret
- [ ] Deploy Worker
- [ ] Test endpoints manually (curl / browser)
- [ ] Configure CORS for your GitHub Pages domain

### Phase 3: WebApp Update
- [ ] Add `VITE_API_URL` environment variable
- [ ] Update `aviationStore.js` to fetch from API
- [ ] Update `buildAirportIndex()` for flat JSON format
- [ ] Test locally with `npm run dev`
- [ ] Verify all pages load correctly, filters work, charts render
- [ ] Build and deploy to GitHub Pages

### Phase 4: Cleanup
- [ ] Remove static CSV/GeoJSON files from `/public/data/` (optional — can keep as fallback)
- [ ] Update `Data-Pipeline-README.md` with new Step 4
- [ ] Update `CLAUDE.md` with Turso architecture notes

---

## 9. Future Scaling Path

### Short Term (free tier, current scope)
- Yearly aggregates in Turso (~40 MB)
- Cloudflare Worker free tier (100K requests/day)
- GitHub Pages static hosting

### Medium Term (if traffic grows or more granularity needed)
- **Monthly granularity**: Upload monthly data instead of yearly (~200 MB, still within free 9 GB)
- **Turso Dev plan** ($4.99/mo): 2.5B row reads/month if free tier reads are exceeded
- **Caching**: Add `Cache-Control` headers to Worker responses for common queries (e.g., yearly totals rarely change)

### Long Term (production-scale)
- **Turso Scaler plan** ($29/mo): Higher read/write limits
- **Vercel or Cloudflare Pages**: Replace GitHub Pages for edge-rendered frontend + built-in serverless functions (eliminates separate Worker)
- **Server-side filtering**: Move filter logic from client to API (send only the rows each page needs, not all data)
- **Pre-computed aggregations**: Create summary tables in Turso for common dashboard queries (top routes, yearly totals by state, etc.)

---

## 10. Cost Summary

| Component | Current | After Migration |
|---|---|---|
| Database | Local SQLite (free) | Turso free tier ($0) |
| API | None (static files) | Cloudflare Worker free tier ($0) |
| Frontend hosting | GitHub Pages ($0) | GitHub Pages ($0) |
| **Total** | **$0/month** | **$0/month** |

Paid upgrades only needed if: monthly row reads exceed 500M (Turso) or API requests exceed 100K/day (Cloudflare).
