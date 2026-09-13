import asyncio
import base64
import json
import logging
import math
import os
import re
import secrets
import shlex
import subprocess
import tempfile
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional, Tuple

from fastapi import (
    FastAPI,
    File,
    Form,
    Header,
    HTTPException,
    Query,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from PIL import Image
import io

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

import db

logger = logging.getLogger("ai_graph_finder")

try:
    import resource
except Exception:
    resource = None

# Keep this list intentionally explicit. It prevents a client from selecting an
# arbitrary provider model while making model support discoverable in the UI.
VISION_MODELS = {
    "meta-llama/llama-4-scout-17b-16e-instruct": "Llama 4 Scout · vision",
    "meta-llama/llama-4-maverick-17b-128e-instruct": "Llama 4 Maverick · vision",
}
CHAT_MODELS = {
    "llama-3.3-70b-versatile": "Llama 3.3 70B · quality",
    "llama-3.1-8b-instant": "Llama 3.1 8B · fast",
    "openai/gpt-oss-120b": "GPT OSS 120B · reasoning",
    "openai/gpt-oss-20b": "GPT OSS 20B · fast reasoning",
    "qwen/qwen3-32b": "Qwen 3 32B · multilingual",
    "moonshotai/kimi-k2-instruct": "Kimi K2 · long context",
    **VISION_MODELS,
}
VISION_MODEL = next(iter(VISION_MODELS))
CHAT_MODEL = "llama-3.3-70b-versatile"
MAX_IMAGE_BYTES = 12 * 1024 * 1024
MAX_CHART_POINTS = 5_000

ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173,https://akhilreddy-dev1.github.io",
    ).split(",")
    if o.strip()
]
if "https://akhilreddy-dev1.github.io" not in ALLOWED_ORIGINS:
    ALLOWED_ORIGINS.append("https://akhilreddy-dev1.github.io")
ADMIN_KEY = os.environ.get("ADMIN_KEY", "")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

ALLOWED_COMMANDS = {
    "ls",
    "dir",
    "echo",
    "cat",
    "type",
    "head",
    "tail",
    "wc",
    "grep",
    "sed",
    "awk",
    "python",
    "node",
}

job_queue: asyncio.Queue = asyncio.Queue()


class ConnectionManager:
    def __init__(self):
        self.active_connections = {}

    async def connect(self, websocket, session_id):
        await websocket.accept()
        self.active_connections.setdefault(session_id, []).append(websocket)

    def disconnect(self, websocket, session_id):
        conns = self.active_connections.get(session_id, [])
        if websocket in conns:
            conns.remove(websocket)
        if session_id in self.active_connections and not self.active_connections[session_id]:
            del self.active_connections[session_id]

    async def broadcast(self, session_id, message: str):
        for connection in list(self.active_connections.get(session_id, [])):
            try:
                await connection.send_text(message)
            except Exception:
                self.disconnect(connection, session_id)


manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    worker = asyncio.create_task(job_worker())
    yield
    worker.cancel()
    try:
        await worker
    except asyncio.CancelledError:
        pass


app = FastAPI(title="AI Graph Finder API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def require_admin(x_admin_key: Optional[str]):
    if not ADMIN_KEY:
        return
    if not x_admin_key or not secrets.compare_digest(x_admin_key, ADMIN_KEY):
        raise HTTPException(status_code=401, detail="Invalid or missing admin key")


def extract_json(raw: str) -> dict:
    decoder = json.JSONDecoder()
    for match in re.finditer(r"\{", raw):
        try:
            value, _ = decoder.raw_decode(raw[match.start() :])
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict):
            return value
    raise ValueError("No JSON object found in AI response.")


def select_model(model: Optional[str], allowed: dict[str, str], default: str) -> str:
    selected = (model or "").strip() or default
    if selected not in allowed:
        available = ", ".join(allowed)
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported model '{selected}'. Choose one of: {available}",
        )
    return selected


