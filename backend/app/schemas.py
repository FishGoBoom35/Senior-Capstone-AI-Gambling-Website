"""The shape of what the API sends to the frontend.

This is the contract with the frontend. Keep it stable even if the database changes.
Full example at http://localhost:8000/docs once the server is running.
"""

from datetime import datetime

from pydantic import BaseModel


class Price(BaseModel):
    outcome: str  # team name, or "Over" / "Under"
    price: int  # American odds, e.g. -145 or +125
    point: float | None = None  # spread or total line; null for moneyline


class GameOdds(BaseModel):
    id: str
    sport: str
    home_team: str
    away_team: str
    commence_time: datetime
    updated_at: datetime  # when these odds were pulled
    is_sample: bool  # true = fake data from sample_data/
    # books["DraftKings"]["h2h"] -> list of Price
    # markets: "h2h" (moneyline), "spreads", "totals"
    books: dict[str, dict[str, list[Price]]]
