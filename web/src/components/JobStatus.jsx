import React, {useEffect, useState} from 'react'
import { API_BASE } from '../config'

export default function JobStatus({jobId}){
  const [job, setJob] = useState(null)

  useEffect(()=>{
    if(!jobId) return
    let mounted = true
    async function poll(){
      try{
        const res = await fetch(`${API_BASE}/api/job/${jobId}`)
        if(!res.ok) throw new Error(`Job request failed (${res.status})`)
        const data = await res.json()
        if(mounted) setJob(data)
        if(data && data.status && ['pending','running'].includes(data.status)){
          setTimeout(poll, 1000)
        }
      }catch(e){console.error(e)}
    }
    poll()
    return ()=>{ mounted=false }
  },[jobId])

  if(!job) return null
  return (
    <div className="mt-2 text-sm text-gray-300">
      <div><strong>Job:</strong> {job.job_id}</div>
      <div><strong>Status:</strong> {job.status}</div>
      {job.stdout && <pre className="mt-2 bg-black p-2 text-xs rounded text-green-200 max-h-40 overflow-auto">{job.stdout}</pre>}
      {job.stderr && <pre className="mt-2 bg-black p-2 text-xs rounded text-red-200 max-h-40 overflow-auto">{job.stderr}</pre>}
    </div>
  )
}
