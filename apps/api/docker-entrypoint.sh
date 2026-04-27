#!/bin/sh
set -e
cd /app
set +e
python - <<'PY'
from sqlalchemy import inspect

from app.database import engine

inspector = inspect(engine)
tables = set(inspector.get_table_names())
if "users" in tables and "alembic_version" not in tables:
    raise SystemExit(10)
PY
needs_stamp="$?"
set -e
if [ "$needs_stamp" = "10" ]; then
  alembic stamp head
elif [ "$needs_stamp" != "0" ]; then
  exit "$needs_stamp"
fi
alembic upgrade head
if [ "${SEED_DEMO:-0}" = "1" ]; then
  python -c "from app.seed import run; run()"
fi
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
