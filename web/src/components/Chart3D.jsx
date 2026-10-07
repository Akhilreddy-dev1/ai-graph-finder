import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export default function Chart3D({
  data,
  physicsOpts = { autoRotate: true, showStems: true, showCurve: true, showGrid: true },
  selectedIndex = null,
  onNodeClick,
  cameraCoords = null,
  onCameraChange,
}) {
  const mountRef = useRef(null)
  const clickHandlerRef = useRef(onNodeClick)
  clickHandlerRef.current = onNodeClick

  const selectedIndexRef = useRef(selectedIndex)
  selectedIndexRef.current = selectedIndex

  const cameraRef = useRef(null)
  const controlsRef = useRef(null)
  const targetCamPosRef = useRef(null)
  const targetCamLookAtRef = useRef(null)

  // Handle dynamic external camera coordinate updates
  useEffect(() => {
    if (!cameraCoords) return

    if (cameraCoords.position) {
      targetCamPosRef.current = new THREE.Vector3(
        cameraCoords.position.x,
        cameraCoords.position.y,
        cameraCoords.position.z
      )
    }

    if (cameraCoords.target) {
      targetCamLookAtRef.current = new THREE.Vector3(
        cameraCoords.target.x,
        cameraCoords.target.y,
        cameraCoords.target.z
      )
    }
  }, [cameraCoords])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let width = mount.clientWidth || window.innerWidth
    let height = mount.clientHeight || window.innerHeight

    // ── Scene & Camera ──
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0d1117)

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    const initialPos = cameraCoords?.position || { x: 28, y: 22, z: 34 }
    camera.position.set(initialPos.x, initialPos.y, initialPos.z)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    // ── OrbitControls ──
    // Properly configured with damping and target synchronisation
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.maxDistance = 140
    controls.minDistance = 6
    const initialTarget = cameraCoords?.target || { x: 0, y: 0, z: 0 }
    controls.target.set(initialTarget.x, initialTarget.y, initialTarget.z)
    controls.update()
    controlsRef.current = controls

    // ── Lighting ──
    const ambientLight = new THREE.AmbientLight(0xf0f6fc, 0.8)
    scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
    dirLight.position.set(25, 40, 20)
    scene.add(dirLight)

    const fillLight = new THREE.DirectionalLight(0x58a6ff, 0.4)
    fillLight.position.set(-20, -10, -20)
    scene.add(fillLight)

    // ── Grid Helper ──
    if (physicsOpts?.showGrid !== false) {
      const gridHelper = new THREE.GridHelper(32, 16, 0x30363d, 0x161b22)
      gridHelper.position.y = -8
      scene.add(gridHelper)
    }

    const plotGroup = new THREE.Group()
    scene.add(plotGroup)

    // ── Data Normalization ──
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

    // Restrained technical palette: cyan, mint, amber, steel, and ice.
    const categoryColors = [0x22d3ee, 0x34d399, 0xf2b84b, 0x94a3b8, 0x7dd3fc]

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
      sphere.userData = { index: i, rawX: xVals[i], rawY: yVals[i], rawZ: zVals[i] }
      plotGroup.add(sphere)
      sphereMeshes.push(sphere)

      if (isSelected) {
        const ringGeo = new THREE.RingGeometry(0.85, 1.05, 24)
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
        const ring = new THREE.Mesh(ringGeo, ringMat)
        ring.position.copy(vec)
        ring.lookAt(camera.position)
        plotGroup.add(ring)
      }

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
      const linkMaterial = new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.7 })
      data.links.forEach((link) => {
        const source = pointById.get(String(link.source))
        const target = pointById.get(String(link.target))
        if (!source || !target) return
        const geometry = new THREE.BufferGeometry().setFromPoints([source, target])
        plotGroup.add(new THREE.Line(geometry, linkMaterial))
      })
    }
    // Spline curve
    if (physicsOpts?.showCurve !== false && points3D.length > 1) {
      const curve = new THREE.CatmullRomCurve3(points3D)
      const tubeGeo = new THREE.TubeGeometry(curve, 72, 0.12, 8, false)
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0x22d3ee,
        roughness: 0.4,
        metalness: 0.1,
      })
      const tube = new THREE.Mesh(tubeGeo, tubeMat)
      plotGroup.add(tube)
    }

    // ── Raycasting for Node Selection ──
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    let mouseDownPos = { x: 0, y: 0 }

    const onPointerDown = (e) => {
      mouseDownPos = { x: e.clientX, y: e.clientY }
    }

    const onPointerUp = (e) => {
      const dist = Math.hypot(e.clientX - mouseDownPos.x, e.clientY - mouseDownPos.y)
      if (dist < 5) {
        const rect = renderer.domElement.getBoundingClientRect()
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
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

    const dom = renderer.domElement
    dom.addEventListener('pointerdown', onPointerDown)
    dom.addEventListener('pointerup', onPointerUp)

    // Notify camera coordinates change
    let lastReportTime = 0
    controls.addEventListener('change', () => {
      const now = performance.now()
      if (onCameraChange && now - lastReportTime > 80) {
        lastReportTime = now
        onCameraChange({
          position: {
            x: Number(camera.position.x.toFixed(2)),
            y: Number(camera.position.y.toFixed(2)),
            z: Number(camera.position.z.toFixed(2)),
          },
          target: {
            x: Number(controls.target.x.toFixed(2)),
            y: Number(controls.target.y.toFixed(2)),
            z: Number(controls.target.z.toFixed(2)),
          },
        })
      }
    })

    const onResize = () => {
      if (!mount) return
      width = mount.clientWidth
      height = mount.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    window.addEventListener('resize', onResize)

    // ── Render & Animation Loop ──
    let animId
    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Smooth interpolation when dynamic camera coordinates are provided
      if (targetCamPosRef.current) {
        camera.position.lerp(targetCamPosRef.current, 0.08)
        if (camera.position.distanceTo(targetCamPosRef.current) < 0.05) {
          camera.position.copy(targetCamPosRef.current)
          targetCamPosRef.current = null
        }
      }

      if (targetCamLookAtRef.current) {
        controls.target.lerp(targetCamLookAtRef.current, 0.08)
        if (controls.target.distanceTo(targetCamLookAtRef.current) < 0.05) {
          controls.target.copy(targetCamLookAtRef.current)
          targetCamLookAtRef.current = null
        }
      }

      // Auto-rotation handling
      if (physicsOpts?.autoRotate && !targetCamPosRef.current) {
        plotGroup.rotation.y += 0.0025
      }

      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      dom.removeEventListener('pointerdown', onPointerDown)
      dom.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('resize', onResize)
      controls.dispose()
      if (mount.contains(dom)) mount.removeChild(dom)
      renderer.dispose()
    }
  }, [
    data,
    physicsOpts?.autoRotate,
    physicsOpts?.showStems,
    physicsOpts?.showCurve,
    physicsOpts?.showGrid,
    selectedIndex,
  ])

  return (
    <div className="w-full h-full relative" style={{ cursor: 'grab' }}>
      <div ref={mountRef} className="w-full h-full absolute inset-0" />
    </div>
  )
}
