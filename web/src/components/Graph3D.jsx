import React, {useEffect, useRef, useState} from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import * as THREE from 'three'
import { fetchGraph } from '../api'
import { HAS_BACKEND, wsUrl } from '../config'
import { chartToGraph } from '../graphUtils'

const DEMO_GRAPH = {
  nodes: [
    { id: 'n1', label: 'shell', color: { background: '#06b6d4' } },
    { id: 'n2', label: 'process: ls', color: { background: '#10b981' } },
    { id: 'n3', label: 'process: python', color: { background: '#f97316' } },
    { id: 'n4', label: 'file: data.json', color: { background: '#8b5cf6' } }
  ],
  links: [
    { source: 'n1', target: 'n2' },
    { source: 'n1', target: 'n3' },
    { source: 'n3', target: 'n4' }
  ]
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function normalizeGraph(data) {
  const nodes = (data?.nodes || []).map((n) => ({
    ...n,
    id: n.id,
    label: n.label || String(n.id),
  }))
  const links = (data?.links || []).map((l) => ({
    source: typeof l.source === 'object' ? l.source.id : l.source,
    target: typeof l.target === 'object' ? l.target.id : l.target,
  }))
  return { nodes, links }
}

export default function Graph3D({session, onSelect, onSessionInvalid, onGraphChange, graphOverride}){
  const fgRef = useRef()
  const [graphData, setGraphData] = useState(DEMO_GRAPH)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState('')

  useEffect(()=>{
    if(!graphOverride) return
    const next = graphOverride.nodes ? normalizeGraph(graphOverride) : chartToGraph(graphOverride)
    if(next){
      setGraphData(next)
      onGraphChange && onGraphChange({ nodes: next.nodes.length, links: next.links.length })
    }
  },[graphOverride])

  useEffect(()=>{
    if(graphOverride) return
    if(!session || !session.session_id || !session.token) {
      setGraphData(DEMO_GRAPH)
      onGraphChange && onGraphChange({ nodes: DEMO_GRAPH.nodes.length, links: DEMO_GRAPH.links.length })
      setConnected(false)
      return
    }

    let cancelled = false
    setError('')

    fetchGraph(session.session_id, session.token)
      .then((d) => {
        if (!cancelled) {
          const next = normalizeGraph(d)
          setGraphData(next)
          onGraphChange && onGraphChange({ nodes: next.nodes.length, links: next.links.length })
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message || 'Failed to load graph')
          if (e.message === 'Invalid session or token') {
            onSessionInvalid && onSessionInvalid()
          }
          console.warn('Failed to load session graph, keeping demo:', e)
        }
      })

    const url = wsUrl(`/api/ws?session=${encodeURIComponent(session.session_id)}&token=${encodeURIComponent(session.token)}`)
    const ws = new WebSocket(url)

    ws.addEventListener('message', (ev)=>{
      try{
        const msg = JSON.parse(ev.data)
        if(msg.type === 'update_graph'){
          const next = normalizeGraph(msg)
          setGraphData(next)
          onGraphChange && onGraphChange({ nodes: next.nodes.length, links: next.links.length })
        }
      }catch(e){console.error('ws parse',e)}
    })
    ws.addEventListener('open', ()=>setConnected(true))
    ws.addEventListener('close', ()=>setConnected(false))
    ws.addEventListener('error', ()=>setConnected(false))

    return ()=>{
      cancelled = true
      try{ ws.close() }catch(e){}
    }
  },[session, graphOverride])

  useEffect(()=>{
    if(fgRef.current && graphData.nodes.length){
      try{
        fgRef.current.zoomToFit(400, 40)
      }catch(e){}
    }
  },[graphData.nodes.length])

  const showDemoBanner = !session || !session.session_id || !session.token

  return (
    <div className="graph-canvas">
      {showDemoBanner && (
        <div className="graph-notice">
          Demo mode — no backend session. Create a session in the sidebar to enable live updates.
        </div>
      )}
      {!showDemoBanner && (
        <div className={`graph-notice ${connected ? 'is-connected' : ''}`}>
          <span className="status-dot" />
          {connected ? 'Live session connected' : error || (HAS_BACKEND ? 'Connecting to backend…' : 'Backend URL not configured')}
        </div>
      )}

      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        nodeLabel={node => {
          const label = escapeHtml(node.label || node.id)
          const kind = escapeHtml(node.type || node.kind || 'graph node')
          return `<div class="graph-tooltip"><strong>${label}</strong><span>${kind}</span></div>`
        }}
        nodeThreeObject={node => {
          const color = node.color?.background || '#8b5cf6'
          const radius = node.id === 'n1' || node.type === 'root' ? 6.5 : 4.8
          return new THREE.Mesh(
            new THREE.SphereGeometry(radius, 24, 24),
            new THREE.MeshStandardMaterial({
              color,
              emissive: color,
              emissiveIntensity: 0.3,
              metalness: 0.28,
              roughness: 0.34,
            }),
          )
        }}
        nodeThreeObjectExtend={false}
        linkWidth={1.15}
        linkColor={()=>'rgba(148,163,184,0.38)'}
        linkDirectionalParticles={3}
        linkDirectionalParticleWidth={1.4}
        linkDirectionalParticleColor={()=>'rgba(129,140,248,0.85)'}
        linkDirectionalParticleSpeed={0.006}
        d3VelocityDecay={0.28}
        warmupTicks={80}
        cooldownTicks={120}
        onRenderFramePre={scene => {
          if (scene.userData.graphStudioLighting) return
          scene.add(new THREE.HemisphereLight('#c4d2ff', '#080b16', 1.7))
          const keyLight = new THREE.DirectionalLight('#ffffff', 2.3)
          keyLight.position.set(120, 160, 100)
          scene.add(keyLight)
          scene.userData.graphStudioLighting = true
        }}
        backgroundColor={'#080b16'}
        onNodeClick={node=>{
          const distance = 120
          const distRatio = 1 + distance/Math.hypot(node.x||0,node.y||0,node.z||0)
          fgRef.current.cameraPosition(
            {x:(node.x||0)*distRatio,y:(node.y||0)*distRatio,z:(node.z||0)*distRatio},
            {x:node.x||0,y:node.y||0,z:node.z||0},
            300
          )
          onSelect && onSelect(node)
        }}
      />
    </div>
  )
}
