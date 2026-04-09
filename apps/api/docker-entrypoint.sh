#!/bin/sh
set -e
cd /app
python -c "from app.seed import run; run()"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
