import sqlite3
from pathlib import Path
import json
import secrets
import time

DB_PATH = Path(__file__).parent / 'graph.db'
DB_PATH = Path(os.environ.get('AGF_DB_PATH', Path(__file__).parent / 'graph.db'))
CREATE_SESSIONS = '''
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  name TEXT,
  created_at REAL
);
'''

CREATE_NODES = '''
CREATE TABLE IF NOT EXISTS nodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  node_id INTEGER NOT NULL,
  label TEXT,
  title TEXT,
  color_bg TEXT,
  raw_json TEXT,
  UNIQUE(session_id, node_id)
);
'''

CREATE_LINKS = '''
CREATE TABLE IF NOT EXISTS links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  source INTEGER NOT NULL,
  target INTEGER NOT NULL,
  UNIQUE(session_id, source, target)
);
'''

CREATE_EXECUTIONS = '''
CREATE TABLE IF NOT EXISTS executions (
  job_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  node_id INTEGER,
  status TEXT,
  stdout TEXT,
  stderr TEXT,
  returncode INTEGER,
  started_at REAL,
  finished_at REAL
);
'''

def get_conn():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(CREATE_SESSIONS)
    cur.execute(CREATE_NODES)
    cur.execute(CREATE_LINKS)
    cur.execute(CREATE_EXECUTIONS)
    conn.commit()
    conn.close()

# Session helpers
def create_session(name=None):
    session_id = secrets.token_urlsafe(8)
    token = secrets.token_urlsafe(24)
    created_at = time.time()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute('INSERT INTO sessions(session_id, token, name, created_at) VALUES (?,?,?,?)',
                (session_id, token, name or 'session', created_at))
    conn.commit()
    conn.close()
    return {'session_id': session_id, 'token': token, 'name': name or 'session', 'created_at': created_at}

def list_sessions():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute('SELECT session_id, name, created_at FROM sessions ORDER BY created_at DESC')
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_session(session_id):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute('SELECT session_id, token, name, created_at FROM sessions WHERE session_id=?', (session_id,))
    row = cur.fetchone()
    conn.close()
    return dict(row) if row else None

def validate_session(session_id, token):
    if not session_id or not token:
        return False
    sess = get_session(session_id)
    return bool(sess and sess.get('token') == token)

# Node/Link persistence

def save_node(session_id: str, node: dict):
    # node must contain node['id']
    conn = get_conn()
    cur = conn.cursor()
    raw = json.dumps(node)
    color = None
    try:
        color = node.get('color', {}).get('background')
    except Exception:
        color = None
    cur.execute('INSERT OR REPLACE INTO nodes(session_id,node_id,label,title,color_bg,raw_json) VALUES(?,?,?,?,?,?)',
                (session_id, node['id'], node.get('label'), node.get('title'), color, raw))
    conn.commit()
    conn.close()

def save_link(session_id: str, source: int, target: int):
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute('INSERT OR IGNORE INTO links(session_id,source,target) VALUES(?,?,?)', (session_id, source, target))
        conn.commit()
    finally:
        conn.close()

def get_graph(session_id: str):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute('SELECT node_id,label,title,color_bg,raw_json FROM nodes WHERE session_id=? ORDER BY id ASC', (session_id,))
    nodes = []
    for r in cur.fetchall():
        try:
            raw = json.loads(r['raw_json']) if r['raw_json'] else None
        except Exception:
            raw = None
        nodes.append({'id': r['node_id'], 'label': r['label'] or (raw and raw.get('label')) or str(r['node_id']), 'title': r['title'], 'color': {'background': r['color_bg']} if r['color_bg'] else None, 'raw': raw})
    cur.execute('SELECT source,target FROM links WHERE session_id=?', (session_id,))
    links = [{'source': r['source'], 'target': r['target']} for r in cur.fetchall()]
    conn.close()
    return {'nodes': nodes, 'links': links}

def clear_session(session_id: str):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute('DELETE FROM nodes WHERE session_id=?', (session_id,))
    cur.execute('DELETE FROM links WHERE session_id=?', (session_id,))
    cur.execute('DELETE FROM executions WHERE session_id=?', (session_id,))
    cur.execute('DELETE FROM sessions WHERE session_id=?', (session_id,))
    conn.commit()
    conn.close()

# Executions
import uuid

def create_execution(session_id: str, node_id: int):
    job_id = uuid.uuid4().hex
    conn = get_conn()
    cur = conn.cursor()
    cur.execute('INSERT INTO executions(job_id, session_id, node_id, status, stdout, stderr, returncode, started_at, finished_at) VALUES(?,?,?,?,?,?,?,?,?)',
                (job_id, session_id, node_id, 'pending', '', '', None, None, None))
    conn.commit()
    conn.close()
    return job_id

def update_execution(job_id: str, **kwargs):
    allowed = {'status','stdout','stderr','returncode','started_at','finished_at'}
    fields = []
    values = []
    for k,v in kwargs.items():
        if k in allowed:
            fields.append(f"{k} = ?")
            values.append(v)
    if not fields:
        return
    values.append(job_id)
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"UPDATE executions SET {', '.join(fields)} WHERE job_id = ?", values)
    conn.commit()
    conn.close()

def get_execution(job_id: str):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute('SELECT * FROM executions WHERE job_id = ?', (job_id,))
    row = cur.fetchone()
    conn.close()
    return dict(row) if row else None

def list_executions_for_session(session_id: str):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute('SELECT job_id, node_id, status, started_at, finished_at FROM executions WHERE session_id = ? ORDER BY started_at DESC', (session_id,))
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]
