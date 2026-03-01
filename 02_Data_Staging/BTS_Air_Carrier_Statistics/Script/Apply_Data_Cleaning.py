"""
Apply Data Cleaning Rules to BTS T-100 Extracted Data
======================================================
Reads data-cleaning.csv and applies all cleaning rules to raw Market CSV,
Segment CSV, and Airport GeoJSON from _temp/. Writes cleaned output to
03_Process_Data/BTS/.

Usage:
    python Apply_Data_Cleaning.py

Author: Generated for TxDOT IAC 2025-26 Task 6
Date: February 2026
"""

import pandas as pd
import json
from pathlib import Path

# ============================================================================
# PATH CONFIGURATION
# ============================================================================

script_dir = Path(__file__).parent
cleaning_dir = script_dir / ".." / "Database" / "data-cleaning"
input_dir = script_dir / "_temp"
output_dir = script_dir / ".." / ".." / ".." / "03_Process_Data" / "BTS"

CLEANING_CSV = cleaning_dir / "data-cleaning.csv"
STATES_LOOKUP = cleaning_dir / "missing-states.csv"

START_YEAR = 2015
END_YEAR = 2024
MARKET_FILE = f"BTS_T-100_Market_{START_YEAR}-{END_YEAR}.csv"
SEGMENT_FILE = f"BTS_T-100_Segment_{START_YEAR}-{END_YEAR}.csv"
GEOJSON_FILE = f"BTS_T-100_Airports_{START_YEAR}-{END_YEAR}.geojson"

# ============================================================================
# FIELD MAPPING — Abstract field names to actual column names
# ============================================================================

# CSV: (origin_id_col, origin_val_col, dest_id_col, dest_val_col)
CSV_FIELD_MAP = {
    "CODE":       ("ORIGIN_AIRPORT_ID", "ORIGIN",           "DEST_AIRPORT_ID", "DEST"),
    "CITY_NAME":  ("ORIGIN_AIRPORT_ID", "ORIGIN_CITY_NAME", "DEST_AIRPORT_ID", "DEST_CITY_NAME"),
    "STATE_NAME": ("ORIGIN_AIRPORT_ID", "ORIGIN_STATE_NM",  "DEST_AIRPORT_ID", "DEST_STATE_NM"),
}

# GeoJSON: abstract field -> property name
GEOJSON_FIELD_MAP = {
    "CODE":       "AIRPORT",
    "CITY_NAME":  "DISPLAY_AIRPORT_CITY_NAME_FULL",
    "STATE_NAME": "AIRPORT_STATE_NAME",
}

# State fill join keys — CSV: (airport_code_col, city_name_col, state_col)
CSV_STATE_KEYS = {
    "origin": ("ORIGIN", "ORIGIN_CITY_NAME", "ORIGIN_STATE_NM"),
    "dest":   ("DEST",   "DEST_CITY_NAME",   "DEST_STATE_NM"),
}

# GeoJSON state fill join keys
GEO_STATE_KEYS = ("AIRPORT", "DISPLAY_AIRPORT_CITY_NAME_FULL", "AIRPORT_STATE_NAME")

# Metric columns used for post-cleaning re-aggregation after code/city normalization
CSV_METRIC_COLUMNS = {
    "market": ["PASSENGERS", "FREIGHT", "MAIL", "DISTANCE"],
    "segment": [
        "DEPARTURES_SCHEDULED",
        "DEPARTURES_PERFORMED",
        "PAYLOAD",
        "SEATS",
        "PASSENGERS",
        "FREIGHT",
        "MAIL",
        "DISTANCE",
        "RAMP_TO_RAMP",
        "AIR_TIME",
    ],
}


# ============================================================================
# CLEANING FUNCTIONS
# ============================================================================

def load_cleaning_rules(path):
    """Load and parse data-cleaning.csv."""
    rules = pd.read_csv(path, dtype={"airport_id": "Int64"})
    print(f"[SUCCESS] Loaded {len(rules)} cleaning rules from {path.name}")
    return rules


def applies_to_csv(target, csv_type):
    """Check if a rule target applies to a given CSV type (market/segment)."""
    if target in ("csv", "all"):
        return True
    if target == csv_type:
        return True
    return False


def applies_to_geojson(target):
    """Check if a rule target applies to the GeoJSON."""
    return target in ("geojson", "all")


