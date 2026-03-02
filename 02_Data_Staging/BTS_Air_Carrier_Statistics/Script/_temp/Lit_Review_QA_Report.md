# Literature Review QA Report
**Date**: 2026-03-01
**File reviewed**: `Air_Connectivity_Review_V2.md` (converted from .docx)
**Data files used for verification**:
- `BTS_T-100_Market_2015-2024.csv` (94,115 rows, updated 2026-03-01 17:23)
- `BTS_T-100_Segment_2015-2024.csv` (94,228 rows)
- `BTS_T-100_Airports_2015-2024.geojson`

## Verification Scope

This report cross-references quantitative claims in the literature review against the processed BTS T-100 Market dataset. Tables and narrative claims that reference BTS T-100 data are verified directly. Tables referencing other data sources (TransBorder Freight, Mexican government data, FAA facility data) are noted but cannot be verified against our datasets.

### Quick Summary

| Category | Checked | Passed | Issues |
|----------|---------|--------|--------|
| Table data points | 135 | 135 | 0 |
| Narrative claims | 19 | 17 | 2 |
| Confirmed issues | - | - | 3 |
| Gray areas / Notes | - | - | 6 |

---

## Table 5: US-Mexico Air Cargo by US State (2024)

All values in 1,000s of lbs.

| State | Export (MD) | Export (Data) | Import (MD) | Import (Data) | Total (MD) | Total (Data) | Status |
|-------|-----------|-------------|-----------|-------------|----------|------------|--------|
| KY | 129,407 | 129,407 | 109,772 | 109,772 | 239,179 | 239,179 | PASS |
| CA | 78,410 | 78,410 | 103,631 | 103,631 | 182,040 | 182,041 | PASS |
| AK | 141,837 | 141,837 | 3,823 | 3,823 | 145,660 | 145,660 | PASS |
| TN | 97,409 | 97,409 | 3,106 | 3,106 | 100,514 | 100,515 | PASS |
| FL | 23,460 | 23,460 | 22,297 | 22,297 | 45,756 | 45,757 | PASS |
| TX | 17,431 | 17,431 | 5,532 | 5,532 | 22,963 | 22,963 | PASS |
| NY | 7,111 | 7,111 | 13,460 | 13,460 | 20,571 | 20,571 | PASS |
| GA | 901 | 901 | 1,875 | 1,875 | 2,776 | 2,776 | PASS |
| MI | 867 | 867 | 1,373 | 1,373 | 2,240 | 2,240 | PASS |
| IL | 1,078 | 1,078 | 1,016 | 1,016 | 2,094 | 2,094 | PASS |
| OH | 859 | 859 | 505 | 505 | 1,365 | 1,364 | PASS |
| NJ | 80 | 80 | 1,098 | 1,098 | 1,178 | 1,178 | PASS |
| MA | 0 | 0 | 412 | 412 | 412 | 412 | PASS |
| HI | 104 | 104 | 196 | 196 | 299 | 300 | PASS |
| IN | 156 | 156 | 112 | 112 | 268 | 268 | PASS |
| VA | 212 | 212 | 46 | 46 | 258 | 258 | PASS |
| MO | 34 | 34 | 169 | 169 | 202 | 203 | PASS |
| OR | 183 | 183 | 13 | 13 | 196 | 196 | PASS |
| PR | 182 | 182 | 0 | 0 | 182 | 182 | PASS |
| SC | 12 | 12 | 161 | 161 | 173 | 173 | PASS |
| NC | 62 | 62 | 89 | 89 | 151 | 151 | PASS |
| CO | 35 | 35 | 93 | 93 | 128 | 128 | PASS |
| AL | 48 | 48 | 62 | 62 | 110 | 110 | PASS |
| UT | 23 | 23 | 82 | 82 | 106 | 105 | PASS |
| LA | 74 | 74 | 16 | 16 | 90 | 90 | PASS |
| AZ | 70 | 70 | 17 | 17 | 87 | 87 | PASS |
| WA | 36 | 36 | 35 | 35 | 72 | 71 | PASS |
| MN | 55 | 55 | 6 | 6 | 61 | 61 | PASS |
| PA | 1 | 1 | 56 | 56 | 57 | 57 | PASS |
| IA | 38 | 38 | 0 | 0 | 38 | 38 | PASS |
| MS | 29 | 29 | 0 | 0 | 29 | 29 | PASS |
| WI | 0 | 0 | 5 | 5 | 5 | 5 | PASS |
| MD | 0 | 0 | 2 | 2 | 2 | 2 | PASS |
| NH | 1 | 1 | 0 | 0 | 1 | 1 | PASS |
| NV | 0 | 0 | 0 | 0 | 1 | 0 | PASS |
| **Total** | **500,206** | **500,206** | **269,059** | **269,059** | **769,264** | **769,265** | PASS |

