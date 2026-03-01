"""
Extract BTS Market and Segment Data for Texas-Mexico Airport Connectivity Analysis

This unified script handles both BTS_MARKET and BTS_SEGMENT tables:
1. Extracts and aggregates records where origin or destination is Texas OR Mexico
2. Aggregates monthly data to annual totals
3. Creates detail CSVs for each data type
4. Generates a single combined GeoJSON with airports from both datasets,
   matched by stable AIRPORT_ID (not IATA codes)

Author: Generated for TxDOT IAC 2025-26 Task 6
Date: February 2026
"""

import pandas as pd
import sqlite3
import geopandas as gpd
from shapely.geometry import Point
from pathlib import Path

# ============================================================================
# CONFIGURATION
# ============================================================================

START_YEAR = 2015
END_YEAR = 2024

# ============================================================================
# PATH CONFIGURATION
# ============================================================================

script_dir = Path(__file__).parent
db_path = script_dir / "../Database/BTS_Air_Carrier_Statistics.db"
airport_master_list_path = script_dir / "../../../01_Raw Data/Airport_Master_List.csv"
output_dir = script_dir / "_temp"
output_dir.mkdir(parents=True, exist_ok=True)

# ============================================================================
# DATA TYPE DEFINITIONS
# ============================================================================

DATA_TYPES = {
    "Market": {
        "table": "BTS_MARKET",
        "agg_columns": [
            "SUM(PASSENGERS) as PASSENGERS",
            "SUM(FREIGHT) as FREIGHT",
            "SUM(MAIL) as MAIL",
            "SUM(DISTANCE) as DISTANCE",
        ],
        "raw_col_count": 41,
        "print_metrics": [
            ("Total Passengers", "PASSENGERS"),
            ("Total Freight (lbs)", "FREIGHT"),
            ("Total Mail (lbs)", "MAIL"),
            ("Total Distance (miles)", "DISTANCE"),
        ],
    },
    "Segment": {
        "table": "BTS_SEGMENT",
        "agg_columns": [
            "SUM(DEPARTURES_SCHEDULED) as DEPARTURES_SCHEDULED",
            "SUM(DEPARTURES_PERFORMED) as DEPARTURES_PERFORMED",
            "SUM(PAYLOAD) as PAYLOAD",
            "SUM(SEATS) as SEATS",
            "SUM(PASSENGERS) as PASSENGERS",
            "SUM(FREIGHT) as FREIGHT",
            "SUM(MAIL) as MAIL",
            "SUM(DISTANCE) as DISTANCE",
            "SUM(RAMP_TO_RAMP) as RAMP_TO_RAMP",
            "SUM(AIR_TIME) as AIR_TIME",
        ],
        "raw_col_count": 50,
        "print_metrics": [
            ("Total Departures Scheduled", "DEPARTURES_SCHEDULED"),
            ("Total Departures Performed", "DEPARTURES_PERFORMED"),
            ("Total Payload (lbs)", "PAYLOAD"),
            ("Total Seats", "SEATS"),
            ("Total Passengers", "PASSENGERS"),
            ("Total Freight (lbs)", "FREIGHT"),
            ("Total Mail (lbs)", "MAIL"),
            ("Total Distance (miles)", "DISTANCE"),
            ("Total Ramp-to-Ramp (minutes)", "RAMP_TO_RAMP"),
            ("Total Air Time (minutes)", "AIR_TIME"),
        ],
    },
}

# Common GROUP BY columns (shared by both Market and Segment)
GROUP_BY_COLUMNS = [
    "YEAR",
    "ORIGIN_AIRPORT_ID",
    "ORIGIN",
    "ORIGIN_CITY_NAME",
    "ORIGIN_STATE_NM",
    "ORIGIN_COUNTRY_NAME",
    "DEST_AIRPORT_ID",
    "DEST",
    "DEST_CITY_NAME",
    "DEST_STATE_NM",
    "DEST_COUNTRY_NAME",
    "CARRIER_NAME",
    "CLASS",
]

