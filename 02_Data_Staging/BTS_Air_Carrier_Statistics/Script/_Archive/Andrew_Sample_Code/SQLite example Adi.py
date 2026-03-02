import pandas as pd
import sqlite3
#comment out this (below) if you dont have the libraries installed and then comment out the graph function below
import matplotlib.pyplot as plt

#AGB Dec 1st 2025. Code contains a few examples for working with SQLite and text files, graphs, GIS files etc.

dbpath = "C:\\Data\\TxDOT IAC\\Airport\\BTSData\\"
dbname = "BTS_Airport_DataII.db"
#This creates a connection to the SQLite DB - declare gloabally as it can be reused
con = sqlite3.connect(dbpath + dbname)
#Change this to a destination folder of choice
outpath = "C:\\Users\\andre\\UNT System\\TxDOT IAC 2025-26 - General\\Task 6 - Airport Connectivity\\02 - Data Staging\\BTS_Database and code\\Code\\"

def example_data_pull_I():
    # Change this to a filename of choice
    outfilename = "test_db_pull_I.csv"
    #Hard code a SQL statement - use double quotes for the string, and single quotes for text in the SQL query
    sql = "select * from BTS_MARKET where ORIGIN = 'IAH' and DEST = 'DFW' order by YEAR"
    #Use pandas to query the db and turn into a DataFrame
    df = pd.read_sql(sql, con)
    df.to_csv(outpath + outfilename, index=False, sep=",") #Output tp flat file - choose seperator etc use a tab so it opens up in Excel

def example_data_pull_II(origin, destination):
    #Change this to a filename of choice
    outfilename = "test_db_pull_II.csv"
    #Soft code a SQL statement - use double quotes for the string, and single quotes for text in the SQL query. Pass in function arguments for a specific OD
    sql = "select * from BTS_MARKET where ORIGIN = '{:s}' and DEST = '{:s}' order by YEAR".format(origin, destination)
    #Use pandas to query the db and turn into a DataFrame
    df = pd.read_sql(sql, con)
    df.to_csv(outpath + outfilename, index=False, sep=",") #Output tp flat file - choose seperator etc use a tab so it opens up in Excel

def example_data_pull_III(origin, destination):
    #Change this to a filename of choice
    outfilename = "test_db_pull_III.csv"
    #Soft code a SQL statement - use double quotes for the string, and single quotes for text in the SQL query. Pass in function arguments for a specific OD
    sql = ("select YEAR, ORIGIN, DEST, SUM(PASSENGERS), SUM(FREIGHT), SUM(MAIL) from BTS_MARKET where ORIGIN = '{:s}' and DEST = '{:s}' "
           " GROUP BY ORIGIN, DEST,YEAR "
           " order by YEAR").format(origin, destination)
    #Use pandas to query the db and turn into a DataFrame
    df = pd.read_sql(sql, con)
    df.to_csv(outpath + outfilename, index=False, sep=",") #Output tp flat file - choose seperator etc use a tab so it opens up in Excel

def ExampleGraph(origin, destination):
    outfilename = "test_graph_{:s}-{:s}.png".format(origin, destination)
    fig, ax = plt.subplots(1,1, figsize=(10,7))
    sql = (
        "select YEAR, ORIGIN, DEST, SUM(PASSENGERS) AS PASSENGERS, SUM(FREIGHT) AS FREIGHT, SUM(MAIL) AS MAIL from BTS_MARKET where ORIGIN = '{:s}' and DEST = '{:s}' "
        " GROUP BY ORIGIN, DEST,YEAR "
        " order by YEAR").format(origin, destination)
    df = pd.read_sql(sql, con)
    ax.plot(df["YEAR"], df["PASSENGERS"], marker='o', linestyle='-', color='r', label=origin + "-" + destination)
    ax.set_xlabel("YEAR")
    ax.set_ylabel("PASSENGERS")
    #Now repeat the query switching o and d
    sql = (
        "select YEAR, ORIGIN, DEST, SUM(PASSENGERS) AS PASSENGERS, SUM(FREIGHT) AS FREIGHT, SUM(MAIL) AS MAIL from BTS_MARKET where ORIGIN= '{:s}' and DEST = '{:s}' "
        " GROUP BY ORIGIN, DEST,YEAR "
        " order by YEAR").format(destination, origin)
    df = pd.read_sql(sql, con)
    ax.plot(df["YEAR"], df["PASSENGERS"], marker='o', linestyle='-', color='b', label=destination + "-" + origin)
    ax.legend()
    plt.savefig(outpath + outfilename)

