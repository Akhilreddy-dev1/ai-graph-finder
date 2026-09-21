import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

/* ─────────────────────────────────────────────
   3D AI Landing Page – Three.js neural network
   ───────────────────────────────────────────── */
export default function LandingPage3D({ onEnter }) {
  const mountRef = useRef(null)
  const rendererRef = useRef(null)
  const frameRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)

  /* ── Trigger entry animation ── */
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  /* ── Three.js scene ── */
  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    // Scene & camera
    const scene = new THREE.Scene()
    const W = el.clientWidth, H = el.clientHeight
    const camera = new THREE.PerspectiveCamera(65, W / H, 0.1, 1000)
    camera.position.set(0, 0, 55)

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H)
    renderer.setClearColor(0x000000, 0)
    el.appendChild(renderer.domElement)
    rendererRef.current = renderer

    /* ── Star field ── */
    const starGeo = new THREE.BufferGeometry()
    const starCount = 2000
    const starPos = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount * 3; i++) starPos[i] = (Math.random() - 0.5) * 400
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    const starMat = new THREE.PointsMaterial({ color: 0xaab4ff, size: 0.25, transparent: true, opacity: 0.6 })
    scene.add(new THREE.Points(starGeo, starMat))

    /* ── Neural network nodes ── */
    const nodePositions = []
    const nodeCount = 40
    const nodeGroup = new THREE.Group()
    scene.add(nodeGroup)

    const baseMat = new THREE.MeshBasicMaterial({ color: 0x6366f1 })
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.18 })

    for (let i = 0; i < nodeCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.random() * Math.PI
      const r     = 14 + Math.random() * 20
      const pos   = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      )
      nodePositions.push(pos)
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), baseMat.clone())
      sphere.position.copy(pos)
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 8), glowMat.clone())
      halo.position.copy(pos)
      nodeGroup.add(sphere, halo)
    }

    /* ── Edges ── */
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x4f46e5, transparent: true, opacity: 0.22 })
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        if (nodePositions[i].distanceTo(nodePositions[j]) < 16) {
          const geo = new THREE.BufferGeometry().setFromPoints([nodePositions[i], nodePositions[j]])
          nodeGroup.add(new THREE.Line(geo, edgeMat.clone()))
        }
      }
    }

    /* ── Floating data particles ── */
    const particleCount = 300
    const pGeo = new THREE.BufferGeometry()
    const pPos = new Float32Array(particleCount * 3)
    const pSpeeds = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      pPos[i*3]   = (Math.random()-0.5)*80
      pPos[i*3+1] = (Math.random()-0.5)*80
      pPos[i*3+2] = (Math.random()-0.5)*80
      pSpeeds[i*3]   = (Math.random()-0.5)*0.008
      pSpeeds[i*3+1] = (Math.random()-0.5)*0.008
      pSpeeds[i*3+2] = (Math.random()-0.5)*0.008
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
    const pMat = new THREE.PointsMaterial({ color: 0x38bdf8, size: 0.18, transparent: true, opacity: 0.5 })
    const particles = new THREE.Points(pGeo, pMat)
    scene.add(particles)

    /* ── Pulsing ring ── */
    const ringGeo = new THREE.TorusGeometry(22, 0.12, 6, 100)
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.35 })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = Math.PI / 3
    scene.add(ring)

    /* ── Mouse parallax ── */
    const mouse = { x: 0, y: 0 }
    const onMouseMove = (e) => {
      mouse.x = (e.clientX / window.innerWidth  - 0.5) * 2
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', onMouseMove)

    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    let t = 0
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate)
      t += 0.004
      nodeGroup.rotation.y = t * 0.18
      nodeGroup.rotation.x = Math.sin(t * 0.12) * 0.3
      ring.rotation.z = t * 0.09
      ring.material.opacity = 0.18 + 0.17 * Math.sin(t * 2)
      const pos = pGeo.attributes.position.array
      for (let i = 0; i < particleCount; i++) {
        pos[i*3]   += pSpeeds[i*3]
        pos[i*3+1] += pSpeeds[i*3+1]
        pos[i*3+2] += pSpeeds[i*3+2]
        for (let ax = 0; ax < 3; ax++) {
          if (Math.abs(pos[i*3+ax]) > 40) pSpeeds[i*3+ax] *= -1
        }
      }
      pGeo.attributes.position.needsUpdate = true
      starMat.opacity = 0.45 + 0.15 * Math.sin(t * 1.5)
      camera.position.x += (mouse.x * 4 - camera.position.x) * 0.04
      camera.position.y += (-mouse.y * 3 - camera.position.y) * 0.04
      camera.lookAt(scene.position)
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  const handleEnter = () => {
    setExiting(true)
    setTimeout(onEnter, 650)
  }

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Enter' || e.key === ' ') handleEnter() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden transition-opacity duration-700 ${visible && !exiting ? 'opacity-100' : 'opacity-0'}`}
      style={{ background: 'radial-gradient(ellipse at 50% 60%, #0e0b2c 0%, #050811 100%)' }}
    >
      <div ref={mountRef} className="absolute inset-0" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 55%, rgba(99,102,241,0.13) 0%, transparent 70%)' }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 40% 30% at 50% 52%, rgba(56,189,248,0.07) 0%, transparent 70%)' }} />

      <div className="relative z-10 flex flex-col items-center gap-7 select-none px-6 text-center">
        <div className="relative w-28 h-28">
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500/40" style={{ animation: 'spin 8s linear infinite' }} />
          <div className="absolute inset-3 rounded-full border border-cyan-400/30" style={{ animation: 'spin 5s linear infinite reverse' }} />
          <div className="absolute inset-6 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 opacity-80 blur-sm" />
          <div className="absolute inset-7 rounded-full flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-white" stroke="currentColor" strokeWidth={1.4}>
              <path d="M3 12h4l3-8 4 16 3-8h4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none"
            style={{ background: 'linear-gradient(135deg, #e0e7ff 10%, #818cf8 45%, #38bdf8 80%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 32px rgba(99,102,241,0.6))' }}>
            AI Graph Finder
          </h1>
          <div className="flex items-center justify-center gap-2">
            <span className="text-lg md:text-2xl font-bold text-indigo-300/80 tracking-widest">2.0</span>
            <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500/30 to-cyan-500/20 border border-indigo-400/40 text-cyan-300 tracking-widest uppercase">PRO</span>
          </div>
        </div>

        <p className="text-slate-300/70 text-base md:text-lg font-light max-w-md leading-relaxed">
          Visualize · Analyze · Understand · Export<br/>
          <span className="text-slate-400/50 text-sm">Powered by built-in AI — no API key required</span>
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {[{icon:'⚡',label:'Built-in AI'},{icon:'📊',label:'2D + 3D Graphs'},{icon:'📷',label:'Camera Scanner'},{icon:'🔮',label:'Zero Setup'}].map(({icon,label}) => (
            <span key={label} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-900/70 border border-indigo-500/25 text-slate-300 backdrop-blur-sm shadow-lg shadow-indigo-500/10">
              <span>{icon}</span>{label}
            </span>
          ))}
        </div>

        <button
          onClick={handleEnter}
          className="group relative mt-2 px-10 py-4 rounded-2xl font-bold text-base md:text-lg text-white overflow-hidden transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-transparent"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1 50%, #0ea5e9)', boxShadow: '0 0 32px rgba(99,102,241,0.55), 0 4px 24px rgba(0,0,0,0.5)' }}
        >
          <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)' }} />
          <span className="relative flex items-center gap-2">
            Launch Studio
            <svg className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </button>

        <p className="text-slate-600 text-xs mt-1 animate-pulse">Press Enter or Space to continue</p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0% { background-position:-200% 0; } 100% { background-position:200% 0; } }
      `}</style>
    </div>
  )
}
