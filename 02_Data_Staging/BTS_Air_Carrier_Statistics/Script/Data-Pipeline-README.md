# BTS T-100 Data Pipeline — Comprehensive Reference

**Project:** TxDOT IAC 2025-26, Task 6 — Airport Connectivity
**Organization:** UNT System (Interagency Contract with Texas Department of Transportation)
**Purpose:** Analyze air connectivity between Texas and Mexico using federal aviation statistics
**Data years covered:** 2015–2024
**Last updated:** 2026-03-01

---

## Table of Contents

1. [What This Project Is About](#1-what-this-project-is-about)
2. [What Is BTS T-100 Data?](#2-what-is-bts-t-100-data)
3. [Market Data vs. Segment Data](#3-market-data-vs-segment-data)
4. [Raw Data Sources](#4-raw-data-sources)
   - 4.1 [SQLite Database](#41-sqlite-database)
   - 4.2 [Airport Master List](#42-airport-master-list)
   - 4.3 [BTS Data Dictionaries](#43-bts-data-dictionaries)
5. [Database Tables](#5-database-tables)
   - 5.1 [BTS_MARKET Table](#51-bts_market-table)
   - 5.2 [BTS_SEGMENT Table](#52-bts_segment-table)
   - 5.3 [Reference Tables](#53-reference-tables)
6. [Pipeline Overview](#6-pipeline-overview)
7. [Step 1 — Extraction](#7-step-1--extraction)
   - 7.1 [What Gets Extracted](#71-what-gets-extracted)
   - 7.2 [Filtering Logic](#72-filtering-logic)
   - 7.3 [Aggregation](#73-aggregation)
   - 7.4 [Intermediate Output Files](#74-intermediate-output-files)
8. [Step 2 — Data Cleaning](#8-step-2--data-cleaning)
   - 8.1 [Cleaning Rule System](#81-cleaning-rule-system)
   - 8.2 [Phase 1: Updates (Code & Name Standardization)](#82-phase-1-updates-code--name-standardization)
   - 8.3 [Phase 2: Corrections (Value Fixes)](#83-phase-2-corrections-value-fixes)
   - 8.4 [Phase 3: Deletes (Unreliable Data Removal)](#84-phase-3-deletes-unreliable-data-removal)
   - 8.5 [Phase 4: Filters (Row Exclusion)](#85-phase-4-filters-row-exclusion)
   - 8.6 [Phase 5: State Name Fill](#86-phase-5-state-name-fill)
   - 8.7 [Phase 6: Re-Aggregation](#87-phase-6-re-aggregation)
9. [Detailed Data Quality Report & Cleaning Rules](#9-detailed-data-quality-report--cleaning-rules)
   - 9.1 [Issues Corrected](#91-issues-corrected)
   - 9.2 [Issues Filtered Out](#92-issues-filtered-out)
   - 9.3 [Issues Acknowledged but Not Corrected](#93-issues-acknowledged-but-not-corrected)
   - 9.4 [Known Anomalies (No Action Required)](#94-known-anomalies-no-action-required)
   - 9.5 [GeoJSON-Specific Cleaning Details](#95-geojson-specific-cleaning-details)
   - 9.6 [Cleaning Summary Table](#96-cleaning-summary-table)
10. [Step 3 — Verification](#10-step-3--verification)
11. [Final Output Files (Process Data)](#11-final-output-files-process-data)
    - 11.1 [Market CSV — Column Definitions](#111-market-csv--column-definitions)
    - 11.2 [Segment CSV — Column Definitions](#112-segment-csv--column-definitions)
    - 11.3 [Airport GeoJSON — Structure & Properties](#113-airport-geojson--structure--properties)
    - 11.4 [CLASS Values (Service Class)](#114-class-values-service-class)
    - 11.5 [DATA_SOURCE Values](#115-data_source-values)
    - 11.6 [Output Statistics](#116-output-statistics)
12. [Known Data Characteristics](#12-known-data-characteristics)
13. [Directory Structure](#13-directory-structure)
14. [How to Run the Pipeline](#14-how-to-run-the-pipeline)
15. [Dependencies](#15-dependencies)
16. [Supporting Files Reference](#16-supporting-files-reference)

---

## 1. What This Project Is About

This project is part of a research initiative between the University of North Texas (UNT) System and the Texas Department of Transportation (TxDOT), funded under Interagency Contract (IAC) 2025-26. **Task 6** focuses on **airport connectivity** — specifically, understanding the air transportation links between Texas airports and Mexico.

The core questions this data helps answer:

- **How many passengers, how much freight, and how much mail travel between Texas and Mexico by air each year?**
- **Which airlines serve these routes, and how has service changed over time (2015–2024)?**
- **What is the domestic air connectivity profile of Texas airports?**
- **What international destinations are served from Texas?**
- **How does US-Mexico air traffic compare at the national level vs. Texas-specific routes?**

To answer these questions, we use **BTS T-100 air carrier statistics** — a comprehensive federal dataset that captures every commercial flight operated by airlines to, from, or within the United States.

---

## 2. What Is BTS T-100 Data?

**BTS** stands for the **Bureau of Transportation Statistics**, a division of the U.S. Department of Transportation (US DOT). BTS maintains the T-100 air carrier statistics program, which collects traffic and capacity data from all certificated U.S. air carriers and foreign air carriers operating to/from the United States.

**Key facts about T-100 data:**

- **Mandatory reporting**: All airlines with U.S. operating authority must file monthly traffic reports with BTS.
- **Both U.S. and foreign carriers**: The data includes U.S.-based airlines (American, United, Southwest, etc.) AND foreign carriers operating to/from U.S. airports (Aeromexico, Volaris, LATAM, etc.).
- **Coverage**: Every commercial flight segment and passenger market involving a U.S. airport.
- **Granularity**: Monthly data broken down by carrier, route (origin-destination airport pair), aircraft type, and service class.
- **Public data**: Available for download at [https://transtats.bts.gov](https://transtats.bts.gov).

The T-100 data is published in two complementary forms: **Market** data and **Segment** data. Understanding the difference is critical to interpreting the numbers correctly.

---

## 3. Market Data vs. Segment Data

This is one of the most important concepts in the dataset. The same flight can produce different numbers depending on whether you're looking at Market or Segment data.

### Market Data — "Where are people actually going?"

Market data counts passengers, freight, and mail at the **journey level** — from the passenger's true origin to their true destination, regardless of how many flight legs (connections) are involved. A passenger is counted **once** for their origin-destination pair.

### Segment Data — "What is happening on each flight?"

Segment data counts traffic on each **individual flight leg**. If a passenger flies from JFK to MIA with a stop in DFW, they are counted on both the JFK→DFW segment and the DFW→MIA segment. Segment data also includes operational metrics not available in market data: scheduled departures, performed departures, seat capacity, and payload.

### Worked Example

> 250 people board a flight from JFK (A) to BWI (B). At BWI, 200 deplane. The remaining 50 passengers plus 70 new passengers continue to MIA (C).

**Market counts:**
| Market (O→D) | Passengers |
|---|---|
| JFK → BWI | 200 |
| JFK → MIA | 50 |
| BWI → MIA | 70 |
| **Total** | **320** |

**Segment counts:**
| Segment (Flight Leg) | Passengers |
|---|---|
| JFK → BWI | 250 (all onboard) |
| BWI → MIA | 120 (50 continuing + 70 new) |
| **Total** | **370** |

The segment total (370) is higher because the 50 through-passengers are counted on both legs. The market total (320) counts each person once for their actual journey.

### When to Use Which

| Analysis Goal | Use |
|---|---|
| Total travel demand between two cities | Market |
| Passenger connectivity patterns | Market |
| How many flights were operated on a route | Segment |
| Airport capacity utilization (seats, load factor) | Segment |
| Cargo tonnage by flight leg | Segment |
| Schedule reliability (scheduled vs. performed departures) | Segment |
| Freight-only and charter flight operations | Segment |

### Key Differences at a Glance

| Aspect | Market | Segment |
|---|---|---|
| Passenger counting | Once per journey (origin to final destination) | Once per flight leg |
| Freight/mail counting | Journey-level (enplaned) | Leg-level (transported) |
| Operational metrics | Not available | Departures scheduled/performed, seats, payload |
| Typical total PAX | Lower | Higher (passengers counted on multiple legs) |
| Number of columns in our output | 17 | 21 |
| Primary use case | Demand & connectivity analysis | Operational & capacity analysis |

---

## 4. Raw Data Sources

### 4.1 SQLite Database

The primary data source is a pre-built SQLite database containing the full BTS T-100 dataset:

- **File:** `02_Data_Staging/BTS_Air_Carrier_Statistics/Database/BTS_Air_Carrier_Statistics.db`
- **Size:** ~4.5 GB
- **SQLite version:** 3.45.3
- **Total records:** ~19.7 million across all tables
- **Content:** All BTS T-100 Market and Segment records (all years available in BTS), plus airport reference tables

This database was built from raw BTS downloads (CSV files by year/month, stored in `01_Raw Data/BTS_Air_Carrier_Statistics/Raw BTS MARKET DATA/` and `Raw BTS SEGMENT DATA/`). The raw CSVs were loaded into SQLite to enable efficient SQL querying across all years simultaneously.

### 4.2 Airport Master List

- **File:** `01_Raw Data/Airport_Master_List.csv`
- **Content:** BTS Airport Master Record — a comprehensive list of all airports in the BTS system with names, codes, coordinates, and time-versioned attributes
- **Used by:** The extraction script to generate the supplementary airport GeoJSON

### 4.3 BTS Data Dictionaries

Official BTS field descriptions are stored alongside the raw data:

- `01_Raw Data/BTS_Air_Carrier_Statistics/Dictionary_market.csv` — field descriptions for all 41 columns in the raw BTS_MARKET table
- `01_Raw Data/BTS_Air_Carrier_Statistics/Dictionary_segment.csv` — field descriptions for all 50+ columns in the raw BTS_SEGMENT table

These dictionaries define the official BTS meaning of each column (see Section 5 for the columns relevant to our pipeline).

---

## 5. Database Tables

### 5.1 BTS_MARKET Table

**Records:** 8,263,523 rows, 41 columns

This is the complete BTS T-100 market dataset. Each row represents one carrier's traffic on one origin-destination market for one month/year/service class combination.

**All 41 columns in the raw database table** (our pipeline extracts a subset — see Section 7):

| Column | Type | Description |
|---|---|---|
| PASSENGERS | REAL | Enplaned passengers (counted once per journey) |
| FREIGHT | REAL | Freight enplaned, in pounds |
| MAIL | REAL | Mail enplaned, in pounds |
| DISTANCE | REAL | Distance between airports, in statute miles |
| UNIQUE_CARRIER | TEXT | DOT unique carrier code (handles code reuse over time) |
| AIRLINE_ID | INTEGER | DOT unique airline identifier number |
| UNIQUE_CARRIER_NAME | TEXT | Full carrier name (disambiguated for code reuse) |
| UNIQUE_CARRIER_ENTITY | TEXT | Unique entity for carrier's operation region |
| REGION | TEXT | Carrier's reporting operation region |
| CARRIER | TEXT | IATA carrier code (may not be unique over time) |
| CARRIER_NAME | TEXT | Carrier name (current, non-disambiguated) |
| CARRIER_GROUP | INTEGER | Legacy carrier group code |
| CARRIER_GROUP_NEW | INTEGER | Updated carrier group code |
| DISTANCE_GROUP | INTEGER | Distance interval (every 500 miles) |
| CLASS | TEXT | Service class code |
| DATA_SOURCE | TEXT | Two-character reporting source code |
| YEAR | INTEGER | Reporting year |
| QUARTER | INTEGER | Quarter (1–4) |
| MONTH | INTEGER | Month (1–12) |
| ORIGIN_AIRPORT_ID | INTEGER | Origin airport unique ID (stable across code changes) |
| ORIGIN_AIRPORT_SEQ_ID | INTEGER | Origin airport sequence ID (point-in-time identifier) |
| ORIGIN_CITY_MARKET_ID | INTEGER | Origin city market ID (consolidates airports in same metro) |
| ORIGIN | TEXT | Origin airport code (IATA or FAA LID) |
| ORIGIN_CITY_NAME | TEXT | Origin city name (format: "City, State/Country") |
| ORIGIN_STATE_ABR | TEXT | Origin state abbreviation (U.S. airports only) |
| ORIGIN_STATE_FIPS | TEXT | Origin state FIPS code |
| ORIGIN_STATE_NM | TEXT | Origin state name (blank for international airports) |
| ORIGIN_COUNTRY | TEXT | Origin country code |
| ORIGIN_COUNTRY_NAME | TEXT | Origin country name |
| ORIGIN_WAC | INTEGER | Origin World Area Code |
| DEST_AIRPORT_ID | INTEGER | Destination airport unique ID |
| DEST_AIRPORT_SEQ_ID | INTEGER | Destination airport sequence ID |
| DEST_CITY_MARKET_ID | INTEGER | Destination city market ID |
| DEST | TEXT | Destination airport code |
| DEST_CITY_NAME | TEXT | Destination city name |
| DEST_STATE_ABR | TEXT | Destination state abbreviation |
| DEST_STATE_FIPS | TEXT | Destination state FIPS code |
| DEST_STATE_NM | TEXT | Destination state name (blank for international airports) |
| DEST_COUNTRY | TEXT | Destination country code |
| DEST_COUNTRY_NAME | TEXT | Destination country name |
| DEST_WAC | INTEGER | Destination World Area Code |

### 5.2 BTS_SEGMENT Table

**Records:** 11,401,811 rows, 50 columns

This is the complete BTS T-100 segment dataset. Each row represents one carrier's operations on one flight segment for one month/year/service class/aircraft type combination.

**Additional columns beyond those shared with BTS_MARKET:**

| Column | Type | Description |
|---|---|---|
| AIRCRAFT_GROUP | INTEGER | Aircraft group classification |
| AIRCRAFT_TYPE | INTEGER | Aircraft type code |
| AIRCRAFT_CONFIG | INTEGER | Aircraft configuration code |
| DEPARTURES_SCHEDULED | REAL | Number of scheduled departures |
| DEPARTURES_PERFORMED | REAL | Number of departures actually performed |
| PAYLOAD | REAL | Total payload capacity, in pounds |
| SEATS | REAL | Total available seats |
| RAMP_TO_RAMP | REAL | Ramp-to-ramp time, in minutes |
| AIR_TIME | REAL | Air time, in minutes |

**Important:** Segment data is reported at a finer granularity than market data — it is broken down by **aircraft type**. This means a single carrier operating two different aircraft types on the same route in the same month will have two separate rows. This is not duplication; it is by design.

### 5.3 Reference Tables

| Table | Records | Purpose |
|---|---|---|
| BORDER_AIRPORTS | 244 | Texas border region airports with WKT point geometry, country/state/county info |
| TEMP_AIRPORTS | 366 | Simple airport reference lookup (airport code + name) |

These reference tables are stored in the database but are not used directly by the data pipeline. The pipeline queries only BTS_MARKET and BTS_SEGMENT.

---

## 6. Pipeline Overview

The pipeline transforms ~19.7 million raw database records into two clean, analysis-ready CSV files covering air routes involving Texas or Mexico.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           RAW DATA SOURCES                               │
│  SQLite Database (~4.5 GB, ~19.7M records across 2 main tables)         │
│  BTS_MARKET: 8.3M rows × 41 cols    BTS_SEGMENT: 11.4M rows × 50 cols  │
│  Airport Master List CSV (names, coordinates, attributes)               │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │
                     ┌──────────▼──────────┐
                     │  STEP 1: EXTRACTION │
                     │  Extract_BTS_Data.py│
                     └──────────┬──────────┘
                                │  SQL query + annual aggregation
                                │  Filter: TX or Mexico routes, 2015-2024
                                │  41→17 cols (market), 50→21 cols (segment)
                                │  Airport Master List → GeoJSON
                                ▼
              ┌────────────────────────────────────────┐
              │  INTERMEDIATE FILES (Script/_temp/)     │
              │  Market CSV:   ~106K rows × 17 cols    │
              │  Segment CSV:  ~109K rows × 21 cols    │
              │  Airport GeoJSON: ~4,981 features      │
              └────────────────────┬───────────────────┘
                                   │
                      ┌────────────▼────────────┐
                      │  STEP 2: DATA CLEANING  │
                      │  Apply_Data_Cleaning.py │
                      └────────────┬────────────┘
                                   │  CSVs: 6-phase cleaning process
                                   │  GeoJSON: 5-phase cleaning process
                                   │  All driven by data-cleaning.csv rules
                                   ▼
              ┌────────────────────────────────────────┐
              │  FINAL OUTPUT (03_Process_Data/BTS/)    │
              │  Market CSV:   ~94K rows × 17 cols     │
              │  Segment CSV:  ~94K rows × 21 cols     │
              │  Airport GeoJSON: 1,275 features       │
              └────────────────────────────────────────┘
                                   │
                      ┌────────────▼────────────────┐
                      │  STEP 3: VERIFICATION       │
                      │  Verify_Corrections.py      │
                      │  (validates cleaning rules)  │
                      └─────────────────────────────┘
```

**Data reduction summary:**
- Raw database: ~19.7 million records
- After extraction (TX/Mexico filter + aggregation): ~215,000 CSV records + ~4,981 GeoJSON features
- After cleaning: ~188,000 CSV records + 1,275 GeoJSON features
- CSV row reduction: ~12% removed (mostly zero-activity rows and self-flights)
- GeoJSON feature reduction: ~74% removed (time-versioned duplicates and orphan airports)

---

## 7. Step 1 — Extraction

**Script:** `Extract_BTS_Data.py`

### 7.1 What Gets Extracted

The extraction script connects to the SQLite database and runs SQL queries against both `BTS_MARKET` and `BTS_SEGMENT` tables. It selects only the columns needed for analysis (reducing from 41/50 raw columns down to 17/21 output columns) and aggregates monthly data into annual totals.

**Columns retained for Market output (17):**

| # | Column | Role |
|---|---|---|
| 1 | YEAR | Time dimension |
| 2 | ORIGIN_AIRPORT_ID | Origin airport unique identifier |
| 3 | ORIGIN | Origin airport code (IATA or FAA LID) |
| 4 | ORIGIN_CITY_NAME | Origin city (e.g., "Houston, TX") |
| 5 | ORIGIN_STATE_NM | Origin state/province name |
| 6 | ORIGIN_COUNTRY_NAME | Origin country |
| 7 | DEST_AIRPORT_ID | Destination airport unique identifier |
| 8 | DEST | Destination airport code |
| 9 | DEST_CITY_NAME | Destination city |
| 10 | DEST_STATE_NM | Destination state/province |
| 11 | DEST_COUNTRY_NAME | Destination country |
| 12 | CARRIER_NAME | Airline name |
| 13 | CLASS | Service class (F, G, L, P) |
| 14 | PASSENGERS | Annual passenger count (summed from monthly) |
| 15 | FREIGHT | Annual freight in pounds (summed) |
| 16 | MAIL | Annual mail in pounds (summed) |
| 17 | DATA_SOURCE | Reporting source code (DU, IU, DF, IF) |

**Segment output adds 4 more columns (21 total):**

| # | Column | Role |
|---|---|---|
| 14 | DEPARTURES_SCHEDULED | Annual scheduled departures (summed) |
| 15 | DEPARTURES_PERFORMED | Annual performed departures (summed) |
| 16 | PAYLOAD | Annual payload capacity in pounds (summed) |
| 17 | SEATS | Annual seat capacity (summed) |
| 18–21 | PASSENGERS, FREIGHT, MAIL, DATA_SOURCE | Same as market |

**Columns intentionally excluded** (not needed for this project's analysis scope):
- QUARTER, MONTH — aggregated to YEAR
- UNIQUE_CARRIER, AIRLINE_ID, CARRIER, UNIQUE_CARRIER_NAME, UNIQUE_CARRIER_ENTITY — replaced by CARRIER_NAME
- CARRIER_GROUP, CARRIER_GROUP_NEW — legacy classification
- ORIGIN/DEST_AIRPORT_SEQ_ID, ORIGIN/DEST_CITY_MARKET_ID — supplementary IDs
- ORIGIN/DEST_STATE_ABR, ORIGIN/DEST_STATE_FIPS — abbreviations and FIPS codes
- ORIGIN/DEST_COUNTRY, ORIGIN/DEST_WAC — country codes and WAC
- DISTANCE, DISTANCE_GROUP — not needed after removing DISTANCE from pipeline
- AIRCRAFT_GROUP, AIRCRAFT_TYPE, AIRCRAFT_CONFIG — aggregated across aircraft types
- RAMP_TO_RAMP, AIR_TIME — operational timing metrics
- REGION — carrier operation region

### 7.2 Filtering Logic

The SQL WHERE clause selects records relevant to Texas-Mexico connectivity:

```sql
WHERE (ORIGIN_STATE_ABR = 'TX'
   OR DEST_STATE_ABR = 'TX'
   OR ORIGIN_COUNTRY_NAME = 'Mexico'
   OR DEST_COUNTRY_NAME = 'Mexico')
  AND YEAR >= 2015
  AND YEAR <= 2024
```

This captures:
- All flights **from** any Texas airport to anywhere
- All flights **to** any Texas airport from anywhere
- All flights **from** any Mexican airport to anywhere in the U.S.
- All flights **to** any Mexican airport from anywhere in the U.S.

The union of these conditions ensures full coverage of:
- Texas domestic routes (TX ↔ other U.S. states)
- Texas international routes (TX ↔ any foreign country)
- US-Mexico routes at the national level (any U.S. airport ↔ Mexico)
- Texas-Mexico routes specifically (TX ↔ Mexico)

### 7.3 Aggregation

Raw BTS data is monthly. The extraction aggregates to **annual** totals:

```sql
GROUP BY YEAR, ORIGIN_AIRPORT_ID, ORIGIN, ORIGIN_CITY_NAME, ORIGIN_STATE_NM,
         ORIGIN_COUNTRY_NAME, DEST_AIRPORT_ID, DEST, DEST_CITY_NAME,
         DEST_STATE_NM, DEST_COUNTRY_NAME, CARRIER_NAME, CLASS, DATA_SOURCE
```

**Market aggregated metrics:** `SUM(PASSENGERS)`, `SUM(FREIGHT)`, `SUM(MAIL)`

**Segment aggregated metrics:** `SUM(DEPARTURES_SCHEDULED)`, `SUM(DEPARTURES_PERFORMED)`, `SUM(PAYLOAD)`, `SUM(SEATS)`, `SUM(PASSENGERS)`, `SUM(FREIGHT)`, `SUM(MAIL)`

This means each row in the output represents: **one airline, on one route (origin-destination pair), in one year, for one service class and data source**.

**Important:** Because segment data in the raw database is split by aircraft type (see Section 5.2), the annual aggregation sums across all aircraft types — so the output has one row per carrier/route/year/class/source, not per aircraft type.

### 7.4 Intermediate Output Files

Written to `Script/_temp/`:

| File | Description |
|---|---|
| `BTS_T-100_Market_2015-2024.csv` | ~106,000 rows × 17 columns |
| `BTS_T-100_Segment_2015-2024.csv` | ~109,000 rows × 21 columns |
| `BTS_T-100_Airports_2015-2024.geojson` | ~4,981 features (all time-versioned airport entries referenced in the data) |

**About the Airport GeoJSON:** The pipeline generates a GeoJSON file from the Airport Master List (CSV), containing geographic coordinates, names, and attributes for every airport referenced in the Market and Segment data. This file provides the spatial reference needed for mapping airport locations and route visualization. The raw GeoJSON contains time-versioned entries (multiple features per airport tracking changes over time) — these are cleaned down to current entries in Step 2.

**CSV output formatting:** Numeric columns that are whole numbers (e.g., PASSENGERS, FREIGHT, SEATS) are written as clean integers (`1234`) rather than float notation (`1234.0`). Float64 columns are auto-detected and converted to nullable `Int64` dtype before CSV export.

---

## 8. Step 2 — Data Cleaning

**Script:** `Apply_Data_Cleaning.py`

The cleaning script reads the intermediate files from `_temp/`, applies all cleaning rules, and writes the final analysis-ready files to `03_Process_Data/BTS/`.

### 8.1 Cleaning Rule System

All cleaning rules are defined in a single CSV file: `Database/data-cleaning/data-cleaning.csv`. Rules are **not hardcoded** in the script — the script reads this file and executes whatever rules it finds. This makes it easy to add, modify, or remove rules without touching Python code.

**Rule file columns:**

| Column | Values | Purpose |
|---|---|---|
| `action` | `update`, `correct`, `delete`, `filter`, `fill` | What operation to perform |
| `target` | `csv`, `market`, `segment`, `geojson`, `all` | Which output file(s) the rule applies to |
| `airport_id` | Integer or blank | Match key for record-level operations |
| `field` | See below | Abstract field name or correction type |
| `old_value` | String or blank | Value to match (for updates) or lookup file (for fills) |
| `new_value` | String or blank | Replacement value |
| `notes` | Free text | Human-readable explanation |

**Processing order:** The script applies rules in a strict sequence — updates → corrections → deletes → filters → state fill → re-aggregation. This order matters because some steps depend on prior steps (e.g., re-aggregation must happen after updates that create semantic duplicates).

**Detailed rationale** for every cleaning rule is documented in `Database/data-cleaning/data-cleaning.md` — a comprehensive data quality report with affected row counts, anomaly explanations, and decision justifications.

### 8.2 Phase 1: Updates (Code & Name Standardization)

BTS uses `AIRPORT_ID` as the stable unique identifier for an airport. Over time, the IATA/FAA code assigned to an airport can change, and city name labels can be inconsistent. Update rules standardize these to the most current value.

**Airport code updates:**

| Airport ID | Old Code | New Code | Location | Reason |
|---|---|---|---|---|
| 12544 | JQF | USA | Concord, NC | FAA LID → IATA code (changed 2017) |
| 13788 | NZC | VQQ | Jacksonville, FL | Naval base closed → civilian airport code |
| 16658 | T1X | GLE | Gainesville, TX | Temporary BTS code → FAA LID |
| 16879 | T4X | AQO | Llano, TX | Invalid code → correct FAA LID |
| 15081 | SXF | BER | Berlin, Germany | Schönefeld absorbed into Brandenburg (2020) |

**City name updates:**

| Airport ID | Code | Old City | New City | Reason |
|---|---|---|---|---|
| 16852 | NLU | Zumpango, Mexico | Mexico City, Mexico | Felipe Ángeles Int'l serves Mexico City metro area |
| 16755 | T8X | Dallas, TX | McKinney, TX | Airport is in McKinney (~35 mi north of Dallas) |

**How updates work in the data:** Because each airport can appear as either origin or destination, the script checks both sides. For example, a code update for Airport ID 12544 changes `ORIGIN` from `JQF` to `USA` where `ORIGIN_AIRPORT_ID = 12544`, AND changes `DEST` from `JQF` to `USA` where `DEST_AIRPORT_ID = 12544`.

### 8.3 Phase 2: Corrections (Value Fixes)

These rules fix specific numeric values that are clearly erroneous.

**a) DEPARTURES_SCHEDULED outliers (Segment only)**

Some segment rows have `DEPARTURES_SCHEDULED` values orders of magnitude higher than `DEPARTURES_PERFORMED` — obvious data entry errors (extra digits, miskeyed values).

- **Detection:** `DEPARTURES_PERFORMED > 0` AND `DEPARTURES_SCHEDULED / DEPARTURES_PERFORMED > 100`
- **Fix:** Set `DEPARTURES_SCHEDULED = DEPARTURES_PERFORMED`
- **Rationale:** A ratio above 100× is physically impossible — even extreme cancellation events produce ratios under 10×

**b) Charter carrier DEPARTURES_SCHEDULED outliers (Segment only)**

Class P (non-scheduled civilian) and Class L (charter) carriers should generally report `DEPARTURES_SCHEDULED = 0` (99.4% do). A small number report implausibly high values.

- **Detection:** `CLASS IN ('P', 'L')` AND `DEPARTURES_PERFORMED > 0` AND `DEPARTURES_SCHEDULED / DEPARTURES_PERFORMED > 10`
- **Fix:** Set `DEPARTURES_SCHEDULED = DEPARTURES_PERFORMED`
- **Why a separate rule:** The 10–100× ratio range for mainstream scheduled carriers (Class F) contains many legitimate entries (route startups, COVID cancellations, aircraft substitutions). Lowering the general threshold would incorrectly erase valid data.

**c) PASSENGERS exceeding SEATS (Segment only)**

A small number of segment rows report more passengers than available seats — a reporting error.

- **Detection:** `PASSENGERS > SEATS` AND `SEATS > 0`
- **Fix:** Cap `PASSENGERS` at `SEATS`
- **Scope:** Segment data only (Market data has no SEATS column)

### 8.4 Phase 3: Deletes (Unreliable Data Removal)

**Airport ID 16706 (Austin, TX):** An unidentifiable facility — not Austin-Bergstrom (AUS), not Austin Executive (EDC), not any other known Austin airport. Only 2 market rows and 4 segment rows, all charter data from one or two carriers. Deleted as unreliable.

### 8.5 Phase 4: Filters (Row Exclusion)

These rules remove rows that are technically valid BTS records but represent no meaningful air connectivity for our analysis.

**a) Self-flights (ORIGIN = DEST)**

Rows where origin and destination are the same airport (e.g., DFW→DFW). These represent maintenance repositioning, training flights, or data entry artifacts.

- Market: 237 rows removed
- Segment: 316 rows removed

**b) All-zero activity rows (PASSENGERS=0, FREIGHT=0, MAIL=0)**

Rows where all three traffic metrics are zero simultaneously. These represent codeshare placeholders, route authorization filings, or empty repositioning flights.

- Market: ~11,900 rows removed (11.2% of raw extract)
- Segment: ~14,600 rows removed (13.4% of raw extract)

For segment data, these all-zero rows may still have nonzero operational fields (departures, seats, payload) — these are real flights that were operated but carried no commercial traffic. They are excluded because this project defines route activity by traffic movement.

**c) Exact duplicate rows**

Safety net filter using pandas `drop_duplicates()`. As of the current extract, no exact duplicates exist — the rule is a precaution for future extracts or expanded year ranges.

### 8.6 Phase 5: State Name Fill

BTS does not populate state/province names for international airports. Approximately 12% of rows in both datasets have blank `ORIGIN_STATE_NM` or `DEST_STATE_NM`.

**Solution:** A hand-verified lookup table (`Database/data-cleaning/missing-states.csv`) maps 460 unique international airport+city combinations to their correct state, province, or administrative region.

- Format: `Airport,City-Name,State-Name`
- Coverage: 100+ countries, all entries verified
- Mexican airports use official state names (e.g., Quintana Roo, Jalisco, Nuevo León)
- Other countries use appropriate administrative divisions (German Bundesländer, French régions, Japanese prefectures, etc.)
- Every airport code + city name combination maps to exactly one state — no ambiguous lookups

The fill is applied to both origin and destination state columns, using a merge-on-key approach. After filling, only a handful of null states remain (airports with no matching entry in the lookup — typically very small or recently opened facilities).

### 8.7 Phase 6: Re-Aggregation

After code and city name updates (Phase 1), some rows that previously had different keys may now share identical descriptor columns. For example, after changing NLU's city name from "Zumpango, Mexico" to "Mexico City, Mexico", two rows for the same carrier/route/year/class that previously differed only in city name would become semantic duplicates.

The re-aggregation step collapses these duplicates by summing their metric columns (PASSENGERS, FREIGHT, MAIL, etc.) while keeping the descriptor columns as the group key. This ensures the output has one row per unique combination of descriptors.

- Market: typically ~5 duplicate groups collapsed
- Segment: typically ~6 duplicate groups collapsed

### 8.8 GeoJSON Cleaning (5 Phases)

The Airport GeoJSON goes through its own parallel cleaning process within the same script. The GeoJSON is sourced from the BTS Airport Master List, which contains time-versioned entries — multiple features per airport tracking name, code, and coordinate changes over time.

**Phase 1: Filter to Latest Records**

The raw GeoJSON contains ~4,981 features but only ~1,354 unique AIRPORT_IDs. Each airport has an average of 3.68 features. Only the entry with `AIRPORT_IS_LATEST = 1` represents the current, active version of each airport.

- **Action:** Keep only features where `AIRPORT_IS_LATEST = 1`
- **Result:** 4,981 → 1,354 features

**Phase 2: Apply Updates (Code & Name Fixes)**

The same code and name update rules that apply to CSVs are also applied to GeoJSON features where the rule's `target` is `geojson` or `all`.

- Code corrections: T4X → AQO (Llano, TX), XJD → IUD (Al Udeid AB, Qatar)
- The XJD → IUD correction is GeoJSON-specific: Airport ID 15968 (Al Udeid Air Base) has code `XJD` in the Airport Master List but appears as `IUD` in the BTS Market and Segment data

**Phase 3: Apply Deletes**

Remove features for airports flagged for deletion in the cleaning rules.

- Airport ID 16706 (unidentifiable Austin, TX facility) — all versions removed

**Phase 4: Scope to Corrected CSV Airport IDs**

After CSV cleaning, some airports are only referenced in rows that were deleted or filtered out. These orphan airports are removed from the GeoJSON.

- **Action:** Keep only AIRPORT_IDs present in the union of cleaned Market and Segment CSVs
- **Result:** 1,354 → 1,275 features (79 orphan airports removed)

**Phase 5: Strip to Essential Properties**

The raw Airport Master List contains many attributes not needed for the final output. The GeoJSON is stripped to just 4 essential fields:

| Raw Property | Output Property | Description |
|---|---|---|
| AIRPORT | AIRPORT | Airport code (IATA or FAA LID) |
| DISPLAY_AIRPORT_NAME | AIRPORT_NAME | Full airport name |
| LATITUDE | LATITUDE | Decimal latitude |
| LONGITUDE | LONGITUDE | Decimal longitude |

All other properties (AIRPORT_ID, IS_LATEST, state, country, ICAO codes, etc.) are removed from the final GeoJSON to minimize file size. The airport code serves as the join key to the CSV data.

---

## 9. Detailed Data Quality Report & Cleaning Rules

This section provides the complete, detailed documentation of every data quality issue found in the BTS T-100 data, the investigation behind each finding, the decision rationale, and the exact correction applied. This is the authoritative reference for understanding why the data was modified.

**Applies to:**
- `03_Process_Data/BTS/BTS_T-100_Market_2015-2024.csv` (106,218 raw → 94,115 cleaned rows)
- `03_Process_Data/BTS/BTS_T-100_Segment_2015-2024.csv` (108,964 raw → 94,228 cleaned rows)
- `03_Process_Data/BTS/BTS_T-100_Airports_2015-2024.geojson` (4,981 raw → 1,275 cleaned features)

**Common observations (both datasets):**
- No exact duplicate rows found in either raw extract
- No negative values in any numeric column
- Year distribution is complete (2015–2024) with no gaps (2020 lowest due to COVID)
- Country names are consistent with no misspellings

### 9.1 Issues Corrected

These issues are addressed via `data-cleaning.csv` and the lookup file `missing-states.csv`.

#### 9.1.1 Missing State Names

**Anomaly:**
`ORIGIN_STATE_NM` and `DEST_STATE_NM` are blank for approximately 12% of rows in both datasets. All missing values correspond to international (non-US) airports. BTS does not populate state/province names for airports outside the United States.

| Dataset | ORIGIN_STATE_NM Missing | DEST_STATE_NM Missing |
|---|---|---|
| Market | 13,124 (12.36%) | 13,217 (12.44%) |
| Segment | 13,431 (12.33%) | 12,860 (11.80%) |

**Interpretation:**
The state/province information is valuable for analysis, particularly for Mexican airports which are a key focus of this project. Without it, analysts cannot filter or group by Mexican states (e.g., "show me all routes to Quintana Roo" or "compare traffic to Nuevo León vs. Jalisco").

**Correction:**
A lookup file `missing-states.csv` was created with 460 entries covering every unique international airport–city combination across both datasets. The file maps each `(Airport, City-Name)` pair to its `State-Name`.

- Format: `Airport,City-Name,State-Name`
- Coverage: 100+ countries, all entries manually verified
- Mexican airports use official Mexican state names (e.g., Quintana Roo, Jalisco, Nuevo León)
- Other countries use the appropriate administrative division (e.g., German Bundesländer, French régions, Japanese prefectures)

**Ambiguity check:** Every airport code + city name combination maps to exactly one state. No ambiguous lookups were found.

#### 9.1.2 NLU City Name Standardization

**Anomaly:**
Airport ID 16852 (NLU — Felipe Ángeles International Airport) appears with two different city names:
- `"Zumpango, Mexico"` — Market: 20 rows; Segment: 22 rows (11 origin + 11 dest)
- `"Mexico City, Mexico"` — remaining rows (2023–2024)

The airport opened in March 2022 in Zumpango, Estado de México. BTS initially labeled it as Zumpango, then changed the label to Mexico City partway through 2023.

**Interpretation:**
Per project advisor (Jolanda) recommendation, the airport is located very close to Mexico City and functionally serves the city, so using "Mexico City" is the most appropriate and consistent reference. The BTS data itself transitioned to this label in 2023.

**Correction:**
Change all `ORIGIN_CITY_NAME` and `DEST_CITY_NAME` values from `"Zumpango, Mexico"` to `"Mexico City, Mexico"` where Airport ID = 16852. The state remains `Estado de Mexico` in both cases.

| Field | Old Value | New Value |
|---|---|---|
| City Name | Zumpango, Mexico | Mexico City, Mexico |
| Airport Code | NLU | NLU (no change) |
| Airport ID | 16852 | 16852 (no change) |

Affected rows: Market 20, Segment 22

#### 9.1.3 Airport Code Updates (Same Airport ID, Multiple Codes)

BTS uses Airport ID as the true unique identifier for an airport. Over time, the FAA or IATA code assigned to an airport can change. In these cases, the Airport ID remains stable but the code column shows different values across years. The correction standardizes all rows to the most current code.

**a) Airport ID 12544 — Concord, NC (Concord-Padgett Regional Airport)**

Two codes appear for the same Airport ID:
- `JQF` — 24 rows (2015–2016) in both datasets
- `USA` — remaining rows (2017–2024)

JQF is the FAA Location Identifier (LID). USA is the IATA code. BTS switched from reporting the FAA LID to the IATA code starting in 2017. Both refer to the same physical airport.

**Correction:** Change `JQF` to `USA` for all rows where Airport ID = 12544.
Affected rows: Market 24, Segment 24

**b) Airport ID 13788 — Jacksonville, FL (Cecil Airport)**

Two codes appear:
- `NZC` — 1 row (2015) in both datasets
- `VQQ` — remaining rows (2018–2022)

NZC was the code for Naval Air Station Cecil Field, which closed in 1999 and was converted to the civilian Cecil Airport. The FAA reassigned the code to VQQ. The NZC code is now used for a different airport in Maria Reiche, Peru.

**Correction:** Change `NZC` to `VQQ` for all rows where Airport ID = 13788.
Affected rows: Market 1, Segment 1

**c) Airport ID 16658 — Gainesville, TX (Gainesville Municipal Airport)**

Two codes appear:
- `T1X` — Market: 4 rows (2018–2019); Segment: 6 rows (2015, 2018–2019)
- `GLE` — 2 rows (2021) in both datasets

T1X was a temporary or internal BTS code. The current FAA LID and recognized code is GLE (ICAO: KGLE).

**Correction:** Change `T1X` to `GLE` for all rows where Airport ID = 16658.
Affected rows: Market 4, Segment 6

**d) Airport ID 15081 — Berlin, Germany (Berlin Brandenburg Airport)**

Two codes appear in the Segment dataset only:
- `SXF` — 1 row (2016) as destination
- `BER` — remaining rows (2023–2024)

The Market dataset only contains `BER` for this Airport ID.

Berlin Schönefeld Airport (SXF) was absorbed into the new Berlin Brandenburg Airport (BER) when it opened in October 2020. BTS updated the code from SXF to BER. The single SXF row is a legacy entry from before the transition.

**Correction:** Change `SXF` to `BER` for all rows where Airport ID = 15081.
Affected rows: Market 0, Segment 1

#### 9.1.4 T4X Code Conflict (Same Code, Multiple Airport IDs)

**Anomaly:**
The code `T4X` is shared by two different Airport IDs pointing to two different cities:
- Airport ID 16706 — `"Austin, TX"` — Market: 2 rows (2018); Segment: 4 rows (2016, 2018)
- Airport ID 16879 — `"Llano, TX"` — 49 rows (2020–2024) in both datasets

T4X is not a recognized FAA or IATA code for either airport.

**a) Airport ID 16879 — Llano, TX (Llano Municipal Airport)**

This is Llano Municipal Airport, whose real FAA LID is AQO (ICAO: KAQO, formerly 6R9). The T4X code should be corrected to AQO.

**Correction:** Change `T4X` to `AQO` for all rows where Airport ID = 16879.
Affected rows: Market 49, Segment 49

**b) Airport ID 16706 — Austin, TX (Unidentifiable Facility)**

This is an unidentifiable facility — only charter data from one or two carriers. It does not correspond to any known Austin airport (AUS, EDC, or others). These rows are deleted as unreliable data.

**Correction:** Delete all rows where Airport ID = 16706.
Affected rows: Market 2, Segment 4

#### 9.1.5 DEPARTURES_SCHEDULED Outliers (Segment Only)

**Anomaly:**
A handful of segment rows have `DEPARTURES_SCHEDULED` values that are orders of magnitude larger than `DEPARTURES_PERFORMED`, clearly indicating data entry errors (extra digits or miskeyed values).

**Known examples (from the full BTS database, all years):**

| Carrier | Route | Year/Month | DEPARTURES_SCHEDULED | DEPARTURES_PERFORMED | Likely Cause |
|---|---|---|---|---|---|
| Peninsula Airways | ANC→CDB | 2003/02 | 84,538 | 43 | Extra digits |
| Spirit | ISP→TPA | 1999/04 | 65,720 | 20 | Extra digits |
| TEM Enterprises | AUS→CUN | 2004/04 | 1,113 | 8 | Typo/miskeyed |

These are rare but would skew any analysis using `DEPARTURES_SCHEDULED` as a denominator (e.g., schedule reliability, completion rates).

**Detection rule:** Rows where `DEPARTURES_PERFORMED > 0` and `DEPARTURES_SCHEDULED / DEPARTURES_PERFORMED > 100`. A ratio above 100 is physically impossible — even extreme cancellation events (COVID, weather) produce ratios under 10.

**Correction:** Set `DEPARTURES_SCHEDULED = DEPARTURES_PERFORMED` for affected rows. The assumption is that the scheduled count was a data entry error and the performed count is reliable.

> **In the current 2015–2024 extract:** All 16 rows matching ratio > 100 belong to **Kalitta Charters II** (Class P, years 2015 and 2017). These same rows are also caught by the charter-specific ratio > 10 rule in Section 9.1.6 — the general rule fires first, so in practice the two rules overlap on these 16 rows.

#### 9.1.6 DEPARTURES_SCHEDULED Charter Carrier Outliers (Segment Only)

**Anomaly:**
Class P (non-scheduled civilian) and Class L (charter) carriers should not report scheduled departures — 99.4% of Class P rows correctly have `DEPARTURES_SCHEDULED = 0`. However, a small number of charter carrier rows report non-zero `DEPARTURES_SCHEDULED` with implausibly high ratios to `DEPARTURES_PERFORMED`, showing the same systematic data entry error pattern as the >100× outliers in Section 9.1.5.

**Affected carriers (in the 2015–2024 extract):**

| Carrier | Class | Rows | Ratio Range | Passengers | Freight (lbs) |
|---|---|---|---|---|---|
| Kalitta Charters II | P | ~22 | 40–95× | 0 | 561,541 |
| Planet Airways | L | ~10 | 44–85× | 983 | 0 |

These are freight-only charter operators (Kalitta) and defunct charter carriers (Planet Airways, ceased 2004) where the `DEPARTURES_SCHEDULED` values are clearly misreported. The ratio range of 10–100× sits just below the general >100× threshold but exhibits the same implausible pattern.

**Why a targeted rule instead of lowering the general threshold:**
The 10–100× ratio range for mainstream Class F carriers (392 total rows) contains many legitimate entries — route startups, COVID-era cancellations, aircraft type substitutions on codeshare routes (Comair, ExpressJet). BTS_SEGMENT is split by aircraft type, so a route served by multiple aircraft types can show high ratios per type while the route-level ratio is normal. Lowering the general threshold to 10× would incorrectly erase valid schedule data for these carriers.

**Detection rule:** Rows where `CLASS IN ('P', 'L')` and `DEPARTURES_PERFORMED > 0` and `DEPARTURES_SCHEDULED / DEPARTURES_PERFORMED > 10`.

**Correction:** Set `DEPARTURES_SCHEDULED = DEPARTURES_PERFORMED` for affected rows. Applied after the general >100× correction (Section 9.1.5) to avoid double-counting.

#### 9.1.7 PASSENGERS Exceeding SEATS (Segment Only)

**Anomaly:**
A small number of segment rows report `PASSENGERS > SEATS` where `SEATS > 0`. These are reporting errors — passengers cannot exceed available seat capacity.

**Detection rule:** Rows where `PASSENGERS > SEATS` and `SEATS > 0`.

**Correction:** Cap `PASSENGERS` at `SEATS` for affected rows. Only applies to segment data (market data does not have a SEATS column).

#### 9.1.8 T8X City Name Correction (McKinney, TX)

**Anomaly:**
Airport ID 16755 (T8X — Collin County Regional Airport at McKinney) is labeled `"Dallas, TX"` by BTS, but the airport is located in McKinney, TX (~35 miles north of Dallas).

**Correction:** Change all `ORIGIN_CITY_NAME` and `DEST_CITY_NAME` values from `"Dallas, TX"` to `"McKinney, TX"` where Airport ID = 16755.

| Field | Old Value | New Value |
|---|---|---|
| City Name | Dallas, TX | McKinney, TX |

Affected rows: Market 46, Segment 47

> **Context:** T8X is one of seven T-prefix FAA LID codes for small Texas airports in the data (see Section 9.4.6). It is the only one with a factual city-name error — the others have correct city labels. T8X is also the most active of the group, with charter passenger service and cargo operations (Ameristar Air Cargo) spanning 2019–2025.

### 9.2 Issues Filtered Out

These rows are not corrected but are excluded during cleaning because they do not represent meaningful air connectivity.

#### 9.2.1 Self-Flight Rows (Same Origin and Destination)

**Anomaly:** Rows where origin and destination airport are identical (ORIGIN = DEST, e.g., DFW→DFW, AUS→AUS).

| | Market | Segment |
|---|---|---|
| Total self-flight rows | 237 | 316 |
| By class F (Scheduled) | 35 | 84 |
| By class G (All-Cargo) | 26 | 27 |
| By class L (Charter) | 90 | 86 |
| By class P (Non-scheduled) | 86 | 119 |
| With passengers > 0 | 70 | 61 |

**Interpretation:** These are not real routes. They likely represent maintenance repositioning, training flights, test flights, or data entry artifacts. Even those with passengers > 0 are anomalous since a flight from an airport to itself carries no meaningful traffic data.

**Action:** Filter out during cleaning. Tagged in `data-cleaning.csv` as `Action = filter`, `Correction_Type = Zero_Distance`.

#### 9.2.2 All-Zero Activity Rows

**Anomaly:** Rows where `PASSENGERS = 0`, `FREIGHT = 0`, and `MAIL = 0` simultaneously.

| | Market | Segment |
|---|---|---|
| Total all-zero rows | 11,921 (11.2%) | 14,552 (13.4%) |
| By class L (Charter) | 6,161 | 7,873 |
| By class F (Scheduled) | 3,296 | 2,243 |
| By class P (Non-scheduled) | 2,409 | 4,333 |
| By class G (All-Cargo) | 55 | 103 |
| By source DU | 8,855 | 11,638 |
| By source IU | 3,066 | 2,412 |

**Interpretation:** These rows represent routes with no reported traffic activity — likely codeshare placeholders, route authorization filings, empty repositioning flights, or inactive route records.

For this project, route activity is defined by traffic movement (PASSENGERS, FREIGHT, MAIL). If all three are zero, the row is excluded even when operational fields (for segment data) are nonzero.

**Overlap with self-flights:**
The self-flight rows (Section 9.2.1) partially overlap with all-zero rows. Unique rows to filter:
- **Market:** 11,921 (all-zero) + 70 (self-flights with activity) = **11,991 unique rows**
- **Segment:** 14,552 (all-zero) + 175 (self-flights with activity) = **14,727 unique rows**

**Repositioning & Empty Flights (Segment Detail):**

Of the 14,411 all-zero segment rows (excluding self-flights), **14,221 had DEPARTURES_PERFORMED > 0** — meaning real flights were operated but carried no commercial traffic. These are repositioning (ferry) flights, empty cargo returns, and charter deadhead legs. The remaining 190 rows had zero departures and represent pure filing placeholders.

Aggregate operational totals (operated empty flights):

| Metric | Total |
|---|---|
| Records | 14,221 |
| Departures performed | 28,487 |
| Departures scheduled | 3,613 |
| Seats | 2,448,772 |
| Payload capacity | ~1.3 billion lbs |

Breakdown by service class:

| Class | Records | Departures | Seats | Payload (lbs) |
|---|---|---|---|---|
| L — Charter | 7,768 (54.6%) | 15,093 | 2,211,643 | 658,513,260 |
| P — Non-scheduled | 4,293 (30.2%) | 9,427 | 4,207 | 521,549,680 |
| F — Scheduled | 2,065 (14.5%) | 3,594 | 232,106 | 59,033,883 |
| G — All-cargo | 95 (0.7%) | 373 | 816 | 58,438,084 |

Charter repositioning (Class L) dominates, led by Caribbean Sun Airlines running empty return legs on BRO–AEX and BRO–Central America routes with 155-seat aircraft. Non-scheduled cargo (Class P) includes operators like USA Jet Airlines, Kalitta Charters, and Gulf & Caribbean Cargo running cross-border freight routes.

**Cross-border context (TX ↔ Mexico):**

In addition to the flights carrying cargo between Texas and Mexico included in the cleaned dataset, **1,748 repositioning and empty cargo departures** were operated on TX–Mexico routes (741 route-carrier-year records, 2015–2024). Notable operators:

| Route | Carrier | Year | Departures | Payload (lbs) |
|---|---|---|---|---|
| NLU→IAH | Turkish Airlines | 2024 | 72 | 16,158,384 |
| MEX→IAH | Turkish Airlines | 2023 | 70 | 15,709,540 |
| BJX→LRD | USA Jet Airlines | 2022 | 45 | 1,509,700 |
| HMO→ELP | USA Jet Airlines | 2022 | 37 | 1,058,200 |
| BJX→LRD | USA Jet Airlines | 2021 | 28 | 1,299,500 |
| ADS→QRO | Ameristar Air Cargo | 2022 | 24 | 511,440 |

These flights highlight existing cross-border air cargo infrastructure that operates even on return legs with no commercial load. They are excluded from the cleaned output because they do not represent actual connectivity (no passengers or goods moved), but they demonstrate the scope of operational capacity on these corridors.

**Why market data also has all-zero rows (11,860 rows):**

Market data has no departure columns — only PASSENGERS, FREIGHT, MAIL. A zero-activity market row means a carrier filed a route/class/year but reported zero traffic moved end-to-end. Cross-referencing with segment data reveals three scenarios:

| Scenario | Approx. % | Explanation |
|---|---|---|
| Segment also zero traffic | ~57% | Route filed/authorized but never carried commercial traffic |
| Segment HAS traffic | ~24% | Multi-leg journeys where segments were active but the market O-D pair itself had no through-traffic |
| No segment match at all | ~19% | Reporting artifacts — carrier filed market data without corresponding segment records |

The 24% with segment traffic reflects how BTS market data counts passengers at the journey level: if a plane flew a leg empty but that leg was part of a larger routing, the market row for that specific O-D pair shows zero.

#### 9.2.3 Exact Duplicate Rows

**Anomaly:** Rows where every column is identical to another row — data artifacts from the extraction or BTS source.

**Action:** Filter out using pandas `drop_duplicates()`. As of the current extract, **no exact duplicates were found in either dataset** — the rule is a safety net for future extracts or expanded year ranges.

### 9.3 Issues Acknowledged but Not Corrected

#### 9.3.1 Missing Carrier Names (2015 Charter Flights)

**Anomaly:** 27 rows have a blank `CARRIER_NAME` in both datasets (identical rows). All 27 share the same characteristics:
- Year: 2015
- Class: L (charter)
- Zero freight and mail across all rows
- 25 of the 27 rows have passengers > 0

**Route pattern:** The routes connect military-adjacent airports (AEX/Fort Polk, CSG/Fort Benning, ELP/Fort Bliss, TOL/Camp Perry) with Texas border cities (BRO/Brownsville, LRD/Laredo) and Central American destinations (GUA/Guatemala City, SAL/San Salvador, SAP/San Pedro Sula, MID/Mérida). This suggests a government or military charter operation.

**All 27 affected routes:**

| Origin | Destination | Passengers |
|---|---|---|
| AEX | AFW | 0 |
| AEX | BRO | 1,789 |
| AEX | DAL | 505 |
| AEX | ELP | 668 |
| AEX | IAH | 389 |
| AEX | MID | 100 |
| AFW | JQF | 252 |
| BRO | AEX | 158 |
| BRO | GUA | 442 |
| BRO | MIA | 692 |
| CLL | COU | 43 |
| COU | CLL | 43 |
| CSG | BRO | 260 |
| CSG | IAH | 875 |
| DAL | SAL | 838 |
| ELP | AEX | 119 |
| EWR | BRO | 129 |
| IAH | GUA | 832 |
| IAH | MID | 82 |
| IAH | SAL | 603 |
| IAH | SAP | 819 |
| LRD | AEX | 1,022 |
| MIA | BRO | 15 |
| MIA | IAH | 25 |
| MIA | MID | 0 |
| MID | MIA | 0 |
| TOL | LRD | 1,040 |

**Investigation:** We attempted to identify the carrier by cross-referencing other Class L carriers on the same routes in 2015. Multiple charter carriers already have named rows on these routes — the top matches were:
- Caribbean Sun Airlines / World Atlantic Airlines (present on 18 of 27 routes)
- Swift Air (present on 12 of 27 routes)
- Falcon Air Express, XTRA Airways (present on 4 each)

However, since these carriers already have their own named rows on the same routes, the missing-carrier rows represent an *additional* operator. Without further data, we cannot reliably identify which carrier this is.

**Decision:** No correction applied. The 27 rows (< 0.03% of either dataset) are left as-is with blank carrier names. The rows still contain valid route, passenger, and distance data that can be used in analysis. Only carrier-level breakdowns would be affected.

### 9.4 Known Anomalies (No Action Required)

These are data quirks observed during the audit that do not require correction or filtering because they do not affect the analysis at the chosen level of aggregation.

#### 9.4.1 Aeromexico VSA→IAH Cumulative Filing (2004/09)

**Anomaly (in BTS_SEGMENT):** A single record for Aeromexico on the VSA (Minatitlán, Mexico) → IAH (Houston, TX) route in September 2004 reports 1,461 departures performed and ~108,000 passengers in one month. This is the only record for this carrier-route combination in 2004.

**Interpretation:** The values are consistent with a full year of operations compressed into a single monthly filing — a cumulative or catch-up report rather than actual September activity. BTS carriers occasionally file accumulated data in a single month when prior months were missed or delayed.

**Why no action is needed:** Since this project aggregates data at the **yearly** level, the annual totals for 2004 remain correct regardless of which month the data was filed under. The anomaly would only distort monthly or seasonal analysis.

#### 9.4.2 BTS_SEGMENT Record Granularity (Split by Aircraft Type)

**Anomaly:** BTS_SEGMENT data is split by **aircraft type** within each carrier/route/month combination. For example, American Airlines (AA) DFW→MEX in January 2023 has two rows: one for aircraft type 698 (9 departures) and one for aircraft type 614 (109 departures).

**Interpretation:** This is by design, not duplication. BTS reports segment-level statistics per aircraft type, so a single carrier operating multiple aircraft types on the same route in the same month will produce multiple rows. Summing across aircraft types gives the correct route-level totals.

**Why no action is needed:** The extraction scripts already aggregate across aircraft types when rolling up to yearly totals. This note is recorded so that analysts working with the raw monthly data or the source database understand why multiple rows may appear for what looks like the same carrier-route-month.

#### 9.4.3 Performed > Scheduled (Within Valid Range)

**Anomaly (in BTS_SEGMENT raw extract):** Some rows have `DEPARTURES_PERFORMED > DEPARTURES_SCHEDULED` even when scheduled > 0.

Current profile (2015–2024 extract):
- `performed > scheduled` (where scheduled > 0): 1,417 rows
- High-ratio tail (`performed/scheduled >= 5`): 10 rows

**Why no action is needed:** Most cases are modest deviations and are treated as operational/reporting variance. Only extreme scheduled-outlier cases (scheduled/performed > 100) are corrected.

#### 9.4.4 PASSENGERS > 0 with SEATS = 0 (Class P Edge Case)

**Anomaly (in BTS_SEGMENT raw extract):** A very small number of rows report `PASSENGERS > 0` while `SEATS = 0`, all in `CLASS = P`.

Current profile: 4 rows where `PASSENGERS > 0 & SEATS = 0 & DEPARTURES_PERFORMED > 0`.

**Why no action is needed:** The cases are rare, low-impact, and outside scheduled-service adherence logic. They are tracked as an edge-case anomaly.

#### 9.4.5 Semantic Duplicates After Normalization

**Anomaly (transformation artifact):** After applying code/city standardization updates (for example, NLU city normalization), some rows can collapse into identical descriptor keys while retaining split metric values.

Current profile before re-aggregation:
- Market: 5 duplicate descriptor groups
- Segment: 6 duplicate descriptor groups

**Action in pipeline:** `Apply_Data_Cleaning.py` re-aggregates metrics by descriptor keys after updates/corrections/filters/fill so normalized duplicates are collapsed deterministically (see Section 8.7).

#### 9.4.6 T-Prefix FAA LID Airport Codes (7 Small TX Airports)

**Anomaly:** Seven airport codes beginning with "T" followed by a digit or alphanumeric suffix appear in the data. These are FAA Location Identifiers (FAA LIDs) for small Texas airports that do not have IATA codes.

| Code | Airport ID | Airport Name | City | Activity | Years | Rows (M+S) |
|---|---|---|---|---|---|---|
| T6X | 16745 | Houston Executive | Houston, TX | Charter (151 PAX) | 2016–2024 | 28+30 |
| T8X | 16755 | Collin County Regional | McKinney, TX | Charter + cargo (75 PAX, 25K lbs FRT) | 2019–2025 | 46+47 |
| T82 | 16947 | Gillespie County | Fredericksburg, TX | Charter + FedEx feeder | 2022–2025 | 8+8 |
| T2X | 16694 | Hereford Municipal | Hereford, TX | Charter (10 PAX) | 2015 | 0+2 |
| T3X | 16702 | El Coyote Ranch (private) | Encino, TX | Int'l charter (4 PAX) | 2016 | 2+3 |
| T5X | 16709 | Castroville Municipal | Castroville, TX | FedEx feeder (3,688 lbs FRT) | 2016 | 2+2 |
| T9X | 16785 | Dimmit County | Carrizo Springs, TX | FedEx feeder (2,434 lbs FRT) | 2017 | 2+2 |

Combined: 88 market + 92 segment rows (~250 total passengers and ~33K lbs freight across all 7 airports over 10 years).

**Why no action is needed:**
1. **Valid FAA codes** — Unlike T1X/T4X (Section 9.1.3c/9.1.4), which had dual codes for the same airport ID, these T-codes are the *sole* identifier for their airport ID. There is no "correct" IATA code to normalize to.
2. **Negligible volume** — noise-level data.
3. **Legitimate activity** — all rows are charter, non-scheduled cargo, all-cargo, or commuter. These represent real charter flights, air taxi operations, and FedEx feeder routes.
4. **T8X city name corrected** — the only factual error (BTS labeling McKinney as "Dallas") is addressed in Section 9.1.8.

> **Note for future analysts:** If new T-prefix codes appear in expanded data, check whether they share an Airport ID with an existing IATA/FAA code (like T1X/T4X did). If so, normalize. If the T-code is the sole identifier, leave it as-is.

### 9.5 GeoJSON-Specific Cleaning Details

The airport GeoJSON is sourced from the BTS Airport Master List. It requires cleaning steps beyond the CSV corrections because the master list contains time-versioned entries (multiple features per airport) and some code mismatches.

#### 9.5.1 Filter to Latest Records

**Issue:** The raw GeoJSON contains 4,981 features but only 1,354 unique AIRPORT_IDs. Each airport has multiple time-versioned entries (average 3.68 features per ID) tracking coordinate/name changes over time. Only the `IS_LATEST=1` entry per airport is current.

**Action:** Filter to `AIRPORT_IS_LATEST = 1` only. Result: 4,981 → 1,354 features.

#### 9.5.2 Scope to Corrected CSV Airport IDs

**Issue:** After filtering to latest, 79 airports remain in the GeoJSON that do not appear in the corrected Market or Segment CSVs. These are airports that were only referenced in rows that got deleted or filtered out.

**Action:** Keep only AIRPORT_IDs present in the union of corrected Market and Segment data. Result: 1,354 → 1,275 features.

#### 9.5.3 GeoJSON Code Mismatch (XJD → IUD)

**Anomaly:** Airport ID 15968 (Al Udeid Air Base, Doha, Qatar) has code `XJD` in the Airport Master List but appears as `IUD` in the BTS Market and Segment data.

**Correction:** Change `AIRPORT` from `XJD` to `IUD` for Airport ID 15968 in the GeoJSON.
Affected features: 1

**Additional GeoJSON corrections applied from CSV rules:**
- Airport ID 16879: T4X → AQO (code correction, same as CSV Section 9.1.4a)
- Airport ID 16706: deleted (same as CSV Section 9.1.4b)

### 9.6 Cleaning Summary Table

| # | Issue | Type | Market Rows | Segment Rows | GeoJSON | Action |
|---|---|---|---|---|---|---|
| 9.1.1 | Missing state names | Data gap | ~13,200 | ~13,400 | 436 | Fill via `missing-states.csv` |
| 9.1.2 | NLU city name | Standardization | 20 | 22 | — | Update to "Mexico City, Mexico" |
| 9.1.3a | Concord, NC (JQF → USA) | Code update | 24 | 24 | — | Update code |
| 9.1.3b | Jacksonville, FL (NZC → VQQ) | Code update | 1 | 1 | — | Update code |
| 9.1.3c | Gainesville, TX (T1X → GLE) | Code update | 4 | 6 | — | Update code |
| 9.1.3d | Berlin (SXF → BER) | Code update | 0 | 1 | — | Update code |
| 9.1.4a | Llano, TX (T4X → AQO) | Code update | 49 | 49 | 1 | Update code |
| 9.1.4b | Austin, TX (ID 16706) | Unreliable data | 2 | 4 | 3 | Delete |
| 9.1.5 | DEPARTURES_SCHEDULED outliers | Data entry error | — | ratio > 100 | — | Correct (set = performed) |
| 9.1.6 | Charter DEPARTURES_SCHEDULED outliers | Charter data entry error | — | Class P/L, ratio > 10 | — | Correct (set = performed) |
| 9.1.7 | PASSENGERS exceeding SEATS | Reporting error | — | PAX > SEATS | — | Correct (cap at SEATS) |
| 9.1.8 | T8X city name (Dallas → McKinney) | City name error | 46 | 47 | — | Update city name |
| 9.2.1 | Self-flight rows (ORIGIN=DEST) | Not real routes | 237 | 316 | — | Filter out |
| 9.2.2 | All-zero activity | No activity | 11,921 | 14,552 | — | Filter out |
| 9.2.3 | Exact duplicate rows | Data artifact | 0 | 0 | — | Filter out (safety net) |
| 9.3.1 | Missing carrier names | Unresolvable | 27 | 27 | — | Acknowledged |
| 9.4.3 | Performed > scheduled (sched>0) | Operational variance | — | 1,417 | — | Documented; no correction |
| 9.4.4 | PASSENGERS > 0 with SEATS = 0 | Edge case | — | 4 | — | Documented; monitor |
| 9.4.5 | Semantic duplicates after normalization | Transformation artifact | 5 groups | 6 groups | — | Re-aggregate in cleaner |
| 9.4.6 | T-prefix FAA LID codes (7 small TX airports) | Valid FAA identifiers | 88 | 92 | — | No action; documented |
| 9.5.1 | GeoJSON multi-version | Processing | — | — | 3,627 | Filter to IS_LATEST=1 |
| 9.5.2 | GeoJSON orphan airports | Processing | — | — | 79 | Scope to CSV IDs |
| 9.5.3 | Al Udeid (XJD → IUD) | Code mismatch | — | — | 1 | Update code |

---

## 10. Step 3 — Verification

**Script:** `Verify_Corrections.py`

This script validates that all documented corrections are consistent with the raw data and scans for new issues. It operates on the **raw** intermediate files in `_temp/` (before cleaning), so it can verify that the issues documented in the cleaning rules actually exist in the data.

**Default mode** — runs a comprehensive verification report:
- Checks each documented correction (code updates, city updates, T4X conflict, etc.) against the raw CSVs
- Reports missing state name counts and coverage against the lookup table
- Checks for self-flights, all-zero rows, duplicates, departure outliers
- Validates GeoJSON update/delete rules, IS_LATEST distribution, CSV–GeoJSON alignment
- Scans for NEW issues not yet documented (new multi-code airports, city name inconsistencies, negative values)

**`--auto-update-rules` mode** — additionally detects candidate update rules:
- Scans for airport IDs with multiple codes or city names
- Selects canonical values (most recent year, then frequency as tiebreaker)
- Previews proposed rule additions and asks for confirmation before modifying `data-cleaning.csv`
- Optionally creates a timestamped backup of the rules file
- Writes an audit report to `Database/data-cleaning/auto-correction-audit.md`

**`--scan-only` mode** — runs only the auto-update scan (skips verification report)

**Safety features:**
- Preview-before-write for all proposed changes
- Optional timestamped backup of `data-cleaning.csv`
- Write-to-temp-then-rename for safe file modification
- Cross-references null-state data against `missing-states.csv` to warn about uncovered pairs
- Reminder to update `data-cleaning.md` after rule changes

---

## 11. Final Output Files (Process Data)

The cleaned, analysis-ready files are written to `03_Process_Data/BTS/`.

### 11.1 Market CSV — Column Definitions

**File:** `BTS_T-100_Market_2015-2024.csv`

| # | Column | Type | Description | Example |
|---|---|---|---|---|
| 1 | YEAR | Integer | Reporting year | 2023 |
| 2 | ORIGIN_AIRPORT_ID | Integer | BTS unique identifier for origin airport (stable across code changes) | 11298 |
| 3 | ORIGIN | String | Origin airport code (IATA 3-letter code or FAA LID) | DFW |
| 4 | ORIGIN_CITY_NAME | String | Origin city and state/country | Dallas/Fort Worth, TX |
| 5 | ORIGIN_STATE_NM | String | Origin state, province, or administrative region (filled for international airports) | Texas |
| 6 | ORIGIN_COUNTRY_NAME | String | Origin country name | United States |
| 7 | DEST_AIRPORT_ID | Integer | BTS unique identifier for destination airport | 12266 |
| 8 | DEST | String | Destination airport code | CUN |
| 9 | DEST_CITY_NAME | String | Destination city and state/country | Cancun, Mexico |
| 10 | DEST_STATE_NM | String | Destination state/province/region | Quintana Roo |
| 11 | DEST_COUNTRY_NAME | String | Destination country name | Mexico |
| 12 | CARRIER_NAME | String | Airline name (may be blank for 27 unidentified charter rows) | American Airlines Inc. |
| 13 | CLASS | String | Service class code (see Section 10.3) | F |
| 14 | PASSENGERS | Integer | Annual enplaned passenger count (origin-to-destination) | 145230 |
| 15 | FREIGHT | Integer | Annual freight enplaned, in pounds | 2340567 |
| 16 | MAIL | Integer | Annual mail enplaned, in pounds | 15420 |
| 17 | DATA_SOURCE | String | Two-character BTS reporting source (see Section 10.4) | DU |

**Each row represents:** One airline's annual traffic on one origin→destination market, for one service class and data source combination.

### 11.2 Segment CSV — Column Definitions

**File:** `BTS_T-100_Segment_2015-2024.csv`

Contains all 17 columns from the Market CSV (same definitions), plus 4 additional operational columns:

| # | Column | Type | Description | Example |
|---|---|---|---|---|
| 14 | DEPARTURES_SCHEDULED | Integer | Annual number of departures the carrier was authorized/scheduled to operate on this segment | 365 |
| 15 | DEPARTURES_PERFORMED | Integer | Annual number of departures actually operated | 358 |
| 16 | PAYLOAD | Integer | Annual total payload capacity, in pounds (weight the aircraft can carry including passengers, bags, freight, mail) | 12500000 |
| 17 | SEATS | Integer | Annual total available seats on all departures | 65700 |
| 18 | PASSENGERS | Integer | Annual passengers transported on this segment (counted each leg) | 58430 |
| 19 | FREIGHT | Integer | Annual freight transported, in pounds | 1870000 |
| 20 | MAIL | Integer | Annual mail transported, in pounds | 9800 |
| 21 | DATA_SOURCE | String | Two-character BTS reporting source | IU |

**Each row represents:** One airline's annual operations on one flight segment (origin→destination), for one service class and data source combination.

**Important note on DEPARTURES_SCHEDULED:**
- Foreign carriers (`DATA_SOURCE` = IF or DF) do not report scheduled departures — the value is always 0. This is a BTS reporting convention, not missing data.
- Charter/non-scheduled carriers (`CLASS` = L or P) have no scheduled departures by definition — 99.4% correctly report 0.

### 11.3 Airport GeoJSON — Structure & Properties

**File:** `BTS_T-100_Airports_2015-2024.geojson`

A standard GeoJSON FeatureCollection containing Point features for each airport referenced in the cleaned Market and Segment CSVs.

**Feature properties (after cleaning):**

| Property | Type | Description | Example |
|---|---|---|---|
| AIRPORT | String | Airport code (IATA or FAA LID) — join key to CSV data | DFW |
| AIRPORT_NAME | String | Full airport display name | Dallas/Fort Worth International |
| LATITUDE | Float | Decimal latitude (WGS 84) | 32.896828 |
| LONGITUDE | Float | Decimal longitude (WGS 84) | -97.037997 |

**Geometry:** Point (longitude, latitude) in EPSG:4326 (WGS 84)

**Feature count:** 1,275 airports after cleaning

**Usage:** The GeoJSON provides airport display names and geographic coordinates for mapping and spatial analysis. The `AIRPORT` code is the join key linking GeoJSON features to rows in the Market and Segment CSVs. All other airport data (traffic, carriers, routes) comes from the CSVs.

### 11.4 CLASS Values (Service Class)

| Code | Name | Description |
|---|---|---|
| F | Scheduled | Regular scheduled airline service — the majority of commercial flights |
| G | All-Cargo | Dedicated cargo aircraft operations (FedEx, UPS, DHL, etc.) |
| L | Charter | Charter flights — ad-hoc service not on a regular schedule |
| P | Non-Scheduled Civilian | Non-scheduled service including air taxi, commuter charters, and non-scheduled cargo |

### 11.5 DATA_SOURCE Values

The DATA_SOURCE column is a two-character code that encodes two dimensions:

**First character — Route type:**
- `D` = Domestic route (both endpoints in the United States)
- `I` = International route (at least one endpoint outside the United States)

**Second character — Carrier nationality:**
- `U` = U.S. carrier (holds a U.S. DOT certificate)
- `F` = Foreign carrier (foreign-flag airline operating to/from the U.S.)

| Code | Meaning | Example |
|---|---|---|
| DU | Domestic route, U.S. carrier | American Airlines: DFW → IAH |
| IU | International route, U.S. carrier | United Airlines: IAH → MEX |
| DF | Domestic route, foreign carrier | (Rare — foreign carriers on domestic U.S. legs) |
| IF | International route, foreign carrier | Aeromexico: MEX → DFW |

**Key implication:** Foreign carriers (DATA_SOURCE ending in `F`) do not report `DEPARTURES_SCHEDULED` — that field is always 0 for IF and DF records.

### 11.6 Output Statistics

| Metric | Market | Segment |
|---|---|---|
| Raw extracted rows | ~106,000 | ~109,000 |
| Cleaned output rows | ~94,000 | ~94,000 |
| Rows removed by cleaning | ~12,000 | ~15,000 |
| Columns | 17 | 21 |
| Year range | 2015–2024 | 2015–2024 |
| Unique airports | ~1,275 | ~1,275 |

---

## 12. Known Data Characteristics

These are patterns in the data that may look unusual but are **not errors**. Understanding them prevents misinterpretation.

### 12.1 Foreign Carriers Report Zero Scheduled Departures

All `DATA_SOURCE = IF` or `DF` records have `DEPARTURES_SCHEDULED = 0`. This is because foreign carriers report to BTS under different rules and are not required to provide schedule data. Their `DEPARTURES_PERFORMED` values are reliable.

### 12.2 Charter/Non-Scheduled Carriers Have No Scheduled Departures

`CLASS = L` (charter) and `CLASS = P` (non-scheduled) services are by definition not scheduled. 99.4% of Class P rows correctly report `DEPARTURES_SCHEDULED = 0`. The small number with nonzero values are data entry errors that the pipeline corrects (see Section 8.3b).

### 12.3 Segment Data Was Originally Split by Aircraft Type

In the raw BTS database, segment data has separate rows for each aircraft type used on a route. For example, American Airlines operating DFW→MEX with both Boeing 737s and Airbus A321s in January would have two rows. Our extraction aggregates across aircraft types to produce one row per carrier/route/year/class/source — but this is why the raw segment table has more records than market.

### 12.4 Performed > Scheduled is Normal (Within Reason)

About 1,400 segment rows have `DEPARTURES_PERFORMED > DEPARTURES_SCHEDULED`. Small deviations are normal (extra sections, demand-driven additions). Only extreme outliers (>100× ratio) are corrected.

### 12.5 Missing Carrier Names (27 Rows)

27 rows in both datasets have blank `CARRIER_NAME` — all from 2015, all Class L (charter), connecting military-adjacent airports with Texas border cities and Central American destinations. Likely a government/military charter operation. The rows are retained because they contain valid route and traffic data; only carrier-level breakdowns are affected.

### 12.6 COVID-19 Impact (2020)

2020 has the lowest traffic volumes across all metrics due to the pandemic. Year-over-year comparisons should account for this. The year distribution is otherwise complete with no gaps.

### 12.7 T-Prefix FAA LID Codes

Seven small Texas airports use FAA Location Identifier codes starting with "T" (T6X, T8X, T82, T2X, T3X, T5X, T9X). These are legitimate FAA codes for airports without IATA codes. Combined volume is negligible (~250 passengers across all 7 airports over 10 years). They are left as-is because no "correct" IATA code exists to normalize to.

### 12.8 AIRPORT_ID Is the True Unique Identifier

Airport codes (IATA/FAA) can change over time and can be reused across different airports. The `AIRPORT_ID` column is the stable, unique identifier assigned by US DOT. Always join or track airports by `AIRPORT_ID`, not by airport code, for reliable longitudinal analysis. The code updates in Section 8.2 normalize historical code changes so that the code column is also consistent, but `AIRPORT_ID` remains the authoritative key.

---

## 13. Directory Structure

```
Task 6 - Airport Connectivity/
│
├── 01_Raw Data/
│   ├── Airport_Master_List.csv                    # BTS airport reference (names, coords)
│   └── BTS_Air_Carrier_Statistics/
│       ├── Readme.txt                             # Market vs. Segment explanation
│       ├── Dictionary_market.csv                  # Official BTS field definitions (41 cols)
│       ├── Dictionary_segment.csv                 # Official BTS field definitions (50 cols)
│       ├── Raw BTS MARKET DATA/                   # Monthly CSV downloads by year
│       └── Raw BTS SEGMENT DATA/                  # Monthly CSV downloads by year
│
├── 02_Data_Staging/
│   └── BTS_Air_Carrier_Statistics/
│       ├── Database/
│       │   ├── BTS_Air_Carrier_Statistics.db      # SQLite database (~4.5 GB)
│       │   ├── Database_Schema.json               # Auto-extracted schema
│       │   ├── Database_Schema_README.md           # Schema documentation
│       │   └── data-cleaning/
│       │       ├── data-cleaning.csv              # Machine-readable cleaning rules
│       │       ├── data-cleaning.md               # Detailed data quality report
│       │       └── missing-states.csv             # International state/province lookup (460 entries)
│       │
│       └── Script/
│           ├── Data Pipeline README.md             # ← This file
│           ├── Extract_BTS_Data.py                # Step 1: Extract & aggregate from DB
│           ├── Apply_Data_Cleaning.py             # Step 2: Clean & output final files
│           ├── Verify_Corrections.py              # Step 3: Validate corrections
│           ├── _temp/                             # Intermediate output (raw, pre-cleaning)
│           │   ├── BTS_T-100_Market_2015-2024.csv
│           │   ├── BTS_T-100_Segment_2015-2024.csv
│           │   └── BTS_T-100_Airports_2015-2024.geojson
│           ├── _helper/
│           │   ├── Audit_GeoJSON.py               # GeoJSON structural audit
│           │   └── Extract_Database_Schema.py     # Generate schema JSON from DB
│           └── _Archive/                          # Superseded scripts
│
├── 03_Process_Data/
│   └── BTS/
│       ├── BTS_T-100_Market_2015-2024.csv         # ★ FINAL cleaned market data
│       ├── BTS_T-100_Segment_2015-2024.csv        # ★ FINAL cleaned segment data
│       └── BTS_T-100_Airports_2015-2024.geojson   # Supplementary airport locations
│
├── 04_GIS/                                        # GIS analysis files
├── 05_Stakeholder_Outreach/
├── 06_Deliverables/
├── 07_WebApp/                                     # React dashboard (separate documentation)
└── 08_Ref_Documents/
```

---

## 14. How to Run the Pipeline

All scripts use relative paths from their own location — they can be run from any working directory.

### Prerequisites

- Python 3.10+ (tested with Python 3.13)
- Required packages: `pandas`, `geopandas`, `shapely` (see Section 14)
- The SQLite database must exist at `Database/BTS_Air_Carrier_Statistics.db`
- The Airport Master List must exist at `01_Raw Data/Airport_Master_List.csv`

### Full Pipeline Run

```bash
# Step 1: Extract data from database → writes to Script/_temp/
python Extract_BTS_Data.py

# Step 2: Clean data → writes to 03_Process_Data/BTS/
python Apply_Data_Cleaning.py

# Step 3 (optional): Verify corrections against raw data
python Verify_Corrections.py

# Step 3 (optional): Verify + scan for new candidate rules
python Verify_Corrections.py --auto-update-rules
```

### Configuration

Year range is configurable at the top of each script:

```python
START_YEAR = 2015
END_YEAR = 2024
```

Changing these values will extract a different date range from the database. The output filenames automatically reflect the configured range (e.g., `BTS_T-100_Market_2015-2024.csv`).

### Console Output

All scripts produce structured console output with status prefixes:
- `[SUCCESS]` — operation completed normally
- `[ERROR]` — fatal error, script will exit
- `[WARNING]` — non-fatal issue, operation continues
- `[UPDATE]`, `[CORRECT]`, `[DELETE]`, `[FILTER]`, `[FILL]`, `[REAGG]` — cleaning step progress

---

## 15. Dependencies

| Package | Purpose | Required By |
|---|---|---|
| `pandas` | Data manipulation, SQL query execution, CSV I/O | All scripts |
| `sqlite3` | Database connectivity (Python standard library) | Extract_BTS_Data.py |
| `geopandas` | Spatial data handling, GeoJSON creation | Extract_BTS_Data.py |
| `shapely` | Point geometry creation | Extract_BTS_Data.py |
| `json` | GeoJSON file I/O (Python standard library) | Apply_Data_Cleaning.py, Verify_Corrections.py |
| `argparse` | CLI argument parsing (Python standard library) | Verify_Corrections.py |

**Python path:** `C:\Users\UNT\AppData\Local\Programs\Python\Python313\python.exe`

---

## 16. Supporting Files Reference

| File | Location | Purpose |
|---|---|---|
| `data-cleaning.csv` | `Database/data-cleaning/` | Machine-readable cleaning rules (17 rules) — the single source of truth for all data corrections |
| `data-cleaning.md` | `Database/data-cleaning/` | Comprehensive data quality report documenting every anomaly, correction rationale, and affected row counts |
| `missing-states.csv` | `Database/data-cleaning/` | Lookup table mapping 460 international airport+city pairs to their state/province/region |
| `Database_Schema.json` | `Database/` | Auto-extracted database schema (tables, columns, types, sample data, statistics) |
| `Database_Schema_README.md` | `Database/` | Documentation for the schema JSON format and example queries |
| `auto-correction-audit.md` | `Database/data-cleaning/` | Audit report from `--auto-update-rules` scans (generated, not manually maintained) |