## Table 6: US-Mexico Air Passengers by US State (2024)

All values in 1,000s of passengers.

| State | Dep (MD) | Dep (Data) | Arr (MD) | Arr (Data) | Total (MD) | Total (Data) | Status |
|-------|---------|-----------|---------|-----------|----------|------------|--------|
| TX | 5,552 | 5,552.1 | 5,485 | 5,484.6 | 11,037 | 11,036.7 | PASS |
| CA | 4,098 | 4,097.8 | 4,083 | 4,083.0 | 8,181 | 8,180.8 | PASS |
| IL | 1,674 | 1,673.7 | 1,688 | 1,687.6 | 3,361 | 3,361.3 | PASS |
| FL | 1,518 | 1,517.6 | 1,511 | 1,510.8 | 3,028 | 3,028.4 | PASS |
| GA | 1,038 | 1,037.5 | 1,038 | 1,037.7 | 2,075 | 2,075.2 | PASS |
| NY | 906 | 906.0 | 907 | 907.0 | 1,813 | 1,813.0 | PASS |
| AZ | 785 | 784.8 | 773 | 773.5 | 1,558 | 1,558.3 | PASS |
| CO | 735 | 735.0 | 748 | 747.8 | 1,483 | 1,482.8 | PASS |
| WA | 463 | 462.7 | 462 | 461.7 | 924 | 924.4 | PASS |
| NV | 436 | 436.5 | 446 | 445.6 | 882 | 882.1 | PASS |
| NC | 400 | 399.8 | 404 | 403.7 | 804 | 803.5 | PASS |
| NJ | 399 | 399.5 | 394 | 394.3 | 794 | 793.8 | PASS |
| MN | 374 | 374.2 | 371 | 371.1 | 745 | 745.3 | PASS |
| MI | 313 | 312.7 | 317 | 317.2 | 630 | 629.9 | PASS |
| UT | 284 | 283.8 | 282 | 281.6 | 565 | 565.4 | PASS |
| PA | 220 | 220.3 | 223 | 222.5 | 443 | 442.8 | PASS |
| MO | 202 | 202.3 | 207 | 206.5 | 409 | 408.8 | PASS |
| VA | 178 | 178.3 | 184 | 184.2 | 363 | 362.5 | PASS |
| MA | 171 | 170.8 | 170 | 170.3 | 341 | 341.1 | PASS |
| MD | 139 | 138.6 | 142 | 142.0 | 281 | 280.6 | PASS |
| OR | 123 | 122.9 | 123 | 122.9 | 246 | 245.8 | PASS |
| OH | 56 | 55.9 | 57 | 56.9 | 113 | 112.8 | PASS |
| TN | 28 | 28.0 | 27 | 27.2 | 55 | 55.2 | PASS |
| KY | 26 | 25.7 | 26 | 26.3 | 52 | 52.0 | PASS |
| LA | 21 | 21.3 | 21 | 21.5 | 43 | 42.8 | PASS |
| IN | 15 | 14.6 | 15 | 15.0 | 30 | 29.6 | PASS |
| WI | 12 | 12.3 | 12 | 12.1 | 24 | 24.4 | PASS |
| PR | 5 | 4.5 | 5 | 4.6 | 9 | 9.1 | PASS |
| CT | 1 | 1.4 | 1 | 1.0 | 2 | 2.4 | PASS |
| KS | 1 | 1.2 | 0 | 0.0 | 1 | 1.2 | PASS |
| IA | 0 | 0.3 | 0 | 0.2 | 1 | 0.5 | PASS |
| ND | 0 | 0.2 | 0 | 0.2 | 0 | 0.4 | PASS |
| NE | 0 | 0.2 | 0 | 0.2 | 0 | 0.4 | PASS |
| SD | 0 | 0.2 | 0 | 0.0 | 0 | 0.2 | PASS |
| SC | 0 | 0.0 | 0 | 0.1 | 0 | 0.1 | PASS |
| **Total** | **20,173** | **20,172.9** | **20,121** | **20,121.0** | **40,294** | **40,293.9** | PASS |

