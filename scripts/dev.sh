#!/usr/bin/env sh
set -eu

workspace_dir=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
backend_dir="$workspace_dir/backend"
frontend_dir="$workspace_dir/gambling-ai-assistant"

if [ ! -x "$backend_dir/.venv/bin/python" ]; then
  echo "Backend virtual environment is missing. Run the backend setup first." >&2
  exit 1
fi

cleanup() {
  kill "$backend_pid" 2>/dev/null || true
}

(
  cd "$backend_dir"
  if [ "${REFRESH_ODDS:-0}" = "1" ]; then
    .venv/bin/python -m app.ingest
  else
    echo "Using cached odds. Run REFRESH_ODDS=1 npm run dev to fetch fresh odds."
  fi
  exec .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
) &
backend_pid=$!
trap cleanup EXIT INT TERM

attempt=0
until curl -fsS http://127.0.0.1:8000/health >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 40 ]; then
    echo "Backend did not start on http://localhost:8000." >&2
    exit 1
  fi
  sleep 0.25
done

cd "$frontend_dir"
npm run dev -- --port 3001
