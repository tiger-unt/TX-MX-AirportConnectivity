"""
Dry-run validation of raw-BTS-data-to-DB.py
============================================
Tests the ZIP-reading logic, column consistency, and data integrity
against actual raw data files WITHOUT writing any database.

Run:  python test_raw_BTS_data_to_DB.py
"""

import os
import sys
import json
import zipfile
import pandas as pd
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).parent.parent.parent.parent  # Task 6 root
RAW_DATA = BASE_DIR / "01_Raw Data" / "BTS_Air_Carrier_Statistics"
MARKET_DIR = RAW_DATA / "Raw BTS MARKET DATA"
SEGMENT_DIR = RAW_DATA / "Raw BTS SEGMENT DATA"
SCHEMA_JSON = (
    BASE_DIR
    / "02_Data_Staging"
    / "BTS_Air_Carrier_Statistics"
    / "Database"
    / "Database_Schema.json"
)

# Expected column counts (from DB schema)
EXPECTED_MARKET_COLS = 41
EXPECTED_SEGMENT_COLS = 50

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_expected_columns(schema_path: Path) -> dict:
    """Load expected column names from Database_Schema.json."""
    with open(schema_path, "r") as f:
        schema = json.load(f)
    return {
        "market": [c["name"] for c in schema["tables"]["BTS_MARKET"]["columns"]],
        "segment": [c["name"] for c in schema["tables"]["BTS_SEGMENT"]["columns"]],
    }


def open_zip_csv(zip_path: Path) -> tuple[pd.DataFrame | None, list[str]]:
    """
    Replicate the script's OpenZipFile logic and return
    (DataFrame-or-None, list-of-csv-names-inside-zip).
    Only reads the first 5 rows for speed.
    """
    csv_names = []
    df = None
    with zipfile.ZipFile(zip_path, "r") as zf:
        for name in zf.namelist():
            if name.lower().endswith(".csv"):
                csv_names.append(name)
                data = zf.open(name)
                df = pd.read_csv(data, sep=",", nrows=5)
    return df, csv_names


# ---------------------------------------------------------------------------
# Test functions
# ---------------------------------------------------------------------------

passed = 0
failed = 0
warnings = 0


def ok(msg):
    global passed
    passed += 1
    print(f"  [PASS] {msg}")


def fail(msg):
    global failed
    failed += 1
    print(f"  [FAIL] {msg}")


def warn(msg):
    global warnings
    warnings += 1
    print(f"  [WARN] {msg}")


def test_paths_exist():
    """Test 1: Verify raw data directories and schema file exist."""
    print("\n== Test 1: Path existence ==")
    for label, p in [
        ("Raw data root", RAW_DATA),
        ("Market ZIP dir", MARKET_DIR),
        ("Segment ZIP dir", SEGMENT_DIR),
        ("Schema JSON", SCHEMA_JSON),
    ]:
        if p.exists():
            ok(f"{label} exists: {p}")
        else:
            fail(f"{label} NOT FOUND: {p}")


def test_zip_file_counts():
    """Test 2: Verify ZIP files are present in both directories."""
    print("\n== Test 2: ZIP file counts ==")
    for label, d in [("Market", MARKET_DIR), ("Segment", SEGMENT_DIR)]:
        if not d.exists():
            fail(f"{label} directory missing — skipped")
            continue
        zips = sorted([f for f in os.listdir(d) if f.lower().endswith(".zip")])
        if len(zips) > 0:
            ok(f"{label}: {len(zips)} ZIP files found")
        else:
            fail(f"{label}: no ZIP files found")
        # Check for non-zip files (unexpected)
        non_zips = [f for f in os.listdir(d) if not f.lower().endswith(".zip")]
        if non_zips:
            warn(f"{label}: {len(non_zips)} non-ZIP files present: {non_zips[:5]}")


def test_each_zip_contains_one_csv():
    """Test 3: Every ZIP should contain exactly 1 CSV (script assumes this)."""
    print("\n== Test 3: Each ZIP contains exactly one CSV ==")
    for label, d in [("Market", MARKET_DIR), ("Segment", SEGMENT_DIR)]:
        if not d.exists():
            fail(f"{label} directory missing — skipped")
            continue
        zips = sorted([f for f in os.listdir(d) if f.lower().endswith(".zip")])
        multi_csv = []
        no_csv = []
        for z in zips:
            with zipfile.ZipFile(d / z, "r") as zf:
                csvs = [n for n in zf.namelist() if n.lower().endswith(".csv")]
                if len(csvs) == 0:
                    no_csv.append(z)
                elif len(csvs) > 1:
                    multi_csv.append((z, len(csvs)))
        if no_csv:
            fail(f"{label}: {len(no_csv)} ZIPs have NO CSV: {no_csv[:3]}")
        else:
            ok(f"{label}: all {len(zips)} ZIPs contain at least one CSV")
        if multi_csv:
            warn(
                f"{label}: {len(multi_csv)} ZIPs have MULTIPLE CSVs "
                f"(script only keeps the last one): {multi_csv[:3]}"
            )
        else:
            ok(f"{label}: all ZIPs have exactly 1 CSV — no multi-CSV issue")