def has_state_fill_rule(rules, target_kind, csv_type=None):
    """
    Check whether STATE_NAME fill is enabled by rules for a target.
    target_kind: "csv" or "geojson"
    """
    fill_rules = rules[
        (rules["action"] == "fill") &
        (rules["field"] == "STATE_NAME")
    ]
    if fill_rules.empty:
        return False

    if target_kind == "geojson":
        return any(applies_to_geojson(t) for t in fill_rules["target"])

    if target_kind == "csv":
        if csv_type is None:
            return False
        return any(applies_to_csv(t, csv_type) for t in fill_rules["target"])

    return False


def resolve_states_lookup_path(rules):
    """Resolve lookup path for STATE_NAME fill rules. Returns None if no fill rule."""
    fill_rules = rules[
        (rules["action"] == "fill") &
        (rules["field"] == "STATE_NAME")
    ]
    if fill_rules.empty:
        return None

    # Support explicit lookup filename in old_value, fallback to default
    value_series = fill_rules["old_value"].dropna().astype(str).str.strip()
    lookup_value = value_series.iloc[0] if not value_series.empty else ""
    if lookup_value:
        lookup_path = Path(lookup_value)
        if not lookup_path.is_absolute():
            lookup_path = cleaning_dir / lookup_path
        return lookup_path

    return STATES_LOOKUP


def apply_csv_updates(df, rules, csv_type):
    """Apply update rules to a CSV DataFrame."""
    total_changed = 0
    update_rules = rules[rules["action"] == "update"]

    for _, rule in update_rules.iterrows():
        if not applies_to_csv(rule["target"], csv_type):
            continue

        field = rule["field"]
        airport_id = rule["airport_id"]
        old_val = rule["old_value"]
        new_val = rule["new_value"]

        if field not in CSV_FIELD_MAP:
            continue

        o_id_col, o_val_col, d_id_col, d_val_col = CSV_FIELD_MAP[field]

        # Update origin side
        mask_o = (df[o_id_col] == airport_id) & (df[o_val_col] == old_val)
        count_o = mask_o.sum()
        if count_o > 0:
            df.loc[mask_o, o_val_col] = new_val

        # Update destination side
        mask_d = (df[d_id_col] == airport_id) & (df[d_val_col] == old_val)
        count_d = mask_d.sum()
        if count_d > 0:
            df.loc[mask_d, d_val_col] = new_val

        changed = count_o + count_d
        if changed > 0:
            total_changed += changed
            print(f"  [UPDATE] {field} ID {airport_id}: {old_val} -> {new_val} ({count_o}o + {count_d}d = {changed} rows)")

    return total_changed


def apply_csv_corrections(df, rules, csv_type):
    """Apply correct rules to a CSV DataFrame (value-based fixes)."""
    total_corrected = 0
    correct_rules = rules[rules["action"] == "correct"]

    for _, rule in correct_rules.iterrows():
        if not applies_to_csv(rule["target"], csv_type):
            continue

        field = rule["field"]

        if field == "DEPARTURES_SCHEDULED_OUTLIER":
            # Fix rows where DEPARTURES_SCHEDULED is absurdly higher than DEPARTURES_PERFORMED
            # These are data entry errors (extra digits or miskeyed values)
            performed = df["DEPARTURES_PERFORMED"]
            scheduled = df["DEPARTURES_SCHEDULED"]
            mask = (performed > 0) & (scheduled / performed > 100)
            count = mask.sum()
            if count > 0:
                df.loc[mask, "DEPARTURES_SCHEDULED"] = df.loc[mask, "DEPARTURES_PERFORMED"]
                total_corrected += count
                print(f"  [CORRECT] {field}: fixed {count} rows (set DEPARTURES_SCHEDULED = DEPARTURES_PERFORMED)")

        elif field == "PASSENGERS_EXCEED_SEATS":
            # Cap PASSENGERS at SEATS where passengers exceed available seats
            # These are reporting errors (only applies to segment data which has SEATS)
            if "SEATS" in df.columns:
                mask = (df["PASSENGERS"] > df["SEATS"]) & (df["SEATS"] > 0)
                count = mask.sum()
                if count > 0:
                    df.loc[mask, "PASSENGERS"] = df.loc[mask, "SEATS"]
                    total_corrected += count
                    print(f"  [CORRECT] {field}: capped {count} rows (set PASSENGERS = SEATS)")
                else:
                    print(f"  [CORRECT] {field}: no rows to fix")
            else:
                print(f"  [CORRECT] {field}: skipped (no SEATS column in {csv_type})")

        else:
            print(f"  [WARNING] Unknown correction type: {field}")

    return total_corrected


