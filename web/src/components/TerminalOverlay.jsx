import React, {useState} from 'react'
import { executeCommand } from '../api'
import JobStatus from './JobStatus'

export default function TerminalOverlay({session}){
  const [cmd, setCmd] = useState('')
  const [output, setOutput] = useState('')
  const [jobId, setJobId] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e){
    e.preventDefault()
    if(!cmd.trim()) return
    if(!session || !session.session_id || !session.token){
      setOutput('Create a session first (a token is required).')
      return
    }

    setBusy(true)
    try{
      const data = await executeCommand(cmd.trim(), session.session_id, session.token)
      if(data.job_id) setJobId(data.job_id)
      setOutput('Queued — job id: ' + (data.job_id || 'n/a'))
      setCmd('')
    }catch(err){
      setOutput(err.message || 'Error sending command')
    }finally{
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-3">
      <label className="block text-sm text-gray-300">Command</label>
      <div className="mt-2 flex gap-2">
        <input
          value={cmd}
          onChange={(e)=>setCmd(e.target.value)}
          placeholder="e.g. echo hello"
          className="w-full bg-[#0b1020] border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none"
        />
        <button disabled={busy} type="submit" className="px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-500 rounded text-white text-sm disabled:opacity-50">
          {busy ? '…' : 'Run'}
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-2">Output: <span className="text-gray-200">{output}</span></p>
      <p className="text-xs text-gray-500 mt-2">Allowed: ls, dir, echo, cat, type, head, tail, wc, grep, python, node</p>
      {jobId && <div className="mt-2"><JobStatus jobId={jobId} /></div>}
    </form>
  )
}