def test_column_consistency():
    """Test 4: All CSVs within market (and segment) share identical columns,
    and those columns match the existing DB schema."""
    print("\n== Test 4: Column consistency across all ZIPs ==")

    if not SCHEMA_JSON.exists():
        fail("Schema JSON missing — cannot compare columns")
        return
    expected = load_expected_columns(SCHEMA_JSON)

    for label, d, exp_cols in [
        ("Market", MARKET_DIR, expected["market"]),
        ("Segment", SEGMENT_DIR, expected["segment"]),
    ]:
        if not d.exists():
            fail(f"{label} directory missing — skipped")
            continue
        zips = sorted([f for f in os.listdir(d) if f.lower().endswith(".zip")])
        column_sets = {}
        for z in zips:
            df, _ = open_zip_csv(d / z)
            if df is not None:
                column_sets[z] = list(df.columns)

        if not column_sets:
            fail(f"{label}: could not read any ZIPs")
            continue

        # Check all ZIPs have same columns
        ref_name, ref_cols = next(iter(column_sets.items()))
        all_same = True
        for z, cols in column_sets.items():
            if cols != ref_cols:
                fail(f"{label}: columns in {z} differ from {ref_name}")
                print(f"    Missing: {set(ref_cols) - set(cols)}")
                print(f"    Extra:   {set(cols) - set(ref_cols)}")
                all_same = False
        if all_same:
            ok(f"{label}: all {len(column_sets)} ZIPs have identical columns ({len(ref_cols)} cols)")

        # Check against DB schema
        if set(ref_cols) == set(exp_cols):
            ok(f"{label}: columns match DB schema exactly")
        else:
            missing_in_csv = set(exp_cols) - set(ref_cols)
            extra_in_csv = set(ref_cols) - set(exp_cols)
            if missing_in_csv:
                fail(f"{label}: DB has columns not in CSV: {missing_in_csv}")
            if extra_in_csv:
                fail(f"{label}: CSV has columns not in DB: {extra_in_csv}")

        # Check expected count
        if len(ref_cols) == (EXPECTED_MARKET_COLS if label == "Market" else EXPECTED_SEGMENT_COLS):
            ok(f"{label}: column count = {len(ref_cols)} (expected)")
        else:
            fail(
                f"{label}: column count = {len(ref_cols)}, expected "
                f"{EXPECTED_MARKET_COLS if label == 'Market' else EXPECTED_SEGMENT_COLS}"
            )


def test_openzip_none_handling():
    """Test 5: Simulate the script's None-check bug.
    The script checks `if df is not None` for market but NOT for segment."""
    print("\n== Test 5: None-handling bug simulation ==")

    # Verify the bug exists in the original script
    script_path = Path(__file__).parent / "raw-BTS-data-to-DB.py"
    if script_path.exists():
        source = script_path.read_text()
        # Market loop has None check
        if "if df is not None" in source:
            ok("Market loop has `if df is not None` guard")
        else:
            warn("Could not confirm market None-check in source")

        # Count occurrences — there should be exactly 1 (only market)
        none_checks = source.count("if df is not None")
        if none_checks == 1:
            fail(
                "Segment loop is MISSING `if df is not None` check — "
                "will crash if any segment ZIP fails to parse"
            )
        elif none_checks >= 2:
            ok("Both loops have None checks")
        else:
            warn("Could not determine None-check coverage")
    else:
        warn("Could not read original script to verify bug")


def test_sample_data_validity():
    """Test 6: Read a few rows from first and last ZIP in each set,
    verify data types look reasonable."""
    print("\n== Test 6: Sample data sanity checks ==")

    for label, d in [("Market", MARKET_DIR), ("Segment", SEGMENT_DIR)]:
        if not d.exists():
            fail(f"{label} directory missing — skipped")
            continue
        zips = sorted([f for f in os.listdir(d) if f.lower().endswith(".zip")])
        # Test first and last
        for z in [zips[0], zips[-1]]:
            df, _ = open_zip_csv(d / z)
            if df is None:
                fail(f"{label}/{z}: could not read CSV")
                continue

            # Check YEAR column exists and has plausible values
            if "YEAR" in df.columns:
                years = df["YEAR"].dropna().unique()
                if all(1990 <= y <= 2030 for y in years):
                    ok(f"{label}/{z}: YEAR values plausible ({years})")
                else:
                    fail(f"{label}/{z}: YEAR values out of range: {years}")
            else:
                fail(f"{label}/{z}: no YEAR column")

            # Check ORIGIN column has 3-letter codes
            if "ORIGIN" in df.columns:
                origins = df["ORIGIN"].dropna()
                if all(isinstance(o, str) and 2 <= len(o) <= 4 for o in origins):
                    ok(f"{label}/{z}: ORIGIN codes look valid (e.g. {origins.iloc[0]})")
                else:
                    warn(f"{label}/{z}: some ORIGIN codes look unusual")

            # Check PASSENGERS is numeric and non-negative
            if "PASSENGERS" in df.columns:
                pax = df["PASSENGERS"].dropna()
                if pd.api.types.is_numeric_dtype(pax) and (pax >= 0).all():
                    ok(f"{label}/{z}: PASSENGERS is numeric and non-negative")
                else:
                    fail(f"{label}/{z}: PASSENGERS has unexpected values")