def apply_csv_deletes(df, rules, csv_type):
    """Apply delete rules to a CSV DataFrame. Returns the filtered DataFrame."""
    delete_rules = rules[rules["action"] == "delete"]
    total_deleted = 0

    for _, rule in delete_rules.iterrows():
        if not applies_to_csv(rule["target"], csv_type):
            continue

        airport_id = rule["airport_id"]
        mask = (df["ORIGIN_AIRPORT_ID"] == airport_id) | (df["DEST_AIRPORT_ID"] == airport_id)
        count = mask.sum()
        if count > 0:
            df = df[~mask].copy()
            total_deleted += count
            print(f"  [DELETE] Airport ID {airport_id}: removed {count} rows")

    return df, total_deleted


def apply_csv_filters(df, rules, csv_type):
    """Apply filter rules to a CSV DataFrame. Returns the filtered DataFrame."""
    filter_rules = rules[rules["action"] == "filter"]
    total_filtered = 0

    for _, rule in filter_rules.iterrows():
        if not applies_to_csv(rule["target"], csv_type):
            continue

        field = rule["field"]
        before = len(df)

        if field == "ZERO_DISTANCE":
            mask = (df["ORIGIN"] == df["DEST"]) & (df["DISTANCE"] == 0)
            df = df[~mask].copy()
        elif field == "ALL_ZERO_ACTIVITY":
            mask = (df["PASSENGERS"] == 0) & (df["FREIGHT"] == 0) & (df["MAIL"] == 0)
            df = df[~mask].copy()
        elif field == "DUPLICATE_ROWS":
            df = df.drop_duplicates().copy()
        else:
            print(f"  [WARNING] Unknown filter type: {field}")
            continue

        removed = before - len(df)
        if removed > 0:
            total_filtered += removed
            print(f"  [FILTER] {field}: removed {removed} rows")

    return df, total_filtered


def apply_csv_state_fill(df, states_df, csv_type):
    """Fill null state names in a CSV DataFrame using the states lookup."""
    total_filled = 0

    for side, (code_col, city_col, state_col) in CSV_STATE_KEYS.items():
        null_mask = df[state_col].isna()
        null_count_before = null_mask.sum()
        if null_count_before == 0:
            continue

        # Merge on airport code + city name
        lookup = states_df.rename(columns={
            "Airport": code_col,
            "City-Name": city_col,
            "State-Name": "_lookup_state",
        })
        df = df.merge(lookup[[code_col, city_col, "_lookup_state"]], on=[code_col, city_col], how="left")

        # Fill nulls
        fill_mask = df[state_col].isna() & df["_lookup_state"].notna()
        filled = fill_mask.sum()
        df.loc[fill_mask, state_col] = df.loc[fill_mask, "_lookup_state"]
        df.drop(columns=["_lookup_state"], inplace=True)

        remaining = df[state_col].isna().sum()
        total_filled += filled
        print(f"  [FILL] {state_col}: filled {filled} of {null_count_before} nulls ({remaining} remaining)")

    return df, total_filled


def reaggregate_csv(df, csv_type):
    """
    Re-aggregate rows after updates/corrections that can normalize keys
    (e.g., code or city updates), creating semantic duplicates.
    """
    metric_cols = [c for c in CSV_METRIC_COLUMNS.get(csv_type, []) if c in df.columns]
    if not metric_cols:
        print(f"  [REAGG] {csv_type}: skipped (no configured metric columns)")
        return df, 0

    key_cols = [c for c in df.columns if c not in metric_cols]
    if not key_cols:
        print(f"  [REAGG] {csv_type}: skipped (no key columns)")
        return df, 0

    before = len(df)
    duplicate_groups = int(df.duplicated(subset=key_cols, keep=False).sum())
    if duplicate_groups == 0:
        print(f"  [REAGG] {csv_type}: no semantic duplicates found")
        return df, 0

    grouped = (
        df.groupby(key_cols, dropna=False, as_index=False)[metric_cols]
        .sum()
    )

    # Preserve original column order
    grouped = grouped[df.columns]
    collapsed = before - len(grouped)
    print(
        f"  [REAGG] {csv_type}: collapsed {collapsed} rows "
        f"({before:,} -> {len(grouped):,}) across normalized duplicate keys"
    )
    return grouped, collapsed


