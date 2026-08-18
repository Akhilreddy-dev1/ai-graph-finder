import React, {useEffect, useState} from 'react'

export default function JobList({session}){
  const [jobs, setJobs] = useState([])

  useEffect(()=>{ if(session) fetchJobs() },[session])

  async function fetchJobs(){
    try{
      const base = `${location.protocol}//${location.hostname}:8000`
      const res = await fetch(`${base}/api/session/${session.session_id}/jobs?token=${encodeURIComponent(session.token)}`)
      const data = await res.json()
      setJobs(data)
    }catch(e){console.error(e)}
  }

  if(!session) return null
  return (
    <div className="mt-3">
      <h4 className="text-sm font-medium">Recent Jobs</h4>
      <ul className="mt-2 text-xs text-gray-400 space-y-1">
        {jobs.map(j=> (
          <li key={j.job_id} className="p-1 bg-[#091025] rounded">{j.job_id.slice(0,8)} — {j.status}</li>
        ))}
      </ul>
    </div>
  )
}
