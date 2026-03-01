"""
Extract BTS Segment Data for Texas-Mexico Airport Connectivity Analysis

This script:
1. Extracts and aggregates BTS_SEGMENT records where origin or destination is Texas OR Mexico
2. Aggregates monthly data to annual totals (summing departures, seats, payload, passengers, freight, mail, distance, ramp-to-ramp, air time)
3. Creates a CSV file with 24 essential columns: BTS_T-100_Segment.csv
4. Generates a GeoJSON file with only airports present in the extracted data: BTS_T-100_Segment_Airports.geojson

Author: Generated for TxDOT IAC 2025-26 Task 6
Date: February 2026
"""

import pandas as pd
import sqlite3
import geopandas as gpd
from shapely.geometry import Point
import os
from pathlib import Path

# ============================================================================
# CONFIGURATION - Modify these values as needed
# ============================================================================

# Year range for data extraction (inclusive)
START_YEAR = 2015  # Beginning year (data from this year will be included)
END_YEAR = 2024    # Ending year (data from this year will be included)

# ============================================================================
# PATH CONFIGURATION
# ============================================================================

# Get the script's directory
script_dir = Path(__file__).parent

# Database path (relative to script location)
db_path = script_dir / "../Database/BTS_Air_Carrier_Statistics.db"

# Input data path
airport_master_list_path = script_dir / "../../../01_Raw Data/Airport_Master_List.csv"

# Output directory
output_dir = script_dir / "../../../03_Process_Data/BTS"

# Create output directory if it doesn't exist
output_dir.mkdir(parents=True, exist_ok=True)

# Output file names (include year range for clarity)
segment_csv_output = output_dir / f"BTS_T-100_Segment_{START_YEAR}-{END_YEAR}.csv"
airports_geojson_output = output_dir / f"BTS_T-100_Segment_Airports_{START_YEAR}-{END_YEAR}.geojson"

print("=" * 80)
print("BTS Segment Data Extraction - Texas-Mexico Analysis")
print("=" * 80)
print(f"\nYear Range: {START_YEAR} - {END_YEAR} (inclusive)")
print(f"Database: {db_path}")
print(f"Airport Master List: {airport_master_list_path}")
print(f"Output Directory: {output_dir}")
print()

# ============================================================================
# STEP 1: EXTRACT BTS_SEGMENT DATA
# ============================================================================

print("Step 1: Extracting and aggregating BTS_SEGMENT data for Texas and Mexico...")
print("-" * 80)

# Connect to the database
try:
    con = sqlite3.connect(db_path)
    print(f"[SUCCESS] Connected to database: {db_path.name}")
except Exception as e:
    print(f"[ERROR] Error connecting to database: {e}")
    exit(1)

# SQL query to extract and aggregate flights touching Texas OR Mexico
# Aggregates monthly data to annual totals with 24 essential columns
sql_query = f"""
SELECT
    YEAR,
    ORIGIN_AIRPORT_ID,
    ORIGIN,
    ORIGIN_CITY_NAME,
    ORIGIN_STATE_NM,
    ORIGIN_COUNTRY_NAME,
    DEST_AIRPORT_ID,
    DEST,
    DEST_CITY_NAME,
    DEST_STATE_NM,
    DEST_COUNTRY_NAME,
    CARRIER_NAME,
    CLASS,
    SUM(DEPARTURES_SCHEDULED) as DEPARTURES_SCHEDULED,
    SUM(DEPARTURES_PERFORMED) as DEPARTURES_PERFORMED,
    SUM(PAYLOAD) as PAYLOAD,
    SUM(SEATS) as SEATS,
    SUM(PASSENGERS) as PASSENGERS,
    SUM(FREIGHT) as FREIGHT,
    SUM(MAIL) as MAIL,
    SUM(DISTANCE) as DISTANCE,
    SUM(RAMP_TO_RAMP) as RAMP_TO_RAMP,
    SUM(AIR_TIME) as AIR_TIME,
    DATA_SOURCE
FROM BTS_SEGMENT
WHERE (ORIGIN_STATE_ABR = 'TX'
   OR DEST_STATE_ABR = 'TX'
   OR ORIGIN_COUNTRY_NAME = 'Mexico'
   OR DEST_COUNTRY_NAME = 'Mexico')
  AND YEAR >= {START_YEAR}
  AND YEAR <= {END_YEAR}
GROUP BY
    YEAR,
    ORIGIN_AIRPORT_ID,
    ORIGIN,
    ORIGIN_CITY_NAME,
    ORIGIN_STATE_NM,
    ORIGIN_COUNTRY_NAME,
    DEST_AIRPORT_ID,
    DEST,
    DEST_CITY_NAME,
    DEST_STATE_NM,
    DEST_COUNTRY_NAME,
    CARRIER_NAME,
    CLASS,
    DATA_SOURCE
ORDER BY
    YEAR,
    ORIGIN,
    DEST,
    CARRIER_NAME
"""

try:
    print("Executing SQL query with annual aggregation...")
    print("Query filters:")
    print("  - Origin or Destination State = 'TX'")
    print("  - Origin or Destination Country = 'Mexico'")
    print(f"  - Year Range: {START_YEAR} to {END_YEAR} (inclusive)")
    print("Aggregation:")
    print("  - Monthly data aggregated to annual totals")
    print("  - Metrics summed: DEPARTURES_SCHEDULED, DEPARTURES_PERFORMED, PAYLOAD,")
    print("                     SEATS, PASSENGERS, FREIGHT, MAIL, DISTANCE,")
    print("                     RAMP_TO_RAMP, AIR_TIME")

    df_segment = pd.read_sql(sql_query, con)

    print(f"[SUCCESS] Extracted and aggregated {len(df_segment):,} annual records from BTS_SEGMENT")
    print(f"  Columns: {len(df_segment.columns)} (simplified from 50 to 24 essential fields)")
    print(f"  Date range: {df_segment['YEAR'].min()} - {df_segment['YEAR'].max()}")

