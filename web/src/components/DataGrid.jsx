import React, { useState } from 'react'
import { Plus, Trash2, RotateCcw } from 'lucide-react'

export default function DataGrid({ data, onUpdateData, onResetData }) {
  const [newX, setNewX] = useState('')
  const [newY, setNewY] = useState('')
  const [newZ, setNewZ] = useState('')

  if (!data || !data.x || !data.y) return null

  const handlePointChange = (idx, field, value) => {
    const num = parseFloat(value)
    if (isNaN(num)) return

    const newX = [...data.x]
    const newY = [...data.y]
    const newZ = data.z ? [...data.z] : null

    if (field === 'x') newX[idx] = num
    if (field === 'y') newY[idx] = num
    if (field === 'z' && newZ) newZ[idx] = num

    onUpdateData({
      ...data,
      x: newX,
      y: newY,
      z: newZ,
    })
  }

  const handleDelete = (idx) => {
    if (data.x.length <= 2) {
      alert('Graph requires at least 2 points.')
      return
    }
    const newX = data.x.filter((_, i) => i !== idx)
    const newY = data.y.filter((_, i) => i !== idx)
    const newZ = data.z ? data.z.filter((_, i) => i !== idx) : null

    onUpdateData({
      ...data,
      x: newX,
      y: newY,
      z: newZ,
    })
  }

  const handleAddPoint = (e) => {
    e.preventDefault()
    const xVal = parseFloat(newX)
    const yVal = parseFloat(newY)
    const zVal = newZ ? parseFloat(newZ) : (data.z ? yVal * 0.5 : null)

    if (isNaN(xVal) || isNaN(yVal)) {
      alert('Please enter valid numeric X and Y values.')
      return
    }

    const newXArr = [...data.x, xVal]
    const newYArr = [...data.y, yVal]
    const newZArr = data.z ? [...data.z, zVal || 0] : null

    onUpdateData({
      ...data,
      x: newXArr,
      y: newYArr,
      z: newZArr,
    })

    setNewX('')
    setNewY('')
    setNewZ('')
  }

  const hasZ = Boolean(data.z && data.z.length === data.x.length)

  return (
    <div className="p-4 glass-card rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-200">Coordinate Data Points</h4>
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
          <thead className="text-[11px] text-slate-400 uppercase bg-slate-800/40 sticky top-0 backdrop-blur-sm">
            <tr>
              <th className="py-2 px-2.5 rounded-l">#</th>
              <th className="py-2 px-2.5">X Axis</th>
              <th className="py-2 px-2.5">Y Value</th>
              {hasZ && <th className="py-2 px-2.5">Z Depth</th>}
              <th className="py-2 px-2.5 text-right rounded-r">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {data.x.map((xVal, idx) => (
              <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-1.5 px-2.5 text-slate-500 font-mono">{idx + 1}</td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    step="any"
                    defaultValue={xVal}
                    onBlur={(e) => handlePointChange(idx, 'x', e.target.value)}
                    className="w-20 bg-slate-900/60 border border-slate-700/60 rounded px-2 py-0.5 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    step="any"
                    defaultValue={data.y[idx]}
                    onBlur={(e) => handlePointChange(idx, 'y', e.target.value)}
                    className="w-20 bg-slate-900/60 border border-slate-700/60 rounded px-2 py-0.5 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </td>
                {hasZ && (
                  <td className="py-1.5 px-2">
                    <input
                      type="number"
                      step="any"
                      defaultValue={data.z[idx]}
                      onBlur={(e) => handlePointChange(idx, 'z', e.target.value)}
                      className="w-20 bg-slate-900/60 border border-slate-700/60 rounded px-2 py-0.5 text-slate-200 focus:border-indigo-500 focus:outline-none"
                    />
                  </td>
                )}
                <td className="py-1.5 px-2 text-right">
                  <button
                    onClick={() => handleDelete(idx)}
                    className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors"
                    title="Delete point"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add point form */}
      <form onSubmit={handleAddPoint} className="mt-3 pt-3 border-t border-slate-800/80 flex gap-2 items-center">
        <input
          type="number"
          step="any"
          value={newX}
          onChange={(e) => setNewX(e.target.value)}
          placeholder="Next X"
          className="w-20 bg-slate-900/80 border border-slate-700/80 rounded px-2 py-1 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
        />
        <input
          type="number"
          step="any"
          value={newY}
          onChange={(e) => setNewY(e.target.value)}
          placeholder="Next Y"
          className="w-20 bg-slate-900/80 border border-slate-700/80 rounded px-2 py-1 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
        />
        {hasZ && (
          <input
            type="number"
            step="any"
            value={newZ}
            onChange={(e) => setNewZ(e.target.value)}
            placeholder="Next Z"
            className="w-20 bg-slate-900/80 border border-slate-700/80 rounded px-2 py-1 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
          />
        )}
        <button
          type="submit"
          className="flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs transition-colors shadow-sm ml-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Point
        </button>
      </form>
    </div>
  )
}
