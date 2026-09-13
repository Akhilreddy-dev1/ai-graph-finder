import React, { useState } from 'react'
import Graph3D from './Graph3D'
import SessionPanel from './SessionPanel'
import TerminalOverlay from './TerminalOverlay'
import DetailsDrawer from './DetailsDrawer'

export default function NodeStudio({ session, setSession }) {
  const [selected, setSelected] = useState(null)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <section className="lg:col-span-8 xl:col-span-9 bg-transparent rounded-xl overflow-hidden glass-card">
        <Graph3D session={session} onSelect={setSelected} />
      </section>

      <aside className="lg:col-span-4 xl:col-span-3 space-y-4">
        <div className="glass-card p-4 rounded-xl">
          <SessionPanel session={session} setSession={setSession} />
        </div>

        <div className="glass-card p-4 rounded-xl">
          <h2 className="text-sm font-semibold text-slate-200">Terminal Command Runner</h2>
          <TerminalOverlay session={session} />
        </div>

        <div className="glass-card p-4 rounded-xl">
          <DetailsDrawer node={selected} />
        </div>
      </aside>
    </div>
  )
}
