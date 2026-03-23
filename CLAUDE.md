# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A scrollytelling data visualization ("A Day in the Life of the Internet") built with vanilla D3.js and HTML Canvas. It visualizes CARNA botnet internet census data (2012) — ping counts geolocated by hour — across three animated panels.

## Data Sources

The hostprobes files in the carna botnet dataset: https://internetcensus2012.github.io/InternetCensus2012/download.html

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

## Intended Narrative Structure

The page tells a story in five acts as the user scrolls:

1. **Intro** — Title ("A Day in the Life of the Internet") and text introducing the CARNA botnet census. Framed as a never-before-seen "photo" of the internet. No visualization visible yet.

2. **Globe reveal** — On scroll, a globe appears (animates from a small dot to full size). Layout: narrative text left, globe right. The globe is interactive (click + drag to rotate, can spin continuously) and shows data fixed at 00:00 UTC. Left text explains this is a single snapshot in time.

3. **Globe → map transition** — On further scroll, the globe transitions out and a flat world map replaces it (right side). Left text introduces the time dimension and prompts the user to scroll to watch a full day.

4. **Scroll-driven time animation** — Scrolling advances the map from 00:00 → 23:59 UTC hour by hour. Left side has narrative callouts at 00:00, 06:00, 12:00, and 18:00, each explaining global activity patterns (regions waking/sleeping, etc.).

5. **Final autoplay** — At 23:59, the map expands to full content width and loops automatically like a GIF. Followed by a conclusion section and credits.

## Visualization Architecture

`script.js` loads two datasets in parallel (`world.geojson` for land outlines + `carna_combined_final.csv`) then runs a single `requestAnimationFrame` loop that handles all three panels:

- **Globe panel** (`#globeCanvas` + `#mapFadeCanvas`): Orthographic projection, draggable. Crossfades to a flat map as the user scrolls into the map panel.
- **Map panel** (`#mapCanvas`): Natural Earth projection, scroll-driven. The `.step[data-hour]` elements in the HTML act as scroll triggers — their positions are read each frame to interpolate the current hour (0–23).
- **Final panel** (`#finalCanvas`): Auto-animates through all 24 hours in a loop.

Intensity is log-normalized against the global max ping count and mapped through a 6-stop color scale (dark blue → red).
