import React, { useState, useEffect } from 'react'
import { Plus, Trash2, RotateCcw, Table } from 'lucide-react'

export default function DataGrid({ data, onUpdateData, onResetData }) {
  const [newX, setNewX] = useState('')
  const [newY, setNewY] = useState('')
  const [newZ, setNewZ] = useState('')
  const [localRows, setLocalRows] = useState([])

  const is3D = Boolean(data?.chart_type === '3d' && Array.isArray(data?.z) && data.z.length === data.x?.length)

  // Synchronize local editable rows whenever graph data changes
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
    // 1. Update local visual input state immediately
    const updatedRows = [...localRows]
    updatedRows[idx] = { ...updatedRows[idx], [field]: rawValue }
    setLocalRows(updatedRows)

    // 2. If it is a valid floating point number, propagate to parent graph state
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
      alert('A graph requires at least 2 points.')
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

    if (isNaN(parsedX) || isNaN(parsedY)) {
      alert('Please enter valid numeric X and Y values.')
      return
    }
    if (is3D && isNaN(parsedZ)) {
      alert('Please enter a valid numeric Z coordinate for this 3D graph.')
      return
    }

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
    <div className="p-4 glass-card rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Table className="w-4 h-4 text-indigo-400" />
          <h4 className="text-sm font-semibold text-slate-200">
            Coordinate Data Points
            <span className="ml-2 text-xs font-normal text-slate-400">
              ({data.x.length} points • {is3D ? '3D Coordinates (X, Y, Z)' : '2D Coordinates (X, Y)'})
            </span>
          </h4>
        </div>

        {onResetData && (
          <button
            onClick={onResetData}
            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Data
          </button>
        )}
      </div>

      <div className="max-h-60 overflow-y-auto pr-1">
        <table className="w-full text-xs text-left">
          <thead className="text-[11px] text-slate-400 uppercase bg-slate-800/60 sticky top-0 backdrop-blur-md">
            <tr>
              <th className="py-2 px-2.5 rounded-l">#</th>
              <th className="py-2 px-2.5">X Axis</th>
              <th className="py-2 px-2.5">Y Value</th>
              {is3D && <th className="py-2 px-2.5 text-indigo-300">Z Coordinate (3D Only)</th>}
              <th className="py-2 px-2.5 text-right rounded-r">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {localRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-1.5 px-2.5 text-slate-500">{idx + 1}</td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    step="any"
                    value={row.x}
                    onChange={(e) => handleFieldChange(idx, 'x', e.target.value)}
                    className="w-24 bg-slate-900/80 border border-slate-700/80 rounded px-2.5 py-1 text-slate-200 focus:border-indigo-500 focus:outline-none transition-colors"
                  />
                </td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    step="any"
                    value={row.y}
                    onChange={(e) => handleFieldChange(idx, 'y', e.target.value)}
                    className="w-24 bg-slate-900/80 border border-slate-700/80 rounded px-2.5 py-1 text-slate-200 focus:border-indigo-500 focus:outline-none transition-colors"
                  />
                </td>
                {is3D && (
                  <td className="py-1.5 px-2">
                    <input
                      type="number"
                      step="any"
                      value={row.z}
                      onChange={(e) => handleFieldChange(idx, 'z', e.target.value)}
                      className="w-24 bg-slate-900/80 border border-indigo-700/80 rounded px-2.5 py-1 text-indigo-200 focus:border-indigo-400 focus:outline-none transition-colors"
                    />
                  </td>
                )}
                <td className="py-1.5 px-2 text-right">
                  <button
                    onClick={() => handleDelete(idx)}
                    className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                    title="Delete coordinate point"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add new coordinate point */}
      <form onSubmit={handleAddPoint} className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap gap-2 items-center">
        <span className="text-xs text-slate-400 mr-1 font-medium">Add Point:</span>
        <input
          type="number"
          step="any"
          value={newX}
          onChange={(e) => setNewX(e.target.value)}
          placeholder="X Axis"
          className="w-24 bg-slate-900/80 border border-slate-700/80 rounded px-2.5 py-1 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none font-mono"
        />
        <input
          type="number"
          step="any"
          value={newY}
          onChange={(e) => setNewY(e.target.value)}
          placeholder="Y Value"
          className="w-24 bg-slate-900/80 border border-slate-700/80 rounded px-2.5 py-1 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none font-mono"
        />
        {is3D && (
          <input
            type="number"
            step="any"
            value={newZ}
            onChange={(e) => setNewZ(e.target.value)}
            placeholder="Z Depth (3D)"
            className="w-28 bg-slate-900/80 border border-indigo-700/80 rounded px-2.5 py-1 text-xs text-indigo-200 focus:border-indigo-400 focus:outline-none font-mono"
          />
        )}
        <button
          type="submit"
          className="flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm ml-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Coordinate
        </button>
      </form>
    </div>
  )
}
