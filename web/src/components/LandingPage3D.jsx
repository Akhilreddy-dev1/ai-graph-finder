
import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { motion } from 'framer-motion'
import {
  Network,
  Server,
  Cloud,
  ChevronDown,
  ArrowRight,
  Zap,
  Globe,
  Cpu,
} from 'lucide-react'

function GithubIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  )
}

/* ═══════════════════════════════════════════════════
   THREE.JS GRAPH CANVAS — floating nodes + glow lines
═══════════════════════════════════════════════════ */
function GraphCanvas() {
  const mountRef = useRef(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const W = el.clientWidth || window.innerWidth
    const H = el.clientHeight || window.innerHeight

    /* Scene / Camera / Renderer */
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 1000)
    camera.position.set(0, 0, 55)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H)
    renderer.setClearColor(0x000000, 0)
    el.appendChild(renderer.domElement)

    /* --- Deep starfield --- */
    const starGeo = new THREE.BufferGeometry()
    const starArr = new Float32Array(2400 * 3)
    for (let i = 0; i < starArr.length; i++) starArr[i] = (Math.random() - 0.5) * 500
    starGeo.setAttribute('position', new THREE.BufferAttribute(starArr, 3))
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.22, transparent: true, opacity: 0.35 })
    scene.add(new THREE.Points(starGeo, starMat))

    /* --- Build nodes --- */
    const NODE_COUNT = 55
    const nodeGroup = new THREE.Group()
    scene.add(nodeGroup)

    const positions = []
    // Palette: muted blue, violet, cyan
    const palette = [0x6366f1, 0x818cf8, 0x38bdf8, 0xa78bfa, 0x7dd3fc, 0xc4b5fd]

    const nodeMeshes = []
    for (let i = 0; i < NODE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      const r     = 12 + Math.random() * 22
      const pos   = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      )
      positions.push(pos)

      const radius = 0.25 + Math.random() * 0.6
      const col    = palette[Math.floor(Math.random() * palette.length)]

      // Core sphere
      const mat = new THREE.MeshBasicMaterial({ color: col })
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 14), mat)
      mesh.position.copy(pos)
      // Store for hover / animation
      mesh.userData = { origY: pos.y, phase: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() * 0.8 }
      nodeGroup.add(mesh)
      nodeMeshes.push(mesh)

      // Glow halo
      const haloMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.18 })
      const halo = new THREE.Mesh(new THREE.SphereGeometry(radius * 2.8, 10, 10), haloMat)
      halo.position.copy(pos)
      nodeGroup.add(halo)
    }

    /* --- Glowing edges using LineSegments with per-vertex color --- */
    const edgePositions = []
    const edgeColors    = []
    const CONNECT_DIST  = 17

    const hexToRgb = (hex) => ({
      r: ((hex >> 16) & 255) / 255,
      g: ((hex >> 8)  & 255) / 255,
      b: (hex & 255) / 255,
    })

    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        if (positions[i].distanceTo(positions[j]) < CONNECT_DIST) {
          edgePositions.push(positions[i].x, positions[i].y, positions[i].z)
          edgePositions.push(positions[j].x, positions[j].y, positions[j].z)
          // Color: gradient from blue to purple
          const c1 = hexToRgb(0x6366f1)
          const c2 = hexToRgb(0x38bdf8)
          edgeColors.push(c1.r, c1.g, c1.b, c2.r, c2.g, c2.b)
        }
      }
    }
    const edgeGeo = new THREE.BufferGeometry()
    edgeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(edgePositions), 3))
    edgeGeo.setAttribute('color',    new THREE.BufferAttribute(new Float32Array(edgeColors),    3))
    const edgeMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.35 })
    nodeGroup.add(new THREE.LineSegments(edgeGeo, edgeMat))

    /* --- Outer slow-pulse rings --- */
    const addRing = (r, col, tilt) => {
      const geo = new THREE.TorusGeometry(r, 0.12, 6, 120)
      const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.25 })
      const m   = new THREE.Mesh(geo, mat)
      m.rotation.x = tilt
      scene.add(m)
      return m
    }
    const ring1 = addRing(30, 0x6366f1, Math.PI / 3.5)
    const ring2 = addRing(36, 0x38bdf8, Math.PI / 1.8)

    /* --- Mouse parallax --- */
    const mouse = { x: 0, y: 0 }
    const onMouseMove = (e) => {
      mouse.x = (e.clientX / window.innerWidth  - 0.5) * 2
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', onMouseMove)

    /* --- Resize --- */
    const onResize = () => {
      const w = el.clientWidth || window.innerWidth
      const h = el.clientHeight || window.innerHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    /* --- Animate --- */
    let t = 0
    let animId
    const animate = () => {
      animId = requestAnimationFrame(animate)
      t += 0.006

      // Group slow rotation
      nodeGroup.rotation.y = t * 0.12
      nodeGroup.rotation.x = Math.sin(t * 0.07) * 0.12

      // Individual node float
      nodeMeshes.forEach(m => {
        m.position.y = m.userData.origY + Math.sin(t * m.userData.speed + m.userData.phase) * 0.6
      })

      // Ring pulse
      ring1.rotation.z = t * 0.08
      ring1.material.opacity = 0.15 + 0.12 * Math.sin(t * 1.4)
      ring2.rotation.y = -t * 0.06
      ring2.material.opacity = 0.12 + 0.1 * Math.sin(t * 1.1 + 1)

      // Camera parallax
      camera.position.x += (mouse.x * 5 - camera.position.x) * 0.04
      camera.position.y += (-mouse.y * 4 - camera.position.y) * 0.04
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} className="absolute inset-0" />
}

/* ═══════════════════════════════════════════════════
   FRAMER-MOTION VARIANTS
═══════════════════════════════════════════════════ */
const fadeUp = {
  hidden:  { opacity: 0, y: 36 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1], delay },
  }),
}

