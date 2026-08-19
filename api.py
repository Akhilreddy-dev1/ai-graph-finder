from fastapi import FastAPI, File, UploadFile, Form, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
import base64
import json
import re
import os
import shlex
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Tuple
from groq import Groq
# POSIX-only resource limits
try:
    import resource
except Exception:
    resource = None

app = FastAPI(title="AI Graph Finder API")
import os
import secrets
from fastapi import Header

ALLOWED_ORIGINS = [
    o.strip() for o in os.environ.get(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",") if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

ADMIN_KEY = os.environ.get("ADMIN_KEY", "")


def require_admin(x_admin_key):
    """No key set = local dev, stays open. Key set = required."""
    if not ADMIN_KEY:
        return
    if not x_admin_key or not secrets.compare_digest(x_admin_key, ADMIN_KEY):
        raise HTTPException(status_code=401, detail="Invalid or missing admin key")


@app.get('/api/health')
async def health():
    return {"status": "ok"}
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"


def extract_json(raw: str) -> dict:
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        raise ValueError("No JSON object found in AI response.")
    return json.loads(match.group(0))


@app.post('/api/analyze-image')
async def analyze_image(api_key: str = Form(...), file: UploadFile = File(...)):
    """POST multipart: api_key (form), file (image). Returns extracted graph JSON."""
    client = Groq(api_key=api_key) if api_key else None
    if not client:
        raise HTTPException(status_code=400, detail="Missing or invalid API key")

    image_bytes = await file.read()
    b64 = base64.b64encode(image_bytes).decode('utf-8')

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

    raw = completion.choices[0].message.content.strip()
    try:
        data = extract_json(raw)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI returned invalid JSON: {exc}")

    return data


@app.get('/api/demo-graph')
async def demo_graph():
    return {
        "x": [1,2,3,4,5,6,7,8],
        "y": [2,5,3,8,7,12,10,15],
        "z": [1,3,2,6,5,9,8,11],
        "label": "Sample Growth Curve",
        "chart_type": "line",
    }


# Persistent graph using db module and session-scoped websocket manager
import db

# initialize DB
db.init_db()

# simple in-memory asyncio job queue
import asyncio
job_queue = asyncio.Queue()

# manager stores connections per session_id
class ConnectionManager:
    def __init__(self):
        # map session_id -> list of WebSocket
        self.active_connections = {}

    async def connect(self, websocket, session_id):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)

    def disconnect(self, websocket, session_id):
        if session_id in self.active_connections and websocket in self.active_connections[session_id]:
            self.active_connections[session_id].remove(websocket)

    async def broadcast(self, session_id, message: str):
        conns = list(self.active_connections.get(session_id, []))
        for connection in conns:
            try:
                await connection.send_text(message)
            except Exception:
                self.disconnect(connection, session_id)

manager = ConnectionManager()

@app.get('/api/nodes')
async def get_nodes(session: str = Query(None), token: str = Query(None)):
    if not session:
        raise HTTPException(status_code=400, detail='Missing session')
    if not db.validate_session(session, token):
        raise HTTPException(status_code=403, detail='Invalid session or token')
    return db.get_graph(session)

# --- sandboxed command execution helpers ---
ALLOWED_COMMANDS = {
    'ls', 'dir', 'echo', 'cat', 'type', 'head', 'tail', 'wc', 'grep', 'sed', 'awk', 'python', 'node'
}

SHELL_METACHARS = set('|&;<>$`\\"\'())')

def contains_shell_metachar(s: str) -> bool:
    # quick check for dangerous characters — conservative
    for ch in ['|','&',';','>','<','$','`','\\','"','\'','(',')']:
        if ch in s:
            return True
    return False


def run_command_sandboxed(command: str, cwd: Path | str, timeout: int = 6) -> Tuple[int, str, str, float]:
    """Run a tokenized command in a temporary cwd with timeout and POSIX resource limits.
    Returns (returncode, stdout, stderr, elapsed_seconds).
    """
    start = time.time()
    # naive tokenization — require simple commands without shell operators
    try:
        tokens = shlex.split(command, posix=True)
    except Exception:
        # fallback to split by space
        tokens = command.split()

    if not tokens:
        return 1, '', 'empty command', 0.0

    # disallow unsafe characters
    if contains_shell_metachar(command):
        return 1, '', 'forbidden shell metacharacters in command', 0.0

    cmd0 = Path(tokens[0]).name
    if cmd0 not in ALLOWED_COMMANDS:
        return 1, '', f'command not allowed: {cmd0}', 0.0

    # prepare minimal env
    env = {k: v for k, v in os.environ.items() if k in ('PATH', 'LANG', 'LC_ALL')}

    try:
        if resource and os.name == 'posix':
            # use preexec_fn to set resource limits on POSIX
            def _preexec():
                # limit CPU seconds
                resource.setrlimit(resource.RLIMIT_CPU, (3, 3))
                # limit address space (virtual memory) to e.g., 200MB
                try:
                    resource.setrlimit(resource.RLIMIT_AS, (200 * 1024 * 1024, 200 * 1024 * 1024))
                except Exception:
                    pass
        else:
            _preexec = None

        proc = subprocess.run(
            tokens,
            cwd=str(cwd),
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=timeout,
            preexec_fn=_preexec if resource and os.name == 'posix' else None,
            check=False,
        )
        elapsed = time.time() - start
        return proc.returncode, proc.stdout, proc.stderr, elapsed
    except subprocess.TimeoutExpired as e:
        elapsed = time.time() - start
        return 124, e.stdout or '', (e.stderr or '') + '\ntimeout', elapsed
    except Exception as exc:
        elapsed = time.time() - start
        return 1, '', str(exc), elapsed


