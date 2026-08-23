import React, {useEffect, useState} from 'react'
import { fetchSessionJobs } from '../api'

export default function JobList({session}){
  const [jobs, setJobs] = useState([])

  useEffect(()=>{
    if(!session?.session_id || !session?.token) {
      setJobs([])
      return
    }
    let mounted = true
    async function load(){
      try{
        const data = await fetchSessionJobs(session.session_id, session.token)
        if(mounted) setJobs(Array.isArray(data) ? data : [])
      }catch(e){
        if(mounted) setJobs([])
      }
    }
    load()
    const id = setInterval(load, 3000)
    return ()=>{ mounted=false; clearInterval(id) }
  },[session])

  if(!session?.token) return null
  return (
    <div className="mt-3">
      <h4 className="text-sm font-medium">Recent Jobs</h4>
      <ul className="mt-2 text-xs text-gray-400 space-y-1">
        {jobs.map(j=> (
          <li key={j.job_id} className="p-1 bg-[#091025] rounded">{j.job_id.slice(0,8)} — {j.status}</li>
        ))}
        {!jobs.length && <li className="text-gray-600">No jobs yet</li>}
      </ul>
    </div>
  )
}
