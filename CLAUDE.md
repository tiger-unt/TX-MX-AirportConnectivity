# CLAUDE.md - Task 6: Airport Connectivity

## Project Overview
TxDOT IAC 2025-26 research project analyzing airport connectivity between Texas and Mexico using BTS (Bureau of Transportation Statistics) Air Carrier data. Part of a UNT System interagency contract with TxDOT.

## Directory Structure
```
01_Raw Data/           # Source data (BTS raw downloads, airport master lists)
02_Data_Staging/       # Database and extraction scripts
  BTS_Air_Carrier_Statistics/
    Database/          # SQLite DB (~4.5 GB), schema JSON, corrections
    Script/            # Python extraction & query scripts
03_Process_Data/       # Cleaned/aggregated outputs (CSV, GeoJSON)
04_GIS/                # GIS analysis files
05_Stakeholder_Outreach/
06_Deliverables/
07_WebApp/             # Web application and supporting data
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

## Scripts
All Python scripts live under `02_Data_Staging/BTS_Air_Carrier_Statistics/Script/`:
- `Extract_TX_MX_Market_Data.py` — extracts & aggregates BTS_MARKET for TX/MX, outputs CSV + airport GeoJSON
- `Extract_TX_MX_Segment_Data.py` — same for BTS_SEGMENT data
- `_helper/Extract_Database_Schema.py` — generates schema JSON from the DB
- `Andrew_Sample_Code/` — example query, load, and GIS scripts

Scripts use relative paths from their own location (`Path(__file__).parent`).

## Tech Stack
- **Python**: pandas, sqlite3, geopandas, shapely, matplotlib
- **Database**: SQLite
- **GIS formats**: GeoJSON, WKT (EPSG:4326)
- **Output formats**: CSV, GeoJSON

## Conventions
- Scripts use `Path(__file__).parent` for relative path resolution
- Output files include year range in filename (e.g., `BTS_T-100_Market_2015-2024.csv`)
- SQL queries use f-strings or `.format()` for parameterization
- Print statements with `[SUCCESS]`/`[ERROR]`/`[WARNING]` prefixes for status logging
- Year range configured via `START_YEAR` / `END_YEAR` constants at top of scripts

## Git
- `.gitignore` excludes all numbered data folders (01–08) — only config and root files are tracked
- Data files are too large for git; the DB alone is ~4.5 GB
