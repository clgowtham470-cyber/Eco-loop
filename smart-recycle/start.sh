#!/usr/bin/env bash
# EcoLoop one-click demo start (Mac/Linux). Run the setup in README.md first.
set -e
cd "$(dirname "$0")/frontend"
echo "Building website..."
npm run build
cd ../backend
[ -f .venv/bin/activate ] && source .venv/bin/activate
echo
echo "EcoLoop running at http://localhost:8000"
echo "For phones, run in another terminal:  ngrok http 8000"
echo
uvicorn main:app --port 8000
