import pandas as pd

INPUT = "../hostprobes_processed/carna_map_dense.csv"
OUTPUT = "../hostprobes_processed/carna_map_sampled.csv"

TARGET_POINTS = 120000   # good for D3 SVG globe

print("Loading dataset...")
df = pd.read_csv(INPUT)

print("Total rows:", len(df))

print("Sampling...")
sample = df.sample(n=TARGET_POINTS, random_state=42)

print("Saving...")
sample.to_csv(OUTPUT, index=False)

print("Done.")
print("Sample size:", len(sample))