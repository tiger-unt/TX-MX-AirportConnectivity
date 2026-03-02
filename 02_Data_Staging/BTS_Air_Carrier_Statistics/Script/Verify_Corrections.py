"""
Verify BTS T-100 Data Against Documented Corrections
=====================================================
Checks all corrections from data-cleaning.csv / data-cleaning.md against
the extracted Market CSVs, Segment CSVs, and Airport GeoJSON. Also scans
for new issues.

Structural GeoJSON quality auditing (coordinates, closed airports, orphan
entries) is handled separately by _helper/Audit_GeoJSON.py.

Optional mode:
    --auto-update-rules   Detect candidate update rules and append uncovered
                          candidates to data-cleaning.csv, with audit report.
    --scan-only           Run only auto-update scan (no verification report).

Runtime configuration:
    Set AUTO_UPDATE_RULES / AUTO_UPDATE_SCAN_ONLY below to True/False.
    CLI flags override these defaults.

Author: Generated for TxDOT IAC 2025-26 Task 6
"""

import argparse
import csv
from datetime import datetime, timezone
from io import StringIO
import json
import shutil
import tempfile
import pandas as pd
from pathlib import Path

script_dir = Path(__file__).parent
TEMP_DIR = script_dir / "_temp"
CLEANING_DIR = script_dir / ".." / "Database" / "data-cleaning"
CLEANING_CSV = CLEANING_DIR / "data-cleaning.csv"
CLEANING_MD = CLEANING_DIR / "data-cleaning.md"
MISSING_STATES_CSV = CLEANING_DIR / "missing-states.csv"
AUDIT_MD = CLEANING_DIR / "auto-correction-audit.md"

MARKET_CSV = TEMP_DIR / "BTS_T-100_Market_2015-2024.csv"
SEGMENT_CSV = TEMP_DIR / "BTS_T-100_Segment_2015-2024.csv"
GEOJSON_FILE = TEMP_DIR / "BTS_T-100_Airports_2015-2024.geojson"
RULE_COLUMNS = ["action", "target", "airport_id", "field", "old_value", "new_value", "notes"]

# GeoJSON property names corresponding to abstract cleaning fields
GEOJSON_FIELD_MAP = {
    "CODE": "AIRPORT",
    "CITY_NAME": "DISPLAY_AIRPORT_CITY_NAME_FULL",
    "STATE_NAME": "AIRPORT_STATE_NAME",
}

# ============================================================================
# RUNTIME CONFIGURATION
# ============================================================================

# Default behavior when no CLI flags are provided.
AUTO_UPDATE_RULES = False
AUTO_UPDATE_SCAN_ONLY = False


def load_data():
    mkt = pd.read_csv(MARKET_CSV)
    seg = pd.read_csv(SEGMENT_CSV)
    print(f"Market:  {len(mkt):,} rows, {len(mkt.columns)} columns")
    print(f"Segment: {len(seg):,} rows, {len(seg.columns)} columns")
    return mkt, seg


def load_rules():
    rules = pd.read_csv(CLEANING_CSV, dtype={"airport_id": "Int64"})
    print(f"Rules:   {len(rules):,} rows from {CLEANING_CSV.name}")
    return rules


def load_geojson():
    with open(GEOJSON_FILE, encoding="utf-8") as f:
        geo = json.load(f)
    features = geo["features"]
    print(f"GeoJSON: {len(features):,} features from {GEOJSON_FILE.name}")
    return features


def norm_text(value):
    if pd.isna(value):
        return ""
    return str(value).strip()


def collect_values(df, origin_id_col, origin_val_col, dest_id_col, dest_val_col):
    origin = df[[origin_id_col, origin_val_col, "YEAR"]].rename(
        columns={origin_id_col: "airport_id", origin_val_col: "value"}
    )
    dest = df[[dest_id_col, dest_val_col, "YEAR"]].rename(
        columns={dest_id_col: "airport_id", dest_val_col: "value"}
    )
    combined = pd.concat([origin, dest], ignore_index=True)
    combined = combined.dropna(subset=["airport_id", "value", "YEAR"]).copy()
    combined["airport_id"] = combined["airport_id"].astype(int)
    combined["value"] = combined["value"].astype(str).str.strip()
    combined = combined[combined["value"] != ""].copy()
    return combined


def detect_update_candidates(df, csv_type, field, origin_id_col, origin_val_col, dest_id_col, dest_val_col):
    """
    Detect candidate update rows for a field by selecting a canonical value per
    AIRPORT_ID using most recent year, then frequency as tie-breaker.
    """
    combined = collect_values(df, origin_id_col, origin_val_col, dest_id_col, dest_val_col)
    candidates = []
    anomaly_summary = []

    for airport_id, group in combined.groupby("airport_id"):
        values = sorted(group["value"].unique())
        if len(values) <= 1:
            continue

        stats = (
            group.groupby("value", as_index=False)
            .agg(last_year=("YEAR", "max"), frequency=("value", "size"))
            .sort_values(["last_year", "frequency", "value"], ascending=[False, False, True])
        )
        canonical = stats.iloc[0]["value"]
        old_values = [v for v in values if v != canonical]

        anomaly_summary.append(
            {
                "airport_id": int(airport_id),
                "field": field,
                "values": values,
                "canonical": canonical,
                "target": csv_type,
            }
        )

        for old in old_values:
            candidates.append(
                {
                    "action": "update",
                    "target": csv_type,
                    "airport_id": int(airport_id),
                    "field": field,
                    "old_value": old,
                    "new_value": canonical,
                    "notes": (
                        f"AUTO-CANDIDATE ({csv_type}) {field}: normalize to most recent value"
                    ),
                }
            )

    return candidates, anomaly_summary


