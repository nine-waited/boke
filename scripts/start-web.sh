#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "Starting Boke web dev server..."
echo "Open http://localhost:5173 in Chromium/Edge for full folder access."
pnpm dev
