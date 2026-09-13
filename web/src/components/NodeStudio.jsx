import React, { useState } from 'react'
import Graph3D from './Graph3D'
import SessionPanel from './SessionPanel'
import DetailsDrawer from './DetailsDrawer'
import { executeCommand } from '../api'

export default function NodeStudio({ session, setSession }) {
  const [selected, setSelected] = useState(null)
  const [cmd, setCmd] = useState('')
  const [output, setOutput] = useState('')
  const [busy, setBusy] = useState(false)

  async function submitCommand(e) {
    e.preventDefault()
    if (!cmd.trim()) return
    if (!session || !session.session_id || !session.token) {
      setOutput('Create an active session first.')
      return
    }

    setBusy(true)
    try {
      const data = await executeCommand(cmd.trim(), session.session_id, session.token)
      setOutput('Queued job ID: ' + (data.job_id || 'ok'))
      setCmd('')
    } catch (err) {
      setOutput(err.message || 'Error executing command')
    } finally {
      setBusy(false)
    }
  }

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
          <form onSubmit={submitCommand} className="mt-3">
            <div className="flex gap-2">
              <input
                value={cmd}
                onChange={(e) => setCmd(e.target.value)}
                placeholder="e.g. echo hello"
                className="w-full bg-[#0b1020] border border-gray-700 rounded px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <button
                disabled={busy}
                type="submit"
                className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-500 rounded text-white text-xs disabled:opacity-50"
              >
                {busy ? '…' : 'Run'}
              </button>
            </div>
            {output && <p className="text-xs text-indigo-300 mt-2">{output}</p>}
            <p className="text-[11px] text-gray-500 mt-2">Allowed: ls, dir, echo, cat, type, python, node</p>
          </form>
        </div>

        <div className="glass-card p-4 rounded-xl">
          <DetailsDrawer node={selected} />
        </div>
      </aside>
    </div>
  )
}