def apply_geojson_updates(features, rules):
    """Apply update rules to GeoJSON features."""
    total_changed = 0
    update_rules = rules[rules["action"] == "update"]

    for _, rule in update_rules.iterrows():
        if not applies_to_geojson(rule["target"]):
            continue

        field = rule["field"]
        airport_id = int(rule["airport_id"])
        old_val = rule["old_value"]
        new_val = rule["new_value"]

        if field not in GEOJSON_FIELD_MAP:
            continue

        prop_name = GEOJSON_FIELD_MAP[field]
        changed = 0

        for feat in features:
            props = feat["properties"]
            if props.get("AIRPORT_ID") == airport_id and props.get(prop_name) == old_val:
                props[prop_name] = new_val
                changed += 1

        if changed > 0:
            total_changed += changed
            print(f"  [UPDATE] {field} ID {airport_id}: {old_val} -> {new_val} ({changed} features)")

    return total_changed


def apply_geojson_deletes(features, rules):
    """Apply delete rules to GeoJSON features. Returns filtered list."""
    delete_rules = rules[rules["action"] == "delete"]
    total_deleted = 0

    for _, rule in delete_rules.iterrows():
        if not applies_to_geojson(rule["target"]):
            continue

        airport_id = int(rule["airport_id"])
        before = len(features)
        features = [f for f in features if f["properties"].get("AIRPORT_ID") != airport_id]
        removed = before - len(features)
        if removed > 0:
            total_deleted += removed
            print(f"  [DELETE] Airport ID {airport_id}: removed {removed} features")

    return features, total_deleted


def apply_geojson_state_fill(features, states_df):
    """Fill null AIRPORT_STATE_NAME in GeoJSON features using states lookup."""
    code_key, city_key, state_key = GEO_STATE_KEYS
    lookup = {}
    for _, row in states_df.iterrows():
        lookup[(row["Airport"], row["City-Name"])] = row["State-Name"]

    filled = 0
    for feat in features:
        props = feat["properties"]
        if props.get(state_key) is None:
            key = (props.get(code_key), props.get(city_key))
            if key in lookup:
                props[state_key] = lookup[key]
                filled += 1

    remaining = sum(1 for f in features if f["properties"].get(state_key) is None)
    print(f"  [FILL] {state_key}: filled {filled} nulls ({remaining} remaining)")
    return filled


# ============================================================================
# MAIN
# ============================================================================

