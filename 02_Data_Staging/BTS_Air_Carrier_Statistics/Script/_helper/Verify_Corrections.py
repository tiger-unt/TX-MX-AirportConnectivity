"""
Verify BTS T-100 CSV Data Against Documented Corrections
=========================================================
Checks all corrections from corrections.csv / corrections.md against
the extracted Market and Segment CSVs. Also scans for new issues.

Author: Generated for TxDOT IAC 2025-26 Task 6
"""

import pandas as pd
from pathlib import Path

script_dir = Path(__file__).parent
TEMP_DIR = script_dir / ".." / "_temp"

MARKET_CSV = TEMP_DIR / "BTS_T-100_Market_2015-2024.csv"
SEGMENT_CSV = TEMP_DIR / "BTS_T-100_Segment_2015-2024.csv"


def load_data():
    mkt = pd.read_csv(MARKET_CSV)
    seg = pd.read_csv(SEGMENT_CSV)
    print(f"Market:  {len(mkt):,} rows, {len(mkt.columns)} columns")
    print(f"Segment: {len(seg):,} rows, {len(seg.columns)} columns")
    return mkt, seg


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


def scan_new_issues(mkt, seg):
    """Detect issues not in current corrections"""
    print("\n" + "=" * 60)
    print("  NEW ISSUE SCAN")
    print("=" * 60)

    for label, df in [("Market", mkt), ("Segment", seg)]:
        print(f"\n--- {label} ---")

        # Airport IDs with multiple codes (not already documented)
        known_multi = {12544, 13788, 16658, 16879, 16706}
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
        known_codes = {"T4X"}
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
        known_city = {16852}
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

    check_missing_states(mkt, seg)
    check_nlu_city(mkt, seg)
    check_code_updates(mkt, seg)
    check_t4x_conflict(mkt, seg)
    check_zero_distance(mkt, seg)
    check_all_zero_activity(mkt, seg)
    check_missing_carrier(mkt, seg)
    scan_new_issues(mkt, seg)

    print("\n" + "=" * 60)
    print("  VERIFICATION COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    main()