## Table 13: TX-Mexico Air Cargo by Airport (2024)

All values in 1,000s of lbs. Export = freight sent to counterpart, Import = freight received from counterpart.

| Airport | Export (MD) | Export (Data) | Import (MD) | Import (Data) | Total (MD) | Total (Data) | Status |
|---------|-----------|-------------|-----------|-------------|----------|------------|--------|
| GDL | 241.1 | 241.1 | 13227.7 | 13227.7 | 13468.8 | 13468.8 | PASS |
| SAT | 12400.1 | 12400.1 | 0.4 | 0.4 | 12400.6 | 12400.5 | PASS |
| DFW | 1432.0 | 1432.0 | 1459.9 | 1459.9 | 2891.8 | 2891.9 | PASS |
| IAH | 1415.7 | 1415.7 | 1255.2 | 1255.2 | 2670.8 | 2670.9 | PASS |
| NLU | 520.7 | 520.7 | 2062.5 | 2062.5 | 2583.2 | 2583.2 | PASS |
| ELP | 512.3 | 512.3 | 1968.2 | 1968.2 | 2480.5 | 2480.5 | PASS |
| CUU | 1977.8 | 1977.8 | 502.2 | 502.2 | 2480.0 | 2480.0 | PASS |
| MEX | 1121.3 | 1121.3 | 702.0 | 702.0 | 1823.3 | 1823.3 | PASS |
| AUS | 1354.3 | 1354.3 | 0.1 | 0.1 | 1354.4 | 1354.4 | PASS |
| LRD | 216.8 | 216.8 | 612.9 | 612.9 | 829.7 | 829.7 | PASS |
| CUN | 300.3 | 300.3 | 318.0 | 318.0 | 618.3 | 618.3 | PASS |
| SLW | 442.1 | 442.1 | 77.8 | 77.8 | 519.9 | 519.9 | PASS |
| MTY | 115.3 | 115.3 | 168.5 | 168.5 | 283.8 | 283.8 | PASS |
| PVR | 187.6 | 187.6 | 77.1 | 77.1 | 264.7 | 264.7 | PASS |
| QRO | 218.0 | 218.0 | 36.8 | 36.8 | 254.7 | 254.8 | PASS |
| MID | 226.9 | 226.9 | 23.8 | 23.8 | 250.7 | 250.7 | PASS |
| AFW | 0.4 | 0.4 | 179.8 | 179.8 | 180.3 | 180.2 | PASS |
| BJX | 101.7 | 101.7 | 43.8 | 43.8 | 145.4 | 145.5 | PASS |
| SJD | 17.2 | 17.2 | 76.1 | 76.1 | 93.3 | 93.3 | PASS |
| HOU | 33.7 | 33.7 | 52.6 | 52.6 | 86.3 | 86.3 | PASS |
| MFE | 64.6 | 64.6 | 0 | 0.0 | 64.6 | 64.6 | PASS |
| SLP | 2.9 | 2.9 | 52.4 | 52.4 | 55.3 | 55.3 | PASS |
| CZM | 21.2 | 21.2 | 17.1 | 17.1 | 38.2 | 38.3 | PASS |
| HMO | 0 | 0.0 | 37.7 | 37.7 | 37.7 | 37.7 | PASS |
| PBC | 33.2 | 33.2 | 0 | 0.0 | 33.2 | 33.2 | PASS |

## Table 14: TX-Mexico Air Passengers by Airport (2024)

All values in 1,000s of passengers.

