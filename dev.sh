#!/usr/bin/env bash
set -e

trap 'kill 0' EXIT

echo "==> Starting backend (FastAPI)..."
cd backend && uvicorn main:app --reload &

echo "==> Starting frontend (Vite)..."
cd frontend && npm run dev &

wait
