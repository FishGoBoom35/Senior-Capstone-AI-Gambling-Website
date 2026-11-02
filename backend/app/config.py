"""All settings in one place. Values come from backend/.env so nothing is hardcoded.

Change these as the team decides things. No code changes needed.
"""

import os

from dotenv import load_dotenv

load_dotenv()


def _list(name: str, default: str) -> list[str]:
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


# Short names we use in our URLs -> The Odds API sport keys.
# Add a line here when we go multi-sport (post-MVP).
SPORT_KEYS = {
    "nfl": "americanfootball_nfl",
    "ncaaf": "americanfootball_ncaaf",
    "nba": "basketball_nba",
    "mlb": "baseball_mlb",
    "nhl": "icehockey_nhl",
}

# Which sports to pull. MVP is NFL only.
SPORTS = _list("SPORTS", "nfl")

# h2h = moneyline, spreads = point spread, totals = over/under
MARKETS = _list("MARKETS", "h2h,spreads,totals")

# Sportsbook region. "us" covers DraftKings, FanDuel, BetMGM, etc.
REGIONS = os.getenv("REGIONS", "us")

# Optional: limit to specific books (Odds API keys, e.g. "draftkings,fanduel,betmgm").
# Leave blank to get every book in the region.
BOOKMAKERS = _list("BOOKMAKERS", "")

ODDS_API_KEY = os.getenv("ODDS_API_KEY", "")

# true = serve the fake odds in sample_data/ instead of calling the API.
# Good for frontend work, demos, and saving API quota.
USE_SAMPLE_DATA = os.getenv("USE_SAMPLE_DATA", "false").lower() == "true"

# Postgres is the target. If this is blank, a local SQLite file is used instead
# so anyone can run the backend without Docker.
DATABASE_URL = os.getenv("DATABASE_URL", "") or "sqlite:///./utgi_local.db"

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