def main():
    print("=" * 70)
    print("  BTS T-100 Data Cleaning")
    print("=" * 70)
    print(f"  Input:    {input_dir}")
    print(f"  Output:   {output_dir}")
    print(f"  Rules:    {CLEANING_CSV}")
    print()

    # Ensure output directory exists
    output_dir.mkdir(parents=True, exist_ok=True)

    # Load cleaning rules
    rules = load_cleaning_rules(CLEANING_CSV)

    # Load states lookup only when a STATE_NAME fill rule exists
    states_df = None
    states_lookup_path = resolve_states_lookup_path(rules)
    if states_lookup_path is not None:
        states_df = pd.read_csv(states_lookup_path)
        print(f"[SUCCESS] Loaded {len(states_df)} state lookup entries from {states_lookup_path.name}")
        print()
    else:
        print("[INFO] No STATE_NAME fill rule found; state-fill step will be skipped")
        print()

    # ── Process CSVs ──────────────────────────────────────────────────────
    all_csv_airport_ids = set()

    for csv_type, filename in [("market", MARKET_FILE), ("segment", SEGMENT_FILE)]:
        print("=" * 70)
        print(f"  Processing {csv_type.title()} CSV")
        print("=" * 70)

        df = pd.read_csv(input_dir / filename)
        before_count = len(df)
        print(f"  Loaded {before_count:,} rows from {filename}")
        print()

        # Step 1: Updates
        print("  Step 1: Applying updates...")
        apply_csv_updates(df, rules, csv_type)
        print()

        # Step 2: Corrections
        print("  Step 2: Applying corrections...")
        apply_csv_corrections(df, rules, csv_type)
        print()

        # Step 3: Deletes
        print("  Step 3: Applying deletes...")
        df, _ = apply_csv_deletes(df, rules, csv_type)
        print()

        # Step 4: Filters
        print("  Step 4: Applying filters...")
        df, _ = apply_csv_filters(df, rules, csv_type)
        print()

        # Step 5: State fill
        print("  Step 5: Filling state names...")
        if states_df is not None and has_state_fill_rule(rules, target_kind="csv", csv_type=csv_type):
            df, _ = apply_csv_state_fill(df, states_df, csv_type)
        else:
            print("  [FILL] skipped (no matching fill rule for this target)")
        print()

        # Step 6: Re-aggregate semantic duplicates introduced by normalization
        print("  Step 6: Re-aggregating normalized duplicate keys...")
        df, _ = reaggregate_csv(df, csv_type)
        print()

        # Collect airport IDs for GeoJSON scoping
        ids = set(df["ORIGIN_AIRPORT_ID"].unique()) | set(df["DEST_AIRPORT_ID"].unique())
        all_csv_airport_ids.update(ids)

        # Save
        out_path = output_dir / filename
        df.to_csv(out_path, index=False)
        print(f"  [SUCCESS] Saved {len(df):,} rows to {out_path}")
        print(f"  Removed {before_count - len(df):,} rows total ({before_count:,} -> {len(df):,})")
        print()

    # ── Process GeoJSON ───────────────────────────────────────────────────
    print("=" * 70)
    print("  Processing Airport GeoJSON")
    print("=" * 70)

    with open(input_dir / GEOJSON_FILE, encoding="utf-8") as f:
        geo = json.load(f)

    features = geo["features"]
    print(f"  Loaded {len(features):,} features from {GEOJSON_FILE}")
    print()

    # Step 1: Filter to IS_LATEST=1
    print("  Step 1: Filtering to IS_LATEST=1...")
    before = len(features)
    features = [f for f in features if f["properties"].get("AIRPORT_IS_LATEST") == 1]
    print(f"  [FILTER] IS_LATEST=1: {before} -> {len(features)} features")
    print()

    # Step 2: Apply updates
    print("  Step 2: Applying updates...")
    apply_geojson_updates(features, rules)
    print()

    # Step 3: Apply deletes
    print("  Step 3: Applying deletes...")
    features, _ = apply_geojson_deletes(features, rules)
    print()

    # Step 4: Scope to CSV airport IDs
    print("  Step 4: Scoping to corrected CSV airport IDs...")
    before = len(features)
    features = [f for f in features if f["properties"].get("AIRPORT_ID") in all_csv_airport_ids]
    removed = before - len(features)
    print(f"  [FILTER] Scoped to CSV IDs: removed {removed} orphan airports ({before} -> {len(features)})")
    print()

    # Step 5: Fill state names
    print("  Step 5: Filling state names...")
    if states_df is not None and has_state_fill_rule(rules, target_kind="geojson"):
        apply_geojson_state_fill(features, states_df)
    else:
        print("  [FILL] skipped (no matching fill rule for geojson)")
    print()

    # Step 6: Strip properties to essential fields only
    print("  Step 6: Stripping to essential properties...")
    KEEP_FIELDS = {"AIRPORT", "DISPLAY_AIRPORT_NAME", "LATITUDE", "LONGITUDE"}
    RENAME_FIELDS = {"DISPLAY_AIRPORT_NAME": "AIRPORT_NAME"}
    for feat in features:
        props = feat["properties"]
        stripped = {}
        for key in KEEP_FIELDS:
            val = props.get(key)
            out_key = RENAME_FIELDS.get(key, key)
            stripped[out_key] = val
        feat["properties"] = stripped
    print(f"  [STRIP] Kept {len(KEEP_FIELDS)} fields, renamed DISPLAY_AIRPORT_NAME -> AIRPORT_NAME")
    print()

    # Save
    geo["features"] = features
    out_path = output_dir / GEOJSON_FILE
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(geo, f, ensure_ascii=False)
    size_kb = out_path.stat().st_size / 1024
    print(f"  [SUCCESS] Saved {len(features)} features to {out_path}")
    print(f"  File size: {size_kb:.1f} KB")
    print()

    # ── Summary ───────────────────────────────────────────────────────────
    print("=" * 70)
    print("  DATA CLEANING COMPLETE")
    print("=" * 70)
    print()
    print("  Output files:")
    print(f"    {output_dir / MARKET_FILE}")
    print(f"    {output_dir / SEGMENT_FILE}")
    print(f"    {output_dir / GEOJSON_FILE}")
    print()
    print(f"  Total unique airport IDs in cleaned data: {len(all_csv_airport_ids):,}")
    print(f"  GeoJSON features: {len(features)}")
    print("=" * 70)


if __name__ == "__main__":
    main()
