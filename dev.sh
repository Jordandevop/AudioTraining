#!/usr/bin/env bash
# Lance le serveur (FastAPI, port 8000) et le site (Vite, port 5173) ensemble.
# Ctrl+C arrête les deux.
set -e
cd "$(dirname "$0")"

# Premier lancement : installation des dépendances et du fichier .env
if [ ! -d backend/.venv ]; then
  echo "Installation du backend…"
  python3 -m venv backend/.venv
  backend/.venv/bin/pip install -q -r backend/requirements-dev.txt
fi
if [ ! -d frontend/node_modules ]; then
  echo "Installation du frontend…"
  (cd frontend && npm install)
fi
[ -f backend/.env ] || cp backend/.env.example backend/.env

trap 'trap - INT TERM HUP EXIT; kill 0' INT TERM HUP EXIT

(cd backend && .venv/bin/uvicorn app.main:app --reload --env-file .env) &
(cd frontend && npm run dev -- --open) &

wait
