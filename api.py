import asyncio
import base64
import json
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

import db

try:
    import resource
except Exception:
    resource = None

VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
CHAT_MODEL = "llama-3.3-70b-versatile"

ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173",
    ).split(",")
    if o.strip()
]
ADMIN_KEY = os.environ.get("ADMIN_KEY", "")

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
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        raise ValueError("No JSON object found in AI response.")
    return json.loads(match.group(0))


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


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.post("/api/analyze-image")
async def analyze_image(api_key: str = Form(...), file: UploadFile = File(...)):
    client = Groq(api_key=api_key) if api_key else None
    if not client:
        raise HTTPException(status_code=400, detail="Missing or invalid API key")

    image_bytes = await file.read()
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
    try:
        return extract_json(raw)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI returned invalid JSON: {exc}")


@app.post("/api/chat")
async def chat(
    api_key: str = Form(...),
    question: str = Form(...),
    graph_context: str = Form(None),
):
    client = Groq(api_key=api_key) if api_key else None
    if not client:
        raise HTTPException(status_code=400, detail="Missing or invalid API key")

    system = (
        "You are an expert math and data visualization assistant. "
        "Help users understand graphs, equations, and data trends. "
        "Be concise and friendly."
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
    return {"reply": completion.choices[0].message.content}


@app.get("/api/demo-graph")
async def demo_graph():
    return {
        "x": [1, 2, 3, 4, 5, 6, 7, 8],
        "y": [2, 5, 3, 8, 7, 12, 10, 15],
        "z": [1, 3, 2, 6, 5, 9, 8, 11],
        "label": "Sample Growth Curve",
        "chart_type": "line",
    }


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