const fadeIn = {
  hidden:  { opacity: 0 },
  visible: (delay = 0) => ({
    opacity: 1,
    transition: { duration: 0.7, ease: 'easeOut', delay },
  }),
}

/* ═══════════════════════════════════════════════════
   BENTO FEATURE CARD
═══════════════════════════════════════════════════ */
function FeatureCard({ icon: Icon, title, desc, accent, delay, tall = false }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      custom={delay}
      viewport={{ once: true, margin: '-80px' }}
      className={`relative overflow-hidden rounded-2xl p-6 flex flex-col gap-3 ${tall ? 'row-span-2' : ''}`}
      style={{
        background: 'rgba(15, 17, 30, 0.72)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(99, 102, 241, 0.18)',
      }}
      whileHover={{ borderColor: 'rgba(99,102,241,0.45)', scale: 1.015, transition: { duration: 0.2 } }}
    >
      {/* Background glow */}
      <div
        className="absolute -top-8 -left-8 w-40 h-40 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: accent }}
      />

      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${accent}22`, border: `1px solid ${accent}44` }}
      >
        <Icon className="w-5 h-5" style={{ color: accent }} />
      </div>
      <h3 className="text-base font-semibold text-white leading-snug">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════
   MAIN LANDING PAGE
═══════════════════════════════════════════════════ */
export default function LandingPage3D({ onEnter }) {
  const [visible, setVisible]   = useState(false)
  const [exiting, setExiting]   = useState(false)
  const containerRef            = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && document.activeElement === document.body) {
        handleEnter()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleEnter = () => {
    setExiting(true)
    setTimeout(onEnter, 480)
  }

  const scrollToFeatures = () => {
    containerRef.current?.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' })
  }

  const features = [
    {
      icon: Network,
      title: 'Node-Based Visualization',
      desc:  'Explore your data as a live, interactive 3D node graph. Pan, rotate, and zoom with mouse controls. Every point tells a story.',
      accent: '#6366f1',
      delay:  0.05,
    },
    {
      icon: Server,
      title: 'FastAPI Backend Integration',
      desc:  'A production-grade Python FastAPI service powers the analytics engine — streaming real-time graph metadata with sub-100ms response.',
      accent: '#38bdf8',
      delay:  0.15,
    },
    {
      icon: Cloud,
      title: 'Automated Cloud Deployment',
      desc:  'One-click deploy to Render or any cloud via GitHub Actions CI/CD. Zero-config, fully automated, always live.',
      accent: '#a78bfa',
      delay:  0.25,
    },
    {
      icon: Zap,
      title: 'Built-in AI Analytics',
      desc:  'Query trends, regression equations, extrema, and forecasts in plain English. No external API key required.',
      accent: '#34d399',
      delay:  0.35,
    },
    {
      icon: Globe,
      title: 'Camera CV Digitizer',
      desc:  'Point your camera at any paper chart or paste a screenshot — the vision engine extracts numerical data in seconds.',
      accent: '#f59e0b',
      delay:  0.05,
    },
    {
      icon: Cpu,
      title: '2D & 3D Studio',
      desc:  'Switch seamlessly between a Chart.js 2D canvas and a full Three.js 3D spatial canvas. Presets load in one click.',
      accent: '#fb7185',
      delay:  0.15,
    },
  ]

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{
        background: '#03040d',
        opacity: visible && !exiting ? 1 : 0,
        transition: 'opacity 0.45s ease',
      }}
    >
      {/* ── SECTION 1: HERO ── */}
      <section className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Full-bleed 3D canvas */}
        <GraphCanvas />

        {/* Subtle vignette / gradient overlay to push text forward */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(3,4,13,0.25) 0%, rgba(3,4,13,0.78) 100%)',
          }}
        />
        <div
          className="absolute bottom-0 inset-x-0 h-32 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, #03040d)' }}
        />

        {/* ── HERO CONTENT ── */}
        <div className="relative z-10 flex flex-col items-center gap-7 px-6 text-center max-w-4xl">
          {/* Badge */}
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            custom={0.1}
          >
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase"
              style={{
                background: 'rgba(99,102,241,0.12)',
                border: '1px solid rgba(99,102,241,0.35)',
                color: '#818cf8',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"
              />
              Open Source · AI-Powered · Built with Three.js
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.2}
            className="text-5xl sm:text-7xl font-black tracking-tight leading-[1.05]"
            style={{
              background: 'linear-gradient(135deg, #ffffff 20%, #c7d2fe 50%, #60a5fa 80%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 40px rgba(99,102,241,0.4))',
            }}
          >
            Navigate Your<br />
            Commands in 3D
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.35}
            className="text-base sm:text-lg text-slate-400 max-w-xl leading-relaxed font-light"
          >
            Interactive 3D graph visualization meets AI analytics. Scan, explore, and
            understand any dataset — from a single canvas.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.5}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            {/* Primary: GitHub */}
            <a
              href="https://github.com/Akhilreddy-dev1/ai-graph-finder"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                boxShadow: '0 0 28px rgba(99,102,241,0.55), 0 0 60px rgba(99,102,241,0.2), 0 4px 20px rgba(0,0,0,0.5)',
              }}
            >
              <GithubIcon className="w-4 h-4" />
              View on GitHub
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>

            {/* Secondary: Enter Studio */}
            <button
              onClick={handleEnter}
              className="group flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-105"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.14)',
                color: '#e2e8f0',
              }}
            >
              Launch Studio
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </motion.div>
        </div>

        {/* Scroll hint */}
        <motion.button
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          custom={1.1}
          onClick={scrollToFeatures}
          className="absolute bottom-8 flex flex-col items-center gap-1.5 opacity-50 hover:opacity-80 transition-opacity"
          style={{ color: '#94a3b8' }}
        >
          <span className="text-xs font-medium tracking-widest uppercase">Explore</span>
          <ChevronDown className="w-4 h-4 animate-bounce" />
        </motion.button>
      </section>

      {/* ── SECTION 2: FEATURES BENTO ── */}
      <section id="features" className="relative w-full max-w-6xl mx-auto px-6 pb-24 pt-16">
        {/* Section heading */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-12 space-y-3"
        >
          <span
            className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}
          >
            Capabilities
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Everything you need. Nothing you don't.
          </h2>
          <p className="text-slate-400 text-base max-w-xl mx-auto">
            A focused toolkit for spatial data exploration — built for developers, researchers, and analysts.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-auto">
          {features.map((f, i) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>

        {/* Footer CTA strip */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          custom={0.3}
          className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            onClick={handleEnter}
            className="px-8 py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:scale-105 hover:shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
              boxShadow: '0 0 28px rgba(99,102,241,0.4)',
            }}
          >
            Open Studio Workspace
          </button>
          <a
            href="https://github.com/Akhilreddy-dev1/ai-graph-finder"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3.5 rounded-xl font-semibold text-sm transition-all hover:scale-105"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.14)',
              color: '#e2e8f0',
            }}
          >
            ⭐ Star on GitHub
          </a>
        </motion.div>

        {/* Footer line */}
        <div className="mt-16 flex flex-col items-center gap-2 opacity-40">
          <div className="h-px w-48 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
          <p className="text-xs text-slate-500 font-mono">AI Graph Finder 2.0 PRO · Open Source MIT</p>
        </div>
      </section>
    </div>
  )
}
