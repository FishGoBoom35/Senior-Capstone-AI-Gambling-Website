"""Gets odds from The Odds API, or from sample_data/ when USE_SAMPLE_DATA=true."""

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx

from app import config

BASE_URL = "https://api.the-odds-api.com/v4"
SAMPLE_DIR = Path(__file__).resolve().parent.parent / "sample_data"


def fetch_odds(sport: str) -> list[dict]:
    """Return a list of games with odds, in The Odds API's format."""
    if sport not in config.SPORT_KEYS:
        raise ValueError(f"Unknown sport '{sport}'. Add it to SPORT_KEYS in config.py")

    if config.USE_SAMPLE_DATA:
        return load_sample(sport)

    if not config.ODDS_API_KEY:
        raise RuntimeError(
            "ODDS_API_KEY is not set. Add it to backend/.env, or set USE_SAMPLE_DATA=true"
        )

    params = {
        "apiKey": config.ODDS_API_KEY,
        "markets": ",".join(config.MARKETS),
        "oddsFormat": "american",
    }
    # The API takes either a region or a list of books, not both
    if config.BOOKMAKERS:
        params["bookmakers"] = ",".join(config.BOOKMAKERS)
    else:
        params["regions"] = config.REGIONS

    response = httpx.get(
        f"{BASE_URL}/sports/{config.SPORT_KEYS[sport]}/odds", params=params, timeout=20
    )
    response.raise_for_status()

    # Free tier has a monthly limit, so show what's left after each pull
    print("Odds API requests remaining:", response.headers.get("x-requests-remaining"))
    return response.json()


def load_sample(sport: str) -> list[dict]:
    """Fake odds for testing. Kickoff times are moved into the future so games show as upcoming."""
    path = SAMPLE_DIR / f"{sport}_odds.json"
    if not path.exists():
        raise FileNotFoundError(f"No sample file for '{sport}' at {path}")

    events = json.loads(path.read_text())
    start = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    for i, event in enumerate(events):
        kickoff = start + timedelta(days=2, hours=3 * i)
        event["commence_time"] = kickoff.strftime("%Y-%m-%dT%H:%M:%SZ")
    return events
