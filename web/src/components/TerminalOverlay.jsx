import React, {useState} from 'react'
import JobStatus from './JobStatus'

export default function TerminalOverlay({session}){
  const [cmd, setCmd] = useState('')
  const [output, setOutput] = useState('')
  const [jobId, setJobId] = useState(null)
  
  async function submit(e){
    e.preventDefault()
    if(!cmd.trim()) return
    if(!session || !session.session_id || !session.token){
      setOutput('Select a created session first (required token).')
      return
    }

    try{
      const form = new FormData()
      form.append('command', cmd.trim())
      form.append('session', session.session_id)
      form.append('token', session.token)
      const base = `${location.protocol}//${location.hostname}:8000`
      const res = await fetch(`${base}/api/execute`, {method:'POST', body: form})
      const data = await res.json()
      if(data.job_id) setJobId(data.job_id)
      setOutput('Queued — job id: ' + (data.job_id || 'n/a'))
      setCmd('')
    }catch(err){
      setOutput('Error sending command')
    }
  }

  return (
    <form onSubmit={submit} className="mt-3">
      <label className="block text-sm text-gray-300">Command</label>
      <div className="mt-2 flex gap-2">
        <input value={cmd} onChange={(e)=>setCmd(e.target.value)} placeholder="e.g. ls -la /var/www" className="w-full bg-[#0b1020] border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none" />
        <button type="submit" className="px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-500 rounded text-white text-sm">Run</button>
      </div>
      <p className="text-xs text-gray-500 mt-2">Output: <span className="text-gray-200">{output}</span></p>
      <p className="text-xs text-gray-500 mt-2">Commands are executed via the FastAPI backend and appear live in the 3D graph.</p>
      {jobId && <div className="mt-2"><JobStatus jobId={jobId} /></div>}
    </form>
  )
}
