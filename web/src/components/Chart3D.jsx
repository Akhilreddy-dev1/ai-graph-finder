
import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function Chart3D({
  data,
  physicsOpts = { autoRotate: true, showStems: true, showCurve: true, showGrid: true },
  selectedIndex = null,
  onNodeClick,
}) {
  const mountRef = useRef(null)
  const clickHandlerRef = useRef(onNodeClick)
  clickHandlerRef.current = onNodeClick

  const selectedIndexRef = useRef(selectedIndex)
  selectedIndexRef.current = selectedIndex

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let width = mount.clientWidth || window.innerWidth
    let height = mount.clientHeight || window.innerHeight

    // Scene & Camera
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0d1117)

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(28, 22, 34)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    // Lighting (neutral data-viz lighting)
    const ambientLight = new THREE.AmbientLight(0xf0f6fc, 0.8)
    scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
    dirLight.position.set(25, 40, 20)
    scene.add(dirLight)

    const fillLight = new THREE.DirectionalLight(0x58a6ff, 0.4)
    fillLight.position.set(-20, -10, -20)
    scene.add(fillLight)

    // Grid helper
    let gridHelper = null
    if (physicsOpts?.showGrid !== false) {
      gridHelper = new THREE.GridHelper(32, 16, 0x30363d, 0x161b22)
      gridHelper.position.y = -8
      scene.add(gridHelper)
    }

    const plotGroup = new THREE.Group()
    scene.add(plotGroup)

    // Parse Data
    const nodeGraph = Array.isArray(data?.nodes)
    const graphNodes = nodeGraph ? data.nodes : []
    const xVals = nodeGraph
      ? graphNodes.map((_, index) => Math.cos((index / Math.max(graphNodes.length, 1)) * Math.PI * 2) * 10)
      : (data?.x || [1, 2, 3, 4, 5, 6, 7, 8])
    const yVals = nodeGraph
      ? graphNodes.map((_, index) => Math.sin((index / Math.max(graphNodes.length, 1)) * Math.PI * 2) * 8)
      : (data?.y || [2, 5, 3, 8, 7, 12, 10, 15])
    const zVals = data?.z && data.z.length === xVals.length
      ? data.z
      : nodeGraph
        ? graphNodes.map((_, index) => ((index % 3) - 1) * 3)
        : yVals.map((y, i) => y * Math.sin(i * 0.8))

    const minX = Math.min(...xVals), maxX = Math.max(...xVals)
    const minY = Math.min(...yVals), maxY = Math.max(...yVals)
    const minZ = Math.min(...zVals), maxZ = Math.max(...zVals)

    const scale = (val, min, max, span = 20) => {
      if (max === min) return 0
      return ((val - min) / (max - min) - 0.5) * span
    }

    const points3D = []
    const sphereMeshes = []
    const sphereGeo = new THREE.SphereGeometry(0.55, 20, 20)

    // Muted palette categories: Slate Blue, Muted Teal, Soft Amber, Steel Gray
    const categoryColors = [0x58a6ff, 0x3fb950, 0xd29922, 0xa371f7, 0x79c0ff]

    for (let i = 0; i < xVals.length; i++) {
      const px = scale(xVals[i], minX, maxX, 20)
      const py = scale(yVals[i], minY, maxY, 14)
      const pz = scale(zVals[i], minZ, maxZ, 20)
      const vec = new THREE.Vector3(px, py, pz)
      points3D.push(vec)

      const isSelected = selectedIndexRef.current === i
      const baseColor = categoryColors[i % categoryColors.length]

      const sphereMat = new THREE.MeshStandardMaterial({
        color: isSelected ? 0xffffff : baseColor,
        roughness: 0.35,
        metalness: 0.25,
      })
      const sphere = new THREE.Mesh(sphereGeo, sphereMat)
      sphere.position.copy(vec)
      sphere.userData = { index: i, label: graphNodes[i]?.label }
      plotGroup.add(sphere)
      sphereMeshes.push(sphere)

      // Selection ring indicator
      if (isSelected) {
        const ringGeo = new THREE.RingGeometry(0.85, 1.05, 24)
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
        const ring = new THREE.Mesh(ringGeo, ringMat)
        ring.position.copy(vec)
        ring.lookAt(camera.position)
        plotGroup.add(ring)
      }

      // Vertical stem drop lines
      if (physicsOpts?.showStems !== false) {
        const stemGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(px, py, pz),
          new THREE.Vector3(px, -8, pz),
        ])
        const stemMat = new THREE.LineBasicMaterial({
          color: 0x30363d,
          transparent: true,
          opacity: 0.6,
        })
        const stem = new THREE.Line(stemGeo, stemMat)
        plotGroup.add(stem)
      }
    }

    if (nodeGraph && Array.isArray(data.links)) {
      const pointById = new Map(graphNodes.map((node, index) => [String(node.id), points3D[index]]))
      const linkMaterial = new THREE.LineBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.7 })
      data.links.forEach((link) => {
        const source = pointById.get(String(link.source))
        const target = pointById.get(String(link.target))
        if (!source || !target) return
        const geometry = new THREE.BufferGeometry().setFromPoints([source, target])
        plotGroup.add(new THREE.Line(geometry, linkMaterial))
      })
    }

    // Spline curve
    if (!nodeGraph && physicsOpts?.showCurve !== false && points3D.length > 1) {
      const curve = new THREE.CatmullRomCurve3(points3D)
      const tubeGeo = new THREE.TubeGeometry(curve, 72, 0.12, 8, false)
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0x58a6ff,
        roughness: 0.4,
        metalness: 0.1,
      })
      const tube = new THREE.Mesh(tubeGeo, tubeMat)
      plotGroup.add(tube)
    }

    // Raycasting for clicking nodes
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    let isDragging = false
    let dragDistance = 0
    let prevMousePos = { x: 0, y: 0 }
    let mouseDownPos = { x: 0, y: 0 }

    const getClientPoint = (e) => {
      const point = e.touches?.[0] || e.changedTouches?.[0] || e
      return { x: point.clientX, y: point.clientY }
    }

    const onPointerDown = (e) => {
      const point = getClientPoint(e)
      isDragging = true
      dragDistance = 0
      prevMousePos = point
      mouseDownPos = point
      dom.setPointerCapture?.(e.pointerId)
    }

    const onPointerMove = (e) => {
      if (!isDragging) return
      const point = getClientPoint(e)
      const deltaX = point.x - prevMousePos.x
      const deltaY = point.y - prevMousePos.y
      dragDistance += Math.abs(deltaX) + Math.abs(deltaY)
      plotGroup.rotation.y += deltaX * 0.006
      plotGroup.rotation.x += deltaY * 0.006
      prevMousePos = point
    }

    const onPointerUp = (e) => {
      const point = getClientPoint(e)
      isDragging = false
      // If it wasn't a significant drag, treat as click for node selection
      if (dragDistance < 6) {
        const rect = renderer.domElement.getBoundingClientRect()
        mouse.x = ((point.x - rect.left) / rect.width) * 2 - 1
        mouse.y = -((point.y - rect.top) / rect.height) * 2 + 1
        raycaster.setFromCamera(mouse, camera)
        const intersects = raycaster.intersectObjects(sphereMeshes, false)
        if (intersects.length > 0) {
          const clickedIndex = intersects[0].object.userData.index
          if (clickHandlerRef.current) {
            clickHandlerRef.current(clickedIndex)
          }
        }
      }
    }

    const onWheel = (e) => {
      e.preventDefault()
      camera.position.z = Math.max(14, Math.min(75, camera.position.z + e.deltaY * 0.03))
    }

    const dom = renderer.domElement
    dom.addEventListener('pointerdown', onPointerDown)
    dom.addEventListener('pointermove', onPointerMove)
    dom.addEventListener('pointerup', onPointerUp)
    dom.addEventListener('pointercancel', onPointerUp)
    dom.addEventListener('wheel', onWheel, { passive: false })

    const onResize = () => {
      if (!mount) return
      width = mount.clientWidth
      height = mount.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    window.addEventListener('resize', onResize)

    // Animation Loop
    let animId
    const animate = () => {
      animId = requestAnimationFrame(animate)
      if (physicsOpts?.autoRotate && !isDragging) {
        plotGroup.rotation.y += 0.0025
      }
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      dom.removeEventListener('pointerdown', onPointerDown)
      dom.removeEventListener('pointermove', onPointerMove)
      dom.removeEventListener('pointerup', onPointerUp)
      dom.removeEventListener('pointercancel', onPointerUp)
      dom.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', onResize)
      if (mount.contains(dom)) mount.removeChild(dom)
      renderer.dispose()
    }
  }, [data, physicsOpts?.autoRotate, physicsOpts?.showStems, physicsOpts?.showCurve, physicsOpts?.showGrid, selectedIndex])

  return (
    <div className="w-full h-full relative" style={{ cursor: 'grab' }}>
      <div ref={mountRef} className="w-full h-full absolute inset-0" />
    </div>
  )
}
