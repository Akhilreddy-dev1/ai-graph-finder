/**
 * Math utility for calculating the derivative, tangent vector, and slope (m)
 * at any user-defined point (x, y) or (x, y, z) on a graph.
 */

/**
 * Calculates the slope (m) and tangent properties at a specific point or index.
 * @param {Object} options - { index?: number, x?: number, y?: number, z?: number }
 * @param {Object} graphData - { x: number[], y: number[], z?: number[], label?: string }
 * @returns {Object|null} Detailed slope, tangent, angle, and camera positioning result
 */
export function calculateSlopeAtPoint(options, graphData) {
  if (!graphData || !Array.isArray(graphData.x) || !Array.isArray(graphData.y) || graphData.x.length < 2) {
    return null
  }

  const { x, y } = graphData
  const is3D = Boolean(graphData.z && Array.isArray(graphData.z) && graphData.z.length === x.length)
  const z = is3D ? graphData.z : null
  const n = x.length

  // Determine target node index
  let idx = 0
  if (typeof options?.index === 'number' && options.index >= 0 && options.index < n) {
    idx = Math.round(options.index)
  } else if (typeof options?.x === 'number') {
    let minDistance = Infinity
    for (let i = 0; i < n; i++) {
      const dist = Math.abs(x[i] - options.x)
      if (dist < minDistance) {
        minDistance = dist
        idx = i
      }
    }
  }

  // Finite differences for numerical derivative
  let dx = 0
  let dy = 0
  let dz = 0

  if (idx === 0) {
    // Forward difference at start boundary
    dx = x[1] - x[0]
    dy = y[1] - y[0]
    dz = z ? (z[1] - z[0]) : 0
  } else if (idx === n - 1) {
    // Backward difference at end boundary
    dx = x[n - 1] - x[n - 2]
    dy = y[n - 1] - y[n - 2]
    dz = z ? (z[n - 1] - z[n - 2]) : 0
  } else {
    // Central difference for superior O(h^2) interior accuracy
    dx = x[idx + 1] - x[idx - 1]
    dy = y[idx + 1] - y[idx - 1]
    dz = z ? (z[idx + 1] - z[idx - 1]) : 0
  }

  // 2D derivative dy/dx
  const slopeXY = dx !== 0 ? dy / dx : Infinity
  const slopeXZ = (z && dx !== 0) ? dz / dx : null

  // Tangent angle in XY plane
  const angleRad = Math.atan(slopeXY)
  const angleDeg = (angleRad * 180) / Math.PI

  // 3D spatial tangent vector (normalized)
  const spatialLength = Math.sqrt(dx * dx + dy * dy + dz * dz)
  const tangentVector = spatialLength > 0
    ? [dx / spatialLength, dy / spatialLength, dz / spatialLength]
    : [1, 0, 0]

  // Spatial elevation / pitch angle
  const horizontalDist = Math.sqrt(dx * dx + dz * dz)
  const pitchDeg = (Math.atan2(dy, horizontalDist) * 180) / Math.PI

  // Point coordinates
  const px = x[idx]
  const py = y[idx]
  const pz = z ? z[idx] : 0

  // Calculate camera placement aligned perpendicular to the tangent vector
  const normalX = -tangentVector[2]
  const normalZ = tangentVector[0]
  const cameraDistance = 20.0

  const cameraPosition = {
    x: Number((px + normalX * cameraDistance + tangentVector[0] * 5.0).toFixed(2)),
    y: Number((py + 8.0).toFixed(2)),
    z: Number((pz + normalZ * cameraDistance + tangentVector[2] * 5.0).toFixed(2)),
  }

  const cameraTarget = {
    x: Number(px.toFixed(2)),
    y: Number(py.toFixed(2)),
    z: Number(pz.toFixed(2)),
  }

  // Slope classification
  let description = 'Horizontal / Flat'
  if (slopeXY > 0.05) description = 'Ascending / Positive Growth'
  else if (slopeXY < -0.05) description = 'Descending / Negative Slope'

  return {
    index: idx,
    coordinate: {
      x: px,
      y: py,
      z: z ? pz : null,
    },
    slope: Number.isFinite(slopeXY) ? Number(slopeXY.toFixed(4)) : 'Undefined',
    slopeXZ: slopeXZ !== null && Number.isFinite(slopeXZ) ? Number(slopeXZ.toFixed(4)) : null,
    angleDeg: Number(angleDeg.toFixed(2)),
    pitchDeg: Number(pitchDeg.toFixed(2)),
    tangentVector: tangentVector.map(v => Number(v.toFixed(4))),
    description,
    suggestedCamera: {
      position: cameraPosition,
      target: cameraTarget,
    },
  }
}

/**
 * Analytical numerical derivative for a custom function f(x)
 * @param {Function} fn - Javascript function returning a number
 * @param {number} x - Coordinate value
 * @param {number} h - Step size
 * @returns {number} Derivative f'(x)
 */
export function calculateFunctionDerivative(fn, x, h = 1e-5) {
  try {
    return (fn(x + h) - fn(x - h)) / (2 * h)
  } catch {
    return 0
  }
}
