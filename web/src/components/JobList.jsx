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
    <div className="job-list">
      <div className="subsection-label">RECENT ACTIVITY</div>
      <ul>
        {jobs.map(j=> (
          <li key={j.job_id}>
            <span className={`job-status job-${j.status}`}>{j.status}</span>
            <code>{j.job_id.slice(0,8)}</code>
            <span className="job-arrow">↗</span>
          </li>
        ))}
        {!jobs.length && <li className="empty-state">No jobs yet</li>}
      </ul>
    </div>
  )
}
