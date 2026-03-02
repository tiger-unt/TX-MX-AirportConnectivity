import pandas as pd
import os
import sqlite3
import zipfile
import matplotlib.pyplot as plt
import geopandas as gp
import numpy as np
from shapely import LineString, Point

class ImportBTSAirData:
    def __init__(self):
        #Change this path to point to the location of all the downloaded BTS Files
        self.path = "C:\\Users\\andre\\UNT System\\TxDOT IAC 2025-26 - General\\Task 6 - Airport Connectivity\\01 - Raw Data\\Raw Data\\Andrew Download BTS US Airport Data\\"
        #Change this path to point to a location where the finished DB should end up
        self.dbpath = "C:\\Data\\TxDOT IAC\\Airport\\BTSData\\"
        #This is the connection to the database at the specified path + desired name of the db
        self.con = sqlite3.connect(self.dbpath + "BTS_Airport_Data.db")

    def ImportAllFiles(self):
        #First put all market data into the DB
        marketpath = self.path + "Raw BTS MARKET DATA\\"
        allfiles = os.listdir(marketpath)
        #List all files and go through and process each ZIP file
        for i in allfiles:
            if i[-3:] == "zip":
                print(i)
                df = self.OpenZipFile(marketpath , i)
                if df is not None:
                    #Update the database by appending the contents of the CSV to the BTS_MARKET table
                    df.to_sql("BTS_MARKET", con=self.con, if_exists="append", index=False)

        # FNow put all segment data into the DB
        segmentpath = self.path + "Raw BTS SEGMENT DATA\\"
        allfiles = os.listdir(segmentpath)
        for i in allfiles:
            if i[-3:] == "zip":
                print(i)
                df = self.OpenZipFile(segmentpath, i)
                df.to_sql("BTS_SEGMENT", con=self.con, if_exists="append", index=False)

    def OpenZipFile(self, path, filename):
        #Opens a zip file and extracts the csv
        df = None
        try:
            with zipfile.ZipFile(path + filename, 'r') as zip_ref:
                #open the zipfile
                files = zip_ref.namelist()
                for i in files:
                    if i[-4:] == ".csv":
                        data = zip_ref.open(i)
                        df = pd.read_csv(data, sep=",")
        except Exception as e:
            print(e, filename)
        return df



if __name__ == "__main__":
    #Run the code from here - initialize the class
    #If you want to create a new db delete the old one or change the name in the connection string
    a = ImportBTSAirData()
    #Then call the class member function
    a.ImportAllFiles()