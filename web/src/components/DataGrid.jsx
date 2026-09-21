
import React, { useState, useEffect } from 'react'
import { Plus, Trash2, RotateCcw, Table } from 'lucide-react'

export default function DataGrid({ data, onUpdateData, onResetData }) {
  const [newX, setNewX] = useState('')
  const [newY, setNewY] = useState('')
  const [newZ, setNewZ] = useState('')
  const [localRows, setLocalRows] = useState([])

  const is3D = Boolean(data?.chart_type === '3d' && Array.isArray(data?.z) && data.z.length === data.x?.length)

  useEffect(() => {
    if (data?.x && data?.y) {
      setLocalRows(
        data.x.map((xVal, idx) => ({
          x: String(xVal),
          y: String(data.y[idx] ?? ''),
          z: is3D && data.z ? String(data.z[idx] ?? '') : '',
        }))
      )
    }
  }, [data, is3D])

  if (!data || !data.x || !data.y) return null

  const handleFieldChange = (idx, field, rawValue) => {
    const updatedRows = [...localRows]
    updatedRows[idx] = { ...updatedRows[idx], [field]: rawValue }
    setLocalRows(updatedRows)

    const num = parseFloat(rawValue)
    if (!isNaN(num)) {
      const nextX = [...data.x]
      const nextY = [...data.y]
      const nextZ = is3D && data.z ? [...data.z] : null

      if (field === 'x') nextX[idx] = num
      if (field === 'y') nextY[idx] = num
      if (field === 'z' && nextZ) nextZ[idx] = num

      onUpdateData({
        ...data,
        x: nextX,
        y: nextY,
        z: nextZ,
      })
    }
  }

  const handleDelete = (idx) => {
    if (data.x.length <= 2) {
      alert('Graph requires at least 2 points.')
      return
    }
    const nextX = data.x.filter((_, i) => i !== idx)
    const nextY = data.y.filter((_, i) => i !== idx)
    const nextZ = is3D && data.z ? data.z.filter((_, i) => i !== idx) : null

    onUpdateData({
      ...data,
      x: nextX,
      y: nextY,
      z: nextZ,
    })
  }

  const handleAddPoint = (e) => {
    e.preventDefault()
    const parsedX = parseFloat(newX)
    const parsedY = parseFloat(newY)
    const parsedZ = is3D ? parseFloat(newZ) : null

    if (isNaN(parsedX) || isNaN(parsedY)) return
    if (is3D && isNaN(parsedZ)) return

    const nextX = [...data.x, parsedX]
    const nextY = [...data.y, parsedY]
    const nextZ = is3D && data.z ? [...data.z, parsedZ] : null

    onUpdateData({
      ...data,
      x: nextX,
      y: nextY,
      z: nextZ,
    })

    setNewX('')
    setNewY('')
    setNewZ('')
  }

  return (
    <div className="p-3.5 glass-panel rounded-lg text-[var(--text-pri)]">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <Table className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="text-xs font-semibold text-[var(--text-pri)]">
            Coordinate Table
          </span>
          <span className="mono text-[10px] text-[var(--text-muted)]">
            ({data.x.length} points • {is3D ? 'X,Y,Z' : 'X,Y'})
          </span>
        </div>

        {onResetData && (
          <button
            onClick={onResetData}
            className="flex items-center gap-1 text-[11px] text-[var(--text-sec)] hover:text-[var(--text-pri)] transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      <div className="max-h-56 overflow-y-auto">
        <table className="w-full text-xs text-left">
          <thead className="text-[10px] text-[var(--text-muted)] uppercase bg-[#161b22] sticky top-0 border-b border-[var(--border)]">
            <tr>
              <th className="py-1.5 px-2">#</th>
              <th className="py-1.5 px-2">X</th>
              <th className="py-1.5 px-2">Y</th>
              {is3D && <th className="py-1.5 px-2">Z (3D)</th>}
              <th className="py-1.5 px-2 text-right">Del</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)] mono text-xs">
            {localRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-[#161b22]/50 transition-colors">
                <td className="py-1 px-2 text-[var(--text-muted)]">{idx + 1}</td>
                <td className="py-1 px-1.5">
                  <input
                    type="number"
                    step="any"
                    value={row.x}
                    onChange={(e) => handleFieldChange(idx, 'x', e.target.value)}
                    className="w-20 bg-[#0d1117] border border-[#30363d] rounded px-1.5 py-0.5 text-xs text-[var(--text-pri)] focus:border-[var(--accent)] outline-none transition-colors"
                  />
                </td>
                <td className="py-1 px-1.5">
                  <input
                    type="number"
                    step="any"
                    value={row.y}
                    onChange={(e) => handleFieldChange(idx, 'y', e.target.value)}
                    className="w-20 bg-[#0d1117] border border-[#30363d] rounded px-1.5 py-0.5 text-xs text-[var(--text-pri)] focus:border-[var(--accent)] outline-none transition-colors"
                  />
                </td>
                {is3D && (
                  <td className="py-1 px-1.5">
                    <input
                      type="number"
                      step="any"
                      value={row.z}
                      onChange={(e) => handleFieldChange(idx, 'z', e.target.value)}
                      className="w-20 bg-[#0d1117] border border-[#30363d] rounded px-1.5 py-0.5 text-xs text-[var(--text-pri)] focus:border-[var(--accent)] outline-none transition-colors"
                    />
                  </td>
                )}
                <td className="py-1 px-2 text-right">
                  <button
                    onClick={() => handleDelete(idx)}
                    className="text-[var(--text-muted)] hover:text-[#f85149] p-1 rounded hover:bg-[#30363d]/50 transition-colors"
                    title="Delete row"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleAddPoint} className="mt-2.5 pt-2 border-t border-[var(--border)] flex flex-wrap gap-1.5 items-center">
        <span className="mono text-[10px] text-[var(--text-muted)] uppercase">Append:</span>
        <input
          type="number"
          step="any"
          value={newX}
          onChange={(e) => setNewX(e.target.value)}
          placeholder="X"
          className="mono w-16 bg-[#0d1117] border border-[#30363d] rounded px-1.5 py-0.5 text-xs text-[var(--text-pri)] focus:border-[var(--accent)] outline-none"
        />
        <input
          type="number"
          step="any"
          value={newY}
          onChange={(e) => setNewY(e.target.value)}
          placeholder="Y"
          className="mono w-16 bg-[#0d1117] border border-[#30363d] rounded px-1.5 py-0.5 text-xs text-[var(--text-pri)] focus:border-[var(--accent)] outline-none"
        />
        {is3D && (
          <input
            type="number"
            step="any"
            value={newZ}
            onChange={(e) => setNewZ(e.target.value)}
            placeholder="Z"
            className="mono w-16 bg-[#0d1117] border border-[#30363d] rounded px-1.5 py-0.5 text-xs text-[var(--text-pri)] focus:border-[var(--accent)] outline-none"
          />
        )}
        <button
          type="submit"
          className="mono flex items-center gap-1 px-2.5 py-1 bg-[#238636] hover:bg-[#2ea043] text-white rounded text-[11px] font-semibold transition-colors ml-auto"
        >
          <Plus className="w-3 h-3" />
          Add Point
        </button>
      </form>
    </div>
  )
}
