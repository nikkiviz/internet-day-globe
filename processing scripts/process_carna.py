import os
import geoip2.database
import pandas as pd
from collections import defaultdict
from datetime import datetime

raw_dir = "../data/carna/hostprobes_raw"
output_file = "../data/carna/hostprobes_processed/carna_batch_1.csv"

reader = geoip2.database.Reader("../data/geoip/GeoLite2-City.mmdb")

print("Processing probe files...")

counts = defaultdict(int)

for fname in sorted(os.listdir(raw_dir)):

    if not fname.isdigit():
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
                hour = datetime.utcfromtimestamp(timestamp).hour
            except:
                continue

            try:
                r = reader.city(ip)

                lat = r.location.latitude
                lon = r.location.longitude

                if lat is None or lon is None:
                    continue

                key = (round(lat,2), round(lon,2), hour)

                counts[key] += 1

            except:
                continue

print("Building dataset...")

rows = []

for (lat, lon, hour), count in counts.items():

    rows.append({
        "lat": lat,
        "lon": lon,
        "hour": hour,
        "ping_count": count
    })

df = pd.DataFrame(rows)

df.to_csv(output_file, index=False)

print("Done.")
print("Rows written:", len(df))