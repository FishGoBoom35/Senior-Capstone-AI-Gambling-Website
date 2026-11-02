"""Pull odds and save them. Run from the backend folder:

    python -m app.ingest              pull every sport in SPORTS (.env)
    python -m app.ingest --sport nfl  pull one sport
    python -m app.ingest --rebuild    refill the tables from saved raw pulls (no API calls)
"""

import argparse

from app import config, storage
from app.db import init_db
from app.odds_api import fetch_odds


def main():
    parser = argparse.ArgumentParser(description="Pull odds into the database")
    parser.add_argument("--sport", help="one sport, e.g. nfl (default: SPORTS in .env)")
    parser.add_argument(
        "--rebuild", action="store_true", help="refill tables from raw_pulls, no API call"
    )
    args = parser.parse_args()

    init_db()

    if args.rebuild:
        count = storage.rebuild_from_raw()
        print(f"Rebuilt {count} prices from saved raw pulls")
        return

    sports = [args.sport] if args.sport else config.SPORTS
    source = "sample data" if config.USE_SAMPLE_DATA else "The Odds API"

    for sport in sports:
        events = fetch_odds(sport)
        count = storage.save_pull(sport, events, is_sample=config.USE_SAMPLE_DATA)
        print(f"[{sport}] Saved {count} prices across {len(events)} games from {source}")


if __name__ == "__main__":
    main()
