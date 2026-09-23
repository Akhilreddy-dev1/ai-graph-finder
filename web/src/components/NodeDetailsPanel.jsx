
import React, { useState, useEffect } from 'react'
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { slopeBetweenPoints } from '../utils/slope'

export default function NodeDetailsPanel({ node, graphData, onUpdateData, onClose }) {
  const [editX, setEditX] = useState('')
  const [editY, setEditY] = useState('')
  const [editZ, setEditZ] = useState('')
  const [saved, setSaved] = useState(false)

  const is3D = graphData?.chart_type === '3d' && Array.isArray(graphData?.z)
  const isSeries = Array.isArray(graphData?.x) && Array.isArray(graphData?.y)
  const graphNodes = Array.isArray(graphData?.nodes) ? graphData.nodes : []

  useEffect(() => {
    if (node !== null && graphData) {
      setEditX(String(graphData.x?.[node] ?? graphNodes[node]?.x ?? ''))
      setEditY(String(graphData.y?.[node] ?? graphNodes[node]?.y ?? ''))
      setEditZ(is3D ? String(graphData.z?.[node] ?? graphNodes[node]?.z ?? '') : '')
    }
  }, [node, graphData, graphNodes])

  if (node === null || !graphData) return null

  const n = isSeries ? graphData.y.length : graphNodes.length
  const x = isSeries ? graphData.x[node] : graphNodes[node]?.x ?? node
  const y = isSeries ? graphData.y[node] : graphNodes[node]?.y ?? null
  const z = is3D ? graphData.z[node] : graphNodes[node]?.z ?? null
  const numericY = Number(y)
  const seriesValues = isSeries ? graphData.y : []
  const mean = seriesValues.length ? seriesValues.reduce((a, b) => a + Number(b), 0) / seriesValues.length : null
  const prevY = isSeries && node > 0 ? graphData.y[node - 1] : null
  const deltaY = prevY !== null ? (y - prevY) : null
  const nextSlope = isSeries && node < n - 1
    ? slopeBetweenPoints(x, y, graphData.x[node + 1], graphData.y[node + 1])
    : null
  const previousSlope = isSeries && node > 0
    ? slopeBetweenPoints(graphData.x[node - 1], graphData.y[node - 1], x, y)
    : null
  const localSlope = nextSlope ?? previousSlope
  const pctFromMean = mean !== null && mean !== 0 && Number.isFinite(numericY)
    ? ((numericY - mean) / Math.abs(mean)) * 100
    : null

  // Local trend over surrounding window
  const windowStart = Math.max(0, node - 2)
  const windowEnd   = Math.min(n - 1, node + 2)
  let localTrend = 0
  if (windowEnd > windowStart) {
    const ys = isSeries ? graphData.y.slice(windowStart, windowEnd + 1) : []
    if (ys.length > 1) localTrend = ys[ys.length - 1] - ys[0]
  }

  const TrendIcon = localTrend > 0.05 ? TrendingUp : localTrend < -0.05 ? TrendingDown : Minus
  const trendColor = localTrend > 0.05 ? 'var(--success)' : localTrend < -0.05 ? 'var(--danger)' : 'var(--text-muted)'
  const trendLabel = localTrend > 0.05 ? 'Rising' : localTrend < -0.05 ? 'Falling' : 'Flat'

  const handleApply = () => {
    if (!isSeries) return
    const nx = parseFloat(editX), ny = parseFloat(editY), nz = parseFloat(editZ)
    if (isNaN(nx) || isNaN(ny)) return
    const newX = [...graphData.x]; newX[node] = nx
    const newY = [...graphData.y]; newY[node] = ny
    let newZ = graphData.z ? [...graphData.z] : null
    if (is3D && newZ && !isNaN(nz)) newZ[node] = nz
    onUpdateData({ ...graphData, x: newX, y: newY, z: newZ })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const StatRow = ({ label, value, mono = true, color }) => (
    <div className="flex items-center justify-between py-1">
      <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{label}</span>
      <span className={`text-[12px] font-medium ${mono ? 'mono' : ''}`} style={{ color: color || 'var(--text-pri)' }}>{value}</span>
    </div>
  )

  return (
    <aside className="glass-panel panel-slide-right fixed right-0 top-10 bottom-0 w-60 z-30 flex flex-col overflow-hidden" style={{ borderLeft: '1px solid var(--border)', borderTop: 'none' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border)]">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Data Point</div>
          <div className="text-sm font-bold text-[var(--text-pri)] mono">#{node + 1} <span className="text-[var(--text-muted)] text-xs">/ {n}</span></div>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-[rgba(48,54,61,0.6)] text-[var(--text-muted)] hover:text-[var(--text-pri)] transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {/* Coordinates */}
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5">Coordinates</div>
          <div className="rounded-md bg-[rgba(13,17,23,0.7)] border border-[var(--border)] px-3 py-2 space-y-1">
            <StatRow label="X" value={typeof x === 'number' ? x.toFixed(3) : x} />
            <StatRow label="Y" value={typeof y === 'number' ? y.toFixed(3) : y} />
            {is3D && <StatRow label="Z" value={typeof z === 'number' ? z.toFixed(3) : z} />}
          </div>
        </div>

        {/* Analysis */}
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5">Analysis</div>
          <div className="rounded-md bg-[rgba(13,17,23,0.7)] border border-[var(--border)] px-3 py-2 space-y-1">
            <StatRow label="Mean Y" value={mean === null ? 'n/a' : mean.toFixed(3)} color="var(--text-sec)" />
            <StatRow
              label="Adjacent slope"
              value={localSlope === null ? 'undefined' : `${localSlope >= 0 ? '+' : ''}${localSlope.toFixed(4)}`}
              color={localSlope === null ? 'var(--warn)' : localSlope > 0 ? 'var(--success)' : localSlope < 0 ? 'var(--danger)' : 'var(--text-muted)'}
            />
            {deltaY !== null && (
              <StatRow
                label="Δy from prev"
                value={(deltaY >= 0 ? '+' : '') + deltaY.toFixed(3)}
                color={deltaY > 0 ? 'var(--success)' : deltaY < 0 ? 'var(--danger)' : 'var(--text-muted)'}
              />
            )}
            <StatRow
              label="% from mean"
              value={pctFromMean === null ? 'n/a' : `${pctFromMean >= 0 ? '+' : ''}${pctFromMean.toFixed(1)}%`}
              color={pctFromMean === null ? 'var(--text-muted)' : pctFromMean > 0 ? 'var(--success)' : pctFromMean < 0 ? 'var(--warn)' : 'var(--text-muted)'}
            />
            <div className="flex items-center justify-between py-1">
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Local trend</span>
              <span className="flex items-center gap-1 text-[12px] font-medium" style={{ color: trendColor }}>
                <TrendIcon className="w-3.5 h-3.5" />
                {trendLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Edit */}
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5">Edit Value</div>
          {isSeries ? <div className="space-y-1.5">
            {[
              { label: 'x', val: editX, set: setEditX },
              { label: 'y', val: editY, set: setEditY },
              ...(is3D ? [{ label: 'z', val: editZ, set: setEditZ }] : []),
            ].map(f => (
              <div key={f.label} className="flex items-center gap-2">
                <span className="mono text-[10px] w-3 text-[var(--text-muted)]">{f.label}</span>
                <input
                  type="number"
                  value={f.val}
                  onChange={e => f.set(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleApply()}
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
          </div> : (
            <p className="text-[10px] leading-relaxed text-[var(--text-muted)]">
              Relationship nodes are generated from labels and edges. Edit their graph structure through the assistant.
            </p>
          )}
        </div>
      </div>

      {/* Index navigation */}
      <div className="border-t border-[var(--border)] px-3 py-2 flex items-center justify-between">
        <button
          disabled={node === 0}
          onClick={() => onClose(node - 1)}
          className="text-[10px] px-2 py-1 rounded text-[var(--text-sec)] hover:bg-[rgba(48,54,61,0.5)] disabled:opacity-30 transition-colors"
        >← Prev</button>
        <span className="mono text-[10px] text-[var(--text-muted)]">{node + 1}/{n}</span>
        <button
          disabled={node === n - 1}
          onClick={() => onClose(node + 1)}
          className="text-[10px] px-2 py-1 rounded text-[var(--text-sec)] hover:bg-[rgba(48,54,61,0.5)] disabled:opacity-30 transition-colors"
        >Next →</button>
      </div>
    </aside>
  )
}
