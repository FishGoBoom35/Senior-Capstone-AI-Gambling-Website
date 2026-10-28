"""FastAPI app. Run from the backend folder:  uvicorn app.main:app --reload"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app import config, storage
from app.db import init_db
from app.schemas import GameOdds


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()  # create tables on startup if they don't exist
    yield


app = FastAPI(title="UTGI Odds API", lifespan=lifespan)

# Let the Next.js frontend call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.FRONTEND_ORIGIN],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "sample_mode": config.USE_SAMPLE_DATA,
        "sports": config.SPORTS,
    }


@app.get("/odds/{sport}", response_model=list[GameOdds])
def get_odds(sport: str):
    """Latest odds for upcoming games, e.g. /odds/nfl"""
    if sport not in config.SPORT_KEYS:
        raise HTTPException(404, f"Unknown sport '{sport}'")
    return storage.get_latest_odds(sport)
