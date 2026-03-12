import geoip2.database
import pandas as pd

reader = geoip2.database.Reader("/Users/hannahperry/Desktop/github/first-d3-project/data/geoip/GeoLite2-City.mmdb")

rows = []

with open("unique_ips.txt") as f:
    for i, ip in enumerate(f):
        ip = ip.strip()

        try:
            r = reader.city(ip)

            rows.append({
                "ip": ip,
                "city": r.city.name,
                "lat": r.location.latitude,
                "lon": r.location.longitude,
                "country": r.country.iso_code
            })

        except:
            pass

        if i % 50000 == 0:
            print(i, "IPs processed")

df = pd.DataFrame(rows)

df.to_csv("ip_locations.csv", index=False)

print("Finished.")