# AI Graph Finder — Web frontend (Node Studio)

This folder contains a lightweight React + Vite + Tailwind frontend focused on a modern node-based shell/process graph UI.

Quick start:

1. cd web
2. npm install
3. npm run dev

Run the backend API (FastAPI) from the repo root in another terminal:

```bash
python -m pip install -r requirements.txt
python api.py  # or: uvicorn api:app --reload --port 8000
```

Notes:
- The app is a demo scaffold demonstrating the node-graph UI and terminal overlay.
- The frontend will call `GET /demo-graph` and `POST /execute` by default. Use `POST /analyze-image` to send images to the Groq vision model (requires API key passed in form data).
- To preserve the original Streamlit features, run `streamlit run app.py` in parallel and optionally surface it in a separate tab.
