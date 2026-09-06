import React, {useEffect, useState} from 'react'
import { fetchJob } from '../api'

export default function JobStatus({jobId}){
  const [job, setJob] = useState(null)
  const [error, setError] = useState('')

  useEffect(()=>{
    if(!jobId) return
    let mounted = true
    async function poll(){
      try{
        const data = await fetchJob(jobId)
        if(mounted) {
          setJob(data)
          setError('')
        }
        if(data && data.status && ['pending','running'].includes(data.status) && mounted){
          setTimeout(poll, 1000)
        }
      }catch(e){
        if(mounted) setError(e.message || 'Failed to load job')
      }
    }
    poll()
    return ()=>{ mounted=false }
  },[jobId])

  if(error) return <div className="mt-2 text-xs text-red-300">{error}</div>
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