except Exception as e:
    print(f"[ERROR] Error executing query: {e}")
    con.close()
    exit(1)

# Save to CSV
try:
    df_segment.to_csv(segment_csv_output, index=False)
    print(f"[SUCCESS] Saved aggregated annual segment data to: {segment_csv_output.name}")
    print(f"  File size: {segment_csv_output.stat().st_size / (1024*1024):.2f} MB")
except Exception as e:
    print(f"[ERROR] Error saving CSV: {e}")
    con.close()
    exit(1)

print()

# ============================================================================
# STEP 2: EXTRACT UNIQUE AIRPORTS
# ============================================================================

print("Step 2: Extracting unique airport codes from segment data...")
print("-" * 80)

# Get unique airport codes from both ORIGIN and DEST columns
origin_airports = set(df_segment['ORIGIN'].dropna().unique())
dest_airports = set(df_segment['DEST'].dropna().unique())

# Combine and create sorted list
unique_airports = sorted(origin_airports.union(dest_airports))

print(f"[SUCCESS] Found {len(unique_airports)} unique airports")
print(f"  Origins: {len(origin_airports)}")
print(f"  Destinations: {len(dest_airports)}")
print(f"  Sample airports: {', '.join(unique_airports[:10])}")
print()

# ============================================================================
# STEP 3: CREATE AIRPORT GEOJSON
# ============================================================================

print("Step 3: Creating GeoJSON file with filtered airports...")
print("-" * 80)

# Read the Airport Master List
try:
    df_airports = pd.read_csv(airport_master_list_path)
    print(f"[SUCCESS] Loaded Airport Master List: {len(df_airports):,} total airports")
except Exception as e:
    print(f"[ERROR] Error reading Airport Master List: {e}")
    con.close()
    exit(1)

# Filter to only airports in our segment data
# The Airport Master List uses 'AIRPORT' column for the IATA code
df_airports_filtered = df_airports[df_airports['AIRPORT'].isin(unique_airports)].copy()

print(f"[SUCCESS] Filtered to {len(df_airports_filtered)} airports present in segment data")

# Check for missing airports
missing_airports = set(unique_airports) - set(df_airports_filtered['AIRPORT'].unique())
if missing_airports:
    print(f"[WARNING] {len(missing_airports)} airports from segment data not found in master list")
    print(f"  Sample missing: {', '.join(sorted(missing_airports)[:5])}")

# Remove rows with invalid coordinates
initial_count = len(df_airports_filtered)
df_airports_filtered = df_airports_filtered.dropna(subset=['LATITUDE', 'LONGITUDE'])
if len(df_airports_filtered) < initial_count:
    print(f"[WARNING] Removed {initial_count - len(df_airports_filtered)} airports with missing coordinates")

# Create point geometries
try:
    geometry = [Point(xy) for xy in zip(df_airports_filtered['LONGITUDE'], df_airports_filtered['LATITUDE'])]
    gdf_airports = gpd.GeoDataFrame(df_airports_filtered, crs="EPSG:4326", geometry=geometry)

    print(f"[SUCCESS] Created GeoDataFrame with {len(gdf_airports)} airport points")

except Exception as e:
    print(f"[ERROR] Error creating geometries: {e}")
    con.close()
    exit(1)

# Save to GeoJSON
try:
    gdf_airports.to_file(airports_geojson_output, driver='GeoJSON')
    print(f"[SUCCESS] Saved airport GeoJSON to: {airports_geojson_output.name}")
    print(f"  File size: {airports_geojson_output.stat().st_size / 1024:.2f} KB")
except Exception as e:
    print(f"[ERROR] Error saving GeoJSON: {e}")
    con.close()
    exit(1)

print()

# ============================================================================
# SUMMARY
# ============================================================================

print("=" * 80)
print("EXTRACTION COMPLETE - SUMMARY")
print("=" * 80)
print(f"Annual Aggregated Records: {len(df_segment):,}")
print(f"Unique Airports: {len(unique_airports)}")
print(f"Airports in GeoJSON: {len(gdf_airports)}")
print()
print("Output Files:")
print(f"  1. {segment_csv_output}")
print(f"  2. {airports_geojson_output}")
print()

# Sample statistics
print("Segment Data Statistics (Annual Totals):")
print(f"  Total Departures Scheduled: {df_segment['DEPARTURES_SCHEDULED'].sum():,.0f}")
print(f"  Total Departures Performed: {df_segment['DEPARTURES_PERFORMED'].sum():,.0f}")
print(f"  Total Payload (lbs): {df_segment['PAYLOAD'].sum():,.0f}")
print(f"  Total Seats: {df_segment['SEATS'].sum():,.0f}")
print(f"  Total Passengers: {df_segment['PASSENGERS'].sum():,.0f}")
print(f"  Total Freight (lbs): {df_segment['FREIGHT'].sum():,.0f}")
print(f"  Total Mail (lbs): {df_segment['MAIL'].sum():,.0f}")
print(f"  Total Distance (miles): {df_segment['DISTANCE'].sum():,.0f}")
print(f"  Total Ramp-to-Ramp (minutes): {df_segment['RAMP_TO_RAMP'].sum():,.0f}")
print(f"  Total Air Time (minutes): {df_segment['AIR_TIME'].sum():,.0f}")
print(f"  Unique Carriers: {df_segment['CARRIER_NAME'].nunique()}")
print()

# Close database connection
con.close()
print("[SUCCESS] Database connection closed")
print("=" * 80)