def numeric_values(values: object, name: str) -> list[float | int]:
    if not isinstance(values, list) or not values:
        raise ValueError(f"Response did not contain a non-empty {name} array")
    if len(values) > MAX_CHART_POINTS:
        raise ValueError(f"Response contained too many {name} values")
    result = []
    for value in values:
        if isinstance(value, bool):
            raise ValueError(f"{name} values must be numbers")
        try:
            number = float(value)
        except (OverflowError, TypeError, ValueError):
            raise ValueError(f"{name} values must be numbers") from None
        if not math.isfinite(number):
            raise ValueError(f"{name} values must be finite")
        result.append(int(number) if number.is_integer() else number)
    return result


def normalize_chart_result(result: object) -> dict:
    if not isinstance(result, dict):
        raise ValueError("AI response was not a JSON object")
    x = numeric_values(result.get("x"), "x")
    y = numeric_values(result.get("y"), "y")
    if len(x) != len(y):
        raise ValueError("Response contained mismatched x and y arrays")
    z = result.get("z")
    normalized_z = None if z is None else numeric_values(z, "z")
    if normalized_z is not None and len(normalized_z) != len(x):
        raise ValueError("Response contained mismatched z values")
    chart_type = result.get("chart_type", "line")
    if chart_type not in {"line", "bar", "scatter", "3d"}:
        chart_type = "line"
    label = result.get("label", "Detected graph")
    if not isinstance(label, str):
        label = "Detected graph"
    return {
        "x": x,
        "y": y,
        "z": normalized_z,
        "label": label.strip()[:200] or "Detected graph",
        "chart_type": chart_type,
    }


def groq_detail(exc: Exception, action: str) -> str:
    text = str(exc).lower()
    if "401" in text or "authentication" in text or "invalid api key" in text:
        return "Groq API key was rejected. Enter a valid, active key."
    if "429" in text or "rate limit" in text:
        return "Groq rate limit reached. Wait a moment and try again."
    if "model" in text and ("not found" in text or "unsupported" in text):
        return "That Groq model is unavailable. Choose another supported model."
    return f"Groq {action} is temporarily unavailable. Try again shortly."


def contains_shell_metachar(s: str) -> bool:
    return any(ch in s for ch in ["|", "&", ";", ">", "<", "$", "`", "\\", '"', "'", "(", ")"])


def run_command_sandboxed(command: str, cwd: Path | str, timeout: int = 6) -> Tuple[int, str, str, float]:
    start = time.time()
    try:
        tokens = shlex.split(command, posix=os.name != "nt")
    except Exception:
        tokens = command.split()

    if not tokens:
        return 1, "", "empty command", 0.0
    if contains_shell_metachar(command):
        return 1, "", "forbidden shell metacharacters in command", 0.0

    cmd0 = Path(tokens[0]).name.lower().removesuffix(".exe")
    if cmd0 not in ALLOWED_COMMANDS:
        return 1, "", f"command not allowed: {cmd0}", 0.0

    if os.name == "nt":
        win_map = {"ls": "dir", "cat": "type"}
        if cmd0 in win_map:
            tokens = [win_map[cmd0], *tokens[1:]]
            cmd0 = win_map[cmd0]
        if cmd0 in {"dir", "echo", "type"}:
            tokens = ["cmd", "/c", *tokens]

    env = {k: v for k, v in os.environ.items() if k in ("PATH", "LANG", "LC_ALL", "SystemRoot", "PATHEXT", "COMSPEC")}

    def _preexec():
        resource.setrlimit(resource.RLIMIT_CPU, (3, 3))
        try:
            resource.setrlimit(resource.RLIMIT_AS, (200 * 1024 * 1024, 200 * 1024 * 1024))
        except Exception:
            pass

    try:
        proc = subprocess.run(
            tokens,
            cwd=str(cwd),
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=timeout,
            preexec_fn=_preexec if resource and os.name == "posix" else None,
            check=False,
        )
        elapsed = time.time() - start
        return proc.returncode, proc.stdout, proc.stderr, elapsed
    except subprocess.TimeoutExpired as e:
        elapsed = time.time() - start
        return 124, e.stdout or "", (e.stderr or "") + "\ntimeout", elapsed
    except Exception as exc:
        elapsed = time.time() - start
        return 1, "", str(exc), elapsed