# DATA_SOURCE is selected but not aggregated — included in GROUP BY
DATA_SOURCE_COL = "DATA_SOURCE"

# WHERE clause filter (same for both data types)
WHERE_CLAUSE = """
WHERE (ORIGIN_STATE_ABR = 'TX'
   OR DEST_STATE_ABR = 'TX'
   OR ORIGIN_COUNTRY_NAME = 'Mexico'
   OR DEST_COUNTRY_NAME = 'Mexico')
  AND YEAR >= {start_year}
  AND YEAR <= {end_year}
"""


# ============================================================================
# FUNCTIONS
# ============================================================================

def extract_detail_data(con, table, agg_columns, label, raw_col_count, start_year, end_year):
    """Extract and aggregate detail data from a BTS table."""

    select_cols = ",\n    ".join(GROUP_BY_COLUMNS + agg_columns + [DATA_SOURCE_COL])
    group_cols = ",\n    ".join(GROUP_BY_COLUMNS + [DATA_SOURCE_COL])
    where = WHERE_CLAUSE.format(start_year=start_year, end_year=end_year)
    output_col_count = len(GROUP_BY_COLUMNS) + len(agg_columns) + 1  # +1 for DATA_SOURCE

    sql = f"""
SELECT
    {select_cols}
FROM {table}
{where}
GROUP BY
    {group_cols}
ORDER BY
    YEAR, ORIGIN, DEST, CARRIER_NAME
"""

    print(f"Executing SQL query with annual aggregation...")
    print(f"  Query filters:")
    print(f"    - Origin or Destination State = 'TX'")
    print(f"    - Origin or Destination Country = 'Mexico'")
    print(f"    - Year Range: {start_year} to {end_year} (inclusive)")
    print(f"  Aggregation: Monthly data aggregated to annual totals")

    df = pd.read_sql(sql, con)

    print(f"[SUCCESS] Extracted {len(df):,} annual records from {table}")
    print(f"  Columns: {len(df.columns)} (simplified from {raw_col_count} to {output_col_count} essential fields)")
    print(f"  Date range: {df['YEAR'].min()} - {df['YEAR'].max()}")

    return df


def extract_unique_airport_ids(df):
    """Get unique AIRPORT_IDs from both origin and destination columns."""
    origin_ids = set(df['ORIGIN_AIRPORT_ID'].dropna().unique())
    dest_ids = set(df['DEST_AIRPORT_ID'].dropna().unique())
    combined = sorted(origin_ids.union(dest_ids))
    return combined


def create_airport_geojson(airport_ids, master_list_path):
    """Create GeoDataFrame from Airport Master List, filtered by AIRPORT_ID."""

    df_airports = pd.read_csv(master_list_path)
    print(f"[SUCCESS] Loaded Airport Master List: {len(df_airports):,} total airports")

    # Filter to only airports found in extracted data (using stable AIRPORT_ID)
    df_filtered = df_airports[df_airports['AIRPORT_ID'].isin(airport_ids)].copy()
    print(f"[SUCCESS] Filtered to {len(df_filtered)} airports present in extracted data")

    # Check for missing airports
    matched_ids = set(df_filtered['AIRPORT_ID'].unique())
    missing_ids = set(airport_ids) - matched_ids
    if missing_ids:
        print(f"[WARNING] {len(missing_ids)} airport IDs from data not found in master list")
        print(f"  Sample missing IDs: {sorted(missing_ids)[:5]}")

    # Remove rows with invalid coordinates
    initial_count = len(df_filtered)
    df_filtered = df_filtered.dropna(subset=['LATITUDE', 'LONGITUDE'])
    if len(df_filtered) < initial_count:
        print(f"[WARNING] Removed {initial_count - len(df_filtered)} airports with missing coordinates")

    # Create point geometries
    geometry = [Point(xy) for xy in zip(df_filtered['LONGITUDE'], df_filtered['LATITUDE'])]
    gdf = gpd.GeoDataFrame(df_filtered, crs="EPSG:4326", geometry=geometry)
    print(f"[SUCCESS] Created GeoDataFrame with {len(gdf)} airport points")

    return gdf


