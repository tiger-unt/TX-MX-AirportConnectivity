"""
Verify BTS T-100 CSV Data Against Documented Corrections
=========================================================
Checks all corrections from data-cleaning.csv / data-cleaning.md against
the extracted Market and Segment CSVs. Also scans for new issues.

Author: Generated for TxDOT IAC 2025-26 Task 6
"""

import pandas as pd
from pathlib import Path

script_dir = Path(__file__).parent
TEMP_DIR = script_dir / ".." / "_temp"
CLEANING_CSV = script_dir / ".." / ".." / "Database" / "data-cleaning" / "data-cleaning.csv"

MARKET_CSV = TEMP_DIR / "BTS_T-100_Market_2015-2024.csv"
SEGMENT_CSV = TEMP_DIR / "BTS_T-100_Segment_2015-2024.csv"


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


def check_zero_distance(mkt, seg):
    """Correction 3.1: Zero-distance rows (origin = dest)"""
    print("\n--- 3.1 Zero-Distance Rows (ORIGIN=DEST, DISTANCE=0) ---")
    for label, df in [("Market", mkt), ("Segment", seg)]:
        zero_dist = df[(df["ORIGIN"] == df["DEST"]) & (df["DISTANCE"] == 0)]
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

            # Breakdown of where scheduled=0 is expected vs observed behavior
            expected_foreign = perf_no_sched[perf_no_sched["DATA_SOURCE"].isin(["IF", "DF"])]
            expected_nonscheduled = perf_no_sched[perf_no_sched["CLASS"].isin(["L", "P"])]
            class_f_us = perf_no_sched[
                (perf_no_sched["CLASS"] == "F") &
                (perf_no_sched["DATA_SOURCE"].isin(["DU", "IU"]))
            ]
            print(f"      Expected foreign (IF/DF): {len(expected_foreign):,}")
            print(f"      Expected non-scheduled class (L/P): {len(expected_nonscheduled):,}")
            print(f"      CLASS=F + DU/IU with scheduled=0: {len(class_f_us):,}")
            print("      Note: some Class F U.S. carrier rows still report scheduled=0 in BTS.")

        print(f"    Scheduled>0, Performed=0: {len(sched_no_perf):,} ({len(sched_no_perf)/total*100:.1f}%)")
        print(f"    Performed > Scheduled (sched>0): {len(perf_gt_sched):,} ({len(perf_gt_sched)/total*100:.1f}%)")

        # This is the operational subset used for schedule adherence
        adherence_scope = df[
            (df["CLASS"] == "F") &
            (df["DATA_SOURCE"].isin(["DU", "IU"])) &
            (df["DEPARTURES_SCHEDULED"] > 0)
        ]
        if len(adherence_scope) > 0:
            exact = (adherence_scope["DEPARTURES_PERFORMED"] == adherence_scope["DEPARTURES_SCHEDULED"]).sum()
            under = (adherence_scope["DEPARTURES_PERFORMED"] < adherence_scope["DEPARTURES_SCHEDULED"]).sum()
            over = (adherence_scope["DEPARTURES_PERFORMED"] > adherence_scope["DEPARTURES_SCHEDULED"]).sum()
            print(
                f"    Adherence scope (CLASS=F, DU/IU, scheduled>0): {len(adherence_scope):,} rows | "
                f"exact={exact:,}, performed<scheduled={under:,}, performed>scheduled={over:,}"
            )


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

    # Explicit multi-ID code conflicts documented in corrections.
    # T4X is currently represented by one update row + one delete row.
    known_multi_codes = {"T4X"}

    return known_multi_ids, known_multi_codes, known_city_ids


def scan_new_issues(mkt, seg, rules):
    """Detect issues not in current corrections"""
    print("\n" + "=" * 60)
    print("  NEW ISSUE SCAN")
    print("=" * 60)

    known_multi, known_codes, known_city = build_known_issue_sets(rules)

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
        multi_codes = set(multi_co + multi_cd) - known_codes
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


def main():
    print("=" * 60)
    print("  BTS T-100 CSV DATA CORRECTION VERIFICATION")
    print("=" * 60)

    mkt, seg = load_data()
    rules = load_rules()

    check_missing_states(mkt, seg)
    check_nlu_city(mkt, seg)
    check_code_updates(mkt, seg)
    check_t4x_conflict(mkt, seg)
    check_zero_distance(mkt, seg)
    check_all_zero_activity(mkt, seg)
    check_duplicate_rows(mkt, seg)
    check_passengers_exceed_seats(mkt, seg)
    check_departure_anomalies(mkt, seg)
    check_missing_carrier(mkt, seg)
    scan_new_issues(mkt, seg, rules)

    print("\n" + "=" * 60)
    print("  VERIFICATION COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    main()