def Draw_a_ton_of_Graphs():
    airports = ["LRD", "DAL", "BRO", "ELP"]
    #Creates each permutation of OD
    for i in range(len(airports)):
        for j in range(i, len(airports)):
            if i != j:
                ExampleGraph(airports[i], airports[j])

#Comment out the below if you don't have the libraries
import geopandas as gp
from shapely import to_wkt, from_wkt, LineString
def Create_a_Geometry_Table():
    inpath = "C:\\Users\\andre\\UNT System\\TxDOT IAC 2025-26 - General\\Task 6 - Airport Connectivity\\02 - Data Staging\\BTS_Database and code\\"
    inputfile = "T_MASTER_CORD.csv"
    df = pd.read_csv(inpath + inputfile)
    geoms = gp.points_from_xy(df["LONGITUDE"], df["LATITUDE"])
    gdf = gp.GeoDataFrame(df, crs="EPSG:4326", geometry=geoms)
    #So this gdf is ready to use and could be outputed, but we are going to create a table in the DB
    wkt = to_wkt(gdf.geometry) #Convert the binary geometry into a WKT format
    #Now add the data to a table in the DB if it exists, replace it so that we dont have duplicates
    df["WKT"] = wkt
    df.to_sql("AIRPORTS", con, if_exists="replace", index=False)

def Create_a_GIS_file():
    outfile = "all_airports.geojson" #Use whatever format you like
    #Create a GIS file from the geometry table in SQLite
    sql = "select * from AIRPORTS where AIRPORT_COUNTRY_NAME = 'Mexico' or AIRPORT_STATE_NAME = 'Texas'"
    #Select all fields but only airports in Mx or Tx
    df = pd.read_sql(sql, con)
    #Now turn the wkt field into geometry
    geoms = from_wkt(df["WKT"])
    gdf = gp.GeoDataFrame(df, crs="EPSG:4326", geometry=geoms) #Create a Geodataframe
    gdf.to_file(outpath + outfile) #Save it to an output location

def Create_a_GIS_OD_File():

    #Creates a GIS file with lines joining up O-Ds and values representing total # passengers, freight etc.
    #Must have the AIRPOTRS table in teh db to work (see preceding function)
    #Could be speeded up using an index on ORIGIN and DEST fields
    #Could be improved by drawing arcs instead of straight lines and by adding error checking
    
    outfile = "airport_OD.geojson"  # Use whatever format you like
    # Create a GIS file from the geometry table in SQLite
    airports = ["LRD", "DFW", "IAH"]
    sql = (
        "select YEAR, ORIGIN, DEST, SUM(PASSENGERS) AS PASSENGERS, SUM(FREIGHT) AS FREIGHT, SUM(MAIL) AS MAIL, D1.WKT AS O_WKT, D2.WKT AS D_WKT from BTS_MARKET "
        " join AIRPORTS as D1 on D1.AIRPORT = BTS_MARKET.ORIGIN "
        " join AIRPORTS as D2 on D2.AIRPORT = BTS_MARKET.DEST "
        " where ORIGIN= '{:s}' and DEST = '{:s}' "
        " GROUP BY ORIGIN, DEST,YEAR"
        " order by YEAR")

    # Creates each permutation of OD
    outdata = []
    geoms = []
    for i in range(len(airports)):
        for j in range(0, len(airports)):
            if i != j:
                sql_mod = sql.format(airports[i], airports[j])
                db = pd.read_sql(sql_mod, con)
                outdata.append(db.iloc[0].to_dict())
                o_pt = db.iloc[0].O_WKT
                d_pt = db.iloc[0].D_WKT
                o_pt = from_wkt(o_pt)
                d_pt = from_wkt(d_pt)
                line = LineString([o_pt, d_pt])
                geoms.append(line)
    #Create a new Geodataframe
    gdf = gp.GeoDataFrame(outdata, crs="EPSG:4326", geometry=geoms)
    gdf.to_file(outpath + outfile)




if __name__ == "__main__":
    # example_data_pull_I()
    # example_data_pull_II(origin="IAH", destination="DFW")
    # example_data_pull_III(origin="IAH", destination="DFW")
    # ExampleGraph("IAH", "DFW")
    # Draw_a_ton_of_Graphs()
    #Create_a_Geometry_Table()
    #Create_a_GIS_file()
    Create_a_GIS_OD_File()
