# BTS T-100 Data — Data Quality Report & Cleaning Rules

**Applies to:**
- `03_Process_Data/BTS/BTS_T-100_Market_2015-2024.csv` (106,218 raw → 94,120 cleaned rows)
- `03_Process_Data/BTS/BTS_T-100_Segment_2015-2024.csv` (108,964 raw → 94,234 cleaned rows)
- `03_Process_Data/BTS/BTS_T-100_Airports_2015-2024.geojson` (4,981 raw → 1,275 cleaned features)

**Years covered:** 2015–2024
**Date of audit:** 2026-02-28
**Last updated:** 2026-02-28

---

## Table of Contents

1. [Dataset Overview](#1-dataset-overview)
2. [Issues Corrected](#2-issues-corrected)
   - 2.1 Missing State Names
   - 2.2 NLU City Name Standardization
   - 2.3 Airport Code Updates (Same Airport ID, Multiple Codes)
   - 2.4 T4X Code Conflict (Same Code, Multiple Airport IDs)
3. [Issues Filtered Out](#3-issues-filtered-out)
   - 3.1 Zero-Distance Rows (Same Origin and Destination)
   - 3.2 All-Zero Activity Rows
4. [Issues Acknowledged but Not Corrected](#4-issues-acknowledged-but-not-corrected)
   - 4.1 Missing Carrier Names (2015 Charter Flights)
5. [GeoJSON Cleaning](#5-geojson-cleaning)
   - 5.1 Filter to Latest Records
   - 5.2 Scope to Corrected CSV Airport IDs
   - 5.3 GeoJSON Code Mismatch (XJD → IUD)
6. [data-cleaning.csv Format Reference](#6-data-cleaningcsv-format-reference)

---

## 1. Dataset Overview

Both datasets contain BTS T-100 data for air routes involving Texas airports or Mexico from 2015 to 2024. They share the same correction logic because the underlying airports, codes, and data quality issues are identical across both tables.

**Market data** represents origin-to-destination traffic regardless of routing:

| Column | Description | Missing |
|--------|-------------|---------|
| YEAR | Reporting year | 0 |
| ORIGIN_AIRPORT_ID | BTS unique airport identifier (origin) | 0 |
| ORIGIN | Airport code — IATA or FAA LID (origin) | 0 |
| ORIGIN_CITY_NAME | City name (origin) | 0 |
| ORIGIN_STATE_NM | State/province name (origin) | 13,124 (12.36%) |
| ORIGIN_COUNTRY_NAME | Country name (origin) | 0 |
| DEST_AIRPORT_ID | BTS unique airport identifier (destination) | 0 |
| DEST | Airport code — IATA or FAA LID (destination) | 0 |
| DEST_CITY_NAME | City name (destination) | 0 |
| DEST_STATE_NM | State/province name (destination) | 13,217 (12.44%) |
| DEST_COUNTRY_NAME | Country name (destination) | 0 |
| CARRIER_NAME | Airline name | 27 (0.03%) |
| CLASS | Service class (F=Scheduled, G=Cargo, L=Charter, P=Non-scheduled civilian) | 0 |
| PASSENGERS | Annual passenger count | 0 |
| FREIGHT | Annual freight (lbs) | 0 |
| MAIL | Annual mail (lbs) | 0 |
| DISTANCE | Non-stop distance (miles) | 0 |
| DATA_SOURCE | BTS source (DU/IU/DF/IF) | 0 |

**Segment data** represents individual flight legs with operational metrics (24 columns). It includes the same 18 columns as market plus six additional:

| Column | Description | Missing |
|--------|-------------|---------|
| DEPARTURES_SCHEDULED | Annual scheduled departures | 0 |
| DEPARTURES_PERFORMED | Annual performed departures | 0 |
| PAYLOAD | Annual payload capacity (lbs) | 0 |
| SEATS | Annual seat capacity | 0 |
| RAMP_TO_RAMP | Annual gate-to-gate time (minutes) | 0 |
| AIR_TIME | Annual air time (minutes) | 0 |

Segment-specific missing values: ORIGIN_STATE_NM 13,431 (12.33%), DEST_STATE_NM 12,860 (11.80%), CARRIER_NAME 27 (0.02%).

**Common observations (both datasets):**
- No exact duplicate rows found.
- No negative values in any numeric column.
- Year distribution is complete with no gaps (2020 is lowest due to COVID).
- Country names are consistent with no misspellings.

---

## 2. Issues Corrected

These issues are addressed via `data-cleaning.csv` and the lookup file `missing-states.csv`.

### 2.1 Missing State Names

**Anomaly:**
`ORIGIN_STATE_NM` and `DEST_STATE_NM` are blank for ~12% of rows in both datasets. All missing values correspond to international (non-US) airports. BTS does not populate state/province names for airports outside the United States.

**Interpretation:**
The state/province information is useful for analysis, particularly for Mexican airports which are a key focus of this project. A lookup table was created mapping each international airport code and city name to its corresponding state, province, or administrative region.

**Correction:**
A lookup file `missing-states.csv` was created with 460 entries covering all unique international airport–city combinations across both datasets. The file maps each `(Airport, City-Name)` pair to its `State-Name`.

- Format: `Airport,City-Name,State-Name`
- Coverage: 100+ countries, all entries verified
- Mexican airports use official Mexican state names (e.g., Quintana Roo, Jalisco, Nuevo Leon)
- Other countries use the appropriate administrative division (e.g., German Bundesländer, French regions, Japanese prefectures)

**Ambiguity check:** Every airport code + city name combination maps to exactly one state. No ambiguous lookups were found.

### 2.2 NLU City Name Standardization

**Anomaly:**
Airport ID 16852 (NLU — Felipe Ángeles International Airport) appears with two different city names:
- `"Zumpango, Mexico"` — Market: 20 rows; Segment: 22 rows (11 origin + 11 dest)
- `"Mexico City, Mexico"` — remaining rows (2023–2024)

The airport opened in March 2022 in Zumpango, Estado de Mexico. BTS initially labeled it as Zumpango, then changed the label to Mexico City partway through 2023.

**Interpretation:**
Per Jolanda's recommendation, the airport is located very close to Mexico City and functionally serves the city, so using "Mexico City" is the most appropriate and consistent reference. The BTS data itself transitioned to this label in 2023.

**Correction:**
Change all `ORIGIN_CITY_NAME` and `DEST_CITY_NAME` values from `"Zumpango, Mexico"` to `"Mexico City, Mexico"` where Airport ID = 16852. The state remains `Estado de Mexico` in both cases.

| Field | Old Value | New Value |
|-------|-----------|-----------|
| City Name | Zumpango, Mexico | Mexico City, Mexico |
| Airport Code | NLU | NLU (no change) |
| Airport ID | 16852 | 16852 (no change) |

Affected rows: Market 20, Segment 22

### 2.3 Airport Code Updates (Same Airport ID, Multiple Codes)

BTS uses Airport ID as the true unique identifier for an airport. Over time, the FAA or IATA code assigned to an airport can change. In these cases, the Airport ID remains stable but the code column shows different values across years. The correction standardizes all rows to the most current code.

#### 2.3a. Airport ID 12544 — Concord, NC (Concord-Padgett Regional Airport)

**Anomaly:**
Two codes appear for the same Airport ID:
- `JQF` — 24 rows (2015–2016) in both datasets
- `USA` — remaining rows (2017–2024)

**Interpretation:**
JQF is the FAA Location Identifier (LID). USA is the IATA code. BTS switched from reporting the FAA LID to the IATA code starting in 2017. Both refer to the same physical airport (Concord-Padgett Regional Airport).

**Correction:**
Change `JQF` to `USA` for all rows where Airport ID = 12544.

| Field | Old Value | New Value |
|-------|-----------|-----------|
| Code | JQF | USA |

Affected rows: Market 24, Segment 24

#### 2.3b. Airport ID 13788 — Jacksonville, FL (Cecil Airport)

**Anomaly:**
Two codes appear for the same Airport ID:
- `NZC` — 1 row (2015) in both datasets
- `VQQ` — remaining rows (2018–2022)

**Interpretation:**
NZC was the code for Naval Air Station Cecil Field, which closed in 1999 and was converted to the civilian Cecil Airport. The FAA reassigned the code to VQQ. The NZC code is now used for a different airport in Maria Reiche, Peru.

**Correction:**
Change `NZC` to `VQQ` for all rows where Airport ID = 13788.

| Field | Old Value | New Value |
|-------|-----------|-----------|
| Code | NZC | VQQ |

Affected rows: Market 1, Segment 1

#### 2.3c. Airport ID 16658 — Gainesville, TX (Gainesville Municipal Airport)

**Anomaly:**
Two codes appear for the same Airport ID:
- `T1X` — Market: 4 rows (2018–2019); Segment: 6 rows (2015, 2018–2019)
- `GLE` — 2 rows (2021) in both datasets

**Interpretation:**
T1X was a temporary or internal BTS code. The current FAA LID and recognized code is GLE (ICAO: KGLE).

**Correction:**
Change `T1X` to `GLE` for all rows where Airport ID = 16658.

| Field | Old Value | New Value |
|-------|-----------|-----------|
| Code | T1X | GLE |

Affected rows: Market 4, Segment 6

#### 2.3d. Airport ID 15081 — Berlin, Germany (Berlin Brandenburg Airport)

**Anomaly:**
Two codes appear for the same Airport ID in the Segment dataset only:
- `SXF` — 1 row (2016) as destination
- `BER` — remaining rows (2023–2024)

The Market dataset only contains `BER` for this Airport ID.

**Interpretation:**
Berlin Schönefeld Airport (SXF) was absorbed into the new Berlin Brandenburg Airport (BER) when it opened in October 2020. BTS updated the code from SXF to BER. The single SXF row is a legacy entry from before the transition.

**Correction:**
Change `SXF` to `BER` for all rows where Airport ID = 15081.

| Field | Old Value | New Value |
|-------|-----------|-----------|
| Code | SXF | BER |

Affected rows: Market 0, Segment 1

### 2.4 T4X Code Conflict (Same Code, Multiple Airport IDs)

**Anomaly:**
The code `T4X` is shared by two different Airport IDs pointing to two different cities:
- Airport ID 16706 — `"Austin, TX"` — Market: 2 rows (2018); Segment: 4 rows (2016, 2018)
- Airport ID 16879 — `"Llano, TX"` — 49 rows (2020–2024) in both datasets

T4X is not a recognized FAA or IATA code for either airport.

**Interpretation:**
Airport ID 16879 (Llano) is Llano Municipal Airport, whose real FAA LID is AQO (ICAO: KAQO, formerly 6R9). The T4X code should be corrected to AQO.

Airport ID 16706 (Austin) is an unidentifiable facility — only charter data from one or two carriers. It does not correspond to any known Austin airport (AUS, EDC, or others). These rows are deleted as unreliable data.

#### 2.4a. Airport ID 16879 — Llano, TX

**Correction:**
Change `T4X` to `AQO` for all rows where Airport ID = 16879.

| Field | Old Value | New Value |
|-------|-----------|-----------|
| Code | T4X | AQO |

Affected rows: Market 49, Segment 49

#### 2.4b. Airport ID 16706 — Austin, TX

**Correction:**
Delete all rows where Airport ID = 16706.

Affected rows: Market 2, Segment 4

---

## 3. Issues Filtered Out

These rows are not corrected but should be excluded during analysis. They are flagged in `data-cleaning.csv` with `Action = filter`.

### 3.1 Zero-Distance Rows (Same Origin and Destination)

**Anomaly:**
Rows with `DISTANCE = 0` where origin and destination airport are identical (e.g., DFW→DFW, AUS→AUS).

| | Market | Segment |
|---|--------|---------|
| Total zero-distance rows | 237 | 316 |
| By class F | 35 | 84 |
| By class G | 26 | 27 |
| By class L | 90 | 86 |
| By class P | 86 | 119 |
| With passengers > 0 | 70 | 61 |

**Interpretation:**
These are not real routes. They likely represent maintenance repositioning, training flights, test flights, or data entry artifacts. Even those with passengers > 0 are anomalous since a flight from an airport to itself carries no meaningful traffic data.

**Approach:**
Filter out during analysis. These rows are flagged in `data-cleaning.csv` with `Action = filter` and `Correction_Type = Zero_Distance`.

### 3.2 All-Zero Activity Rows

**Anomaly:**
Rows where `PASSENGERS = 0`, `FREIGHT = 0`, and `MAIL = 0` simultaneously.

| | Market | Segment |
|---|--------|---------|
| Total all-zero rows | 11,921 (11.2%) | 14,552 (13.4%) |
| By class L | 6,161 | 7,873 |
| By class F | 3,296 | 2,243 |
| By class P | 2,409 | 4,333 |
| By class G | 55 | 103 |
| By source DU | 8,855 | 11,638 |
| By source IU | 3,066 | 2,412 |

**Interpretation:**
These rows represent routes with no reported activity — likely codeshare placeholders, route authorization filings, or inactive route records. They carry no useful traffic or cargo information.

**Approach:**
Filter out during analysis. These rows are flagged in `data-cleaning.csv` with `Action = filter` and `Correction_Type = All_Zero_Activity`.

> **Note:** The zero-distance rows (Section 3.1) partially overlap with all-zero rows. Unique rows to filter:
> - **Market:** 11,921 (all-zero) + 70 (zero-distance with activity) = **11,991 unique rows**
> - **Segment:** 14,552 (all-zero) + 175 (zero-distance with activity) = **14,727 unique rows**

---

## 4. Issues Acknowledged but Not Corrected

### 4.1 Missing Carrier Names (2015 Charter Flights)

**Anomaly:**
27 rows have a blank `CARRIER_NAME` in both datasets (identical rows). All 27 share the same characteristics:
- Year: 2015
- Class: L (charter)
- Zero freight and mail across all rows
- 25 of the 27 rows have passengers > 0

**Route pattern:**
The routes connect military-adjacent airports (AEX/Fort Polk, CSG/Fort Benning, ELP/Fort Bliss, TOL/Camp Perry) with Texas border cities (BRO/Brownsville, LRD/Laredo) and Central American destinations (GUA/Guatemala City, SAL/San Salvador, SAP/San Pedro Sula, MID/Merida). This suggests a government or military charter operation.

**Affected routes (all 27 rows):**

| Origin | Destination | Passengers | Distance |
|--------|------------|-----------|----------|
| AEX | AFW | 0 | 302 |
| AEX | BRO | 1,789 | 1,904 |
| AEX | DAL | 505 | 1,092 |
| AEX | ELP | 668 | 816 |
| AEX | IAH | 389 | 760 |
| AEX | MID | 100 | 737 |
| AFW | JQF | 252 | 964 |
| BRO | AEX | 158 | 952 |
| BRO | GUA | 442 | 2,694 |
| BRO | MIA | 692 | 4,268 |
| CLL | COU | 43 | 614 |
| COU | CLL | 43 | 614 |
| CSG | BRO | 260 | 1,760 |
| CSG | IAH | 875 | 2,560 |
| DAL | SAL | 838 | 5,692 |
| ELP | AEX | 119 | 816 |
| EWR | BRO | 129 | 1,679 |
| IAH | GUA | 832 | 4,412 |
| IAH | MID | 82 | 717 |
| IAH | SAL | 603 | 4,828 |
| IAH | SAP | 819 | 4,424 |
| LRD | AEX | 1,022 | 1,964 |
| MIA | BRO | 15 | 1,067 |
| MIA | IAH | 25 | 964 |
| MIA | MID | 0 | 682 |
| MID | MIA | 0 | 682 |
| TOL | LRD | 1,040 | 5,248 |

**Investigation:**
We attempted to identify the carrier by cross-referencing other Class L carriers on the same routes in 2015. Multiple charter carriers already have named rows on these routes — the top matches were:
- Caribbean Sun Airlines / World Atlantic Airlines (present on 18 of 27 routes)
- Swift Air (present on 12 of 27 routes)
- Falcon Air Express, XTRA Airways (present on 4 each)

However, since these carriers already have their own named rows on the same routes, the missing-carrier rows represent an *additional* operator. Without further data, we cannot reliably identify which carrier this is.

**Approach:**
No correction applied. The 27 rows (< 0.03% of either dataset) are left as-is with blank carrier names. The rows still contain valid route, passenger, and distance data that can be used in analysis. Only carrier-level breakdowns would be affected.

---

## 5. GeoJSON Cleaning

The airport GeoJSON is sourced from the BTS Airport Master List. It requires cleaning steps beyond the CSV corrections because the master list contains time-versioned entries (multiple features per airport) and some code mismatches.

### 5.1 Filter to Latest Records

**Issue:** The raw GeoJSON contains 4,981 features but only 1,354 unique AIRPORT_IDs. Each airport has multiple time-versioned entries (average 3.68 features per ID) tracking coordinate/name changes over time. Only the `IS_LATEST=1` entry per airport is current.

**Action:** Filter to `AIRPORT_IS_LATEST = 1` only. Result: 4,981 → 1,354 features.

### 5.2 Scope to Corrected CSV Airport IDs

**Issue:** After filtering to latest, 79 airports remain in the GeoJSON that do not appear in the corrected Market or Segment CSVs. These are airports that were only referenced in rows that got deleted or filtered out.

**Action:** Keep only AIRPORT_IDs present in the union of corrected Market and Segment data. Result: 1,354 → 1,275 features.

### 5.3 GeoJSON Code Mismatch (XJD → IUD)

**Anomaly:** Airport ID 15968 (Al Udeid Air Base, Doha, Qatar) has code `XJD` in the Airport Master List but appears as `IUD` in the BTS Market and Segment data.

**Correction:** Change `AIRPORT` from `XJD` to `IUD` for Airport ID 15968 in the GeoJSON.

Affected features: 1

**Additional GeoJSON corrections applied from CSV rules:**
- Airport ID 16879: T4X → AQO (code correction, same as CSV 2.4a)
- Airport ID 16706: deleted (same as CSV 2.4b)
- State names filled from `missing-states.csv` (436 null values in final set)

---

## 6. data-cleaning.csv Format Reference

The machine-parsable `data-cleaning.csv` file defines all cleaning rules. It is read by `Script/_helper/Apply_Data_Cleaning.py`.

**Columns:**

| Column | Values | Purpose |
|--------|--------|---------|
| `action` | `update`, `delete`, `filter`, `fill` | Operation type |
| `target` | `csv`, `market`, `segment`, `geojson`, `all` | Which output file(s) |
| `airport_id` | Integer or blank | Match key for record-level ops |
| `field` | `CODE`, `CITY_NAME`, `STATE_NAME`, `ZERO_DISTANCE`, `ALL_ZERO_ACTIVITY` | Abstract field name or filter type |
| `old_value` | String or blank | Value to match (updates) or lookup file path (fills) |
| `new_value` | String or blank | Replacement value |
| `notes` | Free text | Human-readable documentation |

**Field mapping (abstract → actual columns):**

For CSVs, each abstract field maps to paired origin/destination columns:
- `CODE` → ORIGIN / DEST (matched via ORIGIN_AIRPORT_ID / DEST_AIRPORT_ID)
- `CITY_NAME` → ORIGIN_CITY_NAME / DEST_CITY_NAME
- `STATE_NAME` → ORIGIN_STATE_NM / DEST_STATE_NM

For GeoJSON, each abstract field maps to a single column:
- `CODE` → AIRPORT
- `CITY_NAME` → DISPLAY_AIRPORT_CITY_NAME_FULL
- `STATE_NAME` → AIRPORT_STATE_NAME

**Processing order:** updates → deletes → filters → fills

---

## Summary

| # | Issue | Type | Market Rows | Segment Rows | GeoJSON | Action |
|---|-------|------|------------|-------------|---------|--------|
| 2.1 | Missing state names | Data gap | ~13,200 | ~13,400 | 436 | Fill via `missing-states.csv` |
| 2.2 | NLU city name | Standardization | 20 | 22 | — | Update to "Mexico City, Mexico" |
| 2.3a | Concord, NC (JQF → USA) | Code update | 24 | 24 | — | Update code |
| 2.3b | Jacksonville, FL (NZC → VQQ) | Code update | 1 | 1 | — | Update code |
| 2.3c | Gainesville, TX (T1X → GLE) | Code update | 4 | 6 | — | Update code |
| 2.3d | Berlin (SXF → BER) | Code update | 0 | 1 | — | Update code |
| 2.4a | Llano, TX (T4X → AQO) | Code update | 49 | 49 | 1 | Update code |
| 2.4b | Austin, TX (ID 16706) | Unreliable data | 2 | 4 | 3 | Delete |
| 3.1 | Zero-distance rows | Not real routes | 237 | 316 | — | Filter out |
| 3.2 | All-zero activity | No activity | 11,921 | 14,552 | — | Filter out |
| 4.1 | Missing carrier names | Unresolvable | 27 | 27 | — | Acknowledged |
| 5.1 | GeoJSON multi-version | Processing | — | — | 3,627 | Filter to IS_LATEST=1 |
| 5.2 | GeoJSON orphan airports | Processing | — | — | 79 | Scope to CSV IDs |
| 5.3 | Al Udeid (XJD → IUD) | Code mismatch | — | — | 1 | Update code |