@app.post('/api/execute')
async def execute_command(command: str = Form(...), session: str = Form(...), token: str = Form(...)):
    """Enqueue a command execution job for the session (async). Returns job_id and node."""
    if not db.validate_session(session, token):
        raise HTTPException(status_code=403, detail='Invalid session or token')

    # find next node id for session
    g = db.get_graph(session)
    existing = [n['id'] for n in g['nodes']] if g['nodes'] else []
    next_id = max(existing) + 1 if existing else 1
    new_node = {"id": next_id, "label": command.split(' ')[0], "title": command, "color": {"background":"#06b6d4"}}

    # persist node (without output yet)
    db.save_node(session, new_node)
    if existing:
        db.save_link(session, existing[-1], next_id)

    # create execution record and enqueue job
    job_id = db.create_execution(session, next_id)
    await job_queue.put({"job_id": job_id, "session": session, "command": command, "node_id": next_id})

    # broadcast minimal update so clients know job queued
    await manager.broadcast(session, json.dumps({"type":"job_update","job":{"job_id":job_id,"status":"pending","node_id":next_id}}))

    return {"status":"queued","job_id": job_id, "node": new_node, 'session': session}


async def job_worker():
    """Background worker that processes execution jobs sequentially."""
    while True:
        job = await job_queue.get()
        job_id = job['job_id']
        session = job['session']
        command = job['command']
        node_id = job['node_id']

        try:
            db.update_execution(job_id, status='running', started_at=time.time())
            await manager.broadcast(session, json.dumps({"type":"job_update","job":{"job_id":job_id,"status":"running","node_id":node_id}}))

            # run in sandbox
            temp_root = Path(tempfile.gettempdir()) / 'ai_graph_finder' / session
            temp_root.mkdir(parents=True, exist_ok=True)
            run_dir = temp_root / f'run_{int(time.time())}'
            run_dir.mkdir(parents=True, exist_ok=True)

            returncode, stdout, stderr, elapsed = run_command_sandboxed(command, run_dir)

            # save output to node
            node_with_output = {"id": node_id, "label": command.split(' ')[0], "title": command, "color":{"background":"#06b6d4"}, 'raw':{'output':stdout,'stderr':stderr,'returncode':returncode,'elapsed':elapsed,'timestamp':time.time()}}
            db.save_node(session, node_with_output)

            # update execution
            db.update_execution(job_id, status='done', stdout=stdout, stderr=stderr, returncode=returncode, finished_at=time.time())

            # broadcast graph and job done
            await manager.broadcast(session, json.dumps({"type":"update_graph","nodes": db.get_graph(session)['nodes'], "links": db.get_graph(session)['links']}))
            await manager.broadcast(session, json.dumps({"type":"job_update","job": db.get_execution(job_id)}))

        except Exception as exc:
            db.update_execution(job_id, status='failed', stderr=str(exc), finished_at=time.time())
            await manager.broadcast(session, json.dumps({"type":"job_update","job": db.get_execution(job_id)}))
        finally:
            job_queue.task_done()


# start background worker within the app's event loop
@app.on_event('startup')
async def startup_event():
    # spawn background job worker
    asyncio.create_task(job_worker())


@app.post('/api/session')
async def create_session(name: str = Form(None)):
    sess = db.create_session(name)
    # create initial root node for session
    root = {"id": 1, "label":"root", "title":"root", "color": {"background":"#7c3aed"}}
    db.save_node(sess['session_id'], root)
    return sess

@app.get('/api/sessions')
async def list_sessions():
    return db.list_sessions()

@app.post('/api/session/clear')
async def clear_session(session: str = Form(...), token: str = Form(...)):
    if not db.validate_session(session, token):
        raise HTTPException(status_code=403, detail='Invalid session or token')
    db.clear_session(session)
    return {'status':'ok'}

@app.get('/api/job/{job_id}')
async def get_job(job_id: str):
    job = db.get_execution(job_id)
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')
    return job

@app.get('/api/session/{session_id}/jobs')
async def get_session_jobs(session_id: str, token: str = Query(None)):
    if not db.validate_session(session_id, token):
        raise HTTPException(status_code=403, detail='Invalid session or token')
    return db.list_executions_for_session(session_id)


@app.websocket('/api/ws')
async def websocket_endpoint(websocket: WebSocket):
    # expect ?session=...&token=...
    params = websocket.query_params
    session = params.get('session')
    token = params.get('token')
    if not session or not db.validate_session(session, token):
        await websocket.close(code=1008)
        return
    await manager.connect(websocket, session)
    try:
        # send initial graph data
        await websocket.send_text(json.dumps({"type":"update_graph","nodes": db.get_graph(session)['nodes'], "links": db.get_graph(session)['links']}))
        # also send recent job list
        try:
            jobs = db.list_executions_for_session(session)
            await websocket.send_text(json.dumps({"type":"jobs_list","jobs": jobs}))
        except Exception:
            pass

        while True:
            try:
                await websocket.receive_text()
            except Exception:
                # reply with a tiny heartbeat to keep clients alive
                try:
                    await websocket.send_text(json.dumps({"type":"ping"}))
                except Exception:
                    break
    except WebSocketDisconnect:
        manager.disconnect(websocket, session)


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)