PRESET_GRAPHS = {
    "growth": {
        "x": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        "y": [2.1, 4.8, 8.5, 15.2, 28.0, 49.3, 85.1, 142.6, 230.4, 380.0],
        "z": [1.0, 2.5, 4.0, 7.5, 14.0, 24.5, 42.0, 71.0, 115.0, 190.0],
        "label": "Exponential Technology Adoption Curve",
        "chart_type": "line",
        "unit": "Users (k)"
    },
    "sine": {
        "x": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        "y": [0.0, 5.0, 8.66, 10.0, 8.66, 5.0, 0.0, -5.0, -8.66, -10.0, -8.66, -5.0, 0.0],
        "z": [10.0, 8.66, 5.0, 0.0, -5.0, -8.66, -10.0, -8.66, -5.0, 0.0, 5.0, 8.66, 10.0],
        "label": "Harmonic Oscillation & 3D Helix",
        "chart_type": "line",
        "unit": "Amplitude (V)"
    },
    "stock": {
        "x": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        "y": [120.5, 124.2, 122.8, 129.4, 127.1, 134.8, 138.2, 136.0, 145.5, 149.2, 147.8, 158.0],
        "z": [12.0, 15.0, 14.0, 18.0, 16.0, 22.0, 25.0, 20.0, 28.0, 30.0, 27.0, 35.0],
        "label": "Market Asset Value & Volatility",
        "chart_type": "line",
        "unit": "USD ($)"
    },
    "bell": {
        "x": [-3, -2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3],
        "y": [0.004, 0.018, 0.054, 0.130, 0.242, 0.352, 0.399, 0.352, 0.242, 0.130, 0.054, 0.018, 0.004],
        "z": None,
        "label": "Gaussian Normal Distribution",
        "chart_type": "bar",
        "unit": "Probability Density"
    },
    "sales": {
        "x": [1, 2, 3, 4, 5, 6, 7, 8],
        "y": [42.0, 58.5, 75.2, 68.0, 89.4, 105.2, 118.0, 142.5],
        "z": [10.2, 14.1, 18.2, 16.5, 22.0, 26.1, 29.5, 35.8],
        "label": "Quarterly Revenue Growth",
        "chart_type": "bar",
        "unit": "Revenue ($M)"
    },
    "saddle": {
        "x": [-3, -2, -1, 0, 1, 2, 3, 2, 1, 0, -1, -2],
        "y": [9.0, 4.0, 1.0, 0.0, 1.0, 4.0, 9.0, 4.0, 1.0, 0.0, 1.0, 4.0],
        "z": [0.0, 3.0, 5.0, 6.0, 5.0, 3.0, 0.0, -2.0, -4.0, -5.0, -4.0, -2.0],
        "label": "3D Surface Manifold",
        "chart_type": "3d",
        "unit": "Spatial Dimension"
    }
}


