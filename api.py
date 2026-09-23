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
    Request,
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
MAX_CHAT_MESSAGES = 32
MAX_GRAPH_NODES = 500
MAX_GRAPH_LINKS = 2_000
SERVER_GROQ_KEY = os.environ.get("GROQ_API_KEY") or os.environ.get("GROQ_API_TOKEN", "")

UPDATE_3D_GRAPH_TOOL = {
    "type": "function",
    "function": {
        "name": "update_3d_graph",
        "description": "Replace the 3D graph with the supplied nodes and edges.",
        "parameters": {
            "type": "object",
            "properties": {
                "nodes": {
                    "type": "array",
                    "description": "Graph nodes. Every node needs a stable unique id.",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": ["string", "number"]},
                            "label": {"type": "string"},
                            "type": {"type": "string"},
                            "color": {"type": "string"},
                        },
                        "required": ["id"],
                        "additionalProperties": True,
                    },
                },
                "edges": {
                    "type": "array",
                    "description": "Connections between node ids.",
                    "items": {
                        "type": "object",
                        "properties": {
                            "source": {"type": ["string", "number"]},
                            "target": {"type": ["string", "number"]},
                            "label": {"type": "string"},
                        },
                        "required": ["source", "target"],
                        "additionalProperties": True,
                    },
                },
                "links": {
                    "type": "array",
                    "description": "Alias for edges, accepted for graph clients.",
                    "items": {
                        "type": "object",
                        "properties": {
                            "source": {"type": ["string", "number"]},
                            "target": {"type": ["string", "number"]},
                            "label": {"type": "string"},
                        },
                        "required": ["source", "target"],
                        "additionalProperties": True,
                    },
                },
            },
            "required": ["nodes"],
            "additionalProperties": False,
        },
    },
}

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


def _value(obj: object, key: str, default=None):
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def normalize_graph_update(value: object) -> dict:
    """Validate the small graph shape shared by tool calls and the 3D canvas."""
    if not isinstance(value, dict):
        raise ValueError("Graph update must be a JSON object")
    raw_nodes = value.get("nodes")
    if not isinstance(raw_nodes, list) or len(raw_nodes) > MAX_GRAPH_NODES:
        raise ValueError(f"Graph update must contain at most {MAX_GRAPH_NODES} nodes")

    nodes = []
    node_ids = set()
    for raw_node in raw_nodes:
        if not isinstance(raw_node, dict) or raw_node.get("id") is None:
            raise ValueError("Each graph node must contain an id")
        node_id = str(raw_node["id"]).strip()
        if not node_id or node_id in node_ids:
            raise ValueError("Graph node ids must be unique and non-empty")
        node_ids.add(node_id)
        node = {
            "id": node_id,
            "label": str(raw_node.get("label") or node_id)[:200],
        }
        for field in ("type", "kind", "title"):
            if raw_node.get(field) is not None:
                node[field] = str(raw_node[field])[:200]
        color = raw_node.get("color")
        if isinstance(color, str):
            node["color"] = {"background": color[:32]}
        elif isinstance(color, dict):
            background = color.get("background")
            if isinstance(background, str):
                node["color"] = {"background": background[:32]}
        if isinstance(raw_node.get("metadata"), dict):
            node["metadata"] = raw_node["metadata"]
        nodes.append(node)

    raw_links = value.get("edges")
    if raw_links is None:
        raw_links = value.get("links", [])
    if not isinstance(raw_links, list) or len(raw_links) > MAX_GRAPH_LINKS:
        raise ValueError(f"Graph update must contain at most {MAX_GRAPH_LINKS} links")
    links = []
    for raw_link in raw_links:
        if not isinstance(raw_link, dict):
            raise ValueError("Each graph edge must be an object")
        source = str(raw_link.get("source", "")).strip()
        target = str(raw_link.get("target", "")).strip()
        if not source or not target or source not in node_ids or target not in node_ids:
            raise ValueError("Graph edges must reference known node ids")
        link = {"source": source, "target": target}
        if raw_link.get("label") is not None:
            link["label"] = str(raw_link["label"])[:200]
        links.append(link)
    return {"nodes": nodes, "links": links}


def _slug(value: str, fallback: str) -> str:
    result = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return result or fallback


