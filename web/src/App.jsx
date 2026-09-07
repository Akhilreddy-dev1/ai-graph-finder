import React, {useEffect, useState} from 'react'
import Graph3D from './components/Graph3D'
import TerminalOverlay from './components/TerminalOverlay'
import DetailsDrawer from './components/DetailsDrawer'
import SessionPanel from './components/SessionPanel'
import { healthCheck } from './api'
import { HAS_BACKEND } from './config'

function SignalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 19a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm0-7a9 9 0 0 1 9 9m-9-16a16 16 0 0 1 16 16" />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Zm7 14 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" />
    </svg>
  )
}

export default function App(){
  const [selected, setSelected] = useState(null)
  const [graphStats, setGraphStats] = useState({ nodes: 4, links: 3 })
  const [backendOk, setBackendOk] = useState(null)
  const [session, setSession] = useState(()=>{
    try{ return JSON.parse(localStorage.getItem('agf_session')||'null') }catch(e){return null}
  })

  useEffect(()=>{
    if(session) localStorage.setItem('agf_session', JSON.stringify(session))
    else localStorage.removeItem('agf_session')
  },[session])

  useEffect(()=>{
    let mounted = true
    healthCheck()
      .then(()=>{ if(mounted) setBackendOk(true) })
      .catch(()=>{ if(mounted) setBackendOk(false) })
    return ()=>{ mounted=false }
  },[])

  return (
    <div className="app-shell min-h-screen text-slate-100">
      <div className="ambient ambient-purple" />
      <div className="ambient ambient-cyan" />

      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><SparkIcon /></div>
          <div>
            <p className="eyebrow">AI GRAPH FINDER</p>
            <h1>Node Studio</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="status-pill">
            <span className={`status-dot ${backendOk ? 'is-online' : backendOk === false ? 'is-warn' : ''}`} />
            {backendOk ? 'API connected' : backendOk === false ? (HAS_BACKEND ? 'API offline' : 'Demo mode') : 'Checking API'}
          </div>
          <div className="topbar-meta">v0.1 <span className="meta-separator">•</span> Command center</div>
        </div>
      </header>

      <main className="workspace">
        <section className="workspace-main">
          <div className="hero-row">
            <div>
              <p className="eyebrow accent">LIVE TOPOLOGY</p>
              <h2>Explore your execution graph</h2>
              <p className="hero-copy">Trace commands, outputs, and relationships in an interactive 3D workspace.</p>
            </div>
            <div className="hero-stats">
              <div className="stat-card">
                <span className="stat-label">NODES</span>
                <strong>{graphStats.nodes}</strong>
              </div>
              <div className="stat-card">
                <span className="stat-label">LINKS</span>
                <strong>{graphStats.links}</strong>
              </div>
              <div className="stat-card">
                <span className="stat-label">SESSION</span>
                <strong className="stat-session">{session ? 'ACTIVE' : 'DEMO'}</strong>
              </div>
            </div>
          </div>
          <div className="graph-frame">
            <div className="graph-toolbar">
              <div className="toolbar-label"><SignalIcon /> {session ? 'SESSION STREAM' : 'LOCAL PREVIEW'}</div>
              <div className="toolbar-hint">Drag to orbit <span>•</span> Scroll to zoom <span>•</span> Click a node</div>
            </div>
            <Graph3D
              session={session}
              onSelect={setSelected}
              onSessionInvalid={() => setSession(null)}
              onGraphChange={setGraphStats}
            />
            <div className="graph-legend">
              <span><i className="legend-dot legend-root" /> Root</span>
              <span><i className="legend-dot legend-process" /> Process</span>
              <span><i className="legend-dot legend-file" /> Artifact</span>
            </div>
          </div>
        </section>

        <aside className="workspace-sidebar">
          <div className="panel-card">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">CONTROL PLANE</p>
                <h3>Sessions</h3>
              </div>
              <span className="panel-icon"><SignalIcon /></span>
            </div>
            <SessionPanel session={session} setSession={setSession} />
          </div>

          <div className="panel-card command-card">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">EXECUTION</p>
                <h3>Command console</h3>
              </div>
              <span className="console-key">⌘ K</span>
            </div>
            <TerminalOverlay session={session} />
          </div>

          <div className="panel-card details-card">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">INSPECTOR</p>
                <h3>Node details</h3>
              </div>
            </div>
            <DetailsDrawer node={selected} />
          </div>
        </aside>
      </main>
      <footer className="app-footer">
        <span><span className="status-dot is-online" /> Systems nominal</span>
        <span>WebSocket streaming enabled</span>
      </footer>
    </div>
  )
}
