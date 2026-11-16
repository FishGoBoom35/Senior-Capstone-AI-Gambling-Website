# UTGI Backend (draft)

Pulls sportsbook odds from The Odds API, saves them, and serves the latest lines to the frontend.

**Status:** the database tables are a draft until the team's database plan is final. Everything is set up so the schema can change without losing data or breaking the frontend.

## How it fits together

```
The Odds API  ->  odds_api.py  ->  storage.py  ->  database  ->  main.py  ->  /odds/nfl  ->  frontend
(or sample_data/)                  (all DB code)                 (FastAPI)
```

| File | What it does |
|---|---|
| `app/config.py` | All settings, read from `.env` |
| `app/odds_api.py` | Calls The Odds API, or loads `sample_data/` |
| `app/models.py` | Tables. `raw_pulls` is permanent; `games` and `odds_snapshots` are drafts |
| `app/storage.py` | Every database read and write |
| `app/schemas.py` | The response shape the frontend relies on |
| `app/ingest.py` | Command to pull odds and save them |
| `app/main.py` | The API server |

## Setup

1. `cp .env.example .env`
2. Install packages:
   ```
   python -m venv .venv
   source .venv/bin/activate        # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Database, pick one:
   - Postgres: `docker compose up -d` (default in `.env.example`)
   - No Docker: blank out `DATABASE_URL` in `.env` and a local SQLite file is used

## Run

All commands from the `backend/` folder.

```
python -m app.ingest               # pull odds into the database
uvicorn app.main:app --reload      # start the API
```

Then open http://localhost:8000/odds/nfl (interactive docs at http://localhost:8000/docs).

## Sample data vs real data

- `USE_SAMPLE_DATA=true` (default): fake odds from `sample_data/nfl_odds.json`. No API key needed, no quota used. Responses have `"is_sample": true`.
- `USE_SAMPLE_DATA=false`: real odds. Needs `ODDS_API_KEY` from https://the-odds-api.com. Free tier has a monthly request limit; each pull costs one request per market, so don't loop it.

## When the database plan is final

1. Replace the draft tables in `app/models.py`
2. Update `_parse_into_tables` and `get_latest_odds` in `app/storage.py`
3. Run `python -m app.ingest --rebuild` to refill the new tables from every saved raw pull

The frontend doesn't need to change as long as `app/schemas.py` stays the same.

## Response shape

```json
[
  {
    "id": "...",
    "sport": "nfl",
    "home_team": "Jacksonville Jaguars",
    "away_team": "Kansas City Chiefs",
    "commence_time": "2026-11-01T17:00:00Z",
    "updated_at": "2026-10-28T19:30:00Z",
    "is_sample": true,
    "books": {
      "DraftKings": {
        "h2h":     [{ "outcome": "Kansas City Chiefs", "price": -145, "point": null }],
        "spreads": [{ "outcome": "Kansas City Chiefs", "price": -110, "point": -3.0 }],
        "totals":  [{ "outcome": "Over", "price": -110, "point": 45.5 }]
      }
    }
  }
]
```

Never commit `.env`.
