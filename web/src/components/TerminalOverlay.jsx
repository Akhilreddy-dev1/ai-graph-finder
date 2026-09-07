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
    <form onSubmit={submit} className="terminal-form">
      <label className="terminal-label" htmlFor="command-input"><span className="prompt-symbol">›</span> Enter a command</label>
      <div className="terminal-input-row">
        <input
          id="command-input"
          value={cmd}
          onChange={(e)=>setCmd(e.target.value)}
          placeholder="echo hello"
          className="control-input terminal-input"
        />
        <button disabled={busy} type="submit" className="run-button">
          {busy ? '…' : 'Run command'}
        </button>
      </div>
      {output && <p className="terminal-output"><span>OUTPUT</span>{output}</p>}
      <p className="allowed-commands">Allowed: ls, dir, echo, cat, type, head, tail, wc, grep, python, node</p>
      {jobId && <div className="job-result"><JobStatus jobId={jobId} /></div>}
    </form>
  )
}