def merge_candidate_targets(candidates):
    """
    Merge market/segment duplicates into a single csv-target candidate where
    the same update applies to both datasets.
    """
    grouped = {}
    for row in candidates:
        key = (
            row["action"],
            int(row["airport_id"]),
            row["field"],
            row["old_value"],
            row["new_value"],
        )
        if key not in grouped:
            grouped[key] = {
                "action": row["action"],
                "airport_id": int(row["airport_id"]),
                "field": row["field"],
                "old_value": row["old_value"],
                "new_value": row["new_value"],
                "targets": set(),
                "notes": set(),
            }
        grouped[key]["targets"].add(row["target"])
        grouped[key]["notes"].add(row["notes"])

    merged = []
    for item in grouped.values():
        targets = item["targets"]
        target = "csv" if targets == {"market", "segment"} else sorted(targets)[0]
        merged.append(
            {
                "action": item["action"],
                "target": target,
                "airport_id": item["airport_id"],
                "field": item["field"],
                "old_value": item["old_value"],
                "new_value": item["new_value"],
                "notes": " | ".join(sorted(item["notes"])),
            }
        )

    merged.sort(key=lambda x: (x["field"], x["airport_id"], x["old_value"], x["target"]))
    return merged


def build_existing_rule_targets(rules):
    """
    Build lookup for existing rule coverage keyed by
    (action, airport_id, field, old_value, new_value) -> targets
    """
    out = {}
    for _, row in rules.iterrows():
        key = (
            norm_text(row.get("action")).lower(),
            norm_text(row.get("airport_id")),
            norm_text(row.get("field")).upper(),
            norm_text(row.get("old_value")),
            norm_text(row.get("new_value")),
        )
        out.setdefault(key, set()).add(norm_text(row.get("target")).lower())
    return out


def candidate_is_covered(candidate, existing_targets):
    key = (
        norm_text(candidate["action"]).lower(),
        norm_text(candidate["airport_id"]),
        norm_text(candidate["field"]).upper(),
        norm_text(candidate["old_value"]),
        norm_text(candidate["new_value"]),
    )
    covered_targets = existing_targets.get(key, set())
    if not covered_targets:
        return False

    candidate_target = norm_text(candidate["target"]).lower()
    if "all" in covered_targets:
        return True
    if candidate_target in covered_targets:
        return True
    if candidate_target in {"market", "segment"} and "csv" in covered_targets:
        return True
    if candidate_target == "csv" and ("csv" in covered_targets or {"market", "segment"}.issubset(covered_targets)):
        return True
    return False


def preview_candidates(candidates):
    """Display proposed rule changes for user review."""
    print(f"\n  Proposed changes: {len(candidates)} new rule(s) to append to {CLEANING_CSV.name}")
    print("  " + "-" * 56)
    header = ",".join(RULE_COLUMNS)
    print(f"  {header}")
    for row in candidates:
        print(f"  + {to_csv_line(row)}")
    print("  " + "-" * 56)


def prompt_user(prompt, default="y"):
    """Prompt user for y/n confirmation. Returns True for yes."""
    suffix = " [Y/n]: " if default == "y" else " [y/N]: "
    try:
        response = input(prompt + suffix).strip().lower()
    except (EOFError, KeyboardInterrupt):
        print()
        return default == "y"
    if response == "":
        return default == "y"
    return response in ("y", "yes")


