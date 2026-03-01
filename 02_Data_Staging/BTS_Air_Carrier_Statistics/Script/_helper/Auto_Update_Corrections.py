"""
Auto-Update Candidate Cleaning Rules from _temp Extracts
=========================================================
Scans Market/Segment CSVs in Script/_temp for code/city anomalies and appends
new candidate update rules to data-cleaning.csv when they are not already
covered. Also writes a markdown audit diff report.

Usage:
    python _helper/Auto_Update_Corrections.py
"""

from __future__ import annotations

import csv
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path

import pandas as pd


SCRIPT_DIR = Path(__file__).parent
TEMP_DIR = SCRIPT_DIR / ".." / "_temp"
CLEANING_DIR = SCRIPT_DIR / ".." / ".." / "Database" / "data-cleaning"

MARKET_CSV = TEMP_DIR / "BTS_T-100_Market_2015-2024.csv"
SEGMENT_CSV = TEMP_DIR / "BTS_T-100_Segment_2015-2024.csv"
CLEANING_CSV = CLEANING_DIR / "data-cleaning.csv"
AUDIT_MD = CLEANING_DIR / "auto-correction-audit.md"

RULE_COLUMNS = ["action", "target", "airport_id", "field", "old_value", "new_value", "notes"]


def norm_text(value):
    if pd.isna(value):
        return ""
    return str(value).strip()


def load_data():
    market = pd.read_csv(MARKET_CSV)
    segment = pd.read_csv(SEGMENT_CSV)
    print(f"[SUCCESS] Loaded Market:  {len(market):,} rows")
    print(f"[SUCCESS] Loaded Segment: {len(segment):,} rows")
    return market, segment


def load_rules():
    rules = pd.read_csv(CLEANING_CSV, dtype={"airport_id": "Int64"})
    print(f"[SUCCESS] Loaded rules:   {len(rules):,} rows from {CLEANING_CSV.name}")
    return rules


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


def append_new_candidates(rules, candidates):
    if not candidates:
        return rules, 0

    new_rows = pd.DataFrame(candidates, columns=RULE_COLUMNS)
    rules_out = pd.concat([rules[RULE_COLUMNS], new_rows], ignore_index=True)
    rules_out.to_csv(CLEANING_CSV, index=False)
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
    market,
    segment,
    anomaly_summary,
    appended_rows,
    skipped_rows,
    market_multi_code,
    segment_multi_code,
):
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    lines = []
    lines.append("# Auto Correction Scan Audit")
    lines.append("")
    lines.append(f"- Run timestamp: {timestamp}")
    lines.append(f"- Market rows scanned: {len(market):,}")
    lines.append(f"- Segment rows scanned: {len(segment):,}")
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
    if market_multi_code:
        for code, ids in market_multi_code.items():
            lines.append(f"- `{code}` -> IDs {ids}")
    else:
        lines.append("- None")
    lines.append("")
    lines.append("### Segment")
    if segment_multi_code:
        for code, ids in segment_multi_code.items():
            lines.append(f"- `{code}` -> IDs {ids}")
    else:
        lines.append("- None")
    lines.append("")

    AUDIT_MD.write_text("\n".join(lines), encoding="utf-8")


def main():
    print("=" * 78)
    print("  AUTO-UPDATE CANDIDATE CLEANING RULES")
    print("=" * 78)

    market, segment = load_data()
    rules = load_rules()

    market_code_candidates, market_code_anomalies = detect_update_candidates(
        market,
        csv_type="market",
        field="CODE",
        origin_id_col="ORIGIN_AIRPORT_ID",
        origin_val_col="ORIGIN",
        dest_id_col="DEST_AIRPORT_ID",
        dest_val_col="DEST",
    )
    segment_code_candidates, segment_code_anomalies = detect_update_candidates(
        segment,
        csv_type="segment",
        field="CODE",
        origin_id_col="ORIGIN_AIRPORT_ID",
        origin_val_col="ORIGIN",
        dest_id_col="DEST_AIRPORT_ID",
        dest_val_col="DEST",
    )

    market_city_candidates, market_city_anomalies = detect_update_candidates(
        market,
        csv_type="market",
        field="CITY_NAME",
        origin_id_col="ORIGIN_AIRPORT_ID",
        origin_val_col="ORIGIN_CITY_NAME",
        dest_id_col="DEST_AIRPORT_ID",
        dest_val_col="DEST_CITY_NAME",
    )
    segment_city_candidates, segment_city_anomalies = detect_update_candidates(
        segment,
        csv_type="segment",
        field="CITY_NAME",
        origin_id_col="ORIGIN_AIRPORT_ID",
        origin_val_col="ORIGIN_CITY_NAME",
        dest_id_col="DEST_AIRPORT_ID",
        dest_val_col="DEST_CITY_NAME",
    )

    all_candidates = (
        market_code_candidates
        + segment_code_candidates
        + market_city_candidates
        + segment_city_candidates
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

    _, appended_count = append_new_candidates(rules, to_append)

    market_multi_code = detect_multi_id_codes(market)
    segment_multi_code = detect_multi_id_codes(segment)
    anomaly_summary = (
        market_code_anomalies
        + segment_code_anomalies
        + market_city_anomalies
        + segment_city_anomalies
    )

    write_audit_report(
        market=market,
        segment=segment,
        anomaly_summary=anomaly_summary,
        appended_rows=to_append,
        skipped_rows=skipped,
        market_multi_code=market_multi_code,
        segment_multi_code=segment_multi_code,
    )

    print()
    print(f"[SUCCESS] Candidate rows appended: {appended_count}")
    print(f"[INFO] Candidate rows skipped (already covered): {len(skipped)}")
    print(f"[SUCCESS] Markdown audit diff written: {AUDIT_MD}")
    print("=" * 78)


if __name__ == "__main__":
    main()