| Airport | Dep (MD) | Dep (Data) | Arr (MD) | Arr (Data) | Total (MD) | Total (Data) | Status |
|---------|---------|-----------|---------|-----------|----------|------------|--------|
| DFW | 2561.2 | 2561.2 | 2516.9 | 2516.9 | 5078.1 | 5078.1 | PASS |
| IAH | 2036.3 | 2036.3 | 2002.0 | 2002.0 | 4038.3 | 4038.3 | PASS |
| CUN | 1243.3 | 1243.3 | 1232.6 | 1232.6 | 2475.9 | 2475.9 | PASS |
| MEX | 922.5 | 922.5 | 960.9 | 960.9 | 1883.4 | 1883.4 | PASS |
| MTY | 526.7 | 526.7 | 535.8 | 535.8 | 1062.6 | 1062.5 | PASS |
| SJD | 510.6 | 510.6 | 502.8 | 502.8 | 1013.4 | 1013.4 | PASS |
| GDL | 459.5 | 459.5 | 466.2 | 466.2 | 925.7 | 925.7 | PASS |
| SAT | 358.3 | 358.3 | 359.4 | 359.4 | 717.7 | 717.7 | PASS |
| PVR | 317.1 | 317.1 | 318.3 | 318.3 | 635.4 | 635.4 | PASS |
| HOU | 309.3 | 309.3 | 309.3 | 309.3 | 618.6 | 618.6 | PASS |
| QRO | 283.5 | 283.5 | 292.2 | 292.2 | 575.7 | 575.7 | PASS |
| BJX | 257.3 | 257.3 | 264.0 | 264.0 | 521.4 | 521.3 | PASS |
| AUS | 245.2 | 245.2 | 260.8 | 260.8 | 506.0 | 506.0 | PASS |
| CZM | 135.1 | 135.1 | 132.9 | 132.9 | 268.0 | 268.0 | PASS |
| SLP | 113.5 | 113.5 | 117.6 | 117.6 | 231.1 | 231.1 | PASS |
| TQO | 92.9 | 92.9 | 95.0 | 95.0 | 187.9 | 187.9 | PASS |
| AGU | 77.0 | 77.0 | 80.4 | 80.4 | 157.5 | 157.4 | PASS |
| OAX | 76.0 | 76.0 | 79.0 | 79.0 | 155.0 | 155.0 | PASS |
| MID | 76.9 | 76.9 | 78.0 | 78.0 | 154.9 | 154.9 | PASS |
| MLM | 60.0 | 60.0 | 65.4 | 65.4 | 125.4 | 125.4 | PASS |
| NLU | 52.5 | 52.5 | 47.8 | 47.8 | 100.3 | 100.3 | PASS |
| CUU | 47.5 | 47.5 | 48.1 | 48.1 | 95.6 | 95.6 | PASS |
| VER | 47.6 | 47.6 | 47.3 | 47.3 | 94.9 | 94.9 | PASS |
| TRC | 34.6 | 34.6 | 36.1 | 36.1 | 70.7 | 70.7 | PASS |
| DGO | 29.9 | 29.9 | 31.8 | 31.8 | 61.7 | 61.7 | PASS |
| MZT | 27.8 | 27.8 | 27.6 | 27.6 | 55.4 | 55.4 | PASS |
| MFE | 22.8 | 22.8 | 26.5 | 26.5 | 49.4 | 49.3 | PASS |
| TAM | 22.7 | 22.7 | 23.0 | 23.0 | 45.7 | 45.7 | PASS |
| ZIH | 21.0 | 21.0 | 19.2 | 19.2 | 40.2 | 40.2 | PASS |
| ZCL | 15.1 | 15.1 | 16.1 | 16.1 | 31.2 | 31.2 | PASS |
| HUX | 9.8 | 9.8 | 9.6 | 9.6 | 19.5 | 19.4 | PASS |
| PBC | 9.5 | 9.5 | 9.6 | 9.6 | 19.1 | 19.1 | PASS |
| HRL | 9.8 | 9.8 | 3.9 | 3.9 | 13.7 | 13.7 | PASS |
| DAL | 5.4 | 5.4 | 5.2 | 5.2 | 10.7 | 10.6 | PASS |
| CSL | 5.3 | 5.3 | 5.4 | 5.4 | 10.6 | 10.7 | PASS |
| ZLO | 4.2 | 4.2 | 4.3 | 4.3 | 8.5 | 8.5 | PASS |
| ACA | 2.6 | 2.6 | 2.9 | 2.9 | 5.6 | 5.5 | PASS |
| LTO | 2.3 | 2.3 | 2.3 | 2.3 | 4.7 | 4.6 | PASS |
| ELP | 3.9 | 3.9 | 0.0 | 0.0 | 3.9 | 3.9 | PASS |
| CRP | 0.0 | 0.0 | 0.4 | 0.4 | 0.4 | 0.4 | PASS |

---

## Narrative Claims Verification

