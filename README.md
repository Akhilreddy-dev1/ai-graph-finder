# 🤖 AI Graph Finder 2.0 PRO

> **Visualize · Analyze · Understand · Export** — Powered by built-in AI. No API key required.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-6366f1?style=for-the-badge&logo=github)](https://akhilreddy-dev1.github.io/ai-graph-finder/)
[![Backend API](https://img.shields.io/badge/Backend-Render.com-10b981?style=for-the-badge)](https://ai-graph-finder.onrender.com)

---

## ✨ What Is This?

**AI Graph Finder** is an interactive web application that lets you:
- **Draw, customize, and explore 2D & 3D graphs** in real time
- **Scan any graph image** (camera, screenshot, file upload) and digitize it into live data
- **Chat with a built-in AI math assistant** that analyzes trends, peaks, forecasts, and formulas
- **Export graph data** as Python, JavaScript, CSV, or JSON — ready to paste into your projects

Everything runs in your browser. The built-in AI requires **zero API key**.

---

## 🗂️ App Sections

### 📊 2D Studio
The main graphing canvas for line charts, bar charts, and scatter plots.

| Feature | How to use |
|---|---|
| **Change chart type** | Dropdown in the top toolbar (Line / Bar / Scatter) |
| **Load a preset** | Click any preset button (Growth Curve, Stock Price, Bell Curve, Sales Trend) |
| **Edit data points** | Click any cell in the data table below the chart — changes apply instantly |
| **Add / remove rows** | Use the **+ Row** and **🗑️** buttons in the table |
| **Change colors** | Pick a palette from the Color Scheme selector |
| **Export code** | Click **Export Code** → choose Python / JS / CSV / JSON |

### 🔮 3D Studio
Full 3D surface and scatter visualization using Three.js.

| Feature | How to use |
|---|---|
| **3D presets** | Helix, Saddle Surface, Spiral — one click to load |
| **Rotate** | Click and drag the 3D canvas |
| **Zoom** | Scroll wheel on the canvas |
| **Edit XYZ data** | The table shows X, Y, Z columns — edit any cell to update the 3D shape live |
| **Metrics** | Cards show Z-max, Z-min, and point count |

> **Note:** Z coordinates only appear in 3D Studio. The 2D Studio never uses a Z axis.

### 📷 Camera Scanner
Digitize a graph from the real world or from a screenshot.

| Method | Steps |
|---|---|
| **Camera** | Click **Start Camera** → point at graph → click **Capture** |
| **Paste screenshot** | Press **Ctrl + V** anywhere on this page |
| **Upload file** | Drag a PNG/JPG onto the drop zone, or click **Browse** |

After scanning, a **success card** appears with extracted data. Click **View in 2D Studio** or **View in 3D Studio** to navigate there with your scanned graph loaded.

### 🤖 AI Assistant
Ask anything about your current graph in plain English.

**Example questions:**
- *"What is the trend?"*
- *"When does this reach its peak?"*
- *"Give me the formula for this curve."*
- *"Forecast the next 3 points."*
- *"What is the R² value?"*

The assistant uses the built-in math engine by default. If you have a backend with a Groq API key, it automatically upgrades to LLM-powered answers.

---

## 🎯 Key Features

| Feature | Details |
|---|---|
| **Built-in AI** | Local math engine — no API key needed |
| **2D Charts** | Line, Bar, Scatter with live data editing |
| **3D Charts** | Three.js interactive 3D surface/scatter |
| **Camera Scanner** | Camera capture, paste (Ctrl+V), file upload |
| **Code Export** | Python (matplotlib), JavaScript, CSV, JSON |
| **3D Landing Page** | Three.js neural-network animated intro |
| **Persistent state** | Your last graph is remembered via localStorage |
| **Optional AI upgrade** | Connect to Render backend for GPT/Groq-level AI |

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- [Node.js 18+](https://nodejs.org)
- [Python 3.10+](https://python.org) *(optional — only needed for backend AI features)*

### 1. Clone and install

```bash
git clone https://github.com/Akhilreddy-dev1/ai-graph-finder.git
cd ai-graph-finder
```

### 2. Run the frontend

```powershell
cd web
npm install
npm run dev
```

Open [http://localhost:5173/ai-graph-finder/](http://localhost:5173/ai-graph-finder/)

### 3. (Optional) Run the Python backend

```powershell
# In the project root
pip install -r requirements.txt
python main.py
```

Or use the one-click launcher:

```powershell
.\start.bat
```

---

## 🌐 Deploy

**Frontend (GitHub Pages)** — already configured:
```bash
cd web && npm run build
# then push — GitHub Pages serves from /docs or gh-pages branch
```

**Backend (Render)** — already live at `https://ai-graph-finder.onrender.com`

Set the env var `GROQ_API_KEY` on Render for full LLM-powered AI answers.

---

## 🏗️ Architecture

```
ai-graph-finder/
├── web/                      # Vite + React frontend
│   └── src/
│       ├── App.jsx           # Root — tab navigation, shared graph state
│       ├── api.js            # API calls + built-in AI math engine
│       ├── config.js         # Backend URL, feature flags
│       └── components/
│           ├── LandingPage3D.jsx  # Three.js 3D animated intro
│           ├── GraphStudio.jsx    # 2D Studio tab
│           ├── Studio3D.jsx       # 3D Studio tab
│           ├── ScannerStudio.jsx  # Camera Scanner tab
│           ├── AIAssistant.jsx    # AI chat tab
│           ├── Chart2D.jsx        # Recharts 2D renderer
│           ├── Chart3D.jsx        # Three.js 3D renderer
│           ├── DataGrid.jsx       # Live-editable data table
│           └── CodeExport.jsx     # Export modal
├── api.py                    # FastAPI backend
├── main.py                   # Render entrypoint (uvicorn)
├── requirements.txt
└── start.bat                 # One-click local launcher
```

---

## 📄 License

MIT © 2024 Akhil Reddy
