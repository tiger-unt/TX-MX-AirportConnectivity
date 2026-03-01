# BTS Air Carrier Statistics - Data Extraction Scripts

These scripts extract and aggregate air carrier statistics from the BTS T-100 database for Texas-Mexico airport connectivity analysis, as part of **TxDOT IAC 2025-26 Task 6**.

## Scripts

### Extract_BTS_Data.py

Unified extraction script that processes both **market-level** and **segment-level** BTS data in a single run.

**What it does:**

1. Queries both `BTS_MARKET` and `BTS_SEGMENT` tables for records where origin or destination is Texas or Mexico
2. Aggregates monthly data to **annual totals** for each data type
3. Outputs a detail CSV per data type (Market: 18 columns, Segment: 24 columns)
4. Generates a **single combined GeoJSON** of all airports across both datasets, matched by stable `AIRPORT_ID` (not IATA codes)

**Market aggregated metrics:** PASSENGERS, FREIGHT, MAIL, DISTANCE

**Segment aggregated metrics:** DEPARTURES_SCHEDULED, DEPARTURES_PERFORMED, PAYLOAD, SEATS, PASSENGERS, FREIGHT, MAIL, DISTANCE, RAMP_TO_RAMP, AIR_TIME

**Output files:**
- `BTS_T-100_Market_{START_YEAR}-{END_YEAR}.csv`
- `BTS_T-100_Segment_{START_YEAR}-{END_YEAR}.csv`
- `BTS_T-100_Airports_{START_YEAR}-{END_YEAR}.geojson`

## Configuration

Year range is configurable at the top of the script:

```python
START_YEAR = 2015  # Beginning year (inclusive)
END_YEAR = 2024    # Ending year (inclusive)
```

## Directory Structure

```
02_Data_Staging/
└── BTS_Air_Carrier_Statistics/
    ├── Database/
    │   ├── BTS_Air_Carrier_Statistics.db    # Source SQLite database
    │   └── corrections/                     # Data quality corrections (applied separately)
    └── Script/
        ├── README.md                        # This file
        ├── Extract_BTS_Data.py              # Unified extraction script
        └── _Archive/                        # Previous individual scripts

01_Raw Data/
└── Airport_Master_List.csv                  # Airport coordinates lookup

03_Process_Data/
└── BTS/                                     # Output directory (auto-created)
    ├── BTS_T-100_Market_*.csv
    ├── BTS_T-100_Segment_*.csv
    └── BTS_T-100_Airports_*.geojson
```

## Dependencies

- **pandas** - Data manipulation and SQL query execution
- **sqlite3** - Database connectivity (Python standard library)
- **geopandas** - Spatial data handling and GeoJSON export
- **shapely** - Point geometry creation

## Usage

Run from any directory; paths are resolved relative to the script location.

```bash
python Extract_BTS_Data.py
```

## Market vs. Segment Data

| Aspect | Market | Segment |
|--------|--------|---------|
| **Granularity** | Origin-to-final-destination | Individual flight legs |
| **Columns** | 18 | 24 |
| **Unique metrics** | -- | Departures, Seats, Payload, Ramp-to-Ramp, Air Time |
| **Use case** | Demand & connectivity analysis | Operational & capacity analysis |
