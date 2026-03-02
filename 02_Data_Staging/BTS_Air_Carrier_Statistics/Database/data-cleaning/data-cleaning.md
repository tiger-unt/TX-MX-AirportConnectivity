# BTS T-100 Data — Data Quality Report & Cleaning Rules

**Applies to:**
- `03_Process_Data/BTS/BTS_T-100_Market_2015-2024.csv` (106,218 raw → 94,115 cleaned rows)
- `03_Process_Data/BTS/BTS_T-100_Segment_2015-2024.csv` (108,964 raw → 94,228 cleaned rows)
- `03_Process_Data/BTS/BTS_T-100_Airports_2015-2024.geojson` (4,981 raw → 1,275 cleaned features)

**Years covered:** 2015–2024
**Date of audit:** 2026-02-28
**Last updated:** 2026-03-01 (removed DISTANCE, RAMP_TO_RAMP, AIR_TIME columns from pipeline output; added repositioning/empty flights analysis, T8X city name correction, T-prefix FAA LID documentation)

---

## Table of Contents

1. [Dataset Overview](#1-dataset-overview)
2. [Issues Corrected](#2-issues-corrected)
   - 2.1 Missing State Names
   - 2.2 NLU City Name Standardization
   - 2.3 Airport Code Updates (Same Airport ID, Multiple Codes)
   - 2.4 T4X Code Conflict (Same Code, Multiple Airport IDs)
   - 2.5 DEPARTURES_SCHEDULED Outliers (Segment Only)
   - 2.6 DEPARTURES_SCHEDULED Charter Carrier Outliers (Segment Only)
   - 2.7 PASSENGERS Exceeding SEATS (Segment Only)
   - 2.8 T8X City Name Correction (McKinney, TX)
3. [Issues Filtered Out](#3-issues-filtered-out)
   - 3.1 Self-Flight Rows (Same Origin and Destination)
   - 3.2 All-Zero Activity Rows
     - Repositioning & Empty Flights (Segment Detail)
   - 3.3 Exact Duplicate Rows
4. [Issues Acknowledged but Not Corrected](#4-issues-acknowledged-but-not-corrected)
   - 4.1 Missing Carrier Names (2015 Charter Flights)
4b. [Known Anomalies (No Action Required)](#4b-known-anomalies-no-action-required)
   - 4b.1 Aeromexico VSA→IAH Cumulative Filing (2004/09)
   - 4b.2 BTS_SEGMENT Record Granularity (Split by Aircraft Type)
   - 4b.3 Performed > Scheduled (Within Valid Range)
   - 4b.4 PASSENGERS > 0 with SEATS = 0 (Class P Edge Case)
   - 4b.5 Semantic Duplicates After Normalization
   - 4b.6 T-Prefix FAA LID Airport Codes (7 Small TX Airports)
   - 4b.7 DEPARTURES_SCHEDULED Missing-as-Zero (DU/IU + Class F)
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
| DATA_SOURCE | BTS reporting source — first letter: D=Domestic route, I=International route; second letter: U=U.S. carrier, F=Foreign carrier | 0 |

**Segment data** represents individual flight legs with operational metrics (21 columns). It includes the same 17 columns as market plus four additional:

| Column | Description | Missing |
|--------|-------------|---------|
| DEPARTURES_SCHEDULED | Annual scheduled departures | 0 |
| DEPARTURES_PERFORMED | Annual performed departures | 0 |
| PAYLOAD | Annual payload capacity (lbs) | 0 |
| SEATS | Annual seat capacity | 0 |

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

### 2.5 DEPARTURES_SCHEDULED Outliers (Segment Only)

**Anomaly:**
A handful of segment rows have `DEPARTURES_SCHEDULED` values that are orders of magnitude larger than `DEPARTURES_PERFORMED`, clearly indicating data entry errors (extra digits or miskeyed values).

**Known examples (from the full BTS database):**

| Carrier | Route | Year/Month | DEPARTURES_SCHEDULED | DEPARTURES_PERFORMED | Likely Cause |
|---------|-------|-----------|---------------------|---------------------|--------------|
| Peninsula Airways | ANC→CDB | 2003/02 | 84,538 | 43 | Extra digits |
| Spirit | ISP→TPA | 1999/04 | 65,720 | 20 | Extra digits |
| TEM Enterprises | AUS→CUN | 2004/04 | 1,113 | 8 | Typo/miskeyed |

These are rare but would skew any analysis using `DEPARTURES_SCHEDULED` as a denominator (e.g., schedule reliability, completion rates).

**Detection rule:**
Rows where `DEPARTURES_PERFORMED > 0` and `DEPARTURES_SCHEDULED / DEPARTURES_PERFORMED > 100`. A ratio above 100 is physically impossible — even extreme cancellation events (COVID, weather) produce ratios under 10.

**Correction:**
Set `DEPARTURES_SCHEDULED = DEPARTURES_PERFORMED` for affected rows. The assumption is that the scheduled count was a data entry error and the performed count is reliable.

> **Note:** The three known examples above are from years 1999–2004, outside the current 2015–2024 extraction range. The rule is applied generically so it will catch any similar outliers in the current data or if the year range is expanded.
>
> **In the current 2015–2024 extract:** All 16 rows matching ratio > 100 belong to **Kalitta Charters II** (Class P, years 2015 and 2017). These same rows are also caught by the charter-specific ratio > 10 rule in Section 2.6 — the general rule fires first, so in practice the two rules overlap on these 16 rows.

### 2.6 DEPARTURES_SCHEDULED Charter Carrier Outliers (Segment Only)

**Anomaly:**
Class P (non-scheduled civilian) and Class L (charter) carriers should not report scheduled departures — 99.4% of Class P rows correctly have `DEPARTURES_SCHEDULED = 0`. However, a small number of charter carrier rows report non-zero `DEPARTURES_SCHEDULED` with implausibly high ratios to `DEPARTURES_PERFORMED`, showing the same systematic data entry error pattern as the >100x outliers in Section 2.5.

**Affected carriers (in the 2015–2024 extract):**

| Carrier | Class | Rows | Ratio Range | Passengers | Freight (lbs) |
|---------|-------|------|------------|-----------|--------------|
| Kalitta Charters II | P | ~22 | 40–95x | 0 | 561,541 |
| Planet Airways | L | ~10 | 44–85x | 983 | 0 |

These are freight-only charter operators (Kalitta) and defunct charter carriers (Planet Airways, ceased 2004) where the `DEPARTURES_SCHEDULED` values are clearly misreported. The ratio range of 10–100x sits just below the general >100x threshold but exhibits the same implausible pattern.

**Why a targeted rule instead of lowering the general threshold:**
The 10–100x ratio range for mainstream Class F carriers (392 total rows) contains many legitimate entries — route startups, COVID-era cancellations, aircraft type substitutions on codeshare routes (Comair, ExpressJet). BTS_SEGMENT is split by aircraft type, so a route served by multiple aircraft types can show high ratios per type while the route-level ratio is normal. Lowering the general threshold to 10x would incorrectly erase valid schedule data for these carriers.

**Detection rule:**
Rows where `CLASS IN ('P', 'L')` and `DEPARTURES_PERFORMED > 0` and `DEPARTURES_SCHEDULED / DEPARTURES_PERFORMED > 10`.

**Correction:**
Set `DEPARTURES_SCHEDULED = DEPARTURES_PERFORMED` for affected rows. Applied after the general >100x correction (Section 2.5) to avoid double-counting.

### 2.7 PASSENGERS Exceeding SEATS (Segment Only)

**Anomaly:**
A small number of segment rows report `PASSENGERS > SEATS` where `SEATS > 0`. These are reporting errors — passengers cannot exceed available seat capacity.

**Detection rule:**
Rows where `PASSENGERS > SEATS` and `SEATS > 0`.

**Correction:**
Cap `PASSENGERS` at `SEATS` for affected rows. Only applies to segment data (market data does not have a SEATS column).

### 2.8 T8X City Name Correction (McKinney, TX)

**Anomaly:**
Airport ID 16755 (T8X — Collin County Regional Airport at McKinney) is labeled `"Dallas, TX"` by BTS, but the airport is located in McKinney, TX (~35 miles north of Dallas).

**Correction:**
Change all `ORIGIN_CITY_NAME` and `DEST_CITY_NAME` values from `"Dallas, TX"` to `"McKinney, TX"` where Airport ID = 16755.

| Field | Old Value | New Value |
|-------|-----------|-----------|
| City Name | Dallas, TX | McKinney, TX |

Affected rows: Market 46, Segment 47

> **Context:** T8X is one of seven T-prefix FAA LID codes for small Texas airports in the data (see Section 4b.6). It is the only one with a factual city-name error — the others have correct city labels. T8X is also the most active of the group, with charter passenger service and cargo operations (Ameristar Air Cargo) spanning 2019–2025.

---

## 3. Issues Filtered Out

These rows are not corrected but should be excluded during analysis. They are flagged in `data-cleaning.csv` with `Action = filter`.

### 3.1 Self-Flight Rows (Same Origin and Destination)

**Anomaly:**
Rows where origin and destination airport are identical (ORIGIN = DEST, e.g., DFW→DFW, AUS→AUS).

| | Market | Segment |
|---|--------|---------|
| Total self-flight rows | 237 | 316 |
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
These rows represent routes with no reported traffic activity — likely codeshare placeholders, route authorization filings, empty repositioning flights, or inactive route records.

For this project, route activity is defined by traffic movement (`PASSENGERS`, `FREIGHT`, `MAIL`). If all three are zero, the row is excluded even when operational fields (for segment data) are nonzero.

**Approach:**
Filter out during analysis. These rows are flagged in `data-cleaning.csv` with `Action = filter` and `Correction_Type = All_Zero_Activity`.

> **Note:** The self-flight rows (Section 3.1) partially overlap with all-zero rows. Unique rows to filter:
> - **Market:** 11,921 (all-zero) + 70 (self-flights with activity) = **11,991 unique rows**
> - **Segment:** 14,552 (all-zero) + 175 (self-flights with activity) = **14,727 unique rows**
>
> In segment data, these all-zero rows still include a small share of operational totals (e.g., departures/seats/payload), but they remain intentionally excluded because they contain no passengers, freight, or mail.

#### Repositioning & Empty Flights (Segment Detail)

Of the 14,411 all-zero segment rows (excluding self-flights), **14,221 had DEPARTURES_PERFORMED > 0** — meaning real flights were operated but carried no commercial traffic. These are repositioning (ferry) flights, empty cargo returns, and charter deadhead legs. The remaining 190 rows had zero departures and represent pure filing placeholders.

**Aggregate operational totals (operated empty flights):**

| Metric | Total |
|--------|-------|
| Records | 14,221 |
| Departures performed | 28,487 |
| Departures scheduled | 3,613 |
| Seats | 2,448,772 |
| Payload capacity | 1,297,534,907 lbs (~1.3 billion lbs) |

**Breakdown by service class:**

| Class | Records | Departures | Seats | Payload (lbs) |
|-------|---------|-----------|-------|---------------|
| L — Charter | 7,768 (54.6%) | 15,093 | 2,211,643 | 658,513,260 |
| P — Non-scheduled | 4,293 (30.2%) | 9,427 | 4,207 | 521,549,680 |
| F — Scheduled | 2,065 (14.5%) | 3,594 | 232,106 | 59,033,883 |
| G — All-cargo | 95 (0.7%) | 373 | 816 | 58,438,084 |

**Breakdown by aircraft type (SEATS as proxy):**

| Category | Records | Departures | Payload (lbs) |
|----------|---------|-----------|---------------|
| SEATS = 0 (cargo/charter aircraft) | 4,583 | 10,054 | 608,408,278 |
| SEATS > 0 (passenger aircraft flying empty) | 9,638 | 18,433 | 689,126,629 |

Charter repositioning (Class L) dominates, led by Caribbean Sun Airlines running empty return legs on BRO–AEX and BRO–Central America routes with 155-seat aircraft. Non-scheduled cargo (Class P) includes operators like USA Jet Airlines, Kalitta Charters, and Gulf & Caribbean Cargo running cross-border freight routes.

**Cross-border context (TX ↔ Mexico):**

In addition to the flights carrying cargo between Texas and Mexico included in the cleaned dataset, **1,748 repositioning and empty cargo departures** were operated on TX–Mexico routes (741 route-carrier-year records, 2015–2024). Notable operators:

| Route | Carrier | Year | Departures | Payload (lbs) |
|-------|---------|------|-----------|---------------|
| NLU→IAH | Turkish Airlines | 2024 | 72 | 16,158,384 |
| MEX→IAH | Turkish Airlines | 2023 | 70 | 15,709,540 |
| BJX→LRD | USA Jet Airlines | 2022 | 45 | 1,509,700 |
| HMO→ELP | USA Jet Airlines | 2022 | 37 | 1,058,200 |
| BJX→LRD | USA Jet Airlines | 2021 | 28 | 1,299,500 |
| ADS→QRO | Ameristar Air Cargo | 2022 | 24 | 511,440 |

These flights highlight existing cross-border air cargo infrastructure that operates even on return legs with no commercial load. They are excluded from the dashboard because they do not represent actual connectivity (no passengers or goods moved), but they demonstrate the scope of operational capacity on these corridors.

**Why market data also has all-zero rows (11,860 rows):**

Market data has no departure columns — only PASSENGERS, FREIGHT, MAIL. A zero-activity market row means a carrier filed a route/class/year but reported zero traffic moved end-to-end. Cross-referencing with segment data reveals three scenarios:

| Scenario | Approx. % | Explanation |
|----------|----------|-------------|
| Segment also zero traffic | ~57% | Route filed/authorized but never carried commercial traffic |
| Segment HAS traffic | ~24% | Multi-leg journeys where segments were active but the market O-D pair itself had no through-traffic |
| No segment match at all | ~19% | Reporting artifacts — carrier filed market data without corresponding segment records |

The 24% with segment traffic reflects how BTS market data counts passengers at the journey level: if a plane flew a leg empty but that leg was part of a larger routing, the market row for that specific O-D pair shows zero.

### 3.3 Exact Duplicate Rows

**Anomaly:**
Rows where every column is identical to another row. These are data artifacts from the extraction or BTS source.

**Approach:**
Filter out during analysis. The cleaning pipeline drops exact duplicate rows using pandas `drop_duplicates()`. As of the current extract, no exact duplicates were found in either dataset — the rule is a safety net for future extracts or expanded year ranges.

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

## 4b. Known Anomalies (No Action Required)

These are data quirks observed during the audit that do not require correction or filtering because they do not affect the analysis at the chosen level of aggregation.

### 4b.1 Aeromexico VSA→IAH Cumulative Filing (2004/09)

**Anomaly (observed in BTS_SEGMENT):**
A single record in the `BTS_SEGMENT` table for Aeromexico on the VSA (Minatitlán, Mexico) → IAH (Houston, TX) route in September 2004 reports 1,461 departures performed and ~108,000 passengers in one month. This is the only record for this carrier-route combination in 2004. A corresponding cumulative pattern likely exists in `BTS_MARKET` for the same route, though without the departures metric.

**Interpretation:**
The values are consistent with a full year of operations compressed into a single monthly filing — a cumulative or catch-up report rather than actual September activity. BTS carriers occasionally file accumulated data in a single month when prior months were missed or delayed.

**Why no action is needed:**
Since this project aggregates data at the **yearly** level, the annual totals for 2004 remain correct regardless of which month the data was filed under. The anomaly would only distort **monthly or seasonal** analysis on this route.

### 4b.2 BTS_SEGMENT Record Granularity (Split by Aircraft Type)

**Anomaly:**
BTS_SEGMENT data is split by **aircraft type** within each carrier/route/month combination. For example, American Airlines (AA) DFW→MEX in January 2023 has two rows: one for aircraft type 698 (9 departures) and one for aircraft type 614 (109 departures).

**Interpretation:**
This is by design, not duplication. BTS reports segment-level statistics per aircraft type, so a single carrier operating multiple aircraft types on the same route in the same month will produce multiple rows. Summing across aircraft types gives the correct route-level totals.

**Why no action is needed:**
The extraction scripts already aggregate across aircraft types when rolling up to yearly totals. This note is recorded so that analysts working with the raw monthly data or the source database understand why multiple rows may appear for what looks like the same carrier-route-month.

### 4b.3 Performed > Scheduled (Within Valid Range)

**Anomaly (observed in BTS_SEGMENT raw extract):**
Some rows have `DEPARTURES_PERFORMED > DEPARTURES_SCHEDULED` even when scheduled > 0.

**Current profile (2015–2024 extract):**
- `performed > scheduled` (where scheduled > 0): 1,417 rows
- High-ratio tail (`performed/scheduled >= 5`): 10 rows

**Why no action is needed:**
Most cases are modest deviations and are treated as operational/reporting variance. Only extreme scheduled-outlier cases (scheduled/performed > 100) are corrected.

### 4b.4 PASSENGERS > 0 with SEATS = 0 (Class P Edge Case)

**Anomaly (observed in BTS_SEGMENT raw extract):**
A very small number of rows report `PASSENGERS > 0` while `SEATS = 0`, all in `CLASS = P`.

**Current profile (2015–2024 extract):**
- `PASSENGERS > 0 & SEATS = 0 & DEPARTURES_PERFORMED > 0`: 4 rows

**Why no action is needed:**
The cases are rare, low-impact, and outside scheduled-service adherence logic. They are tracked as an edge-case anomaly.

### 4b.5 Semantic Duplicates After Normalization

**Anomaly (transformation artifact):**
After applying code/city standardization updates (for example, NLU city normalization), some rows can collapse into identical descriptor keys while retaining split metric values.

**Current profile before re-aggregation (2015–2024 extract):**
- Market: 5 duplicate descriptor groups
- Segment: 6 duplicate descriptor groups

**Action in pipeline:**
`Apply_Data_Cleaning.py` now re-aggregates metrics by descriptor keys after updates/corrections/filters/fill so normalized duplicates are collapsed deterministically.

### 4b.6 T-Prefix FAA LID Airport Codes (7 Small TX Airports)

**Anomaly:**
Seven airport codes beginning with "T" followed by a digit or alphanumeric suffix (T6X, T8X, T82, T2X, T3X, T5X, T9X) appear in the data. These are FAA Location Identifiers (FAA LIDs) for small Texas airports that do not have IATA codes. Combined: 88 market + 92 segment rows.

| Code | Airport ID | Airport Name | City | Activity | Years | Rows (M+S) |
|------|-----------|-------------|------|----------|-------|-------------|
| T6X | 16745 | Houston Executive | Houston, TX | Charter (151 PAX) | 2016–2024 | 28+30 |
| T8X | 16755 | Collin County Regional | McKinney, TX | Charter + cargo (75 PAX, 25K lbs FRT) | 2019–2025 | 46+47 |
| T82 | 16947 | Gillespie County | Fredericksburg, TX | Charter + FedEx feeder | 2022–2025 | 8+8 |
| T2X | 16694 | Hereford Municipal | Hereford, TX | Charter (10 PAX) | 2015 | 0+2 |
| T3X | 16702 | El Coyote Ranch (private) | Encino, TX | Int'l charter (4 PAX) | 2016 | 2+3 |
| T5X | 16709 | Castroville Municipal | Castroville, TX | FedEx feeder (3,688 lbs FRT) | 2016 | 2+2 |
| T9X | 16785 | Dimmit County | Carrizo Springs, TX | FedEx feeder (2,434 lbs FRT) | 2017 | 2+2 |

**Why no action is needed:**

1. **Valid FAA codes** — Unlike T1X/T4X (Section 2.3c/2.4), which had dual codes for the same airport ID, these T-codes are the *sole* identifier for their airport ID. There is no "correct" IATA code to normalize to.
2. **Negligible volume** — ~250 total passengers and ~33K lbs freight across all 7 airports over 10 years. This is noise-level data.
3. **Legitimate activity** — all rows are CLASS=L (charter), CLASS=P (non-scheduled cargo), CLASS=G (all-cargo), or CLASS=F (commuter). These represent real charter flights, air taxi operations, and FedEx feeder routes.
4. **T8X city name corrected** — the only factual error (BTS labeling McKinney as "Dallas") is addressed in Section 2.8.

> **Note for future agents:** If new T-prefix codes appear in expanded data, check whether they share an Airport ID with an existing IATA/FAA code (like T1X/T4X did). If so, normalize. If the T-code is the sole identifier, leave it as-is.

### 4b.7 DEPARTURES_SCHEDULED Missing-as-Zero (DU/IU + Class F)

**Anomaly:**
U.S. carriers (DATA_SOURCE = DU, IU) operating scheduled service (CLASS = F) sometimes report DEPARTURES_PERFORMED > 0 but DEPARTURES_SCHEDULED = 0. This affects ~14% of DU/F rows (5,293 rows) and ~13.5% of IU/F rows (1,457 rows). These zeros represent unreported schedule data, not a true absence of scheduled departures.

This is distinct from the well-known cases where DEPARTURES_SCHEDULED = 0 is expected:
- **Foreign carriers (IF/DF):** Not required to report schedules under T-100(f) regulations
- **Charters (CLASS = L/P):** No scheduled departures by definition

**Action:** A `SCHED_REPORTED` flag column is added to the cleaned segment CSV during Step 7 of the cleaning pipeline:
- `SCHED_REPORTED = 0`: Schedule data is unreported/unreliable (IF/DF foreign carriers + DU/IU Class F missing-as-zero)
- `SCHED_REPORTED = 1`: Schedule data is reported and trustworthy

**Impact:** Schedule adherence analysis should filter to `SCHED_REPORTED = 1 AND CLASS = 'F'` instead of the older `DEPARTURES_SCHEDULED > 0` check. The webapp's schedule adherence charts use this flag automatically.

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

The machine-parsable `data-cleaning.csv` file defines all cleaning rules. It is read by `Script/Apply_Data_Cleaning.py`.

**Columns:**

| Column | Values | Purpose |
|--------|--------|---------|
| `action` | `update`, `correct`, `delete`, `filter`, `fill` | Operation type |
| `target` | `csv`, `market`, `segment`, `geojson`, `all` | Which output file(s) |
| `airport_id` | Integer or blank | Match key for record-level ops |
| `field` | `CODE`, `CITY_NAME`, `STATE_NAME`, `ZERO_DISTANCE`, `ALL_ZERO_ACTIVITY`, `DEPARTURES_SCHEDULED_OUTLIER`, `DEPARTURES_SCHEDULED_CHARTER_OUTLIER`, `PASSENGERS_EXCEED_SEATS`, `DUPLICATE_ROWS` | Abstract field name, filter type, or correction type |
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

**Processing order (CSV):** updates → corrections → deletes → filters → fills (if `fill` rule exists) → re-aggregate normalized duplicate keys

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
| 2.5 | DEPARTURES_SCHEDULED outliers | Data entry error | — | ratio > 100 | — | Correct (set = performed) |
| 2.6 | DEPARTURES_SCHEDULED charter outliers | Charter data entry error | — | Class P/L, ratio > 10 | — | Correct (set = performed) |
| 2.7 | PASSENGERS exceeding SEATS | Reporting error | — | PAX > SEATS | — | Correct (cap at SEATS) |
| 2.8 | T8X city name (Dallas → McKinney) | City name error | 46 | 47 | — | Update city name |
| 3.1 | Self-flight rows (ORIGIN=DEST) | Not real routes | 237 | 316 | — | Filter out |
| 3.2 | All-zero activity | No activity | 11,921 | 14,552 | — | Filter out |
| 3.3 | Exact duplicate rows | Data artifact | 0 | 0 | — | Filter out (safety net) |
| 4.1 | Missing carrier names | Unresolvable | 27 | 27 | — | Acknowledged |
| 4b.3 | Performed > scheduled (sched>0) | Operational variance | — | 1,417 | — | Documented; no correction |
| 4b.4 | PASSENGERS > 0 with SEATS = 0 | Edge case | — | 4 | — | Documented; monitor |
| 4b.5 | Semantic duplicates after normalization | Transformation artifact | 5 groups | 6 groups | — | Re-aggregate in cleaner |
| 4b.6 | T-prefix FAA LID codes (7 small TX airports) | Valid FAA identifiers | 88 | 92 | — | No action; documented |
| 4b.7 | DEPARTURES_SCHEDULED missing-as-zero (DU/IU + F) | Unreported data | — | ~6,750 | — | SCHED_REPORTED flag (Step 7) |
| 5.1 | GeoJSON multi-version | Processing | — | — | 3,627 | Filter to IS_LATEST=1 |
| 5.2 | GeoJSON orphan airports | Processing | — | — | 79 | Scope to CSV IDs |
| 5.3 | Al Udeid (XJD → IUD) | Code mismatch | — | — | 1 | Update code |
