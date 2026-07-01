@echo off
cd /d "%~dp0.."
echo Starting Boke web dev server...
echo Open http://localhost:5173 in Chromium/Edge for full folder access.
pnpm dev
