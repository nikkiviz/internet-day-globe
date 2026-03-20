# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A scrollytelling data visualization ("A Day in the Life of the Internet") built with vanilla D3.js and HTML Canvas. It visualizes CARNA botnet internet census data (2012) — ping counts geolocated by hour — across three animated panels.

## Running the Project

This is a static site with no build step. Serve it with any local HTTP server (required for fetching local data files):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Data Pipeline

Raw data lives in `data/carna/hostprobes_raw/` as `.zpaq` archives (must be decompressed first). Processing scripts live in `processing scripts/` and must be run from that directory:

1. **`process_carna.py`** — reads decompressed raw hostprobe files (tab-separated: `ip\ttimestamp\tstatus`), geolocates IPs using `data/geoip/GeoLite2-City.mmdb` via `geoip2`, bins to 0.25° grid cells, and outputs per-batch CSVs to `data/carna/hostprobes_processed/`.
2. **`combine_final_carna.py`** — merges all batch CSVs in `hostprobes_processed/` into `carna_combined_final.csv`.

The final file consumed by the frontend is `data/carna/hostprobes_processed/carna_combined_final.csv` with columns: `lat, lon, hour, ping_count`.

## Visualization Architecture

`script.js` loads two datasets in parallel (`world.geojson` for land outlines + `carna_combined_final.csv`) then runs a single `requestAnimationFrame` loop that handles all three panels:

- **Globe panel** (`#globeCanvas` + `#mapFadeCanvas`): Orthographic projection, draggable. Crossfades to a flat map as the user scrolls into the map panel.
- **Map panel** (`#mapCanvas`): Natural Earth projection, scroll-driven. The `.step[data-hour]` elements in the HTML act as scroll triggers — their positions are read each frame to interpolate the current hour (0–23).
- **Final panel** (`#finalCanvas`): Auto-animates through all 24 hours in a loop.

Intensity is log-normalized against the global max ping count and mapped through a 6-stop color scale (dark blue → red).
