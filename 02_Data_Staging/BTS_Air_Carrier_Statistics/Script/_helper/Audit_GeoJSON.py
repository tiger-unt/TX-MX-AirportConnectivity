"""
Comprehensive Quality Audit of BTS Airport GeoJSON File
========================================================
Checks: coordinates, codes, IDs, closed/inactive, duplicates, missing data
"""

import json
from collections import Counter, defaultdict

script_dir = __import__('pathlib').Path(__file__).parent
GEOJSON_PATH = str(
    script_dir / ".." / "_temp" / "BTS_T-100_Airports_2015-2024.geojson"
)

def load_geojson(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def main():
    print("=" * 80)
    print("  GEOJSON AIRPORT FILE QUALITY AUDIT")
    print("=" * 80)

    data = load_geojson(GEOJSON_PATH)

    features = data.get("features", [])
    total = len(features)

    # ─── 1. BASIC STATS ─────────────────────────────────────────────────
    print("\n" + "=" * 80)
    print("  1. BASIC STATS")
    print("=" * 80)
    print(f"  Total features:    {total}")
    print(f"  GeoJSON type:      {data.get('type')}")
    print(f"  Collection name:   {data.get('name')}")
    crs = data.get("crs", {})
    crs_name = crs.get("properties", {}).get("name", "NOT SPECIFIED")
    print(f"  CRS:               {crs_name}")

    # Geometry types
    geom_types = Counter(
        f.get("geometry", {}).get("type") if f.get("geometry") else "NULL_GEOMETRY"
        for f in features
    )
    print(f"  Geometry types:    {dict(geom_types)}")

    # Properties/columns
    if features:
        props = list(features[0].get("properties", {}).keys())
        print(f"  Properties ({len(props)} columns):")
        for p in props:
            print(f"    - {p}")

    # ─── 2. COORDINATE VALIDATION ────────────────────────────────────────
    print("\n" + "=" * 80)
    print("  2. COORDINATE VALIDATION")
    print("=" * 80)

    null_coords = []
    lat_out_of_range = []
    lon_out_of_range = []
    near_zero = []  # within 0.1 degrees of (0,0)
    coord_map = defaultdict(list)  # (lon, lat) -> list of airport codes

    for i, f in enumerate(features):
        props = f.get("properties", {})
        geom = f.get("geometry")
        code = props.get("AIRPORT", "???")
        aid = props.get("AIRPORT_ID", "???")
        seq = props.get("AIRPORT_SEQ_ID", "???")

        if geom is None or geom.get("coordinates") is None:
            null_coords.append((i, code, aid, seq))
            continue

        coords = geom["coordinates"]
        if len(coords) < 2 or coords[0] is None or coords[1] is None:
            null_coords.append((i, code, aid, seq))
            continue

        lon, lat = coords[0], coords[1]

        if lat < -90 or lat > 90:
            lat_out_of_range.append((code, aid, seq, lat, lon))
        if lon < -180 or lon > 180:
            lon_out_of_range.append((code, aid, seq, lat, lon))
        if abs(lat) < 0.1 and abs(lon) < 0.1:
            near_zero.append((code, aid, seq, lat, lon))

        coord_key = (round(lon, 6), round(lat, 6))
        coord_map[coord_key].append((code, aid, seq))

    print(f"  Null/missing coordinates:       {len(null_coords)}")
    if null_coords:
        for item in null_coords[:10]:
            print(f"    Feature #{item[0]}: Code={item[1]}, ID={item[2]}, SEQ={item[3]}")

    print(f"  Latitude out of [-90, 90]:      {len(lat_out_of_range)}")
    if lat_out_of_range:
        for item in lat_out_of_range[:10]:
            print(f"    Code={item[0]}, ID={item[1]}, SEQ={item[2]}, lat={item[3]}, lon={item[4]}")

    print(f"  Longitude out of [-180, 180]:   {len(lon_out_of_range)}")
    if lon_out_of_range:
        for item in lon_out_of_range[:10]:
            print(f"    Code={item[0]}, ID={item[1]}, SEQ={item[2]}, lat={item[3]}, lon={item[4]}")

    print(f"  Airports at/near (0, 0):        {len(near_zero)}")
    if near_zero:
        for item in near_zero:
            print(f"    Code={item[0]}, ID={item[1]}, SEQ={item[2]}, lat={item[3]}, lon={item[4]}")

    # Duplicate coordinates (different AIRPORT codes at same exact location)
    dup_coords = {k: v for k, v in coord_map.items() if len(v) > 1}
    # Filter to only those where there are different AIRPORT codes
    dup_coords_diff_code = {}
    for k, v in dup_coords.items():
        codes = set(item[0] for item in v)
        if len(codes) > 1:
            dup_coords_diff_code[k] = v

    print(f"\n  Duplicate coords (same exact loc, different codes): {len(dup_coords_diff_code)}")
    if dup_coords_diff_code:
        for (lon, lat), airports in sorted(dup_coords_diff_code.items())[:20]:
            codes_str = ", ".join(f"{a[0]}(ID:{a[1]})" for a in airports)
            print(f"    ({lat}, {lon}): {codes_str}")

    # ─── 3. AIRPORT CODE ISSUES ──────────────────────────────────────────
    print("\n" + "=" * 80)
    print("  3. AIRPORT CODE ISSUES")
    print("=" * 80)

    code_counter = Counter()
    id_counter = Counter()
    null_code = []
    code_to_ids = defaultdict(set)
    id_to_codes = defaultdict(set)

    for f in features:
        props = f.get("properties", {})
        code = props.get("AIRPORT")
        aid = props.get("AIRPORT_ID")
        seq = props.get("AIRPORT_SEQ_ID")

        if code is None or str(code).strip() == "":
            null_code.append((aid, seq))
        else:
            code_counter[code] += 1
            code_to_ids[code].add(aid)

        if aid is not None:
            id_counter[aid] += 1
            id_to_codes[aid].add(code)

    print(f"  Null/blank AIRPORT codes:       {len(null_code)}")
    if null_code:
        for item in null_code[:10]:
            print(f"    AIRPORT_ID={item[0]}, AIRPORT_SEQ_ID={item[1]}")

    # Duplicate AIRPORT codes (same code appears multiple times)
    dup_codes = {k: v for k, v in code_counter.items() if v > 1}
    print(f"  AIRPORT codes appearing >1 time: {len(dup_codes)} (expected - multiple SEQ entries per airport)")

    # Duplicate AIRPORT_IDs (same ID appears multiple times)
    dup_ids = {k: v for k, v in id_counter.items() if v > 1}
    print(f"  AIRPORT_IDs appearing >1 time:   {len(dup_ids)} (expected - multiple SEQ entries per ID)")

    # Codes mapping to multiple IDs (PROBLEM - same code, different facility)
    code_multi_ids = {k: v for k, v in code_to_ids.items() if len(v) > 1}
    print(f"\n  AIRPORT codes mapping to MULTIPLE AIRPORT_IDs: {len(code_multi_ids)}")
    if code_multi_ids:
        for code, ids in sorted(code_multi_ids.items()):
            print(f"    Code '{code}' -> IDs: {sorted(ids)}")

    # IDs mapping to multiple codes (PROBLEM - facility changed code)
    id_multi_codes = {k: v for k, v in id_to_codes.items() if len(v) > 1}
    print(f"\n  AIRPORT_IDs mapping to MULTIPLE codes: {len(id_multi_codes)}")
    if id_multi_codes:
        for aid, codes in sorted(id_multi_codes.items()):
            print(f"    ID {aid} -> Codes: {sorted(codes)}")

    # Check for specific problem codes from corrections
    print("\n  --- Correction Check: Problem Codes ---")
    problem_codes = ["JQF", "NZC", "T1X", "T4X"]
    for pc in problem_codes:
        if pc in code_counter:
            print(f"    [FOUND] '{pc}' is present ({code_counter[pc]} features, IDs: {sorted(code_to_ids[pc])})")
        else:
            print(f"    [NOT FOUND] '{pc}' is NOT present (good if corrected)")

    print("\n  --- Correction Check: Corrected Codes ---")
    corrected_codes = ["USA", "VQQ", "GLE", "AQO"]
    for cc in corrected_codes:
        if cc in code_counter:
            print(f"    [FOUND] '{cc}' is present ({code_counter[cc]} features, IDs: {sorted(code_to_ids[cc])})")
        else:
            print(f"    [NOT FOUND] '{cc}' is NOT present")

    # ─── 4. AIRPORT ID CONSISTENCY ───────────────────────────────────────
    print("\n" + "=" * 80)
    print("  4. AIRPORT ID CONSISTENCY (Specific IDs)")
    print("=" * 80)

    check_ids = {
        16706: "Austin facility to delete",
        16852: "NLU - Felipe Angeles / Santa Lucia",
        12544: "Check code assignment",
        13788: "Check code assignment",
        16658: "Check code assignment",
        16879: "Check code assignment",
    }

    for check_id, desc in check_ids.items():
        matching = [
            f for f in features
            if f.get("properties", {}).get("AIRPORT_ID") == check_id
        ]
        if matching:
            print(f"\n  AIRPORT_ID {check_id} ({desc}): {len(matching)} feature(s)")
            for m in matching:
                p = m["properties"]
                print(f"    SEQ_ID:     {p.get('AIRPORT_SEQ_ID')}")
                print(f"    Code:       {p.get('AIRPORT')}")
                print(f"    Name:       {p.get('DISPLAY_AIRPORT_NAME')}")
                print(f"    City:       {p.get('DISPLAY_AIRPORT_CITY_NAME_FULL')}")
                print(f"    Country:    {p.get('AIRPORT_COUNTRY_NAME')}")
                print(f"    Is Closed:  {p.get('AIRPORT_IS_CLOSED')}")
                print(f"    Is Latest:  {p.get('AIRPORT_IS_LATEST')}")
                print(f"    Start:      {p.get('AIRPORT_START_DATE')}")
                print(f"    Thru:       {p.get('AIRPORT_THRU_DATE')}")
                geom = m.get("geometry", {})
                coords = geom.get("coordinates", [None, None])
                print(f"    Coords:     lon={coords[0]}, lat={coords[1]}")
                print()
        else:
            print(f"\n  AIRPORT_ID {check_id} ({desc}): NOT FOUND")

    # ─── 5. CLOSED / INACTIVE AIRPORTS ───────────────────────────────────
    print("\n" + "=" * 80)
    print("  5. CLOSED / INACTIVE AIRPORTS")
    print("=" * 80)

    closed = [f for f in features if f["properties"].get("AIRPORT_IS_CLOSED") == 1]
    not_latest = [f for f in features if f["properties"].get("AIRPORT_IS_LATEST") == 0]
    both = [
        f for f in features
        if f["properties"].get("AIRPORT_IS_CLOSED") == 1
        and f["properties"].get("AIRPORT_IS_LATEST") == 0
    ]

    print(f"  AIRPORT_IS_CLOSED = 1:          {len(closed)}")
    print(f"  AIRPORT_IS_LATEST = 0:          {len(not_latest)}")
    print(f"  Both closed AND not latest:     {len(both)}")

    if closed:
        print("\n  --- All Closed Airports ---")
        for f in closed:
            p = f["properties"]
            print(f"    Code={p.get('AIRPORT')}, ID={p.get('AIRPORT_ID')}, "
                  f"Name={p.get('DISPLAY_AIRPORT_NAME')}, "
                  f"IsLatest={p.get('AIRPORT_IS_LATEST')}, "
                  f"Start={p.get('AIRPORT_START_DATE')}, "
                  f"Thru={p.get('AIRPORT_THRU_DATE')}")

    # ─── 6. MULTIPLE ENTRIES PER AIRPORT ─────────────────────────────────
    print("\n" + "=" * 80)
    print("  6. MULTIPLE ENTRIES PER AIRPORT")
    print("=" * 80)

    print(f"\n  AIRPORT_IDs with multiple features (top 20 by count):")
    top_dup_ids = sorted(dup_ids.items(), key=lambda x: -x[1])[:20]
    for aid, count in top_dup_ids:
        codes = sorted(id_to_codes[aid])
        print(f"    ID {aid}: {count} features, Codes: {codes}")

    print(f"\n  Total unique AIRPORT_IDs:  {len(id_counter)}")
    print(f"  Total features:            {total}")
    print(f"  Avg features per ID:       {total / len(id_counter):.2f}")

    # Distribution of features per ID
    count_dist = Counter(id_counter.values())
    print(f"\n  Distribution of features per AIRPORT_ID:")
    for n_features in sorted(count_dist.keys()):
        print(f"    {n_features} feature(s): {count_dist[n_features]} airport IDs")

    # Codes appearing with multiple different IDs (re-display with more detail)
    print(f"\n  AIRPORT codes with MULTIPLE different AIRPORT_IDs (code reuse/reassignment):")
    if code_multi_ids:
        for code, ids in sorted(code_multi_ids.items()):
            details = []
            for aid in sorted(ids):
                matching = [
                    f for f in features
                    if f["properties"].get("AIRPORT_ID") == aid
                    and f["properties"].get("AIRPORT") == code
                ]
                if matching:
                    p = matching[0]["properties"]
                    details.append(
                        f"ID={aid}, Name='{p.get('DISPLAY_AIRPORT_NAME')}', "
                        f"City='{p.get('DISPLAY_AIRPORT_CITY_NAME_FULL')}'"
                    )
            print(f"    Code '{code}':")
            for d in details:
                print(f"      {d}")
    else:
        print("    None found.")

    # ─── 7. MISSING DATA ─────────────────────────────────────────────────
    print("\n" + "=" * 80)
    print("  7. MISSING DATA")
    print("=" * 80)

    null_name = []
    null_city = []
    null_country = []
    null_state = []

    for f in features:
        p = f.get("properties", {})
        code = p.get("AIRPORT", "???")
        aid = p.get("AIRPORT_ID", "???")

        if p.get("DISPLAY_AIRPORT_NAME") is None or str(p.get("DISPLAY_AIRPORT_NAME", "")).strip() == "":
            null_name.append((code, aid))
        if p.get("DISPLAY_AIRPORT_CITY_NAME_FULL") is None or str(p.get("DISPLAY_AIRPORT_CITY_NAME_FULL", "")).strip() == "":
            null_city.append((code, aid))
        if p.get("AIRPORT_COUNTRY_NAME") is None or str(p.get("AIRPORT_COUNTRY_NAME", "")).strip() == "":
            null_country.append((code, aid))
        if p.get("AIRPORT_STATE_NAME") is None:
            null_state.append((code, aid, p.get("AIRPORT_COUNTRY_NAME")))

    print(f"  Null DISPLAY_AIRPORT_NAME:              {len(null_name)}")
    if null_name:
        for item in null_name[:10]:
            print(f"    Code={item[0]}, ID={item[1]}")

    print(f"  Null DISPLAY_AIRPORT_CITY_NAME_FULL:    {len(null_city)}")
    if null_city:
        for item in null_city[:10]:
            print(f"    Code={item[0]}, ID={item[1]}")

    print(f"  Null AIRPORT_COUNTRY_NAME:              {len(null_country)}")
    if null_country:
        for item in null_country[:10]:
            print(f"    Code={item[0]}, ID={item[1]}")

    print(f"  Null AIRPORT_STATE_NAME:                {len(null_state)}")
    # Break down by country
    country_null_state = Counter(item[2] for item in null_state)
    print(f"  Null AIRPORT_STATE_NAME by country (top 20):")
    for country, count in country_null_state.most_common(20):
        print(f"    {country}: {count}")

    # ─── 8. CITY NAME CONSISTENCY (NLU / Airport ID 16852) ──────────────
    print("\n" + "=" * 80)
    print("  8. CITY NAME CONSISTENCY - NLU (Airport ID 16852)")
    print("=" * 80)

    nlu_features = [
        f for f in features
        if f["properties"].get("AIRPORT_ID") == 16852
    ]
    if nlu_features:
        for nf in nlu_features:
            p = nf["properties"]
            print(f"  SEQ_ID:    {p.get('AIRPORT_SEQ_ID')}")
            print(f"  Code:      {p.get('AIRPORT')}")
            print(f"  Name:      {p.get('DISPLAY_AIRPORT_NAME')}")
            print(f"  City Full: {p.get('DISPLAY_AIRPORT_CITY_NAME_FULL')}")
            print(f"  Market:    {p.get('DISPLAY_CITY_MARKET_NAME_FULL')}")
            print(f"  IsLatest:  {p.get('AIRPORT_IS_LATEST')}")
            print(f"  IsClosed:  {p.get('AIRPORT_IS_CLOSED')}")
            print()

        cities = set(
            nf["properties"].get("DISPLAY_AIRPORT_CITY_NAME_FULL")
            for nf in nlu_features
        )
        print(f"  Distinct city names for NLU (ID 16852): {cities}")
        if any("Zumpango" in str(c) for c in cities):
            print("  --> Contains 'Zumpango'")
        if any("Mexico City" in str(c) for c in cities):
            print("  --> Contains 'Mexico City'")
    else:
        print("  Airport ID 16852 (NLU) NOT FOUND in file.")

    # Also check by code NLU
    nlu_by_code = [f for f in features if f["properties"].get("AIRPORT") == "NLU"]
    if nlu_by_code and len(nlu_by_code) != len(nlu_features):
        print(f"\n  NOTE: Found {len(nlu_by_code)} features with code 'NLU' vs "
              f"{len(nlu_features)} with ID 16852")

    # ─── 9. ORPHANED AIRPORTS ────────────────────────────────────────────
    print("\n" + "=" * 80)
    print("  9. ORPHANED / SUPERSEDED AIRPORTS")
    print("=" * 80)

    orphaned = [
        f for f in features
        if f["properties"].get("AIRPORT_IS_LATEST") == 0
        and f["properties"].get("AIRPORT_IS_CLOSED") == 0
    ]
    print(f"  AIRPORT_IS_LATEST=0 AND AIRPORT_IS_CLOSED=0: {len(orphaned)}")
    print(f"  (These are old/superseded entries that are not closed)")

    # Check: how many unique AIRPORT_IDs have ONLY non-latest entries?
    latest_ids = set()
    all_ids = set()
    for f in features:
        p = f["properties"]
        aid = p.get("AIRPORT_ID")
        all_ids.add(aid)
        if p.get("AIRPORT_IS_LATEST") == 1:
            latest_ids.add(aid)

    ids_without_latest = all_ids - latest_ids
    print(f"\n  Unique AIRPORT_IDs total:             {len(all_ids)}")
    print(f"  Unique AIRPORT_IDs with a latest=1:   {len(latest_ids)}")
    print(f"  AIRPORT_IDs with NO latest=1 entry:   {len(ids_without_latest)}")

    if ids_without_latest:
        print(f"\n  --- IDs with NO 'is_latest=1' entry (first 30) ---")
        for aid in sorted(ids_without_latest)[:30]:
            matching = [
                f for f in features
                if f["properties"].get("AIRPORT_ID") == aid
            ]
            codes = set(m["properties"].get("AIRPORT") for m in matching)
            names = set(m["properties"].get("DISPLAY_AIRPORT_NAME") for m in matching)
            closed_vals = set(m["properties"].get("AIRPORT_IS_CLOSED") for m in matching)
            print(f"    ID {aid}: Codes={sorted(codes)}, Names={sorted(names)}, "
                  f"Closed={sorted(closed_vals)}, #features={len(matching)}")

    # ─── SUMMARY ─────────────────────────────────────────────────────────
    print("\n" + "=" * 80)
    print("  SUMMARY")
    print("=" * 80)
    print(f"  Total features:                        {total}")
    print(f"  Unique AIRPORT codes:                  {len(code_counter)}")
    print(f"  Unique AIRPORT_IDs:                    {len(id_counter)}")
    print(f"  Null coordinates:                      {len(null_coords)}")
    print(f"  Lat out of range:                      {len(lat_out_of_range)}")
    print(f"  Lon out of range:                      {len(lon_out_of_range)}")
    print(f"  Near (0,0):                            {len(near_zero)}")
    print(f"  Dup coords (diff codes):               {len(dup_coords_diff_code)}")
    print(f"  Null/blank codes:                      {len(null_code)}")
    print(f"  Codes -> multi IDs:                    {len(code_multi_ids)}")
    print(f"  IDs -> multi codes:                    {len(id_multi_codes)}")
    print(f"  Closed airports:                       {len(closed)}")
    print(f"  Not-latest entries:                    {len(not_latest)}")
    print(f"  Orphaned (not-latest, not-closed):     {len(orphaned)}")
    print(f"  IDs with no latest entry:              {len(ids_without_latest)}")
    print(f"  Null DISPLAY_AIRPORT_NAME:             {len(null_name)}")
    print(f"  Null DISPLAY_AIRPORT_CITY_NAME_FULL:   {len(null_city)}")
    print(f"  Null AIRPORT_COUNTRY_NAME:             {len(null_country)}")
    print(f"  Null AIRPORT_STATE_NAME:               {len(null_state)}")
    print("=" * 80)
    print("  AUDIT COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    main()
