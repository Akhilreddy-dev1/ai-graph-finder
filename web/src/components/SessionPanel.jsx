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
    <div className="p-3">
      <h3 className="text-sm font-medium">Sessions</h3>
      <div className="mt-2 space-y-2">
        {list.map(s=> (
          <button key={s.session_id} onClick={()=>pick(s)} className="w-full text-left p-2 bg-gray-800 rounded text-sm hover:bg-gray-700">
            {s.name || s.session_id}
          </button>
        ))}
        {!list.length && <p className="text-xs text-gray-500">No sessions yet. Create one below.</p>}
      </div>

      <div className="mt-3">
        <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="New session name" className="w-full bg-[#0b1020] border border-gray-700 rounded px-2 py-1 text-sm" />
        <button disabled={busy} onClick={create} className="mt-2 w-full px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-500 rounded text-white text-sm disabled:opacity-50">
          {busy ? 'Working…' : 'Create session'}
        </button>
      </div>

      {session && (
        <div className="mt-3 text-xs text-gray-400">
          <div><strong>Active:</strong> {session.name || session.session_id}</div>
          <div className="mt-1">session: <code className="text-xs">{session.session_id}</code></div>
          {!session.token && <div className="mt-1 text-amber-400">Missing token — create a new session.</div>}
          <div className="mt-2 flex gap-2">
            <button onClick={disconnect} className="flex-1 px-2 py-1 bg-gray-800 rounded">Disconnect</button>
            <button onClick={clearActive} className="flex-1 px-2 py-1 bg-gray-800 rounded">Clear</button>
          </div>
        </div>
      )}

      <details className="mt-3 text-xs text-gray-500">
        <summary className="cursor-pointer">Admin key (optional)</summary>
        <input
          value={adminKey}
          onChange={(e)=>setAdminKeyInput(e.target.value)}
          placeholder="X-Admin-Key"
          className="mt-2 w-full bg-[#0b1020] border border-gray-700 rounded px-2 py-1 text-sm"
        />
        <button onClick={saveKey} className="mt-2 w-full px-2 py-1 bg-gray-800 rounded">Save key</button>
      </details>

      {status && <p className="mt-2 text-xs text-amber-300">{status}</p>}
      <JobList session={session} />
    </div>
  )
}
