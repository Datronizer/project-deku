#!/usr/bin/env bash
set -e

echo "==> Installing frontend dependencies..."
cd frontend && npm install && cd ..

echo "==> Installing backend dependencies..."
cd backend && pip install -r requirements.txt && cd ..

echo "==> Bootstrap complete. Run ./dev.sh to start the dev servers."