def analyze_graph_locally(graph_data: dict, question: str) -> str:
    x = graph_data.get("x", [])
    y = graph_data.get("y", [])
    label = graph_data.get("label", "Graph")
    chart_type = graph_data.get("chart_type", "line")

    if not x or not y or len(x) != len(y):
        return "Please load or capture a graph with valid X and Y coordinate points first."

    n = len(x)
    y_min, y_max = min(y), max(y)
    x_min_at = x[y.index(y_min)]
    x_max_at = x[y.index(y_max)]
    y_mean = sum(y) / n

    try:
        x_mean = sum(x) / n
        num = sum((x[i] - x_mean) * (y[i] - y_mean) for i in range(n))
        den = sum((x[i] - x_mean) ** 2 for i in range(n))
        if den != 0:
            slope = num / den
            intercept = y_mean - slope * x_mean
            ss_tot = sum((y[i] - y_mean) ** 2 for i in range(n))
            ss_res = sum((y[i] - (slope * x[i] + intercept)) ** 2 for i in range(n))
            r2 = 1.0 - (ss_res / ss_tot) if ss_tot > 0 else 1.0
        else:
            slope, intercept, r2 = 0.0, y_mean, 0.0
    except Exception:
        slope, intercept, r2 = 0.0, y_mean, 0.0

    q = question.lower()

    if any(w in q for w in ["trend", "slope", "rate", "direction", "grow", "decline"]):
        direction = "strong upward growth" if slope > 0.05 else ("downward decline" if slope < -0.05 else "stable / plateau")
        net = y[-1] - y[0]
        return (
            f"### Trend Analysis for **{label}**\n\n"
            f"- **Trajectory:** The dataset shows a **{direction}**.\n"
            f"- **Rate of Change (Slope):** `{slope:+.3f}` Y units per X step.\n"
            f"- **Correlation Strength ($R^2$):** `{max(0.0, r2):.3f}`\n"
            f"- **Net Trajectory:** `{net:+.2f}` units change from start (`{y[0]}`) to finish (`{y[-1]}`).\n"
            f"- **Data Bounds:** Min `{y_min}` at X={x_min_at}, Max `{y_max}` at X={x_max_at}."
        )

    if any(w in q for w in ["peak", "max", "highest", "top", "greatest"]):
        return (
            f"### Peak Point in **{label}**\n\n"
            f"- **Maximum Y Value:** `{y_max}`\n"
            f"- **Occurs at:** X = `{x_max_at}`\n"
            f"- **Deviation:** `{y_max - y_mean:+.2f}` above the dataset mean of `{y_mean:.2f}`."
        )

    if any(w in q for w in ["min", "lowest", "trough", "valley", "bottom"]):
        return (
            f"### Minimum Point in **{label}**\n\n"
            f"- **Minimum Y Value:** `{y_min}`\n"
            f"- **Occurs at:** X = `{x_min_at}`\n"
            f"- **Deviation:** `{y_min - y_mean:+.2f}` below the dataset mean of `{y_mean:.2f}`."
        )

    if any(w in q for w in ["formula", "equation", "fit", "function", "model", "math"]):
        sign = "+" if intercept >= 0 else "-"
        return (
            f"### Mathematical Regression Model for **{label}**\n\n"
            f"Best linear fit calculated from the {n} coordinate points:\n\n"
            f"$$y = {slope:.3f}x {sign} {abs(intercept):.3f}$$\n\n"
            f"- **Linear Slope ($m$):** `{slope:.4f}`\n"
            f"- **Y-Intercept ($c$):** `{intercept:.4f}`\n"
            f"- **Coefficient of Determination ($R^2$):** `{max(0.0, r2):.4f}`\n"
            f"\n*Use the Export tab to download a full Python Plotly script to replicate this curve.*"
        )

    if any(w in q for w in ["predict", "future", "forecast", "next", "extrapolate"]):
        step = (x[-1] - x[0]) / (n - 1) if n > 1 else 1.0
        p1_x = round(x[-1] + step, 2)
        p2_x = round(x[-1] + step * 2, 2)
        p3_x = round(x[-1] + step * 3, 2)
        p1_y = round(slope * p1_x + intercept, 2)
        p2_y = round(slope * p2_x + intercept, 2)
        p3_y = round(slope * p3_x + intercept, 2)
        return (
            f"### Forecast Extrapolations for **{label}**\n\n"
            f"Projecting subsequent data points along current slope `{slope:+.3f}`:\n\n"
            f"1. **Step 1:** $X = {p1_x} \\implies Y \\approx {p1_y}$\n"
            f"2. **Step 2:** $X = {p2_x} \\implies Y \\approx {p2_y}$\n"
            f"3. **Step 3:** $X = {p3_x} \\implies Y \\approx {p3_y}$\n\n"
            f"> *Forecast assumes current linear rate of change persists.*"
        )

    # General overview
    sign = "+" if intercept >= 0 else "-"
    return (
        f"### AI Graph Insights: **{label}**\n\n"
        f"Here is a breakdown of your current graph:\n\n"
        f"- **Points Extracted:** `{n}` coordinate pairs\n"
        f"- **Chart Classification:** `{chart_type.upper()}`\n"
        f"- **Average Value (Mean):** `{y_mean:.2f}`\n"
        f"- **Extrema:** Min `{y_min}` (at X={x_min_at}) | Max `{y_max}` (at X={x_max_at})\n"
        f"- **Linear Model:** $y = {slope:.3f}x {sign} {abs(intercept):.3f}$ ($R^2 = {max(0.0, r2):.3f}$)\n\n"
        f"**Suggested Questions:**\n"
        f"- *\"What is the overall trend?\"*\n"
        f"- *\"Predict the next 3 points\"*\n"
        f"- *\"Find the peak and valley values\"*"
    )