# ============================================================================
# MAIN
# ============================================================================

def main():
    print("=" * 80)
    print("BTS Data Extraction - Texas-Mexico Airport Connectivity Analysis")
    print("=" * 80)
    print(f"\nYear Range: {START_YEAR} - {END_YEAR} (inclusive)")
    print(f"Database: {db_path}")
    print(f"Airport Master List: {airport_master_list_path}")
    print(f"Output Directory: {output_dir}")
    print()

    # Connect to database
    try:
        con = sqlite3.connect(db_path)
        print(f"[SUCCESS] Connected to database: {db_path.name}")
    except Exception as e:
        print(f"[ERROR] Error connecting to database: {e}")
        exit(1)

    all_airport_ids = set()

    # Process each data type
    for type_key, config in DATA_TYPES.items():
        print()
        print("=" * 80)
        print(f"Processing {type_key} Data ({config['table']})")
        print("=" * 80)
        print()

        # Step 1: Extract detail data
        print(f"Step 1: Extracting and aggregating {config['table']} data...")
        print("-" * 80)

        try:
            df = extract_detail_data(
                con,
                config['table'],
                config['agg_columns'],
                type_key,
                config['raw_col_count'],
                START_YEAR,
                END_YEAR,
            )
        except Exception as e:
            print(f"[ERROR] Error executing query: {e}")
            con.close()
            exit(1)

        # Step 2: Save CSV
        csv_path = output_dir / f"BTS_T-100_{type_key}_{START_YEAR}-{END_YEAR}.csv"
        try:
            df.to_csv(csv_path, index=False)
            print(f"[SUCCESS] Saved to: {csv_path.name}")
            print(f"  File size: {csv_path.stat().st_size / (1024*1024):.2f} MB")
        except Exception as e:
            print(f"[ERROR] Error saving CSV: {e}")
            con.close()
            exit(1)

        # Step 3: Collect airport IDs
        airport_ids = extract_unique_airport_ids(df)
        all_airport_ids.update(airport_ids)

        origin_count = len(set(df['ORIGIN_AIRPORT_ID'].dropna().unique()))
        dest_count = len(set(df['DEST_AIRPORT_ID'].dropna().unique()))
        print(f"  Unique airports: {len(airport_ids)} (origins: {origin_count}, destinations: {dest_count})")

        # Print statistics
        print()
        print(f"{type_key} Data Statistics (Annual Totals):")
        for label, col in config['print_metrics']:
            print(f"  {label}: {df[col].sum():,.0f}")
        print(f"  Unique Carriers: {df['CARRIER_NAME'].nunique()}")
        print()

    # Step 4: Create combined airport GeoJSON
    print("=" * 80)
    print("Creating Combined Airport GeoJSON")
    print("=" * 80)
    print()
    print(f"Total unique airport IDs across all data types: {len(all_airport_ids)}")
    print("-" * 80)

    try:
        gdf = create_airport_geojson(sorted(all_airport_ids), airport_master_list_path)

        geojson_path = output_dir / f"BTS_T-100_Airports_{START_YEAR}-{END_YEAR}.geojson"
        gdf.to_file(geojson_path, driver='GeoJSON')
        print(f"[SUCCESS] Saved airport GeoJSON to: {geojson_path.name}")
        print(f"  File size: {geojson_path.stat().st_size / 1024:.2f} KB")
    except Exception as e:
        print(f"[ERROR] Error creating GeoJSON: {e}")
        con.close()
        exit(1)

    # Final summary
    print()
    print("=" * 80)
    print("EXTRACTION COMPLETE")
    print("=" * 80)
    print()
    print("Output Files:")
    for type_key in DATA_TYPES:
        csv_name = f"BTS_T-100_{type_key}_{START_YEAR}-{END_YEAR}.csv"
        print(f"  - {csv_name}")
    print(f"  - BTS_T-100_Airports_{START_YEAR}-{END_YEAR}.geojson")
    print()

    con.close()
    print("[SUCCESS] Database connection closed")
    print("=" * 80)


if __name__ == "__main__":
    main()
