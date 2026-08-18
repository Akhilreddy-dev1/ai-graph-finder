# AI Graph Finder

Smart Graph Camera & AI Assistant — snap a photo of any graph, recreate it interactively in 2D and 3D, and get Python code to replicate it.

## Features

- **Camera Scanner** — photograph a graph with your webcam; AI extracts data points
- **3D Graph Studio** — interactive 2D and 3D Plotly charts
- **AI Chat Assistant** — ask questions about your graph data
- **Python Export** — download code or JSON to recreate graphs offline

## Setup

This repository now includes a modern React frontend scaffold at `./web` while retaining the original Streamlit app.

Run the Streamlit app (existing features):

```bash
pip install -r requirements.txt
streamlit run app.py
```

Run the React frontend (Node Studio UI demo):

```bash
cd web
npm install
npm run dev
```

Get a free Groq API key at [console.groq.com](https://console.groq.com/) and enter it in the sidebar.

## Standalone graph script

```bash
python graph_generator.py
python graph_generator.py graph_data.json
```

Generates `graph_2d.html` and `graph_3d.html`.

## Files

| File | Description |
|------|-------------|
| `app.py` | Main Streamlit application |
| `graph_generator.py` | Standalone Python graph generator |
| `requirements.txt` | Python dependencies |
