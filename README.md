# AI Graph Finder — Node Studio (Web)

This repository contains both the original Streamlit shell app and a new React + Vite web frontend (Node Studio) that provides a 3D immersive graph UI.

The web frontend is served as a static SPA and is deployed to GitHub Pages: https://akhilreddy-dev1.github.io/ai-graph-finder/

If you want the full interactive experience (live commands, sandboxed execution, and persistent sessions) you must run or deploy the backend (FastAPI) described below. The GitHub Pages site hosts only the frontend static files.

Quick start — run the full stack locally

1) Install Python deps and start backend (FastAPI):

```bash
pip install -r requirements.txt
uvicorn api:app --reload --port 8000
```

2) In a second terminal, run the frontend dev server:

```bash
cd web
npm install
npm run dev
```

Open http://localhost:5173 (Vite) and create a session in the sidebar — the UI will connect to the backend at http://localhost:8000.

Run frontend-only (preview built SPA)

```bash
cd web
npm ci
npm run build
npx serve -s dist -l 5000   # or use `vite preview`
```

Deployment notes

- The frontend is published to GitHub Pages (gh-pages branch). The Pages site is static and does not include the backend. To enable live execution you must deploy the FastAPI backend to a hosting provider (Heroku/Render/Railway/Vercel serverless, or your own VPS) and configure the frontend to call that backend (see CONFIGURATION below).

Configuration & making the site work on Pages

- The frontend will work standalone as a demo on GitHub Pages. To enable live features:
  - Deploy the backend and record its public URL (e.g., https://your-host.example.com).
  - Set the API base in the frontend (development: .env.local, production: build-time BASE_URL env). Example: in web/src/config.js set export const API_BASE = 'https://your-host.example.com'

Fallback behavior (Pages)

- The Pages-hosted SPA will show a demo graph when no backend is connected, so the UI remains interactive even without server-side execution. To use live sessions you must run/deploy the backend and create a session in the sidebar.

Troubleshooting checklist

- If the Pages site shows the repository README instead of the app:
  - Hard-refresh (Ctrl+Shift+R) or open an Incognito window — Pages are cached.
  - Ensure Pages is configured to use the `gh-pages` branch (Repository → Settings → Pages).

- If the app shows "Demo mode — no backend connected":
  - Start the backend locally (uvicorn) and create a session via the sidebar.
  - Or deploy the backend publicly and point the frontend to it (see Deployment notes).

- If the frontend builds but assets 404 on Pages:
  - Ensure Vite's `base` is set correctly for your Pages path (web/vite.config.js uses relative paths by default).

Security notes

- The project includes a conservative in-process sandbox for command execution. For production, run the command worker in a properly isolated environment (container / gVisor / separate VM) and enforce rate limits.

Files of interest

- web/: React + Vite frontend (3D graph visualization)
- api.py: FastAPI backend (session management, sandboxed execution, WebSocket notifications)
- db.py: SQLite persistence for sessions, nodes, and executions
- .github/workflows/deploy-pages.yml: CI for building and publishing the frontend to GitHub Pages

Want me to:
- Deploy the backend for you (requires a hosting account and credentials) — I can add a simple GitHub Actions workflow to deploy to a target like Railway/Render if you provide access.
- Or prepare a build-time configuration so the Pages site points to an externally hosted backend (I can add docs and code to read a BASE_URL at build time).