import React, { useState } from 'react'

const SAMPLE = {
  x: '1, 2, 3, 4, 5',
  y: '2, 5, 3, 8, 7',
  z: '',
  label: 'Sample Growth Curve',
  chart_type: 'line',
}

function parseValues(value, name) {
  if (!value.trim()) return []
  const values = value.split(',').map((item) => Number(item.trim()))
  if (values.some((item) => !Number.isFinite(item))) throw new Error(`${name} must contain numbers separated by commas.`)
  return values
}

export default function ManualGraphBuilder({ onGraph, onClear }) {
  const [form, setForm] = useState(SAMPLE)
  const [error, setError] = useState('')

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
  }

  function build(event) {
    event.preventDefault()
    try {
      const x = parseValues(form.x, 'X values')
      const y = parseValues(form.y, 'Y values')
      const z = parseValues(form.z, 'Z values')
      if (!x.length || !y.length) throw new Error('X and Y values are required.')
      if (x.length !== y.length) throw new Error('X and Y must have the same number of values.')
      if (z.length && z.length !== x.length) throw new Error('Z must match the length of X and Y.')
      onGraph({
        x,
        y,
        z: z.length ? z : null,
        label: form.label.trim() || 'Manual graph',
        chart_type: form.chart_type,
      })
    } catch (err) {
      setError(err.message)
    }
  }

  function reset() {
    setForm(SAMPLE)
    setError('')
    onGraph({
      x: SAMPLE.x.split(',').map((value) => Number(value.trim())),
      y: SAMPLE.y.split(',').map((value) => Number(value.trim())),
      z: null,
      label: SAMPLE.label,
      chart_type: SAMPLE.chart_type,
    })
  }

  return (
    <form className="tool-panel" onSubmit={build}>
      <p className="tool-description">Build a graph locally without sending data to the backend.</p>
      <label className="tool-label" htmlFor="manual-x">X values</label>
      <input id="manual-x" className="control-input" value={form.x} onChange={(e) => update('x', e.target.value)} placeholder="1, 2, 3" />
      <label className="tool-label" htmlFor="manual-y">Y values</label>
      <input id="manual-y" className="control-input" value={form.y} onChange={(e) => update('y', e.target.value)} placeholder="2, 4, 6" />
      <label className="tool-label" htmlFor="manual-z">Z values <span>(optional)</span></label>
      <input id="manual-z" className="control-input" value={form.z} onChange={(e) => update('z', e.target.value)} placeholder="optional 3D values" />
      <div className="tool-grid">
        <div>
          <label className="tool-label" htmlFor="manual-label">Label</label>
          <input id="manual-label" className="control-input" value={form.label} onChange={(e) => update('label', e.target.value)} />
        </div>
        <div>
          <label className="tool-label" htmlFor="manual-type">Chart type</label>
          <select id="manual-type" className="control-input" value={form.chart_type} onChange={(e) => update('chart_type', e.target.value)}>
            <option value="line">Line</option>
            <option value="bar">Bar</option>
            <option value="scatter">Scatter</option>
            <option value="3d">3D</option>
          </select>
        </div>
      </div>
      <div className="tool-actions">
        <button type="submit" className="primary-button">Create graph</button>
        <button type="button" className="secondary-button" onClick={reset}>Demo sample</button>
      </div>
      {error && <p className="tool-error">{error}</p>}
    </form>
  )
}