def deterministic_graph_update(text: str, graph_context: Optional[str] = None) -> Optional[dict]:
    """Build a useful graph for common prompts when no LLM is configured."""
    lowered = text.lower()
    graph_intent = "->" in text or bool(
        re.search(
            r"\b(add|create|build|make|draw|visualize|map|connect|link|update|replace|construct)\b",
            lowered,
        )
    )
    graph_intent = graph_intent and (
        "->" in text
        or bool(re.search(r"\b(graph|node|edge|link|topology|relationship|network|entities|services)\b", lowered))
    )
    if not graph_intent:
        return None

    nodes = []
    links = []
    if graph_context:
        try:
            context = json.loads(graph_context) if isinstance(graph_context, str) else graph_context
            context_graph = context.get("graph", context) if isinstance(context, dict) else {}
            normalized = normalize_graph_update(context_graph)
            nodes, links = normalized["nodes"], normalized["links"]
        except (TypeError, ValueError, json.JSONDecodeError):
            pass

    names = []
    # Arrow chains are unambiguous: "A -> B -> C".
    if "->" in text:
        names = [part.strip() for part in text.split("->") if part.strip()]
    else:
        match = re.search(
            r"([A-Za-z][A-Za-z0-9 _-]{0,60})\s+(?:connects to|connected to|links to|relates to)\s+"
            r"([A-Za-z][A-Za-z0-9 _-]{0,60})",
            text,
            re.IGNORECASE,
        )
        if match:
            names = [match.group(1).strip(" ,."), match.group(2).strip(" ,.")]
        else:
            list_match = re.search(r"(?:nodes?|entities?|services?)\s*[:\-]\s*([^.!?]+)", text, re.IGNORECASE)
            if list_match:
                names = [part.strip(" ,") for part in re.split(r",|\band\b", list_match.group(1)) if part.strip(" ,")]

    if names:
        names[0] = re.sub(r"^(?:please\s+)?(?:connect|link|add|create)\s+", "", names[0], flags=re.IGNORECASE).strip() or names[0]
        ids = []
        for index, name in enumerate(names):
            node_id = _slug(name, f"node-{index + 1}")
            if node_id not in {node["id"] for node in nodes}:
                nodes.append({"id": node_id, "label": name[:200], "type": "assistant", "color": {"background": "#8b5cf6"}})
            ids.append(node_id)
        for source, target in zip(ids, ids[1:]):
            if not any(link["source"] == source and link["target"] == target for link in links):
                links.append({"source": source, "target": target})
    elif not nodes:
        nodes = [
            {"id": "assistant-root", "label": "Graph", "type": "root", "color": {"background": "#7c3aed"}},
            {"id": "assistant-node", "label": "New node", "type": "assistant", "color": {"background": "#06b6d4"}},
        ]
        links = [{"source": "assistant-root", "target": "assistant-node"}]

    return normalize_graph_update({"nodes": nodes, "links": links})


ASSISTANT_CONTACT_EMAIL = "akhilreddy200925@gmail.com"
ASSISTANT_SCOPE_REPLY = (
    "I can only help with AI Graph Finder: creating graphs, analyzing graph data, "
    "finding slopes, trends, extrema, regression, and forecasts. "
    f"For other questions, contact {ASSISTANT_CONTACT_EMAIL}."
)


def fallback_chat(history: list[dict], graph_context: Optional[str]) -> tuple[str, list[dict], list[dict], Optional[dict]]:
    latest = next((item["content"] for item in reversed(history) if item["role"] == "user"), "")
    question = latest.lower()
    scope_terms = (
        "graph", "chart", "plot", "data", "node", "edge", "slope", "trend",
        "regression", "equation", "forecast", "predict", "peak", "minimum",
        "maximum", "average", "visualiz", "coordinate", "x", "y",
    )
    greeting_terms = ("hello", "hi", "hey", "help", "what can you do")
    if not any(term in question for term in scope_terms) and not any(term in question for term in greeting_terms):
        return ASSISTANT_SCOPE_REPLY, [], [], None
    graph = deterministic_graph_update(latest, graph_context)
    if graph:
        call = {
            "id": "fallback-update-3d-graph",
            "type": "function",
            "function": {"name": "update_3d_graph", "arguments": json.dumps(graph)},
        }
        result = {
            "tool_call_id": call["id"],
            "name": "update_3d_graph",
            "result": {"status": "updated", "graph": graph, "node_count": len(graph["nodes"]), "link_count": len(graph["links"])},
        }
        return "I updated the 3D graph with the relationships from your request.", [call], [result], graph
    if graph_context:
        try:
            context = json.loads(graph_context) if isinstance(graph_context, str) else graph_context
            if isinstance(context, dict) and context.get("x") and context.get("y"):
                return analyze_graph_locally(context, latest), [], [], None
        except (TypeError, ValueError, json.JSONDecodeError):
            pass
    return (
        "Welcome to AI Graph Finder. I can create and analyze graphs, find slopes and trends, "
        "calculate regression and extrema, forecast values, and update the 3D canvas. "
        f"For questions outside graph analysis, contact {ASSISTANT_CONTACT_EMAIL}.",
        [],
        [],
        None,
    )