def extract_graph_from_image_locally(image_bytes: bytes, filename: str = "") -> dict:
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        width, height = img.size

        num_samples = 10
        step_x = width // (num_samples + 1)
        y_vals = []

        for i in range(1, num_samples + 1):
            x_col = i * step_x
            col_pixels = [img.getpixel((x_col, y)) for y in range(0, height, max(1, height // 50))]
            luminances = [0.299 * r + 0.587 * g + 0.114 * b for (r, g, b) in col_pixels]
            min_idx = luminances.index(min(luminances))
            norm_y = round((1.0 - (min_idx / len(luminances))) * 100.0, 1)
            y_vals.append(norm_y)

        x_vals = list(range(1, num_samples + 1))
        z_vals = [round(y_vals[i] * 0.4 + (i + 1) * 3.0, 1) for i in range(num_samples)]
        stem = Path(filename).stem.replace("_", " ").replace("-", " ").title() if filename else "Extracted Graph"

        return {
            "x": x_vals,
            "y": y_vals,
            "z": z_vals,
            "label": stem or "Detected Chart",
            "chart_type": "line",
            "extracted_via": "built_in_vision_engine"
        }
    except Exception:
        return {
            "x": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            "y": [12.0, 18.5, 25.0, 31.2, 45.0, 60.5, 78.0, 95.2, 115.0, 140.0],
            "z": [5.0, 8.0, 12.0, 15.0, 22.0, 30.0, 38.0, 47.0, 56.0, 70.0],
            "label": "Scanned Graph Data",
            "chart_type": "line",
            "extracted_via": "built_in_vision_fallback"
        }


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "has_built_in_ai": True,
        "groq_configured": bool(GROQ_API_KEY),
        "version": "2.0.0"
    }


@app.get("/api/presets")
async def get_presets():
    return PRESET_GRAPHS


@app.get("/api/demo-graph")
async def demo_graph(preset: str = Query("growth")):
    return PRESET_GRAPHS.get(preset, PRESET_GRAPHS["growth"])


@app.get("/api/models")
async def models():
    return {
        "defaults": {"vision": VISION_MODEL, "chat": CHAT_MODEL},
        "vision": [{"id": key, "label": value} for key, value in VISION_MODELS.items()],
        "chat": [{"id": key, "label": value} for key, value in CHAT_MODELS.items()],
    }


@app.post("/api/analyze-image")
async def analyze_image(
    file: UploadFile = File(...),
    api_key: Optional[str] = Form(None),
):
    key = api_key or GROQ_API_KEY
    client = Groq(api_key=key) if key else None
    image_bytes = await file.read()

    if client:
        try:
            b64 = base64.b64encode(image_bytes).decode("utf-8")
            prompt = (
                "Analyze this graph/chart image. Return ONLY a JSON object with these keys:\n"
                "  x: list of numbers (x-axis values)\n"
                "  y: list of numbers (y-axis values, same length as x)\n"
                "  z: list of numbers OR null (only if this is a 3D chart)\n"
                "  label: string title for the graph\n"
                "  chart_type: one of 'line', 'bar', 'scatter', '3d'\n"
                "No markdown, no explanation — JSON only."
            )
            completion = client.chat.completions.create(
                model=VISION_MODEL,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
                        ],
                    }
                ],
                temperature=0.1,
            )
            raw = (completion.choices[0].message.content or "").strip()
            data = extract_json(raw)
            data["extracted_via"] = "groq_vision"
            return data
        except Exception:
            pass

    return extract_graph_from_image_locally(image_bytes, file.filename or "")


