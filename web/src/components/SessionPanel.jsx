import React, {useEffect, useState} from 'react'
import { clearSession, createSession, listSessions } from '../api'
import { getAdminKey, setAdminKey } from '../config'
import JobList from './JobList'

export default function SessionPanel({session, setSession}){
  const [list, setList] = useState([])
  const [name, setName] = useState('')
  const [adminKey, setAdminKeyInput] = useState(getAdminKey())
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(()=>{ fetchList() }, [])

  async function fetchList(){
    try{
      const data = await listSessions()
      setList(Array.isArray(data) ? data : [])
      setStatus('')
    }catch(e){
      setList([])
      setStatus(e.message || 'Backend not reachable')
    }
  }

  async function create(){
    setBusy(true)
    try{
      const data = await createSession(name)
      localStorage.setItem('agf_session', JSON.stringify(data))
      setSession(data)
      setName('')
      setStatus('Session created')
      await fetchList()
    }catch(e){
      setStatus(e.message || 'Failed to create session')
    }finally{
      setBusy(false)
    }
  }

  function pick(sess){
    const stored = JSON.parse(localStorage.getItem('agf_session') || 'null')
    if(stored && stored.session_id === sess.session_id && stored.token){
      setSession(stored)
      setStatus('')
    }else{
      setStatus('This session has no saved token in this browser. Create a new session to get a token.')
    }
  }

  async function disconnect(){
    localStorage.removeItem('agf_session')
    setSession(null)
  }

  async function clearActive(){
    if(!session?.session_id || !session?.token) return
    setBusy(true)
    try{
      await clearSession(session.session_id, session.token)
      localStorage.removeItem('agf_session')
      setSession(null)
      setStatus('Session cleared')
      await fetchList()
    }catch(e){
      setStatus(e.message || 'Failed to clear session')
    }finally{
      setBusy(false)
    }
  }

  function saveKey(){
    setAdminKey(adminKey.trim())
    fetchList()
  }

  return (
    <div className="session-panel">
      <div className="session-list">
        {list.map(s=> (
          <button key={s.session_id} onClick={()=>pick(s)} className="session-item">
            <span className="session-avatar">{(s.name || s.session_id).slice(0, 1).toUpperCase()}</span>
            <span className="session-name">{s.name || s.session_id}</span>
            <span className="session-arrow">↗</span>
          </button>
        ))}
        {!list.length && <p className="empty-state">No sessions yet. Create one below.</p>}
      </div>

      <div className="session-create">
        <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Name a new session" className="control-input" />
        <button disabled={busy} onClick={create} className="primary-button">
          <span>+</span>{busy ? 'Working…' : 'Create session'}
        </button>
      </div>

      {session && (
        <div className="active-session">
          <div className="active-session-label"><span className="status-dot is-online" /> Active session</div>
          <strong>{session.name || session.session_id}</strong>
          <code>{session.session_id}</code>
          {!session.token && <div className="warning-copy">Missing token — create a new session.</div>}
          <div className="session-actions">
            <button onClick={disconnect} className="secondary-button">Disconnect</button>
            <button onClick={clearActive} className="secondary-button">Clear</button>
          </div>
        </div>
      )}

      <details className="admin-details">
        <summary>Admin key <span>(optional)</span></summary>
        <input
          value={adminKey}
          onChange={(e)=>setAdminKeyInput(e.target.value)}
          placeholder="X-Admin-Key"
          className="control-input"
        />
        <button onClick={saveKey} className="secondary-button save-key">Save key</button>
      </details>

      {status && <p className="status-copy">{status}</p>}
      <JobList session={session} />
    </div>
  )
}
