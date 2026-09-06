import React, {useEffect, useState} from 'react'
import { API_BASE, HAS_BACKEND } from '../config'

export default function SessionPanel({session, setSession}){
  const [list, setList] = useState([])
  const [name, setName] = useState('')

  useEffect(()=>{ if(HAS_BACKEND) fetchList() }, [])

  async function fetchList(){
    try{
      const res = await fetch(`${API_BASE}/api/sessions`)
      if(!res.ok) throw new Error(`Session request failed (${res.status})`)
      const data = await res.json()
      setList(data)
    }catch(e){console.error(e)}
  }

  async function create(){
    if(!HAS_BACKEND) return
    try{
      const form = new FormData(); if(name) form.append('name', name)
      const res = await fetch(`${API_BASE}/api/session`, {method:'POST', body: form})
      if(!res.ok) throw new Error(`Session creation failed (${res.status})`)
      const data = await res.json()
      // store token & session in localStorage
      localStorage.setItem('agf_session', JSON.stringify(data))
      setSession(data)
      fetchList()
    }catch(e){console.error(e)}
  }

  function pick(sess){
    // load token from backend response previously saved in localStorage or re-create
    const stored = JSON.parse(localStorage.getItem('agf_session') || 'null')
    if(stored && stored.session_id === sess.session_id){
      setSession(stored)
    }else{
      // user may not have token locally; warn user to create session here to get token
      setSession({session_id: sess.session_id, token: null, name: sess.name})
    }
  }

  return (
    <div className="p-3">
      <h3 className="text-sm font-medium">Sessions</h3>
      <div className="mt-2 space-y-2">
        {list.map(s=> (
          <button key={s.session_id} onClick={()=>pick(s)} className="w-full text-left p-2 bg-gray-800 rounded text-sm hover:bg-gray-700">{s.name || s.session_id}</button>
        ))}
      </div>

      <div className="mt-3">
        {!HAS_BACKEND && <p className="mb-2 text-xs text-amber-300">Configure VITE_API_BASE to enable live sessions.</p>}
        <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="New session name" className="w-full bg-[#0b1020] border border-gray-700 rounded px-2 py-1 text-sm" />
        <button onClick={create} disabled={!HAS_BACKEND} className="mt-2 w-full px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-500 rounded text-white text-sm disabled:cursor-not-allowed disabled:opacity-50">Create session</button>
      </div>

      {session && (
        <div className="mt-3 text-xs text-gray-400">
          <div><strong>Active:</strong> {session.name || session.session_id}</div>
          <div className="mt-1">session: <code className="text-xs">{session.session_id}</code></div>
        </div>
      )}
    </div>
  )
}
