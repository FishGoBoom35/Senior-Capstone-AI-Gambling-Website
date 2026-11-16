"""Database connection. Works with Postgres or SQLite depending on DATABASE_URL."""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import DATABASE_URL

# One engine for the whole app; it manages the pool of connections
engine = create_engine(DATABASE_URL)

# Call SessionLocal() to open a session (a unit of work) for reads and writes
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    """Every table class in models.py inherits from this."""


def init_db():
    """Create any tables that don't exist yet. Safe to run every time."""
    from app import models  # noqa: F401  (registers the tables)

    Base.metadata.create_all(engine)
