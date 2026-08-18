import React, {useState, useEffect} from 'react'
import Graph3D from './components/Graph3D'
import TerminalOverlay from './components/TerminalOverlay'
import DetailsDrawer from './components/DetailsDrawer'
import SessionPanel from './components/SessionPanel'

export default function App(){
  const [selected, setSelected] = useState(null)
  const [nodes, setNodes] = useState([])
  const [session, setSession] = useState(()=>{
    try{ return JSON.parse(localStorage.getItem('agf_session')||'null') }catch(e){return null}
  })

  useEffect(()=>{
    if(session) localStorage.setItem('agf_session', JSON.stringify(session))
  },[session])

  return (
    <div className="min-h-screen bg-[#0f0c29] text-slate-100">
      <header className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">AI Graph Finder — Node Studio</h1>
          <span className="text-sm text-gray-400">Dark · Minimal</span>
        </div>
        <nav className="flex items-center gap-3">
          <a href="/" className="text-sm text-gray-300 hover:text-white">Graph Studio</a>
          <a href="../app.py" className="text-sm text-gray-300 hover:text-white">Streamlit App</a>
        </nav>
      </header>

      <main className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        <section className="lg:col-span-9 bg-transparent rounded-lg">
          <Graph3D session={session} onSelect={setSelected} />
        </section>

        <aside className="lg:col-span-3">
          <div className="glass-card p-4">
            <SessionPanel session={session} setSession={setSession} />
          </div>

          <div className="mt-4 glass-card p-4">
            <h2 className="text-lg font-medium">Command Input</h2>
            <TerminalOverlay session={session} />
          </div>

          <div className="mt-4 glass-card">
            <DetailsDrawer node={selected} />
          </div>
        </aside>
      </main>
    </div>
  )
}