| # | Claim | Expected | Actual | Status |
|---|-------|----------|--------|--------|
| N1 | TX ranks 6th in US-MX air cargo (by weight) | 6th | 6th | PASS |
| N2 | TX accounts for ~3% of US-MX air cargo | ~3% | 3.0% | PASS |
| N3 | TX ranks 1st in US-MX air passengers | 1st | 1st | PASS |
| N4 | TX accounts for 27.4% of US-MX air passengers | 27.4% | 27.4% | PASS |
| N5 | States above TX in cargo: KY, CA, Arkansas, TN, FL | KY,CA,AK,TN,FL | KY,CA,AK,TN,FL | PASS |
| N6 | SAT handled most TX-MX cargo (among TX airports) | SAT | SAT | PASS |
| N7 | DFW handled most TX-MX passengers (among TX airports) | DFW | DFW | PASS |
| N8 | Border airports = 14.7% of TX-MX cargo | 14.7% | 14.7% | PASS |
| N9 | Border airports export 4.6% of TX-MX cargo exports | 4.6% | 4.6% | PASS |
| N10 | Border airports import 46.7% of TX-MX cargo imports | 46.7% | 46.7% | PASS |
| N11 | Border airports = 0.6% of TX-MX passengers (total) | 0.6% | 0.6% | PASS |
| N12 | Border pax = 67,000 out of 11,036,800 total | 67,000 total | 67,029 total | PASS (fixed in updated docx) |
| N13 | MFE-NLU = 77.4% of border arrivals from MX | 77.4% | 77.3% | PASS |
| N14 | MFE-NLU = 54.4% of border departures to MX | 54.4% | 54.2% | PASS |
| N15 | LRD+ELP = 98% of border air cargo | 98% | 98.1% | PASS |
| N16 | ELP-CUU = 91.8% of ELP cargo exports to MX | 91.8% | 91.8% | PASS |
| N17 | SLW = 43.7% of LRD cargo imports | 43.7% | 43.7% | PASS |
| N18 | SLW = 35.3% of LRD cargo exports | 35.3% | 35.4% | PASS |
| N19 | Figure 2 shows trends from 2000 to 2024 | 2000-2024 | 2015-2024 | MISMATCH |

---

## Issues and Concerns Summary

### Confirmed Issues

- **ISSUE** [N5]: The MD text (Section 3.2 narrative) states that 'Kentucky, California, **Arkansas**, Tennessee, and Florida rank higher than Texas'. The data shows **Alaska** (AK) ranks 3rd, not Arkansas (AR). Arkansas does not appear in Table 5 at all. This appears to be a text error confusing AK (Alaska) with AR (Arkansas).
- ~~FIXED~~ [N12]: Previously stated '36,500 out of 11,036,800 total passengers'. Updated docx now correctly says '67,000 out of 11,036,800 total passengers', which matches the data (67,029). Also fixed 'George Bus' to 'George Bush' in this section.
- *GRAY AREA* [N19]: Figure 2 narrative says 'from 2000 to 2024', but our processed data only covers 2015-2024. This may not be an error if the author used a separate data extraction for Figure 2 with a wider year range. However, it cannot be verified against the current dataset.
- *GRAY AREA* [Totals]: Table 5 US total: MD=769,264, Data=769,265. Difference of 1 (1000 lbs). This is a rounding artifact from summing individually rounded state values.
- **GRAY AREA** [Table 15]: SAT Export/Import ratio displays as 29,040.1 which is correct when computed from raw values (12,400,127 lbs / 427 lbs = 29,040.1). However, dividing the displayed rounded values (12,400.1 / 0.4 = 31,000.25) yields a very different result. This is a presentation concern: the ratio is technically correct but cannot be reproduced from the values shown in the same table row.
- *GRAY AREA* [Table 1]: Table 1 (Mexico Airport Groups): GAP shows no count for Domestic or International columns but Total=11. The data appears incomplete.
- NOTE [Tables 9-12]: Tables 9-12 use BTS TransBorder Freight Data (commodity-level trade data), which is a different dataset from the T-100 Market data. These tables cannot be verified against our processed T-100 data files.
- NOTE [Tables 2-4]: Tables 2-4 use Mexican government data (AFAC/airport group statistics). These cannot be verified against our BTS T-100 data.
- NOTE [Tables 7-8]: Tables 7-8 (airport runway characteristics) use FAA/AFAC airport facility data, not BTS T-100 data. These cannot be verified against our datasets.
- *GRAY AREA* [Text]: MD text (Section 4.3, Table 13 text) refers to 'George Bus Intercontinental airport' - should be 'George Bush Intercontinental airport' (missing 'h').
- *GRAY AREA* [Text]: MD text (Section 4.3, Table 14/16 text) also says 'George Bus Intercontinental' - same typo.
- *GRAY AREA* [Text]: Table 10 import value for Computer-Related Machinery is listed as '$207,695,1230' - appears to have an extra digit (should likely be '$207,695,123').