def test_script_static_issues():
    """Test 7: Static analysis of the original script for known issues."""
    print("\n== Test 7: Static analysis of raw-BTS-data-to-DB.py ==")

    script_path = Path(__file__).parent / "raw-BTS-data-to-DB.py"
    if not script_path.exists():
        fail("Script not found")
        return

    source = script_path.read_text()
    lines = source.splitlines()

    # Check for hardcoded paths (use raw string to match literal double-backslashes in source)
    if r"C:\Users\andre" in source or r"C:\\Users\\andre" in source:
        fail("Hardcoded path to colleague's machine (C:\\Users\\andre\\) — won't work here")
    else:
        ok("No hardcoded user paths")

    # Check for connection close
    if ".close()" in source or "with sqlite3" in source:
        ok("Database connection is properly closed")
    else:
        fail("Database connection is never closed (self.con.close() missing)")

    # Check for unused imports
    unused = []
    for imp in ["matplotlib", "geopandas", "numpy", "shapely"]:
        # imported but only used in the import line itself
        import_count = sum(1 for l in lines if imp in l)
        usage_count = sum(1 for l in lines if imp in l and "import" not in l)
        if import_count > 0 and usage_count == 0:
            unused.append(imp)
    if unused:
        warn(f"Unused imports: {unused}")
    else:
        ok("No unused imports")

    # Check DB name
    if "BTS_Airport_Data.db" in source:
        warn(
            'Script creates "BTS_Airport_Data.db" but production DB is '
            '"BTS_Air_Carrier_Statistics.db" — name mismatch'
        )

    # Check for append without dedup protection
    if 'if_exists="append"' in source:
        warn(
            'Uses if_exists="append" — running twice will DUPLICATE all data. '
            "No deduplication logic present."
        )

    # Typo check
    if "FNow" in source:
        warn('Typo on line with "FNow" — should be "Now"')


def test_year_coverage():
    """Test 8: Check that ZIP filenames cover expected year range."""
    print("\n== Test 8: Year coverage from filenames ==")

    for label, d in [("Market", MARKET_DIR), ("Segment", SEGMENT_DIR)]:
        if not d.exists():
            fail(f"{label} directory missing — skipped")
            continue
        zips = sorted([f for f in os.listdir(d) if f.lower().endswith(".zip")])
        # Extract year from filename (last 4 chars before .zip)
        years = set()
        for z in zips:
            name = z.replace(".zip", "")
            try:
                y = int(name.split("_")[-1])
                years.add(y)
            except ValueError:
                warn(f"{label}: could not extract year from {z}")
        if years:
            ok(f"{label}: covers years {min(years)}-{max(years)} ({len(years)} years)")
            # Check for gaps
            full_range = set(range(min(years), max(years) + 1))
            missing = full_range - years
            if missing:
                warn(f"{label}: missing years in range: {sorted(missing)}")
            else:
                ok(f"{label}: no year gaps in range")
        else:
            fail(f"{label}: could not determine year coverage")


def test_cross_year_column_stability():
    """Test 9: Verify column ORDER is identical across all years
    (not just set equality — pandas to_sql is order-sensitive for appends)."""
    print("\n== Test 9: Column ORDER stability across years ==")

    for label, d in [("Market", MARKET_DIR), ("Segment", SEGMENT_DIR)]:
        if not d.exists():
            fail(f"{label} directory missing — skipped")
            continue
        zips = sorted([f for f in os.listdir(d) if f.lower().endswith(".zip")])
        first_cols = None
        first_name = None
        order_issues = []
        for z in zips:
            df, _ = open_zip_csv(d / z)
            if df is None:
                continue
            cols = list(df.columns)
            if first_cols is None:
                first_cols = cols
                first_name = z
            elif cols != first_cols:
                order_issues.append(z)
        if order_issues:
            fail(
                f"{label}: column ORDER differs in {len(order_issues)} files vs {first_name}: "
                f"{order_issues[:3]}"
            )
        else:
            ok(f"{label}: column order identical across all {len(zips)} ZIPs")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 65)
    print("  Dry-Run Validation: raw-BTS-data-to-DB.py")
    print("=" * 65)

    test_paths_exist()
    test_zip_file_counts()
    test_each_zip_contains_one_csv()
    test_column_consistency()
    test_openzip_none_handling()
    test_sample_data_validity()
    test_script_static_issues()
    test_year_coverage()
    test_cross_year_column_stability()

    print("\n" + "=" * 65)
    print(f"  Results: {passed} passed, {failed} failed, {warnings} warnings")
    print("=" * 65)

    if failed > 0:
        print("\n  *** FAILURES DETECTED — script has bugs that need fixing ***")
        sys.exit(1)
    elif warnings > 0:
        print("\n  Script will functionally work but has quality issues (see warnings).")
        sys.exit(0)
    else:
        print("\n  All checks passed.")
        sys.exit(0)