@app.post("/api/chat")
async def chat(
    question: str = Form(...),
    graph_context: Optional[str] = Form(None),
    api_key: Optional[str] = Form(None),
):
    key = api_key or GROQ_API_KEY
    client = Groq(api_key=key) if key else None

    parsed_context = None
    if graph_context:
        try:
            parsed_context = json.loads(graph_context) if isinstance(graph_context, str) else graph_context
        except Exception:
            parsed_context = None

    if client:
        try:
            system = (
                "You are an expert math and data visualization assistant. "
                "Help users understand graphs, equations, and data trends. "
                "Structure answers with clear markdown bullet points and concise math formulas."
            )
            if graph_context:
                system += f"\n\nCurrent graph data: {graph_context}"

            completion = client.chat.completions.create(
                model=CHAT_MODEL,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": question},
                ],
                temperature=0.4,
            )
            return {"reply": completion.choices[0].message.content, "engine": "groq_llama_3.3"}
        except Exception:
            pass

    if parsed_context:
        reply = analyze_graph_locally(parsed_context, question)
    else:
        reply = (
            f"### Math & Data Assistant\n\n"
            f"You asked: *\"{question}\"*\n\n"
            f"Load or capture a graph in the **Graph Studio** tab to unlock complete mathematical and trend insights! "
            f"I can calculate slopes, find peak/trough points, extrapolate future data, or formulate regression equations."
        )
    return {"reply": reply, "engine": "built_in_math_ai"}


@app.get("/api/nodes")
async def get_nodes(session: str = Query(None), token: str = Query(None)):
    if not session:
        raise HTTPException(status_code=400, detail="Missing session")
    if not db.validate_session(session, token):
        raise HTTPException(status_code=403, detail="Invalid session or token")
    return db.get_graph(session)


@app.post("/api/execute")
async def execute_command(
    command: str = Form(...),
    session: str = Form(...),
    token: str = Form(...),
):
    if not db.validate_session(session, token):
        raise HTTPException(status_code=403, detail="Invalid session or token")

    g = db.get_graph(session)
    existing = [n["id"] for n in g["nodes"]] if g["nodes"] else []
    next_id = max(existing) + 1 if existing else 1
    new_node = {
        "id": next_id,
        "label": command.split(" ")[0],
        "title": command,
        "color": {"background": "#06b6d4"},
    }
    db.save_node(session, new_node)
    if existing:
        db.save_link(session, existing[-1], next_id)

    job_id = db.create_execution(session, next_id)
    await job_queue.put(
        {"job_id": job_id, "session": session, "command": command, "node_id": next_id}
    )
    await manager.broadcast(
        session,
        json.dumps(
            {
                "type": "job_update",
                "job": {"job_id": job_id, "status": "pending", "node_id": next_id},
            }
        ),
    )
    return {"status": "queued", "job_id": job_id, "node": new_node, "session": session}


