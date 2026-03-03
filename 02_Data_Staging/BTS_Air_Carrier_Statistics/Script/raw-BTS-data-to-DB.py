import pandas as pd
import os
import sqlite3
import zipfile
from pathlib import Path


class ImportBTSAirData:
    def __init__(self):
        # Resolve paths relative to this script's location
        script_dir = Path(__file__).parent
        raw_data = script_dir.parent.parent.parent / "01_Raw Data" / "BTS_Air_Carrier_Statistics"
        self.path = raw_data
        # Output DB goes in the Database folder alongside this script's parent
        self.dbpath = script_dir.parent / "Database"
        self.con = sqlite3.connect(self.dbpath / "BTS_Air_Carrier_Statistics.db")

    def ImportAllFiles(self):
        # First put all market data into the DB
        marketpath = self.path / "Raw BTS MARKET DATA"
        allfiles = os.listdir(marketpath)
        # List all files and go through and process each ZIP file
        for i in allfiles:
            if i[-3:] == "zip":
                print(i)
                df = self.OpenZipFile(marketpath, i)
                if df is not None:
                    # Update the database by appending the contents of the CSV to the BTS_MARKET table
                    df.to_sql("BTS_MARKET", con=self.con, if_exists="append", index=False)

        # Now put all segment data into the DB
        segmentpath = self.path / "Raw BTS SEGMENT DATA"
        allfiles = os.listdir(segmentpath)
        for i in allfiles:
            if i[-3:] == "zip":
                print(i)
                df = self.OpenZipFile(segmentpath, i)
                if df is not None:
                    df.to_sql("BTS_SEGMENT", con=self.con, if_exists="append", index=False)

    def OpenZipFile(self, path, filename):
        # Opens a zip file and extracts the csv
        df = None
        try:
            with zipfile.ZipFile(Path(path) / filename, 'r') as zip_ref:
                # open the zipfile
                files = zip_ref.namelist()
                for i in files:
                    if i[-4:] == ".csv":
                        data = zip_ref.open(i)
                        df = pd.read_csv(data, sep=",")
        except Exception as e:
            print(f"[ERROR] {e} — {filename}")
        return df


if __name__ == "__main__":
    # Run the code from here - initialize the class
    # If you want to create a new db delete the old one or change the name in the connection string
    a = ImportBTSAirData()
    # Then call the class member function
    a.ImportAllFiles()
    # Close the database connection
    a.con.close()
    print("[SUCCESS] All files imported and database connection closed.")
