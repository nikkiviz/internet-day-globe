import os

raw_dir = "../data/carna/hostprobes_raw"
output_file = "../data/carna/hostprobes_processed/alive_hosts.txt"

print("Building alive_hosts.txt...")

with open(output_file, "w") as out:

    for fname in sorted(os.listdir(raw_dir)):

        if not fname.isdigit():
            continue

        path = os.path.join(raw_dir, fname)

        print("Processing probe file:", fname)

        with open(path) as f:
            for line in f:
                if "\tup\t" in line:
                    out.write(line)

print("Finished.")