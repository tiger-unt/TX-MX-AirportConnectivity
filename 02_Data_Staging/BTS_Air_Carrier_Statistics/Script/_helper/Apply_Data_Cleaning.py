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
cleaning_dir = script_dir / ".." / ".." / "Database" / "data-cleaning"
input_dir = script_dir / ".." / "_temp"
output_dir = script_dir / ".." / ".." / ".." / ".." / "03_Process_Data" / "BTS"

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

    # Load states lookup (for fill rules)
    states_df = pd.read_csv(STATES_LOOKUP)
    print(f"[SUCCESS] Loaded {len(states_df)} state lookup entries from {STATES_LOOKUP.name}")
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

        # Step 2: Deletes
        print("  Step 2: Applying deletes...")
        df, _ = apply_csv_deletes(df, rules, csv_type)
        print()

        # Step 3: Filters
        print("  Step 3: Applying filters...")
        df, _ = apply_csv_filters(df, rules, csv_type)
        print()

        # Step 4: State fill
        print("  Step 4: Filling state names...")
        df, _ = apply_csv_state_fill(df, states_df, csv_type)
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
    apply_geojson_state_fill(features, states_df)
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
