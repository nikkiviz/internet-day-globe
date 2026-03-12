import geopandas as gpd
import json

input_file = "../data/populated_places/source/ne_10m_populated_places.shp"
output_file = "../data/populated_places/cities.json"

print("Loading shapefile...")

gdf = gpd.read_file(input_file)

cities = []

for _, row in gdf.iterrows():

    cities.append({
        "name": row["NAME"],
        "lat": row.geometry.y,
        "lon": row.geometry.x,
        "population": row["POP_MAX"]
    })

print("Saving cities.json...")

with open(output_file, "w") as f:
    json.dump(cities, f)

print("Finished.")