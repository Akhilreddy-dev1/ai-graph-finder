import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

export default function Chart3D({ data }) {
  const mountRef = useRef(null)
  const [autoRotate, setAutoRotate] = useState(true)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const width = mount.clientWidth || 600
    const height = mount.clientHeight || 420

    // Scene, Camera, Renderer
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0e1a)

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(30, 24, 38)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
    scene.add(ambientLight)

    const pointLight = new THREE.PointLight(0x818cf8, 2.5, 100)
    pointLight.position.set(20, 30, 20)
    scene.add(pointLight)

    const pointLightCyan = new THREE.PointLight(0x06b6d4, 2.0, 100)
    pointLightCyan.position.set(-20, -10, -20)
    scene.add(pointLightCyan)

    // Grid helper
    const gridHelper = new THREE.GridHelper(30, 15, 0x6366f1, 0x1e293b)
    gridHelper.position.y = -8
    scene.add(gridHelper)

    // Group for plot elements (for rotation)
    const plotGroup = new THREE.Group()
    scene.add(plotGroup)

    // Normalize coordinates to fit nicely in 3D space (-12 to +12)
    const xVals = data?.x || [1, 2, 3, 4, 5, 6, 7, 8]
    const yVals = data?.y || [2, 5, 3, 8, 7, 12, 10, 15]
    const zVals = data?.z && data.z.length === xVals.length
      ? data.z
      : yVals.map((y, i) => y * Math.sin(i * 0.8))

    const minX = Math.min(...xVals), maxX = Math.max(...xVals)
    const minY = Math.min(...yVals), maxY = Math.max(...yVals)
    const minZ = Math.min(...zVals), maxZ = Math.max(...zVals)

    const scale = (val, min, max, span = 18) => {
      if (max === min) return 0
      return ((val - min) / (max - min) - 0.5) * span
    }

    const points3D = []
    const sphereGeo = new THREE.SphereGeometry(0.55, 16, 16)

    for (let i = 0; i < xVals.length; i++) {
      const px = scale(xVals[i], minX, maxX, 18)
      const py = scale(yVals[i], minY, maxY, 14)
      const pz = scale(zVals[i], minZ, maxZ, 18)
      const vec = new THREE.Vector3(px, py, pz)
      points3D.push(vec)

      // Color gradient from cyan to purple
      const color = new THREE.Color().setHSL(0.55 + (i / xVals.length) * 0.25, 0.9, 0.55)
      const sphereMat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.2,
        metalness: 0.8,
        emissive: color,
        emissiveIntensity: 0.35,
      })
      const sphere = new THREE.Mesh(sphereGeo, sphereMat)
      sphere.position.copy(vec)
      plotGroup.add(sphere)

      // Vertical stem drop lines to floor
      const stemGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(px, py, pz),
        new THREE.Vector3(px, -8, pz),
      ])
      const stemMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.25,
      })
      const stem = new THREE.Line(stemGeo, stemMat)
      plotGroup.add(stem)
    }

    // Connect points with a smooth 3D glowing spline curve
    if (points3D.length > 1) {
      const curve = new THREE.CatmullRomCurve3(points3D)
      const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.18, 8, false)
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0x818cf8,
        emissive: 0x4f46e5,
        emissiveIntensity: 0.4,
        roughness: 0.3,
      })
      const tube = new THREE.Mesh(tubeGeo, tubeMat)
      plotGroup.add(tube)
    }

    // Background floating particle stars
    const particleCount = 120
    const particleGeo = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 80
      positions[i + 1] = (Math.random() - 0.5) * 60
      positions[i + 2] = (Math.random() - 0.5) * 80
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const particleMat = new THREE.PointsMaterial({
      color: 0x818cf8,
      size: 0.4,
      transparent: true,
      opacity: 0.4,
    })
    const particleSystem = new THREE.Points(particleGeo, particleMat)
    scene.add(particleSystem)

    // Mouse Interaction for rotation & tilt
    let isDragging = false
    let prevMousePos = { x: 0, y: 0 }

    const onMouseDown = (e) => {
      isDragging = true
      prevMousePos = { x: e.clientX, y: e.clientY }
    }

    const onMouseMove = (e) => {
      if (!isDragging) return
      const deltaX = e.clientX - prevMousePos.x
      const deltaY = e.clientY - prevMousePos.y
      plotGroup.rotation.y += deltaX * 0.008
      plotGroup.rotation.x += deltaY * 0.008
      prevMousePos = { x: e.clientX, y: e.clientY }
    }

    const onMouseUp = () => {
      isDragging = false
    }

    const onWheel = (e) => {
      e.preventDefault()
      camera.position.z = Math.max(12, Math.min(80, camera.position.z + e.deltaY * 0.03))
    }

    const dom = renderer.domElement
    dom.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    dom.addEventListener('wheel', onWheel, { passive: false })

    // Resize handler
    const onResize = () => {
      if (!mount) return
      const w = mount.clientWidth
      const h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    // Animation Loop
    let animId
    const animate = () => {
      animId = requestAnimationFrame(animate)
      if (autoRotate && !isDragging) {
        plotGroup.rotation.y += 0.004
      }
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      dom.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      dom.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', onResize)
      if (mount.contains(dom)) mount.removeChild(dom)
      renderer.dispose()
    }
  }, [data, autoRotate])

  return (
    <div className="relative w-full h-full min-h-[380px] rounded-xl overflow-hidden glass-card">
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
            autoRotate
              ? 'bg-indigo-600/80 border-indigo-400 text-white shadow-sm'
              : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
          }`}
        >
          {autoRotate ? 'Auto-Rotate ON' : 'Auto-Rotate OFF'}
        </button>
      </div>
      <div className="absolute bottom-3 left-3 z-10 text-[11px] text-slate-400 pointer-events-none bg-slate-900/60 backdrop-blur-sm px-2.5 py-1 rounded-md border border-slate-800">
        Click & drag to rotate • Scroll to zoom
      </div>
      <div ref={mountRef} className="w-full h-full min-h-[380px]" />
    </div>
  )
}
