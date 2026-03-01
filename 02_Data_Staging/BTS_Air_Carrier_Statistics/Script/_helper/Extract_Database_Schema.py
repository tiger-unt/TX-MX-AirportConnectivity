#!/usr/bin/env python3
"""
Database Schema Extractor for BTS Airport Data

This script extracts and documents the complete schema of the BTS_Airport_DataII.db
SQLite database, including table structures, column information, indexes, and
sample data for development purposes.

Output includes:
- Database overview (tables, record counts)
- Detailed table schemas with column types and descriptions
- Index information
- Sample data from each table
- Foreign key relationships (if any)
"""

import sqlite3
import pandas as pd
import os
from datetime import datetime
import json

class BTSDatabaseSchemaExtractor:
    def __init__(self, db_path):
        """Initialize with database path"""
        self.db_path = db_path
        self.connection = None
        self.schema_data = {}

    def connect(self):
        """Establish database connection"""
        try:
            self.connection = sqlite3.connect(self.db_path)
            print(f"[SUCCESS] Connected to database: {self.db_path}")
            return True
        except Exception as e:
            print(f"[ERROR] Failed to connect to database: {e}")
            return False

    def disconnect(self):
        """Close database connection"""
        if self.connection:
            self.connection.close()
            print("[INFO] Database connection closed")

    def get_database_overview(self):
        """Get basic database information"""
        overview = {}

        # Get SQLite version
        version = pd.read_sql("SELECT sqlite_version() as version", self.connection)
        overview['sqlite_version'] = version.iloc[0]['version']

        # Get database file size
        db_size = os.path.getsize(self.db_path)
        overview['database_size_mb'] = round(db_size / (1024 * 1024), 2)

        # Get all tables
        tables_query = """
        SELECT name, type
        FROM sqlite_master
        WHERE type IN ('table', 'view', 'index')
        AND name NOT LIKE 'sqlite_%'
        ORDER BY type, name
        """
        tables_df = pd.read_sql(tables_query, self.connection)
        overview['tables'] = tables_df[tables_df['type'] == 'table']['name'].tolist()
        overview['views'] = tables_df[tables_df['type'] == 'view']['name'].tolist()
        overview['indexes'] = tables_df[tables_df['type'] == 'index']['name'].tolist()

        return overview

    def get_table_schema(self, table_name):
        """Get detailed schema for a specific table"""
        schema = {'table_name': table_name}

        # Get column information using PRAGMA
        columns_df = pd.read_sql(f"PRAGMA table_info({table_name})", self.connection)
        schema['columns'] = columns_df.to_dict('records')

        # Get record count
        count_df = pd.read_sql(f"SELECT COUNT(*) as record_count FROM {table_name}", self.connection)
        schema['record_count'] = int(count_df.iloc[0]['record_count'])

        # Get sample data (first 5 rows)
        try:
            sample_df = pd.read_sql(f"SELECT * FROM {table_name} LIMIT 5", self.connection)
            schema['sample_data'] = sample_df.to_dict('records')
        except Exception as e:
            schema['sample_data'] = f"Error getting sample data: {e}"

        # Get data types summary
        try:
            dtypes_df = pd.read_sql(f"SELECT * FROM {table_name} LIMIT 1000", self.connection)
            schema['data_types_info'] = dtypes_df.dtypes.astype(str).to_dict()
        except Exception as e:
            schema['data_types_info'] = f"Error getting data types: {e}"

        # Get index information for this table
        indexes_query = f"""
        SELECT name, sql
        FROM sqlite_master
        WHERE type = 'index'
        AND tbl_name = '{table_name}'
        AND name NOT LIKE 'sqlite_autoindex_%'
        """
        indexes_df = pd.read_sql(indexes_query, self.connection)
        schema['indexes'] = indexes_df.to_dict('records') if not indexes_df.empty else []

        return schema

    def get_foreign_keys(self):
        """Get foreign key relationships"""
        fk_info = {}

        # Get all tables
        tables_df = pd.read_sql("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", self.connection)

        for table_name in tables_df['name']:
            try:
                fk_df = pd.read_sql(f"PRAGMA foreign_key_list({table_name})", self.connection)
                if not fk_df.empty:
                    fk_info[table_name] = fk_df.to_dict('records')
            except Exception as e:
                print(f"Warning: Could not get foreign keys for {table_name}: {e}")

        return fk_info

    def analyze_data_ranges(self, table_name):
        """Analyze data ranges for numeric/date columns"""
        analysis = {}

        try:
            # Get numeric columns
            numeric_cols = []
            dtypes_df = pd.read_sql(f"SELECT * FROM {table_name} LIMIT 1", self.connection)
            for col in dtypes_df.columns:
                if dtypes_df[col].dtype in ['int64', 'float64']:
                    numeric_cols.append(col)

            # Analyze numeric ranges
            if numeric_cols:
                for col in numeric_cols:
                    range_query = f"SELECT MIN({col}) as min_val, MAX({col}) as max_val, AVG({col}) as avg_val FROM {table_name} WHERE {col} IS NOT NULL"
                    range_df = pd.read_sql(range_query, self.connection)
                    analysis[col] = {
                        'min': float(range_df.iloc[0]['min_val']) if range_df.iloc[0]['min_val'] is not None else None,
                        'max': float(range_df.iloc[0]['max_val']) if range_df.iloc[0]['max_val'] is not None else None,
                        'avg': float(range_df.iloc[0]['avg_val']) if range_df.iloc[0]['avg_val'] is not None else None
                    }

            # Analyze YEAR column if exists
            year_cols = [col for col in dtypes_df.columns if 'year' in col.lower() or 'YEAR' in col]
            if year_cols:
                for col in year_cols:
                    year_range = pd.read_sql(f"SELECT DISTINCT {col} FROM {table_name} ORDER BY {col}", self.connection)
                    analysis[f'{col}_values'] = year_range[col].tolist()

        except Exception as e:
            analysis['error'] = str(e)

        return analysis

    def generate_schema_report(self):
        """Generate complete schema report"""
        if not self.connect():
            return None

        print("[INFO] Extracting database schema...")

        # Get overview
        self.schema_data['overview'] = self.get_database_overview()
        self.schema_data['extraction_timestamp'] = datetime.now().isoformat()

        # Get detailed schema for each table
        self.schema_data['tables'] = {}
        for table_name in self.schema_data['overview']['tables']:
            print(f"[INFO] Processing table: {table_name}")
            self.schema_data['tables'][table_name] = self.get_table_schema(table_name)
            self.schema_data['tables'][table_name]['data_analysis'] = self.analyze_data_ranges(table_name)

        # Get foreign key relationships
        print("[INFO] Checking foreign key relationships...")
        self.schema_data['foreign_keys'] = self.get_foreign_keys()

        self.disconnect()
        return self.schema_data

    def save_schema_to_file(self, output_path=None):
        """Save schema to JSON file"""
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"BTS_Database_Schema_{timestamp}.json"

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(self.schema_data, f, indent=2, default=str, ensure_ascii=False)

        print(f"[SUCCESS] Schema saved to: {output_path}")
        return output_path

    def print_summary_report(self):
        """Print a human-readable summary"""
        if not self.schema_data:
            print("No schema data available. Run generate_schema_report() first.")
            return

        print("\n" + "="*80)
        print("BTS AIRPORT DATABASE SCHEMA SUMMARY")
        print("="*80)

        overview = self.schema_data['overview']
        print(f"SQLite Version: {overview['sqlite_version']}")
        print(f"Database Size: {overview['database_size_mb']} MB")
        print(f"Tables: {len(overview['tables'])}")
        print(f"Views: {len(overview.get('views', []))}")
        print(f"Indexes: {len(overview.get('indexes', []))}")

        print(f"\nTABLE DETAILS:")
        print("-" * 40)

        for table_name in overview['tables']:
            table_info = self.schema_data['tables'][table_name]
            print(f"\n[TABLE] {table_name}")
            print(f"   Records: {table_info['record_count']:,}")
            print(f"   Columns: {len(table_info['columns'])}")

            # Show key columns
            key_cols = []
            for col in table_info['columns']:
                if col.get('pk', 0) == 1:
                    key_cols.append(f"{col['name']} (PK)")
                elif 'year' in col['name'].lower():
                    key_cols.append(f"{col['name']} (Time)")

            if len(key_cols) <= 5:
                print(f"   Key Fields: {', '.join(key_cols)}")
            else:
                print(f"   Key Fields: {', '.join(key_cols[:3])}, ...")

        # Foreign keys
        fk_info = self.schema_data.get('foreign_keys', {})
        if fk_info:
            print(f"\nFOREIGN KEY RELATIONSHIPS:")
            print("-" * 40)
            for table, fks in fk_info.items():
                for fk in fks:
                    print(f"   {table}.{fk['from']} → {fk['table']}.{fk['to']}")

        print(f"\n[TIMESTAMP] Extraction Time: {self.schema_data['extraction_timestamp']}")
        print("="*80)

def main():
    """Main execution function"""
    # Database path - adjust if needed
    db_path = r"c:\Users\UNT\UNT System\TxDOT IAC 2025-26 - General\Task 6 - Airport Connectivity\02_Data_Staging\BTS\BTS_Airport_DataII.db"

    # Check if database exists
    if not os.path.exists(db_path):
        print(f"[ERROR] Database not found: {db_path}")
        return

    # Create extractor and generate schema
    extractor = BTSDatabaseSchemaExtractor(db_path)

    # Generate schema
    schema = extractor.generate_schema_report()

    if schema:
        # Print summary
        extractor.print_summary_report()

        # Save detailed schema to file
        output_file = extractor.save_schema_to_file()

        print(f"\n[SUCCESS] Schema extraction complete!")
        print(f"[OUTPUT] Detailed schema saved to: {output_file}")
        print("\n[INFO] The JSON file contains complete table schemas, sample data,")
        print("   data type information, and analysis that can be used for")
        print("   further agent development.")

    else:
        print("[ERROR] Failed to extract schema")

if __name__ == "__main__":
    main()