
import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Sparkles, ArrowRight, Box, LineChart, Camera, Bot } from 'lucide-react'

export default function LandingPage3D({ onEnter }) {
  const mountRef = useRef(null)
  const rendererRef = useRef(null)
  const frameRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const scene = new THREE.Scene()
    const W = el.clientWidth || window.innerWidth
    const H = el.clientHeight || window.innerHeight
    const camera = new THREE.PerspectiveCamera(65, W / H, 0.1, 1000)
    camera.position.set(0, 0, 52)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H)
    renderer.setClearColor(0x000000, 0)
    el.appendChild(renderer.domElement)
    rendererRef.current = renderer

    /* ── Star field ── */
    const starGeo = new THREE.BufferGeometry()
    const starCount = 2200
    const starPos = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount * 3; i++) {
      starPos[i] = (Math.random() - 0.5) * 450
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    const starMat = new THREE.PointsMaterial({
      color: 0xc7d2fe,
      size: 0.28,
      transparent: true,
      opacity: 0.65,
    })
    const starField = new THREE.Points(starGeo, starMat)
    scene.add(starField)

    /* ── Neural Network Nodes Group ── */
    const nodePositions = []
    const nodeCount = 48
    const nodeGroup = new THREE.Group()
    scene.add(nodeGroup)

    const nodeMat = new THREE.MeshBasicMaterial({ color: 0x6366f1 })
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      transparent: true,
      opacity: 0.25,
    })

    for (let i = 0; i < nodeCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const r = 13 + Math.random() * 22
      const pos = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      )
      nodePositions.push(pos)

      // Core sphere
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 10), nodeMat.clone())
      sphere.position.copy(pos)

      // Glow halo
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 10), glowMat.clone())
      halo.position.copy(pos)

      nodeGroup.add(sphere, halo)
    }

    /* ── Neural Synapse Connections ── */
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x4f46e5,
      transparent: true,
      opacity: 0.28,
    })
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        if (nodePositions[i].distanceTo(nodePositions[j]) < 17) {
          const geo = new THREE.BufferGeometry().setFromPoints([nodePositions[i], nodePositions[j]])
          nodeGroup.add(new THREE.Line(geo, edgeMat.clone()))
        }
      }
    }

    /* ── Floating Data Particles ── */
    const particleCount = 350
    const pGeo = new THREE.BufferGeometry()
    const pPos = new Float32Array(particleCount * 3)
    const pSpeeds = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 90
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 90
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 90
      pSpeeds[i * 3] = (Math.random() - 0.5) * 0.009
      pSpeeds[i * 3 + 1] = (Math.random() - 0.5) * 0.009
      pSpeeds[i * 3 + 2] = (Math.random() - 0.5) * 0.009
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
    const pMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.22,
      transparent: true,
      opacity: 0.6,
    })
    const particles = new THREE.Points(pGeo, pMat)
    scene.add(particles)

    /* ── Pulsing Orbital Rings ── */
    const ringGeo1 = new THREE.TorusGeometry(23, 0.14, 8, 120)
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.35,
    })
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1)
    ring1.rotation.x = Math.PI / 3
    scene.add(ring1)

    const ringGeo2 = new THREE.TorusGeometry(28, 0.09, 8, 120)
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.25,
    })
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2)
    ring2.rotation.y = Math.PI / 4
    scene.add(ring2)

    /* ── Mouse Parallax ── */
    const mouse = { x: 0, y: 0 }
    const onMouseMove = (e) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', onMouseMove)

    const onResize = () => {
      const w = el.clientWidth || window.innerWidth
      const h = el.clientHeight || window.innerHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    /* ── Animation Loop ── */
    let t = 0
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate)
      t += 0.004

      nodeGroup.rotation.y = t * 0.18
      nodeGroup.rotation.x = Math.sin(t * 0.12) * 0.25

      ring1.rotation.z = t * 0.09
      ring1.material.opacity = 0.2 + 0.18 * Math.sin(t * 2)

      ring2.rotation.x = -t * 0.07
      ring2.rotation.z = t * 0.05

      const pos = pGeo.attributes.position.array
      for (let i = 0; i < particleCount; i++) {
        pos[i * 3] += pSpeeds[i * 3]
        pos[i * 3 + 1] += pSpeeds[i * 3 + 1]
        pos[i * 3 + 2] += pSpeeds[i * 3 + 2]
        for (let ax = 0; ax < 3; ax++) {
          if (Math.abs(pos[i * 3 + ax]) > 45) pSpeeds[i * 3 + ax] *= -1
        }
      }
      pGeo.attributes.position.needsUpdate = true

      starMat.opacity = 0.45 + 0.2 * Math.sin(t * 1.5)

      camera.position.x += (mouse.x * 4.5 - camera.position.x) * 0.04
      camera.position.y += (-mouse.y * 3.5 - camera.position.y) * 0.04
      camera.lookAt(0, 0, 0)

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
    setTimeout(onEnter, 500)
  }

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Enter' || e.key === ' ') handleEnter()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden transition-opacity duration-500 ${
        visible && !exiting ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      style={{
        background: 'radial-gradient(ellipse at 50% 55%, #0e1126 0%, #060913 100%)',
      }}
    >
      {/* 3D Canvas Background */}
      <div ref={mountRef} className="absolute inset-0" />

      {/* Atmospheric Radial Shimmers */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 75% 60% at 50% 50%, rgba(99,102,241,0.16) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 45% 35% at 50% 52%, rgba(56,189,248,0.1) 0%, transparent 70%)',
        }}
      />

      {/* Hero Content Overlay */}
      <div className="relative z-10 flex flex-col items-center gap-6 select-none px-6 text-center max-w-2xl">
        {/* Animated AI Core Emblem */}
        <div className="relative w-24 h-24">
          <div
            className="absolute inset-0 rounded-full border-2 border-indigo-500/40"
            style={{ animation: 'landingSpin 9s linear infinite' }}
          />
          <div
            className="absolute inset-2.5 rounded-full border border-cyan-400/35"
            style={{ animation: 'landingSpin 6s linear infinite reverse' }}
          />
          <div className="absolute inset-5 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 opacity-75 blur-sm" />
          <div className="absolute inset-6 rounded-full flex items-center justify-center bg-[#0b1021]">
            <Sparkles className="w-6 h-6 text-cyan-300 animate-pulse" />
          </div>
        </div>

        {/* Title & Badge */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="mono text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-cyan-300 border border-indigo-400/30">
              NEXT-GEN VISUAL INTELLIGENCE
            </span>
          </div>

          <h1
            className="text-4xl sm:text-6xl font-black tracking-tight leading-none"
            style={{
              background: 'linear-gradient(135deg, #ffffff 20%, #a5b4fc 55%, #38bdf8 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 24px rgba(99,102,241,0.5))',
            }}
          >
            AI Graph Finder
          </h1>

          <div className="flex items-center justify-center gap-2">
            <span className="mono text-sm sm:text-base font-semibold text-indigo-300 tracking-wider">
              VERSION 2.0 PRO
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-slate-300/80 text-sm sm:text-base font-light max-w-lg leading-relaxed">
          Intelligent 2D & 3D Spatial Graph Modeling, Real-Time Computer Vision Digitizer, and Analytical Math Assistant.
          <br />
          <span className="text-slate-400/60 text-xs mono">
            Powered by built-in AI • Zero API key required
          </span>
        </p>

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {[
            { icon: <Box className="w-3.5 h-3.5 text-cyan-400" />, label: '3D Spatial Canvas' },
            { icon: <LineChart className="w-3.5 h-3.5 text-indigo-400" />, label: '2D Coordinates Studio' },
            { icon: <Camera className="w-3.5 h-3.5 text-emerald-400" />, label: 'Camera CV Scanner' },
            { icon: <Bot className="w-3.5 h-3.5 text-purple-400" />, label: 'Analytical Math AI' },
          ].map(({ icon, label }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-900/80 border border-indigo-500/25 text-slate-200 backdrop-blur-md shadow-lg shadow-indigo-500/10"
            >
              {icon}
              <span>{label}</span>
            </span>
          ))}
        </div>

        {/* CTA Launch Button */}
        <button
          onClick={handleEnter}
          className="group relative mt-2 px-9 py-3.5 rounded-xl font-bold text-sm sm:text-base text-white overflow-hidden transition-transform duration-200 hover:scale-105 active:scale-95 shadow-xl shadow-indigo-500/30"
          style={{
            background: 'linear-gradient(135deg, #4f46e5, #6366f1 50%, #0284c7)',
          }}
        >
          <span className="relative flex items-center gap-2">
            <span>Launch Studio Workspace</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
          </span>
        </button>

        <p className="mono text-[11px] text-slate-500 animate-pulse">
          Press Enter or Space to enter workspace
        </p>
      </div>

      <style>{`
        @keyframes landingSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
