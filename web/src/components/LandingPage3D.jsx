import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import {
  ArrowRight,
  Box,
  CheckCircle2,
  Cloud,
  GitBranch,
  LineChart,
  Network,
  Rocket,
  Server,
  Sparkles,
} from 'lucide-react'

const GITHUB_URL = 'https://github.com/Akhilreddy-dev1/ai-graph-finder'

export default function LandingPage3D({ onEnter }) {
  const mountRef = useRef(null)
  const frameRef = useRef(null)
  const rendererRef = useRef(null)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return undefined
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(55, el.clientWidth / el.clientHeight, 0.1, 1000)
    camera.position.set(0, 1, 28)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(el.clientWidth, el.clientHeight)
    el.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const group = new THREE.Group()
    scene.add(group)
    const nodes = []
    const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0x8b7cff })
    const glowMaterial = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.16 })
    for (let i = 0; i < 42; i += 1) {
      const angle = (i / 42) * Math.PI * 2
      const radius = 6 + (i % 5) * 1.15
      const position = new THREE.Vector3(
        Math.cos(angle * 1.7) * radius,
        Math.sin(angle * 2.1) * radius * 0.55,
        (i % 7 - 3) * 1.5
      )
      nodes.push(position)
      const node = new THREE.Mesh(new THREE.SphereGeometry(i % 6 === 0 ? 0.3 : 0.14, 12, 12), nodeMaterial.clone())
      node.position.copy(position)
      group.add(node)
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.62, 10, 10), glowMaterial.clone())
      glow.position.copy(position)
      group.add(glow)
    }
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x4f46e5, transparent: true, opacity: 0.28 })
    nodes.forEach((source, index) => {
      nodes.slice(index + 1).forEach((target) => {
        if (source.distanceTo(target) < 5.7) {
          group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([source, target]), edgeMaterial.clone()))
        }
      })
    })
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(9, 0.025, 8, 160),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.38 })
    )
    halo.rotation.x = Math.PI / 2.5
    group.add(halo)

    const pointer = { x: 0, y: 0 }
    const onPointerMove = (event) => {
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 2
      pointer.y = (event.clientY / window.innerHeight - 0.5) * 2
    }
    const onResize = () => {
      const width = el.clientWidth || window.innerWidth
      const height = el.clientHeight || window.innerHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('resize', onResize)
    let tick = 0
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate)
      tick += 0.003
      group.rotation.y = tick * 0.32
      group.rotation.x = Math.sin(tick * 0.8) * 0.08
      camera.position.x += (pointer.x * 2.4 - camera.position.x) * 0.025
      camera.position.y += (-pointer.y * 1.6 + 1 - camera.position.y) * 0.025
      camera.lookAt(0, 0, 0)
      renderer.render(scene, camera)
    }
    animate()
    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        setExiting(true)
        window.setTimeout(onEnter, 380)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onEnter])

  const enterStudio = () => {
    setExiting(true)
    window.setTimeout(onEnter, 380)
  }

  const features = [
    {
      icon: Network,
      title: 'Node-based visualization',
      copy: 'Explore relationships as a living 3D network with selectable nodes, links, coordinates, and local slope insights.',
      tone: 'cyan',
    },
    {
      icon: Server,
      title: 'FastAPI intelligence',
      copy: 'A production-ready API powers graph analysis, conversational tool use, image digitization, and resilient fallback math.',
      tone: 'purple',
    },
    {
      icon: Cloud,
      title: 'Cloud-ready by default',
      copy: 'GitHub Pages and Render deployment workflows keep the frontend and backend connected from commit to production.',
      tone: 'green',
    },
  ]

  return (
    <motion.div
      className={`landing-page fixed inset-0 z-50 overflow-y-auto ${exiting ? 'is-exiting' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 0.38 }}
    >
      <div ref={mountRef} className="landing-page-canvas" />
      <div className="landing-page-noise" />
      <nav className="landing-page-nav">
        <div className="landing-page-brand">
          <span className="landing-page-brand-mark"><Sparkles size={15} /></span>
          <span>AI Graph Finder <small>2.0 PRO</small></span>
        </div>
        <div className="landing-page-nav-actions">
          <span className="landing-page-live"><i /> LIVE GRAPH ENGINE</span>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="landing-page-github">
            <GitBranch size={15} /> GitHub
          </a>
        </div>
      </nav>

      <main>
        <section className="landing-page-hero">
          <motion.div
            className="landing-page-copy"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            <div className="landing-page-kicker"><span /> SPATIAL ANALYTICS / 02.0</div>
            <h1>Navigate your<br /><em>commands</em> in 3D.</h1>
            <p>Turn raw coordinates and complex relationships into an explorable visual system. Analyze, digitize, and build graphs with an AI assistant that understands the shape of your data.</p>
            <div className="landing-page-actions">
              <button onClick={enterStudio} className="landing-page-primary">
                Open graph studio <ArrowRight size={17} />
              </button>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="landing-page-secondary">
                <GitBranch size={16} /> View on GitHub
              </a>
            </div>
            <div className="landing-page-proof">
              <span><CheckCircle2 size={13} /> No API key required</span>
              <span><CheckCircle2 size={13} /> 2D + 3D workflows</span>
              <span><CheckCircle2 size={13} /> Mobile ready</span>
            </div>
          </motion.div>

          <motion.div
            className="landing-page-visual"
            initial={{ opacity: 0, scale: 0.92, x: 24 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.28 }}
          >
            <div className="landing-page-visual-grid" />
            <div className="landing-page-visual-top"><span>NETWORK / RENDER_03</span><b>● STREAMING</b></div>
            <div className="landing-page-visual-center"><Box size={17} /><span>42 NODES</span></div>
            <div className="landing-page-visual-bottom"><span>LIVE TOPOLOGY</span><span>DRAG TO EXPLORE ↗</span></div>
          </motion.div>
        </section>

        <section className="landing-page-features">
          <motion.div
            className="landing-page-section-heading"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span>BUILT FOR CLARITY</span>
            <h2>From signal to <em>structure.</em></h2>
          </motion.div>
          <div className="landing-page-feature-grid">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.article
                  key={feature.title}
                  className={`landing-page-feature landing-page-feature-${feature.tone}`}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className="landing-page-feature-icon"><Icon size={19} /></div>
                  <span className="landing-page-feature-index">0{index + 1}</span>
                  <h3>{feature.title}</h3>
                  <p>{feature.copy}</p>
                  <ArrowRight className="landing-page-feature-arrow" size={17} />
                </motion.article>
              )
            })}
          </div>
        </section>
      </main>
      <footer className="landing-page-footer">
        <span>AI GRAPH FINDER <b>×</b> BUILT FOR EXPLORATION</span>
        <button onClick={enterStudio}><Rocket size={13} /> Enter workspace</button>
      </footer>
    </motion.div>
  )
}
