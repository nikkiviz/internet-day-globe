import os
import geoip2.database
import csv
from collections import defaultdict

raw_dir = "../data/carna/hostprobes_raw"
output_file = "../data/carna/hostprobes_processed/carna_1213141516.csv"

reader = geoip2.database.Reader("../data/geoip/GeoLite2-City.mmdb")

GRID_SIZE = 0.25

print("Processing probe files...")

counts = defaultdict(int)

for fname in sorted(os.listdir(raw_dir)):

    if "." in fname:
        continue

    path = os.path.join(raw_dir, fname)

    print("Reading:", fname)

    with open(path) as f:

        for line in f:

            parts = line.split("\t")

            if len(parts) < 3:
                continue

            if parts[2] != "up":
                continue

            ip = parts[0]

            try:
                timestamp = int(parts[1])
                hour = (timestamp // 3600) % 24
            except:
                continue

            try:
                r = reader.city(ip)

                lat = r.location.latitude
                lon = r.location.longitude

                if lat is None or lon is None:
                    continue

                grid_lat = round(lat / GRID_SIZE) * GRID_SIZE
                grid_lon = round(lon / GRID_SIZE) * GRID_SIZE

                key = (grid_lat, grid_lon, hour)

                counts[key] += 1

            except:
                continue

print("Writing dataset...")

with open(output_file, "w", newline="") as f:

    writer = csv.writer(f)

    writer.writerow(["lat","lon","hour","ping_count"])

    for (lat, lon, hour), count in counts.items():
        writer.writerow([lat, lon, hour, count])

print("Done.")
print("Rows written:", len(counts))