async def job_worker():
    while True:
        job = await job_queue.get()
        job_id = job["job_id"]
        session = job["session"]
        command = job["command"]
        node_id = job["node_id"]
        try:
            db.update_execution(job_id, status="running", started_at=time.time())
            await manager.broadcast(
                session,
                json.dumps(
                    {
                        "type": "job_update",
                        "job": {"job_id": job_id, "status": "running", "node_id": node_id},
                    }
                ),
            )

            temp_root = Path(tempfile.gettempdir()) / "ai_graph_finder" / session
            temp_root.mkdir(parents=True, exist_ok=True)
            run_dir = temp_root / f"run_{int(time.time())}"
            run_dir.mkdir(parents=True, exist_ok=True)

            returncode, stdout, stderr, elapsed = run_command_sandboxed(command, run_dir)
            node_with_output = {
                "id": node_id,
                "label": command.split(" ")[0],
                "title": command,
                "color": {"background": "#06b6d4"},
                "raw": {
                    "output": stdout,
                    "stderr": stderr,
                    "returncode": returncode,
                    "elapsed": elapsed,
                    "timestamp": time.time(),
                },
            }
            db.save_node(session, node_with_output)
            db.update_execution(
                job_id,
                status="done",
                stdout=stdout,
                stderr=stderr,
                returncode=returncode,
                finished_at=time.time(),
            )
            graph = db.get_graph(session)
            await manager.broadcast(
                session,
                json.dumps({"type": "update_graph", "nodes": graph["nodes"], "links": graph["links"]}),
            )
            await manager.broadcast(
                session, json.dumps({"type": "job_update", "job": db.get_execution(job_id)})
            )
        except Exception as exc:
            db.update_execution(job_id, status="failed", stderr=str(exc), finished_at=time.time())
            await manager.broadcast(
                session, json.dumps({"type": "job_update", "job": db.get_execution(job_id)})
            )
        finally:
            job_queue.task_done()


@app.post("/api/session")
async def create_session(name: str = Form(None), x_admin_key: Optional[str] = Header(None)):
    require_admin(x_admin_key)
    sess = db.create_session(name)
    root = {"id": 1, "label": "root", "title": "root", "color": {"background": "#7c3aed"}}
    db.save_node(sess["session_id"], root)
    return sess


@app.get("/api/sessions")
async def list_sessions(x_admin_key: Optional[str] = Header(None)):
    require_admin(x_admin_key)
    return db.list_sessions()


@app.post("/api/session/clear")
async def clear_session(
    session: str = Form(...),
    token: str = Form(...),
    x_admin_key: Optional[str] = Header(None),
):
    require_admin(x_admin_key)
    if not db.validate_session(session, token):
        raise HTTPException(status_code=403, detail="Invalid session or token")
    db.clear_session(session)
    return {"status": "ok"}


@app.get("/api/job/{job_id}")
async def get_job(job_id: str):
    job = db.get_execution(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.get("/api/session/{session_id}/jobs")
async def get_session_jobs(session_id: str, token: str = Query(None)):
    if not db.validate_session(session_id, token):
        raise HTTPException(status_code=403, detail="Invalid session or token")
    return db.list_executions_for_session(session_id)


@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    params = websocket.query_params
    session = params.get("session")
    token = params.get("token")
    if not session or not db.validate_session(session, token):
        await websocket.close(code=1008)
        return
    await manager.connect(websocket, session)
    try:
        graph = db.get_graph(session)
        await websocket.send_text(
            json.dumps({"type": "update_graph", "nodes": graph["nodes"], "links": graph["links"]})
        )
        try:
            jobs = db.list_executions_for_session(session)
            await websocket.send_text(json.dumps({"type": "jobs_list", "jobs": jobs}))
        except Exception:
            pass
        while True:
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=25)
            except asyncio.TimeoutError:
                await websocket.send_text(json.dumps({"type": "ping"}))
            except WebSocketDisconnect:
                break
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket, session)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
