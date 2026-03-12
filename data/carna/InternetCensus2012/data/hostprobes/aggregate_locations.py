import pandas as pd

print("Loading alive hosts...")
alive = pd.read_csv(
    "alive_hosts.txt",
    sep="\t",
    header=None,
    names=["ip","timestamp","status","response"]
)

print("Counting pings per IP...")
counts = alive.groupby("ip").size().reset_index(name="ping_count")

print("Loading IP locations...")
locations = pd.read_csv("ip_locations_clean.csv")

print("Merging datasets...")
merged = counts.merge(locations, on="ip", how="inner")

print("Selecting coordinates...")
dense = merged[["lat","lon","ping_count"]]

print("Saving dense dataset...")
dense.to_csv("../hostprobes_processed/carna_map_dense.csv", index=False)

print("Done.")
print(len(dense), "host points written")