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

  if(error) return <div className="job-error">{error}</div>
  if(!job) return null
  return (
    <div className="job-status-detail">
      <div><span>JOB</span> <code>{job.job_id}</code></div>
      <div><span>STATUS</span> <b>{job.status}</b></div>
      {job.stdout && <pre className="job-output success-output">{job.stdout}</pre>}
      {job.stderr && <pre className="job-output error-output">{job.stderr}</pre>}
    </div>
  )
}
