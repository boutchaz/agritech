#!/usr/bin/env bash
# Run FastAPI satellite on :8001 with debugpy on :5678 — attach from Cursor:
#   Run and Debug → "Python: Attach (satellite local :5678)"
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# macOS: never `xargs kill` with empty input (exits 1). Free ports if something listens.
for port in 8001 5678; do
  for p in $(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true); do
    kill -9 "$p" 2>/dev/null || true
  done
done
sleep 1
cd "$ROOT/backend-service"
export PYDEVD_DISABLE_FILE_VALIDATION=1
exec ./venv/bin/python -Xfrozen_modules=off -m debugpy --listen 127.0.0.1:5678 -m uvicorn app.main:app --host 127.0.0.1 --port 8001