def backup_cleaning_csv():
    """Create a timestamped backup of data-cleaning.csv. Returns backup path."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = CLEANING_CSV.parent / f"data-cleaning.backup_{timestamp}.csv"
    shutil.copy2(CLEANING_CSV, backup_path)
    print(f"  [SUCCESS] Backup saved: {backup_path.name}")
    return backup_path


def safe_write_csv(df):
    """Write DataFrame to a temp file, then atomically rename over the target."""
    tmp_fd, tmp_path = tempfile.mkstemp(
        suffix=".csv", prefix="data-cleaning_", dir=CLEANING_CSV.parent
    )
    try:
        with open(tmp_fd, "w", newline="", encoding="utf-8") as f:
            df.to_csv(f, index=False)
        # On Windows, target must not exist for os.rename; use shutil.move instead
        shutil.move(tmp_path, CLEANING_CSV)
    except Exception:
        # Clean up temp file on failure
        Path(tmp_path).unlink(missing_ok=True)
        raise


def append_new_candidates(rules, candidates):
    if not candidates:
        return rules, 0

    # --- Preview proposed changes ---
    preview_candidates(candidates)

    # --- Ask user to confirm ---
    if not prompt_user("\n  Apply these changes?"):
        print("  [INFO] Aborted — no changes written.")
        return rules, 0

    # --- Optionally back up the current CSV ---
    if prompt_user("  Create a backup of data-cleaning.csv first?"):
        backup_cleaning_csv()

    # --- Build new DataFrame and write safely ---
    new_rows = pd.DataFrame(candidates, columns=RULE_COLUMNS)
    rules_out = pd.concat([rules[RULE_COLUMNS], new_rows], ignore_index=True)
    safe_write_csv(rules_out)
    return rules_out, len(new_rows)


def detect_multi_id_codes(df):
    o_cmap = df.groupby("ORIGIN")["ORIGIN_AIRPORT_ID"].nunique()
    d_cmap = df.groupby("DEST")["DEST_AIRPORT_ID"].nunique()
    codes = sorted(set(o_cmap[o_cmap > 1].index).union(set(d_cmap[d_cmap > 1].index)))

    mapping = {}
    for code in codes:
        origin_ids = set(df[df["ORIGIN"] == code]["ORIGIN_AIRPORT_ID"].dropna().astype(int).tolist())
        dest_ids = set(df[df["DEST"] == code]["DEST_AIRPORT_ID"].dropna().astype(int).tolist())
        mapping[code] = sorted(origin_ids.union(dest_ids))
    return mapping


def to_csv_line(row):
    buffer = StringIO()
    writer = csv.writer(buffer, lineterminator="")
    writer.writerow([row[c] for c in RULE_COLUMNS])
    return buffer.getvalue()


def write_audit_report(
    mkt,
    seg,
    anomaly_summary,
    appended_rows,
    skipped_rows,
    mkt_multi_code,
    seg_multi_code,
):
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    lines = []
    lines.append("# Auto Correction Scan Audit")
    lines.append("")
    lines.append(f"- Run timestamp: {timestamp}")
    lines.append(f"- Market rows scanned: {len(mkt):,}")
    lines.append(f"- Segment rows scanned: {len(seg):,}")
    lines.append(f"- Source rules file: `{CLEANING_CSV.name}`")
    lines.append("")

    lines.append("## Detected Multi-Value Airport-ID Anomalies")
    lines.append("")
    if anomaly_summary:
        for item in anomaly_summary:
            lines.append(
                f"- `{item['target']}` ID `{item['airport_id']}` `{item['field']}` "
                f"values={item['values']} -> canonical `{item['canonical']}`"
            )
    else:
        lines.append("- None")
    lines.append("")

    lines.append("## Candidate Rows Appended")
    lines.append("")
    lines.append("```diff")
    if appended_rows:
        for row in appended_rows:
            lines.append(f"+ {to_csv_line(row)}")
    else:
        lines.append("# No new rows appended (all candidates already covered or no anomalies found).")
    lines.append("```")
    lines.append("")

    lines.append("## Candidate Rows Skipped (Already Covered)")
    lines.append("")
    if skipped_rows:
        for row in skipped_rows:
            lines.append(f"- {to_csv_line(row)}")
    else:
        lines.append("- None")
    lines.append("")

    lines.append("## Multi-ID Code Conflicts (Manual Review)")
    lines.append("")
    lines.append("### Market")
    if mkt_multi_code:
        for code, ids in mkt_multi_code.items():
            lines.append(f"- `{code}` -> IDs {ids}")
    else:
        lines.append("- None")
    lines.append("")

    lines.append("### Segment")
    if seg_multi_code:
        for code, ids in seg_multi_code.items():
            lines.append(f"- `{code}` -> IDs {ids}")
    else:
        lines.append("- None")
    lines.append("")

    AUDIT_MD.write_text("\n".join(lines), encoding="utf-8")


def run_auto_update_corrections(mkt, seg, rules):
    print("\n" + "=" * 60)
    print("  AUTO-UPDATE CANDIDATE RULE SCAN")
    print("=" * 60)

    mkt_code_candidates, mkt_code_anomalies = detect_update_candidates(
        mkt,
        csv_type="market",
        field="CODE",
        origin_id_col="ORIGIN_AIRPORT_ID",
        origin_val_col="ORIGIN",
        dest_id_col="DEST_AIRPORT_ID",
        dest_val_col="DEST",
    )
    seg_code_candidates, seg_code_anomalies = detect_update_candidates(
        seg,
        csv_type="segment",
        field="CODE",
        origin_id_col="ORIGIN_AIRPORT_ID",
        origin_val_col="ORIGIN",
        dest_id_col="DEST_AIRPORT_ID",
        dest_val_col="DEST",
    )
    mkt_city_candidates, mkt_city_anomalies = detect_update_candidates(
        mkt,
        csv_type="market",
        field="CITY_NAME",
        origin_id_col="ORIGIN_AIRPORT_ID",
        origin_val_col="ORIGIN_CITY_NAME",
        dest_id_col="DEST_AIRPORT_ID",
        dest_val_col="DEST_CITY_NAME",
    )
    seg_city_candidates, seg_city_anomalies = detect_update_candidates(
        seg,
        csv_type="segment",
        field="CITY_NAME",
        origin_id_col="ORIGIN_AIRPORT_ID",
        origin_val_col="ORIGIN_CITY_NAME",
        dest_id_col="DEST_AIRPORT_ID",
        dest_val_col="DEST_CITY_NAME",
    )

    all_candidates = (
        mkt_code_candidates
        + seg_code_candidates
        + mkt_city_candidates
        + seg_city_candidates
    )
    merged_candidates = merge_candidate_targets(all_candidates)
    existing_targets = build_existing_rule_targets(rules)

    to_append = []
    skipped = []
    for candidate in merged_candidates:
        if candidate_is_covered(candidate, existing_targets):
            skipped.append(candidate)
        else:
            to_append.append(candidate)

    rules_out, appended_count = append_new_candidates(rules, to_append)
    anomaly_summary = (
        mkt_code_anomalies
        + seg_code_anomalies
        + mkt_city_anomalies
        + seg_city_anomalies
    )
    mkt_multi_code = detect_multi_id_codes(mkt)
    seg_multi_code = detect_multi_id_codes(seg)
    write_audit_report(
        mkt=mkt,
        seg=seg,
        anomaly_summary=anomaly_summary,
        appended_rows=to_append,
        skipped_rows=skipped,
        mkt_multi_code=mkt_multi_code,
        seg_multi_code=seg_multi_code,
    )

    print(f"  [SUCCESS] Candidate rows appended: {appended_count}")
    print(f"  [INFO] Candidate rows skipped (already covered): {len(skipped)}")
    print(f"  [SUCCESS] Markdown audit diff written: {AUDIT_MD}")

    if appended_count > 0:
        print(f"\n  [REMINDER] {CLEANING_MD.name} is now out of date.")
        print(f"             {appended_count} new rule(s) were added to {CLEANING_CSV.name}")
        print(f"             but the human-readable documentation has not been updated.")
        print(f"             Consider using an LLM (e.g. Claude) to draft the update:")
        print(f'               "Here are the new rules added to data-cleaning.csv —')
        print(f'                please update data-cleaning.md to document them."')

    return rules_out


def check_nlu_city(mkt, seg):
    """Correction 2.2: NLU city name 'Zumpango' -> 'Mexico City'"""
    print("\n--- 2.2 NLU City Name (Airport ID 16852) ---")
    for label, df in [("Market", mkt), ("Segment", seg)]:
        nlu = df[df["ORIGIN_AIRPORT_ID"] == 16852]
        nlu_d = df[df["DEST_AIRPORT_ID"] == 16852]
        zump_o = df[(df["ORIGIN_AIRPORT_ID"] == 16852) & (df["ORIGIN_CITY_NAME"] == "Zumpango, Mexico")]
        zump_d = df[(df["DEST_AIRPORT_ID"] == 16852) & (df["DEST_CITY_NAME"] == "Zumpango, Mexico")]
        print(f"  {label}: {len(zump_o)} origin + {len(zump_d)} dest rows with 'Zumpango'")
        cities_o = df[df["ORIGIN_AIRPORT_ID"] == 16852]["ORIGIN_CITY_NAME"].unique()
        cities_d = df[df["DEST_AIRPORT_ID"] == 16852]["DEST_CITY_NAME"].unique()
        print(f"    Origin city variants: {list(cities_o)}")
        print(f"    Dest city variants:   {list(cities_d)}")


def check_code_updates(mkt, seg):
    """Corrections 2.3a-c: Airport code changes"""
    checks = [
        ("2.3a", 12544, "JQF", "USA", "Concord, NC"),
        ("2.3b", 13788, "NZC", "VQQ", "Jacksonville, FL"),
        ("2.3c", 16658, "T1X", "GLE", "Gainesville, TX"),
        ("2.3d", 15081, "SXF", "BER", "Berlin, Germany"),
    ]
    for ref, aid, old_code, new_code, city in checks:
        print(f"\n--- {ref} Airport ID {aid} ({city}: {old_code} -> {new_code}) ---")
        for label, df in [("Market", mkt), ("Segment", seg)]:
            old_o = len(df[(df["ORIGIN_AIRPORT_ID"] == aid) & (df["ORIGIN"] == old_code)])
            old_d = len(df[(df["DEST_AIRPORT_ID"] == aid) & (df["DEST"] == old_code)])
            new_o = len(df[(df["ORIGIN_AIRPORT_ID"] == aid) & (df["ORIGIN"] == new_code)])
            new_d = len(df[(df["DEST_AIRPORT_ID"] == aid) & (df["DEST"] == new_code)])
            total_old = old_o + old_d
            print(f"  {label}: {old_code}={total_old} rows ({old_o}o+{old_d}d), {new_code}={new_o + new_d} rows")


def check_t4x_conflict(mkt, seg):
    """Correction 2.4: T4X code conflict"""
    print("\n--- 2.4 T4X Code Conflict ---")
    for label, df in [("Market", mkt), ("Segment", seg)]:
        t4x_o = df[df["ORIGIN"] == "T4X"]
        t4x_d = df[df["DEST"] == "T4X"]
        ids_o = t4x_o["ORIGIN_AIRPORT_ID"].unique() if len(t4x_o) > 0 else []
        ids_d = t4x_d["DEST_AIRPORT_ID"].unique() if len(t4x_d) > 0 else []
        print(f"  {label} T4X as origin: {len(t4x_o)} rows, IDs: {list(ids_o)}")
        print(f"  {label} T4X as dest:   {len(t4x_d)} rows, IDs: {list(ids_d)}")

        # 2.4a: Llano (16879) - should become AQO
        llano_o = len(df[(df["ORIGIN_AIRPORT_ID"] == 16879)])
        llano_d = len(df[(df["DEST_AIRPORT_ID"] == 16879)])
        print(f"  {label} ID 16879 (Llano): {llano_o + llano_d} total rows")

        # 2.4b: Austin (16706) - should be deleted
        austin_o = len(df[(df["ORIGIN_AIRPORT_ID"] == 16706)])
        austin_d = len(df[(df["DEST_AIRPORT_ID"] == 16706)])
        print(f"  {label} ID 16706 (Austin): {austin_o + austin_d} total rows (to delete)")


def check_missing_states(mkt, seg):
    """Correction 2.1: Missing state names"""
    print("\n--- 2.1 Missing State Names ---")
    for label, df in [("Market", mkt), ("Segment", seg)]:
        miss_o = df["ORIGIN_STATE_NM"].isna().sum()
        miss_d = df["DEST_STATE_NM"].isna().sum()
        print(f"  {label}: ORIGIN_STATE_NM missing={miss_o:,}, DEST_STATE_NM missing={miss_d:,}")

        # Breakdown by country (top 5)
        miss_o_df = df[df["ORIGIN_STATE_NM"].isna()]
        if len(miss_o_df) > 0:
            top = miss_o_df["ORIGIN_COUNTRY_NAME"].value_counts().head(5)
            print(f"    Top countries (origin): {dict(top)}")


def check_missing_states_coverage(mkt, seg):
    """Cross-reference null-state rows against missing-states.csv lookup table."""
    print("\n--- 2.1b Missing-States Lookup Coverage ---")
    if not MISSING_STATES_CSV.exists():
        print(f"  [WARNING] {MISSING_STATES_CSV.name} not found — cannot verify coverage")
        return

    lookup = pd.read_csv(MISSING_STATES_CSV)
    # Build set of (Airport, City-Name) pairs covered by the lookup
    covered = set(
        zip(lookup["Airport"].str.strip(), lookup["City-Name"].str.strip())
    )

    uncovered_all = []
    for label, df in [("Market", mkt), ("Segment", seg)]:
        # Collect null-state origin rows
        miss_o = df[df["ORIGIN_STATE_NM"].isna()][["ORIGIN", "ORIGIN_CITY_NAME"]].copy()
        miss_o.columns = ["Airport", "City-Name"]
        # Collect null-state dest rows
        miss_d = df[df["DEST_STATE_NM"].isna()][["DEST", "DEST_CITY_NAME"]].copy()
        miss_d.columns = ["Airport", "City-Name"]

        missing = pd.concat([miss_o, miss_d], ignore_index=True).dropna()
        missing["Airport"] = missing["Airport"].str.strip()
        missing["City-Name"] = missing["City-Name"].str.strip()
        pairs = set(zip(missing["Airport"], missing["City-Name"]))
        uncovered = sorted(pairs - covered)

        if uncovered:
            print(f"  [WARNING] {label}: {len(uncovered)} airport/city pair(s) with null state NOT in {MISSING_STATES_CSV.name}:")
            for airport, city in uncovered[:15]:
                print(f"    {airport}  {city}")
            if len(uncovered) > 15:
                print(f"    ... and {len(uncovered) - 15} more")
            uncovered_all.extend(uncovered)
        else:
            print(f"  {label}: all null-state pairs covered by {MISSING_STATES_CSV.name}")

    if uncovered_all:
        print(f"\n  [ACTION] Add the uncovered pairs above to {MISSING_STATES_CSV.name}")
        print(f"           then re-run Apply_Data_Cleaning.py to fill the state names.")


def check_zero_distance(mkt, seg):
    """Correction 3.1: Zero-distance rows (origin = dest)"""
    print("\n--- 3.1 Self-Flight Rows (ORIGIN=DEST) ---")
    for label, df in [("Market", mkt), ("Segment", seg)]:
        zero_dist = df[df["ORIGIN"] == df["DEST"]]
        print(f"  {label}: {len(zero_dist)} zero-distance rows")
        if len(zero_dist) > 0:
            by_class = zero_dist["CLASS"].value_counts().to_dict()
            with_pax = len(zero_dist[zero_dist["PASSENGERS"] > 0])
            print(f"    By class: {by_class}")
            print(f"    With passengers > 0: {with_pax}")


def check_all_zero_activity(mkt, seg):
    """Correction 3.2: All-zero activity rows"""
    print("\n--- 3.2 All-Zero Activity Rows (PAX=0, FREIGHT=0, MAIL=0) ---")
    for label, df in [("Market", mkt), ("Segment", seg)]:
        zero_all = df[
            (df["PASSENGERS"] == 0) & (df["FREIGHT"] == 0) & (df["MAIL"] == 0)
        ]
        print(f"  {label}: {len(zero_all):,} all-zero rows ({len(zero_all)/len(df)*100:.1f}%)")
        if len(zero_all) > 0:
            by_class = zero_all["CLASS"].value_counts().to_dict()
            by_source = zero_all["DATA_SOURCE"].value_counts().to_dict()
            print(f"    By class: {by_class}")
            print(f"    By source: {by_source}")


def check_missing_carrier(mkt, seg):
    """Correction 4.1: Missing carrier names"""
    print("\n--- 4.1 Missing Carrier Names ---")
    for label, df in [("Market", mkt), ("Segment", seg)]:
        missing = df[df["CARRIER_NAME"].isna()]
        print(f"  {label}: {len(missing)} rows with missing CARRIER_NAME")
        if len(missing) > 0:
            years = missing["YEAR"].unique()
            classes = missing["CLASS"].unique()
            print(f"    Years: {sorted(years)}, Classes: {sorted(classes)}")


def check_duplicate_rows(mkt, seg):
    """Check for exact duplicate rows (all columns identical)."""
    print("\n--- 3.3 Duplicate Rows ---")
    for label, df in [("Market", mkt), ("Segment", seg)]:
        dup_count = df.duplicated().sum()
        print(f"  {label}: {dup_count:,} exact duplicate rows ({dup_count/len(df)*100:.2f}%)")
        if dup_count > 0:
            # Show a sample of the duplicated rows
            dups = df[df.duplicated(keep="first")]
            sample = dups.head(3)
            carriers = dups["CARRIER_NAME"].value_counts().head(5).to_dict()
            print(f"    Top carriers with duplicates: {carriers}")


def check_passengers_exceed_seats(mkt, seg):
    """Check for rows where PASSENGERS > SEATS (segment only)."""
    print("\n--- 3.4 Passengers Exceeding Seats ---")
    for label, df in [("Market", mkt), ("Segment", seg)]:
        if "SEATS" not in df.columns:
            print(f"  {label}: skipped (no SEATS column)")
            continue
        exceed = df[(df["PASSENGERS"] > df["SEATS"]) & (df["SEATS"] > 0)]
        print(f"  {label}: {len(exceed):,} rows where PASSENGERS > SEATS")
        if len(exceed) > 0:
            avg_diff = (exceed["PASSENGERS"] - exceed["SEATS"]).mean()
            max_diff = (exceed["PASSENGERS"] - exceed["SEATS"]).max()
            print(f"    Avg excess: {avg_diff:.1f}, Max excess: {max_diff:.0f}")


def check_departure_anomalies(mkt, seg):
    """Report structural departure scheduled vs performed patterns (informational)."""
    print("\n--- 3.5 Departure Scheduled vs Performed (Informational) ---")
    for label, df in [("Market", mkt), ("Segment", seg)]:
        if "DEPARTURES_SCHEDULED" not in df.columns:
            print(f"  {label}: skipped (no departure columns)")
            continue

        total = len(df)
        perf_no_sched = df[(df["DEPARTURES_PERFORMED"] > 0) & (df["DEPARTURES_SCHEDULED"] == 0)]
        sched_no_perf = df[(df["DEPARTURES_SCHEDULED"] > 0) & (df["DEPARTURES_PERFORMED"] == 0)]
        perf_gt_sched = df[(df["DEPARTURES_PERFORMED"] > df["DEPARTURES_SCHEDULED"]) & (df["DEPARTURES_SCHEDULED"] > 0)]

        print(f"  {label} ({total:,} rows):")
        print(f"    Performed>0, Scheduled=0: {len(perf_no_sched):,} ({len(perf_no_sched)/total*100:.1f}%)")
        if len(perf_no_sched) > 0:
            by_class = perf_no_sched["CLASS"].value_counts().to_dict()
            by_source = perf_no_sched["DATA_SOURCE"].value_counts().to_dict()
            print(f"      By CLASS: {by_class}")
            print(f"      By DATA_SOURCE: {by_source}")
            print("      (Common in IF/DF and/or L/P rows)")

        print(f"    Scheduled>0, Performed=0: {len(sched_no_perf):,} ({len(sched_no_perf)/total*100:.1f}%)")
        print(f"    Performed > Scheduled (sched>0): {len(perf_gt_sched):,} ({len(perf_gt_sched)/total*100:.1f}%)")


def check_departure_outliers(mkt, seg):
    """Verify DEPARTURES_SCHEDULED outlier corrections (both >100 and charter >10)."""
    print("\n--- 3.6 DEPARTURES_SCHEDULED Outlier Verification ---")
    for label, df in [("Market", mkt), ("Segment", seg)]:
        if "DEPARTURES_SCHEDULED" not in df.columns:
            print(f"  {label}: skipped (no departure columns)")
            continue

        performed = df["DEPARTURES_PERFORMED"]
        scheduled = df["DEPARTURES_SCHEDULED"]

        # General outliers: ratio > 100 (all classes)
        broad_mask = (performed > 0) & (scheduled / performed > 100)
        broad_count = broad_mask.sum()
        print(f"  {label}: {broad_count} rows with SCHED/PERF ratio > 100 (should be 0 after cleaning)")

        # Charter outliers: Class P/L with ratio > 10
        if "CLASS" in df.columns:
            is_charter = df["CLASS"].isin(["P", "L"])
            charter_mask = is_charter & (performed > 0) & (scheduled / performed > 10)
            charter_count = charter_mask.sum()
            print(f"  {label}: {charter_count} Class P/L rows with SCHED/PERF ratio > 10 (should be 0 after cleaning)")
            if charter_count > 0:
                remaining = df[charter_mask]
                carriers = remaining["CARRIER_NAME"].value_counts().head(5).to_dict()
                print(f"    Top carriers: {carriers}")
        else:
            print(f"  {label}: skipped charter check (no CLASS column)")


def check_geojson_updates(features, rules):
    """Verify GeoJSON-targeted update rules (code and city name fixes)."""
    print("\n--- 5.1 GeoJSON Update Rules ---")
    update_rules = rules[rules["action"] == "update"]
    found_any = False

    for _, rule in update_rules.iterrows():
        target = norm_text(rule["target"]).lower()
        if target not in ("geojson", "all"):
            continue

        field = norm_text(rule["field"]).upper()
        if field not in GEOJSON_FIELD_MAP:
            continue

        prop_name = GEOJSON_FIELD_MAP[field]
        airport_id = int(rule["airport_id"])
        old_val = norm_text(rule["old_value"])
        new_val = norm_text(rule["new_value"])
        found_any = True

        old_count = sum(
            1 for f in features
            if f["properties"].get("AIRPORT_ID") == airport_id
            and str(f["properties"].get(prop_name, "")).strip() == old_val
        )
        new_count = sum(
            1 for f in features
            if f["properties"].get("AIRPORT_ID") == airport_id
            and str(f["properties"].get(prop_name, "")).strip() == new_val
        )
        total = sum(
            1 for f in features
            if f["properties"].get("AIRPORT_ID") == airport_id
        )

        status = "[OK]" if old_count > 0 else "[CLEAN]"
        print(f"  {status} ID {airport_id} {field} {old_val}->{new_val}: "
              f"old={old_count}, new={new_count}, total={total} features")

    if not found_any:
        print("  No GeoJSON-targeted update rules found")


def check_geojson_deletes(features, rules):
    """Verify GeoJSON-targeted delete rules."""
    print("\n--- 5.2 GeoJSON Delete Rules ---")
    delete_rules = rules[rules["action"] == "delete"]
    found_any = False

    for _, rule in delete_rules.iterrows():
        target = norm_text(rule["target"]).lower()
        if target not in ("geojson", "all"):
            continue

        airport_id = int(rule["airport_id"])
        found_any = True

        count = sum(
            1 for f in features
            if f["properties"].get("AIRPORT_ID") == airport_id
        )

        status = "[OK]" if count > 0 else "[CLEAN]"
        print(f"  {status} ID {airport_id}: {count} features present "
              f"({'to be removed' if count > 0 else 'already absent'})")

    if not found_any:
        print("  No GeoJSON-targeted delete rules found")


def check_geojson_latest(features):
    """Report IS_LATEST distribution in raw GeoJSON."""
    print("\n--- 5.3 GeoJSON IS_LATEST Distribution ---")
    latest = sum(1 for f in features if f["properties"].get("AIRPORT_IS_LATEST") == 1)
    not_latest = sum(1 for f in features if f["properties"].get("AIRPORT_IS_LATEST") == 0)
    other = len(features) - latest - not_latest
    print(f"  IS_LATEST=1: {latest:,} features")
    print(f"  IS_LATEST=0: {not_latest:,} features (removed during cleaning)")
    if other > 0:
        print(f"  Other/null:  {other:,} features")


def check_geojson_csv_alignment(features, mkt, seg):
    """Cross-reference GeoJSON airport IDs against CSV airport IDs."""
    print("\n--- 5.4 GeoJSON–CSV Airport ID Alignment ---")

    # GeoJSON IDs (IS_LATEST=1 only, matching cleaning pipeline)
    geo_ids = set(
        f["properties"].get("AIRPORT_ID") for f in features
        if f["properties"].get("AIRPORT_IS_LATEST") == 1
    )
    geo_ids.discard(None)

    # CSV IDs (union of origin + dest from both datasets)
    csv_ids = set()
    for df in (mkt, seg):
        csv_ids.update(df["ORIGIN_AIRPORT_ID"].dropna().astype(int).tolist())
        csv_ids.update(df["DEST_AIRPORT_ID"].dropna().astype(int).tolist())

    in_csv_not_geo = sorted(csv_ids - geo_ids)
    in_geo_not_csv = sorted(geo_ids - csv_ids)

    print(f"  GeoJSON (IS_LATEST=1): {len(geo_ids):,} unique airport IDs")
    print(f"  CSVs (Market+Segment): {len(csv_ids):,} unique airport IDs")
    print(f"  In CSVs but not GeoJSON: {len(in_csv_not_geo)}")
    if in_csv_not_geo:
        for aid in in_csv_not_geo[:15]:
            # Find sample code from CSV
            sample = mkt[mkt["ORIGIN_AIRPORT_ID"] == aid]
            code = sample["ORIGIN"].iloc[0] if len(sample) > 0 else "?"
            print(f"    ID {aid} ({code})")
        if len(in_csv_not_geo) > 15:
            print(f"    ... and {len(in_csv_not_geo) - 15} more")

    print(f"  In GeoJSON but not CSVs: {len(in_geo_not_csv)} (removed as orphans during cleaning)")


def build_known_issue_sets(rules):
    """Build known issue sets from data-cleaning.csv so scanner stays current."""
    code_updates = rules[
        (rules["action"] == "update") &
        (rules["field"] == "CODE") &
        (rules["airport_id"].notna())
    ].copy()
    city_updates = rules[
        (rules["action"] == "update") &
        (rules["field"] == "CITY_NAME") &
        (rules["airport_id"].notna())
    ].copy()
    deletes = rules[
        (rules["action"] == "delete") &
        (rules["airport_id"].notna())
    ].copy()

    known_multi_ids = set(code_updates["airport_id"].astype(int).tolist())
    known_multi_ids.update(deletes["airport_id"].astype(int).tolist())

    known_city_ids = set(city_updates["airport_id"].astype(int).tolist())

    # Old code values that are explicitly remapped in correction rules
    known_old_codes = set(code_updates["old_value"].dropna().astype(str).str.strip().tolist())

    return known_multi_ids, known_old_codes, known_city_ids


def scan_new_issues(mkt, seg, rules):
    """Detect issues not in current corrections"""
    print("\n" + "=" * 60)
    print("  NEW ISSUE SCAN")
    print("=" * 60)

    known_multi, known_old_codes, known_city = build_known_issue_sets(rules)

    for label, df in [("Market", mkt), ("Segment", seg)]:
        print(f"\n--- {label} ---")

        # Airport IDs with multiple codes (not already documented in data-cleaning.csv)
        o_map = df.groupby("ORIGIN_AIRPORT_ID")["ORIGIN"].nunique()
        d_map = df.groupby("DEST_AIRPORT_ID")["DEST"].nunique()
        multi_o = o_map[o_map > 1].index.tolist()
        multi_d = d_map[d_map > 1].index.tolist()
        multi_ids = set(multi_o + multi_d) - known_multi
        if multi_ids:
            print(f"  NEW multi-code Airport IDs: {sorted(multi_ids)}")
            for aid in sorted(multi_ids):
                codes_o = df[df["ORIGIN_AIRPORT_ID"] == aid]["ORIGIN"].unique()
                codes_d = df[df["DEST_AIRPORT_ID"] == aid]["DEST"].unique()
                all_codes = sorted(set(list(codes_o) + list(codes_d)))
                print(f"    ID {aid}: codes = {all_codes}")
        else:
            print("  No new multi-code Airport IDs")

        # Codes mapping to multiple IDs (not already documented)
        o_cmap = df.groupby("ORIGIN")["ORIGIN_AIRPORT_ID"].nunique()
        d_cmap = df.groupby("DEST")["DEST_AIRPORT_ID"].nunique()
        multi_co = o_cmap[o_cmap > 1].index.tolist()
        multi_cd = d_cmap[d_cmap > 1].index.tolist()
        raw_multi_codes = sorted(set(multi_co + multi_cd))

        def code_is_known_resolved(code):
            if code not in known_old_codes:
                return False
            ids_o = set(df[df["ORIGIN"] == code]["ORIGIN_AIRPORT_ID"].dropna().astype(int).tolist())
            ids_d = set(df[df["DEST"] == code]["DEST_AIRPORT_ID"].dropna().astype(int).tolist())
            return ids_o.union(ids_d).issubset(known_multi)

        multi_codes = [c for c in raw_multi_codes if not code_is_known_resolved(c)]
        if multi_codes:
            print(f"  NEW multi-ID codes: {sorted(multi_codes)}")
        else:
            print("  No new multi-ID codes")

        # City name inconsistencies (same Airport ID, different city names)
        o_cities = df.groupby("ORIGIN_AIRPORT_ID")["ORIGIN_CITY_NAME"].nunique()
        d_cities = df.groupby("DEST_AIRPORT_ID")["DEST_CITY_NAME"].nunique()
        multi_city_o = o_cities[o_cities > 1].index.tolist()
        multi_city_d = d_cities[d_cities > 1].index.tolist()
        multi_city_ids = set(multi_city_o + multi_city_d) - known_city
        if multi_city_ids:
            print(f"  NEW city name inconsistencies: {sorted(multi_city_ids)}")
            for aid in sorted(multi_city_ids):
                cities = sorted(set(
                    list(df[df["ORIGIN_AIRPORT_ID"] == aid]["ORIGIN_CITY_NAME"].unique()) +
                    list(df[df["DEST_AIRPORT_ID"] == aid]["DEST_CITY_NAME"].unique())
                ))
                print(f"    ID {aid}: cities = {cities}")
        else:
            print("  No new city name inconsistencies")

        # Negative values
        num_cols = df.select_dtypes(include="number").columns.drop(
            ["YEAR", "ORIGIN_AIRPORT_ID", "DEST_AIRPORT_ID"], errors="ignore"
        )
        neg_counts = {c: int((df[c] < 0).sum()) for c in num_cols if (df[c] < 0).any()}
        if neg_counts:
            print(f"  NEGATIVE VALUES: {neg_counts}")
        else:
            print("  No negative values in numeric columns")


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description=(
            "Verify documented corrections against _temp extracts, and optionally "
            "auto-update candidate correction rules."
        )
    )
    parser.add_argument(
        "--auto-update-rules",
        dest="auto_update_rules",
        action="store_true",
        default=None,
        help="Detect candidate update rules and append uncovered candidates to data-cleaning.csv.",
    )
    parser.add_argument(
        "--no-auto-update-rules",
        dest="auto_update_rules",
        action="store_false",
        help="Disable auto-update rule scan (overrides config).",
    )
    parser.add_argument(
        "--scan-only",
        dest="scan_only",
        action="store_true",
        default=None,
        help="Run only the auto-update scan stage (implies --auto-update-rules).",
    )
    parser.add_argument(
        "--no-scan-only",
        dest="scan_only",
        action="store_false",
        help="Disable scan-only mode (overrides config).",
    )
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)

    auto_update_rules = AUTO_UPDATE_RULES if args.auto_update_rules is None else args.auto_update_rules
    scan_only = AUTO_UPDATE_SCAN_ONLY if args.scan_only is None else args.scan_only
    if scan_only:
        auto_update_rules = True

    print("=" * 60)
    print("  BTS T-100 DATA CORRECTION VERIFICATION")
    print("=" * 60)

    mkt, seg = load_data()
    features = load_geojson()
    rules = load_rules()

    if auto_update_rules:
        rules = run_auto_update_corrections(mkt, seg, rules)
        if scan_only:
            print("\n" + "=" * 60)
            print("  SCAN COMPLETE (scan-only mode)")
            print("=" * 60)
            return

    check_missing_states(mkt, seg)
    check_missing_states_coverage(mkt, seg)
    check_nlu_city(mkt, seg)
    check_code_updates(mkt, seg)
    check_t4x_conflict(mkt, seg)
    check_zero_distance(mkt, seg)
    check_all_zero_activity(mkt, seg)
    check_duplicate_rows(mkt, seg)
    check_passengers_exceed_seats(mkt, seg)
    check_departure_anomalies(mkt, seg)
    check_departure_outliers(mkt, seg)
    check_missing_carrier(mkt, seg)

    # GeoJSON verification
    print("\n" + "=" * 60)
    print("  GEOJSON VERIFICATION")
    print("=" * 60)
    check_geojson_updates(features, rules)
    check_geojson_deletes(features, rules)
    check_geojson_latest(features)
    check_geojson_csv_alignment(features, mkt, seg)

    scan_new_issues(mkt, seg, rules)

    print("\n" + "=" * 60)
    print("  VERIFICATION COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    main()
