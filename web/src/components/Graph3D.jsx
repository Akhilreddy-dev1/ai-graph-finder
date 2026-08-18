import React, {useEffect, useRef, useState} from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import SpriteText from 'three-spritetext'

const DEMO_GRAPH = {
  nodes: [
    { id: 'n1', label: 'shell', color: { background: '#06b6d4' }, x:0, y:0, z:0 },
    { id: 'n2', label: 'process: ls', color: { background: '#10b981' }, x:80, y:30, z:10 },
    { id: 'n3', label: 'process: python', color: { background: '#f97316' }, x:-80, y:-20, z:-10 },
    { id: 'n4', label: 'file: data.json', color: { background: '#8b5cf6' }, x:20, y:-90, z:40 }
  ],
  links: [
    { source: 'n1', target: 'n2' },
    { source: 'n1', target: 'n3' },
    { source: 'n3', target: 'n4' }
  ]
}

export default function Graph3D({session, onSelect}){
  const fgRef = useRef()
  const [graphData, setGraphData] = useState(DEMO_GRAPH)
  const wsRef = useRef(null)

  useEffect(()=>{
    if(!session || !session.session_id) return
    // fetch initial graph for session (backend should be hosted separately in production)
    const base = `${location.protocol}//${location.hostname}:8000`
    fetch(`${base}/api/nodes?session=${encodeURIComponent(session.session_id)}&token=${encodeURIComponent(session.token||'')}`)
      .then(r=>r.json())
      .then(d=>setGraphData({nodes:d.nodes || [], links:d.links || []}))
      .catch((e)=>{
        console.warn('Failed to load session graph, keeping demo:', e)
      })

    // connect websocket to backend for this session
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${location.hostname}:8000/api/ws?session=${encodeURIComponent(session.session_id)}&token=${encodeURIComponent(session.token||'')}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.addEventListener('message', (ev)=>{
      try{
        const msg = JSON.parse(ev.data)
        if(msg.type === 'update_graph'){
          setGraphData({nodes: msg.nodes, links: msg.links})
        }
      }catch(e){console.error('ws parse',e)}
    })

    ws.addEventListener('open', ()=>console.log('ws open'))
    ws.addEventListener('close', ()=>console.log('ws closed'))

    return ()=>{ try{ ws.close() }catch(e){} }
  },[session])

  useEffect(()=>{
    // subtle camera auto-adjust when data changes
    if(fgRef.current && graphData.nodes.length){
      try{
        fgRef.current.centerAt(0,0,1000)
        fgRef.current.zoomToFit(400)
      }catch(e){}
    }
  },[graphData.nodes.length])

  // Render banner when there is no active session; graph still shows demo data so Pages works without backend.
  const showDemoBanner = !session || !session.session_id

  return (
    <div className="h-[72vh] rounded-lg overflow-hidden relative">
      {showDemoBanner && (
        <div className="absolute top-4 left-4 z-20 bg-black/40 text-gray-100 px-3 py-2 rounded-md text-sm">
          Demo mode — no backend connected. Create a session to enable live updates.
        </div>
      )}

      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        nodeAutoColorBy={n=>n.color?.background || '#8b5cf6'}
        nodeThreeObject={node => {
          const sprite = new SpriteText(node.label)
          sprite.color = node.color?.background || '#e5e7eb'
          sprite.textHeight = 8
          return sprite
        }}
        nodeThreeObjectExtend={true}
        linkWidth={1.5}
        linkColor={()=>'rgba(148,163,184,0.6)'}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={1}
        linkDirectionalParticleColor={()=>'rgba(99,102,241,0.9)'}
        backgroundColor={'#0f0c29'}
        onNodeClick={node=>{
          // center on node
          const distance = 120
          const distRatio = 1 + distance/Math.hypot(node.x||0,node.y||0,node.z||0)
          fgRef.current.cameraPosition({x:(node.x||0)*distRatio,y:(node.y||0)*distRatio,z:(node.z||0)*distRatio},{x:node.x||0,y:node.y||0,z:node.z||0},300)
          onSelect && onSelect(node)
        }}
        onEngineTick={() => { /* keep performance snappy */ }}
      />
    </div>
  )
}