def normalize_chat_history(value: object) -> list[dict]:
    if value is None:
        return []
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            return []
    if not isinstance(value, list):
        raise ValueError("history must be an array")
    history = []
    for item in value[-MAX_CHAT_MESSAGES:]:
        if not isinstance(item, dict) or item.get("role") not in {"user", "assistant"}:
            continue
        content = item.get("content")
        if isinstance(content, str) and content.strip():
            history.append({"role": item["role"], "content": content.strip()[:12000]})
    return history


def tool_call_payload(tool_call: object) -> dict:
    function = _value(tool_call, "function", {}) or {}
    arguments = _value(function, "arguments", "{}") or "{}"
    if not isinstance(arguments, str):
        arguments = json.dumps(arguments)
    return {
        "id": str(_value(tool_call, "id", "tool-call")),
        "type": str(_value(tool_call, "type", "function")),
        "function": {
            "name": str(_value(function, "name", "")),
            "arguments": arguments,
        },
    }


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
        "z": None,
        "label": "Exponential Technology Adoption Curve",
        "chart_type": "line",
        "unit": "Users (k)"
    },
    "stock": {
        "x": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        "y": [120.5, 124.2, 122.8, 129.4, 127.1, 134.8, 138.2, 136.0, 145.5, 149.2, 147.8, 158.0],
        "z": None,
        "label": "Market Asset Price Trend",
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
        "z": None,
        "label": "Quarterly Revenue Growth",
        "chart_type": "bar",
        "unit": "Revenue ($M)"
    },
    "helix_3d": {
        "x": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        "y": [0.0, 5.0, 8.66, 10.0, 8.66, 5.0, 0.0, -5.0, -8.66, -10.0, -8.66, -5.0, 0.0],
        "z": [10.0, 8.66, 5.0, 0.0, -5.0, -8.66, -10.0, -8.66, -5.0, 0.0, 5.0, 8.66, 10.0],
        "label": "3D Harmonic Helix & Wave",
        "chart_type": "3d",
        "unit": "Amplitude (V)"
    },
    "saddle_3d": {
        "x": [-3, -2, -1, 0, 1, 2, 3, 2, 1, 0, -1, -2],
        "y": [9.0, 4.0, 1.0, 0.0, 1.0, 4.0, 9.0, 4.0, 1.0, 0.0, 1.0, 4.0],
        "z": [0.0, 3.0, 5.0, 6.0, 5.0, 3.0, 0.0, -2.0, -4.0, -5.0, -4.0, -2.0],
        "label": "3D Hyperbolic Paraboloid Saddle",
        "chart_type": "3d",
        "unit": "Spatial Dimension"
    },
    "spiral_3d": {
        "x": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
        "y": [2, 4, 7, 12, 18, 25, 32, 38, 42, 44, 43, 39, 32, 22],
        "z": [1, 3, 6, 10, 15, 20, 24, 26, 25, 21, 15, 8, 0, -10],
        "label": "3D Torus Vortex Manifold",
        "chart_type": "3d",
        "unit": "Vector Flux"
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
        stem = Path(filename).stem.replace("_", " ").replace("-", " ").title() if filename else "Extracted Graph"

        return {
            "x": x_vals,
            "y": y_vals,
            "z": None,
            "label": stem or "Detected Chart",
            "chart_type": "line",
            "extracted_via": "built_in_vision_engine"
        }
    except Exception:
        return {
            "x": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            "y": [12.0, 18.5, 25.0, 31.2, 45.0, 60.5, 78.0, 95.2, 115.0, 140.0],
            "z": None,
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
    request: Request,
):
    try:
        if "application/json" in request.headers.get("content-type", ""):
            payload = await request.json()
        else:
            form = await request.form()
            payload = dict(form)
    except (TypeError, ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=400, detail="Chat request must contain valid JSON or form data") from exc

    history_value = payload.get("history", payload.get("messages"))
    try:
        history = normalize_chat_history(history_value)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    question = payload.get("question")
    if isinstance(question, str) and question.strip():
        if not history or history[-1]["role"] != "user" or history[-1]["content"] != question.strip():
            history.append({"role": "user", "content": question.strip()[:12000]})
    if not history or not any(message["role"] == "user" for message in history):
        raise HTTPException(status_code=400, detail="Question or history with a user message is required")

    api_key = str(payload.get("api_key") or "").strip() or (
        os.environ.get("GROQ_API_KEY") or os.environ.get("GROQ_API_TOKEN") or SERVER_GROQ_KEY
    ).strip()
    graph_context = payload.get("graph_context")
    if isinstance(graph_context, (dict, list)):
        graph_context = json.dumps(graph_context)
    if graph_context is not None:
        graph_context = str(graph_context)[:12000]
    selected_model = select_model(payload.get("model"), CHAT_MODELS, CHAT_MODEL)
    fallback = lambda: fallback_chat(history, graph_context)

    if not api_key:
        reply, tool_calls, tool_results, graph = fallback()
        return {"reply": reply, "text": reply, "tool_calls": tool_calls, "tool_results": tool_results, "graph": graph, "fallback": True}
    try:
        client = Groq(api_key=api_key.strip())
        system = (
            "You are the official virtual assistant for AI Graph Finder. "
            "Welcome visitors and answer questions only about AI Graph Finder. "
            "AI Graph Finder lets users create, edit, scan, visualize, and analyze 2D and 3D graphs; "
            "it can calculate slopes, trends, extrema, regression equations, forecasts, and relationships "
            "between nodes and edges. Its primary goal is to make graph exploration and mathematical insight "
            "clear and interactive. Be helpful, friendly, professional, and concise: stay under three sentences "
            "unless the user asks for a detailed explanation. "
            "Politely decline unrelated, political, or general-knowledge questions. If you do not know an "
            f"AI Graph Finder answer, say exactly: 'I don't have that information right now, but you can "
            f"reach out to us at {ASSISTANT_CONTACT_EMAIL}.' "
            "When the user asks to create, change, or explain a relationship graph, call "
            "update_3d_graph with the complete graph. Use stable string ids and include every node "
            "needed by the edges. Never invent a graph update for a question that only asks for an explanation."
        )
        if graph_context:
            system += f"\n\nCurrent graph data: {graph_context[:12000]}"
        messages = [{"role": "system", "content": system}, *history]
        completion = client.chat.completions.create(
            model=selected_model,
            messages=messages,
            temperature=0.4,
            tools=[UPDATE_3D_GRAPH_TOOL],
            tool_choice="auto",
        )
        message = completion.choices[0].message
        raw_tool_calls = _value(message, "tool_calls", []) or []
        tool_calls = [tool_call_payload(item) for item in raw_tool_calls]
        tool_results = []
        graph = None
        for call in tool_calls:
            if call["function"]["name"] != "update_3d_graph":
                continue
            try:
                arguments = json.loads(call["function"]["arguments"])
                graph = normalize_graph_update(arguments)
                result = {
                    "status": "updated",
                    "graph": graph,
                    "node_count": len(graph["nodes"]),
                    "link_count": len(graph["links"]),
                }
            except (TypeError, ValueError, json.JSONDecodeError) as exc:
                result = {"status": "error", "error": str(exc)}
            tool_results.append({
                "tool_call_id": call["id"],
                "name": call["function"]["name"],
                "result": result,
            })

        reply = _value(message, "content", "") or ""
        # Give the model a chance to describe a successful graph update naturally.
        if tool_results:
            assistant_tool_calls = [
                {"id": call["id"], "type": "function", "function": call["function"]}
                for call in tool_calls
            ]
            follow_up_messages = [
                *messages,
                {"role": "assistant", "content": reply, "tool_calls": assistant_tool_calls},
                *[
                    {
                        "role": "tool",
                        "tool_call_id": item["tool_call_id"],
                        "content": json.dumps(item["result"]),
                    }
                    for item in tool_results
                ],
            ]
            try:
                follow_up = client.chat.completions.create(
                    model=selected_model,
                    messages=follow_up_messages,
                    temperature=0.4,
                )
                reply = _value(follow_up.choices[0].message, "content", "") or reply
            except Exception:
                logger.info("Assistant follow-up after graph tool call failed", exc_info=True)
        return {
            "reply": reply,
            "text": reply,
            "tool_calls": tool_calls,
            "tool_results": tool_results,
            "graph": graph,
            "fallback": False,
        }
    except Exception as exc:
        # Chat remains useful on local/dev deployments and during provider outages.
        logger.warning("Assistant request failed; using deterministic fallback: %s", groq_detail(exc, "assistant"))
        reply, tool_calls, tool_results, graph = fallback()
        return {"reply": reply, "text": reply, "tool_calls": tool_calls, "tool_results": tool_results, "graph": graph, "fallback": True}


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
