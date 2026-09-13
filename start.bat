@echo off
echo Starting AI Graph Finder Backend and Frontend...

start "AI Graph Finder Backend" cmd /k "uvicorn api:app --reload --port 8000"
timeout /t 2 /nobreak >nul

start "AI Graph Finder Frontend" cmd /k "cd web && npm run dev"
timeout /t 3 /nobreak >nul

start http://localhost:5173/ai-graph-finder/

echo.
echo Both servers started!
echo Frontend: http://localhost:5173/ai-graph-finder/
echo Backend:  http://127.0.0.1:8000
echo.
