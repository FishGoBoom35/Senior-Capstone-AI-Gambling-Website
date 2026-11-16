"""Database tables.

raw_pulls is permanent: it keeps every API response exactly as received.

games and odds_snapshots are DRAFT tables until the team's database plan is final.
When it is, replace them here and update storage.py. Then run
`python -m app.ingest --rebuild` to refill the new tables from raw_pulls,
so no history is lost.
"""

from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class RawPull(Base):
    """One API call, stored untouched. Source of truth for everything else."""

    __tablename__ = "raw_pulls"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sport: Mapped[str] = mapped_column(String, index=True)  # e.g. "nfl"
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    is_sample: Mapped[bool] = mapped_column(default=False)
    payload: Mapped[list] = mapped_column(JSON)


# ---------------------------------------------------------------------------
# DRAFT: swap these for the final schema once it's agreed.
# ---------------------------------------------------------------------------


class Game(Base):
    __tablename__ = "games"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # Odds API event id
    sport: Mapped[str] = mapped_column(String, index=True)
    commence_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    home_team: Mapped[str] = mapped_column(String)
    away_team: Mapped[str] = mapped_column(String)


class OddsSnapshot(Base):
    """One price from one book in one pull. Never overwritten, so line history builds up."""

    __tablename__ = "odds_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    pull_id: Mapped[int] = mapped_column(ForeignKey("raw_pulls.id"), index=True)
    game_id: Mapped[str] = mapped_column(ForeignKey("games.id"), index=True)
    bookmaker: Mapped[str] = mapped_column(String)  # e.g. "DraftKings"
    market: Mapped[str] = mapped_column(String)  # h2h, spreads, totals
    outcome: Mapped[str] = mapped_column(String)  # team name, or Over / Under
    price: Mapped[int] = mapped_column(Integer)  # American odds, e.g. -145
    point: Mapped[float | None] = mapped_column(Float, nullable=True)  # spread or total line
