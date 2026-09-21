
import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { ArrowRight, BarChart3, Box, Terminal, Camera } from 'lucide-react'

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
    const W = el.clientWidth, H = el.clientHeight
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000)
    camera.position.set(0, 0, 50)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H)
    renderer.setClearColor(0x0d1117, 1)
    el.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Grid plane
    const grid = new THREE.GridHelper(70, 35, 0x21262d, 0x161b22)
    grid.position.y = -14
    scene.add(grid)

    // Node network
    const nodePositions = []
    const nodeCount = 38
    const nodeGroup = new THREE.Group()
    scene.add(nodeGroup)

    const categoryColors = [0x58a6ff, 0x3fb950, 0xd29922, 0xa371f7, 0x79c0ff]
    const sphereGeo = new THREE.SphereGeometry(0.35, 12, 12)

    for (let i = 0; i < nodeCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const r = 10 + Math.random() * 16
      const pos = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta) * 0.7,
        r * Math.cos(phi)
      )
      nodePositions.push(pos)

      const mat = new THREE.MeshBasicMaterial({ color: categoryColors[i % categoryColors.length] })
      const sphere = new THREE.Mesh(sphereGeo, mat)
      sphere.position.copy(pos)
      nodeGroup.add(sphere)
    }

    // Edges
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x30363d, transparent: true, opacity: 0.5 })
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        if (nodePositions[i].distanceTo(nodePositions[j]) < 11) {
          const geo = new THREE.BufferGeometry().setFromPoints([nodePositions[i], nodePositions[j]])
          nodeGroup.add(new THREE.Line(geo, edgeMat))
        }
      }
    }

    // Particles
    const pCount = 140
    const pGeo = new THREE.BufferGeometry()
    const pPos = new Float32Array(pCount * 3)
    for (let i = 0; i < pCount * 3; i++) pPos[i] = (Math.random() - 0.5) * 80
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
    const pMat = new THREE.PointsMaterial({ color: 0x484f58, size: 0.3, transparent: true, opacity: 0.5 })
    scene.add(new THREE.Points(pGeo, pMat))

    const mouse = { x: 0, y: 0 }
    const onMouseMove = (e) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2
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
      t += 0.003
      nodeGroup.rotation.y = t * 0.15
      nodeGroup.rotation.x = Math.sin(t * 0.1) * 0.15
      camera.position.x += (mouse.x * 2.5 - camera.position.x) * 0.05
      camera.position.y += (-mouse.y * 2 - camera.position.y) * 0.05
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
    setTimeout(onEnter, 400)
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
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#0d1117] transition-opacity duration-500 ${
        visible && !exiting ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div ref={mountRef} className="absolute inset-0" />

      {/* Floating Center Hero Panel */}
      <div className="relative z-10 max-w-xl w-full mx-4 p-8 rounded-xl glass-panel text-center shadow-2xl border border-[#30363d]">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="mono text-xs px-2 py-0.5 rounded bg-[#21262d] text-[var(--accent)] border border-[#30363d]">
            DATA-VIZ PLATFORM 2.0
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#f0f6fc] mb-3">
          AI Graph Finder
        </h1>

        <p className="text-sm text-[#8b949e] max-w-md mx-auto mb-6 leading-relaxed">
          Full-spectrum 2D/3D graph digitization, spatial coordinates modeling, and statistical regression analytics.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          {[
            { icon: <Box className="w-3.5 h-3.5" />, label: '3D Spatial' },
            { icon: <BarChart3 className="w-3.5 h-3.5" />, label: '2D Studio' },
            { icon: <Camera className="w-3.5 h-3.5" />, label: 'CV Scanner' },
            { icon: <Terminal className="w-3.5 h-3.5" />, label: 'Analytics' },
          ].map((feature, i) => (
            <div
              key={i}
              className="p-2.5 rounded bg-[#161b22] border border-[#30363d] flex flex-col items-center gap-1 text-[11px] font-medium text-[#c9d1d9]"
            >
              <span className="text-[var(--accent)]">{feature.icon}</span>
              <span>{feature.label}</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleEnter}
          className="mono inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#238636] hover:bg-[#2ea043] active:bg-[#1a7f37] text-white text-xs font-semibold rounded-md transition-all shadow-md"
        >
          <span>Enter Workspace</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <div className="mono text-[10px] text-[#484f58] mt-4">
          Press <kbd className="px-1 py-0.5 rounded bg-[#21262d] border border-[#30363d] text-[#8b949e]">Enter</kbd> to launch
        </div>
      </div>
    </div>
  )
}
