"""Every database read and write lives here.

When the final schema is agreed, this is the only file (plus models.py) that needs
to change. The API response shape in schemas.py stays the same, so the frontend
doesn't break.
"""

from datetime import datetime, timezone

from sqlalchemy import delete, func, select

from app.db import SessionLocal
from app.models import Game, OddsSnapshot, RawPull


def _parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _as_utc(value: datetime) -> datetime:
    # SQLite gives back times without a timezone; treat them as UTC
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


# ---------------------------------------------------------------------------
# Writing
# ---------------------------------------------------------------------------


def save_pull(sport: str, events: list[dict], is_sample: bool = False) -> int:
    """Store one API response: the raw JSON, then the parsed rows. Returns prices saved."""
    with SessionLocal() as session:
        pull = RawPull(
            sport=sport,
            fetched_at=datetime.now(timezone.utc),
            is_sample=is_sample,
            payload=events,
        )
        session.add(pull)
        session.flush()  # gives pull an id

        saved = _parse_into_tables(session, pull)
        session.commit()
        return saved


def rebuild_from_raw() -> int:
    """Clear the draft tables and refill them from raw_pulls.

    Run this after changing the schema in models.py.
    """
    with SessionLocal() as session:
        session.execute(delete(OddsSnapshot))
        session.execute(delete(Game))

        saved = 0
        for pull in session.scalars(select(RawPull).order_by(RawPull.fetched_at)):
            saved += _parse_into_tables(session, pull)

        session.commit()
        return saved


def _parse_into_tables(session, pull: RawPull) -> int:
    """Turn one raw pull into game and price rows. Change this when the schema changes."""
    saved = 0
    for event in pull.payload:
        game = session.get(Game, event["id"])
        if game is None:
            game = Game(id=event["id"], sport=pull.sport)
            session.add(game)
        game.commence_time = _parse_time(event["commence_time"])
        game.home_team = event["home_team"]
        game.away_team = event["away_team"]

        for book in event.get("bookmakers", []):
            for market in book.get("markets", []):
                for outcome in market.get("outcomes", []):
                    session.add(
                        OddsSnapshot(
                            pull_id=pull.id,
                            game_id=event["id"],
                            bookmaker=book["title"],
                            market=market["key"],
                            outcome=outcome["name"],
                            price=outcome["price"],
                            point=outcome.get("point"),
                        )
                    )
                    saved += 1
        session.flush()
    return saved


# ---------------------------------------------------------------------------
# Reading
# ---------------------------------------------------------------------------


def get_latest_odds(sport: str) -> list[dict]:
    """Newest prices for every upcoming game in a sport, grouped by book and market."""
    now = datetime.now(timezone.utc)

    with SessionLocal() as session:
        # Most recent pull for this sport
        latest_pull_id = session.scalar(
            select(func.max(RawPull.id)).where(RawPull.sport == sport)
        )
        if latest_pull_id is None:
            return []

        pull = session.get(RawPull, latest_pull_id)
        rows = session.execute(
            select(Game, OddsSnapshot)
            .join(OddsSnapshot, OddsSnapshot.game_id == Game.id)
            .where(OddsSnapshot.pull_id == latest_pull_id)
            .order_by(Game.commence_time, OddsSnapshot.bookmaker)
        ).all()

        games: dict[str, dict] = {}
        for game, snap in rows:
            kickoff = _as_utc(game.commence_time)
            if kickoff < now:
                continue  # game already started

            entry = games.setdefault(
                game.id,
                {
                    "id": game.id,
                    "sport": game.sport,
                    "home_team": game.home_team,
                    "away_team": game.away_team,
                    "commence_time": kickoff,
                    "updated_at": _as_utc(pull.fetched_at),
                    "is_sample": pull.is_sample,
                    "books": {},
                },
            )
            entry["books"].setdefault(snap.bookmaker, {}).setdefault(snap.market, []).append(
                {"outcome": snap.outcome, "price": snap.price, "point": snap.point}
            )

        return list(games.values())
