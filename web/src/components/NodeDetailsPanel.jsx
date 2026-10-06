import React, { useState, useEffect, useMemo } from 'react'
import { X, TrendingUp, TrendingDown, Minus, Camera, Compass } from 'lucide-react'
import { calculateSlopeAtPoint } from '../utils/math'

export default function NodeDetailsPanel({
  node,
  graphData,
  onUpdateData,
  onClose,
  onMoveCamera,
}) {
  const [editX, setEditX] = useState('')
  const [editY, setEditY] = useState('')
  const [editZ, setEditZ] = useState('')
  const [saved, setSaved] = useState(false)

  const is3D = graphData?.chart_type === '3d' && Array.isArray(graphData?.z)

  useEffect(() => {
    if (node !== null && graphData) {
      setEditX(String(graphData.x[node] ?? ''))
      setEditY(String(graphData.y[node] ?? ''))
      setEditZ(is3D ? String(graphData.z[node] ?? '') : '')
    }
  }, [node, graphData, is3D])

  // Calculate high-precision mathematical slope and tangent data at this point
  const slopeData = useMemo(() => {
    if (node === null || !graphData) return null
    return calculateSlopeAtPoint({ index: node }, graphData)
  }, [node, graphData])

  if (node === null || !graphData) return null

  const x = graphData.x[node]
  const y = graphData.y[node]
  const z = is3D ? graphData.z[node] : null
  const n = graphData.y.length
  const mean = graphData.y.reduce((a, b) => a + b, 0) / n
  const prevY = node > 0 ? graphData.y[node - 1] : null
  const deltaY = prevY !== null ? y - prevY : null
  const pctFromMean = mean !== 0 ? ((y - mean) / Math.abs(mean)) * 100 : 0

  const mValue = slopeData?.slope ?? (deltaY !== null ? deltaY : 0)
  const isRising = typeof mValue === 'number' && mValue > 0.05
  const isFalling = typeof mValue === 'number' && mValue < -0.05

  const TrendIcon = isRising ? TrendingUp : isFalling ? TrendingDown : Minus
  const trendColor = isRising ? 'var(--success)' : isFalling ? 'var(--danger)' : 'var(--text-muted)'
  const trendLabel = isRising ? 'Ascending' : isFalling ? 'Descending' : 'Plateau'

  const handleApply = () => {
    const nx = parseFloat(editX)
    const ny = parseFloat(editY)
    const nz = parseFloat(editZ)
    if (isNaN(nx) || isNaN(ny)) return

    const newX = [...graphData.x]
    newX[node] = nx
    const newY = [...graphData.y]
    newY[node] = ny
    let newZ = graphData.z ? [...graphData.z] : null
    if (is3D && newZ && !isNaN(nz)) newZ[node] = nz

    onUpdateData({ ...graphData, x: newX, y: newY, z: newZ })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  // Camera Actions
  const handleFocusNode = () => {
    if (!onMoveCamera) return
    const px = typeof x === 'number' ? x : 0
    const py = typeof y === 'number' ? y : 0
    const pz = typeof z === 'number' ? z : 0

    onMoveCamera({
      position: { x: px + 12, y: py + 10, z: pz + 16 },
      target: { x: px, y: py, z: pz },
    })
  }

  const handleAlignToSlope = () => {
    if (!onMoveCamera || !slopeData?.suggestedCamera) return
    onMoveCamera(slopeData.suggestedCamera)
  }

  const StatRow = ({ label, value, mono = true, color }) => (
    <div className="flex items-center justify-between py-1">
      <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{label}</span>
      <span className={`text-[12px] font-medium ${mono ? 'mono' : ''}`} style={{ color: color || 'var(--text-pri)' }}>
        {value}
      </span>
    </div>
  )

  return (
    <aside
      className="glass-panel panel-slide-right fixed right-0 top-10 bottom-0 w-64 z-30 flex flex-col overflow-hidden"
      style={{ borderLeft: '1px solid var(--border)', borderTop: 'none' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[var(--border)] bg-[#161b22]/70">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Node Details & Derivative
          </div>
          <div className="text-sm font-bold text-[var(--text-pri)] mono">
            Point #{node + 1}{' '}
            <span className="text-[var(--text-muted)] text-xs font-normal">/ {n}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-[rgba(48,54,61,0.6)] text-[var(--text-muted)] hover:text-[var(--text-pri)] transition-colors"
          title="Close details"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-4">
        {/* Coordinates */}
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
            Coordinates
          </div>
          <div className="rounded-md bg-[rgba(13,17,23,0.7)] border border-[var(--border)] px-3 py-2 space-y-1">
            <StatRow label="X Axis" value={typeof x === 'number' ? x.toFixed(3) : x} />
            <StatRow label="Y Value" value={typeof y === 'number' ? y.toFixed(3) : y} />
            {is3D && <StatRow label="Z Depth" value={typeof z === 'number' ? z.toFixed(3) : z} />}
          </div>
        </div>

        {/* Mathematical Derivative & Slope (m) */}
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5 flex items-center justify-between">
            <span>Instantaneous Slope ($m$)</span>
            <span className="text-[var(--accent)] font-mono text-[10px]">dy/dx</span>
          </div>
          <div className="rounded-md bg-[rgba(13,17,23,0.7)] border border-[var(--border)] px-3 py-2 space-y-1">
            <StatRow
              label="Derivative (m)"
              value={slopeData?.slope ?? 'N/A'}
              color={isRising ? 'var(--success)' : isFalling ? 'var(--danger)' : 'var(--text-pri)'}
            />
            {slopeData?.angleDeg !== undefined && (
              <StatRow label="Tangent Angle" value={`${slopeData.angleDeg}°`} color="var(--text-sec)" />
            )}
            {slopeData?.slopeXZ !== null && slopeData?.slopeXZ !== undefined && (
              <StatRow label="dz/dx (Depth)" value={slopeData.slopeXZ} color="var(--text-sec)" />
            )}
            {slopeData?.pitchDeg !== undefined && (
              <StatRow label="Spatial Pitch" value={`${slopeData.pitchDeg}°`} color="var(--text-sec)" />
            )}
            <div className="flex items-center justify-between py-1">
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Dynamic</span>
              <span className="flex items-center gap-1 text-[12px] font-medium" style={{ color: trendColor }}>
                <TrendIcon className="w-3.5 h-3.5" />
                {trendLabel}
              </span>
            </div>
          </div>
        </div>

        {/* 3D Camera Controls Aligned to this Point */}
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
            3D Camera View
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            <button
              onClick={handleFocusNode}
              className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-xs font-medium text-[var(--text-pri)] transition-colors"
            >
              <Camera className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Focus Camera on Node</span>
            </button>
            <button
              onClick={handleAlignToSlope}
              className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded bg-[#1f242c] hover:bg-[#2b323c] border border-[#388bfd]/40 text-xs font-medium text-[#79c0ff] transition-colors"
            >
              <Compass className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Angle Along Slope Vector</span>
            </button>
          </div>
        </div>

        {/* Additional Statistical Metrics */}
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
            Dataset Metrics
          </div>
          <div className="rounded-md bg-[rgba(13,17,23,0.7)] border border-[var(--border)] px-3 py-2 space-y-1">
            <StatRow label="Mean Y" value={mean.toFixed(3)} color="var(--text-sec)" />
            {deltaY !== null && (
              <StatRow
                label="Δy from prev"
                value={(deltaY >= 0 ? '+' : '') + deltaY.toFixed(3)}
                color={deltaY > 0 ? 'var(--success)' : deltaY < 0 ? 'var(--danger)' : 'var(--text-muted)'}
              />
            )}
            <StatRow
              label="% from mean"
              value={(pctFromMean >= 0 ? '+' : '') + pctFromMean.toFixed(1) + '%'}
              color={pctFromMean > 0 ? 'var(--success)' : pctFromMean < 0 ? 'var(--warn)' : 'var(--text-muted)'}
            />
          </div>
        </div>

        {/* Edit Values */}
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
            Edit Node Value
          </div>
          <div className="space-y-1.5">
            {[
              { label: 'x', val: editX, set: setEditX },
              { label: 'y', val: editY, set: setEditY },
              ...(is3D ? [{ label: 'z', val: editZ, set: setEditZ }] : []),
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2">
                <span className="mono text-[10px] w-3 text-[var(--text-muted)]">{f.label}</span>
                <input
                  type="number"
                  step="any"
                  value={f.val}
                  onChange={(e) => f.set(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                  className="mono flex-1 px-2 py-1 text-xs rounded bg-[rgba(13,17,23,0.8)] border border-[var(--border)] text-[var(--text-pri)] outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>
            ))}
            <button
              onClick={handleApply}
              className="w-full mt-1 py-1.5 rounded text-[11px] font-semibold transition-all"
              style={{ background: saved ? 'var(--success)' : 'var(--accent)', color: 'white' }}
            >
              {saved ? '✓ Applied' : 'Apply Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Index Stepping Footer */}
      <div className="border-t border-[var(--border)] px-3.5 py-2 flex items-center justify-between bg-[#161b22]/50">
        <button
          disabled={node === 0}
          onClick={() => onClose(node - 1)}
          className="text-[10px] px-2 py-1 rounded text-[var(--text-sec)] hover:bg-[rgba(48,54,61,0.5)] disabled:opacity-30 transition-colors"
        >
          ← Prev
        </button>
        <span className="mono text-[10px] text-[var(--text-muted)]">
          {node + 1} / {n}
        </span>
        <button
          disabled={node === n - 1}
          onClick={() => onClose(node + 1)}
          className="text-[10px] px-2 py-1 rounded text-[var(--text-sec)] hover:bg-[rgba(48,54,61,0.5)] disabled:opacity-30 transition-colors"
        >
          Next →
        </button>
      </div>
    </aside>
  )
}
