import React, { useEffect, useState } from 'react'
import { analyzeImage } from '../api'
import { VISION_MODELS } from '../models'

export default function CameraPanel({ apiKey, setApiKey, onGraph, onClear }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [model, setModel] = useState(VISION_MODELS[0].id)

  useEffect(() => {
    if (!file) {
      setPreview('')
      return undefined
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function selectFile(event) {
    setError('')
    setFile(event.target.files?.[0] || null)
  }

  async function analyze(event) {
    event.preventDefault()
    if (!file) return setError('Choose an image first.')
    if (!apiKey.trim()) return setError('Enter a Groq API key to analyze the image.')
    setBusy(true)
    setError('')
    try {
      const result = await analyzeImage(file, apiKey.trim(), model)
      if (!Array.isArray(result?.x) || !Array.isArray(result?.y)) {
        throw new Error('The image response did not contain chart data.')
      }
      onGraph(result)
    } catch (err) {
      setError(err.message || 'Image analysis failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tool-panel">
      <p className="tool-description">Capture a chart or upload an image and let vision AI turn it into a 3D graph.</p>
      <label className="tool-label" htmlFor="groq-key">Groq API key</label>
      <input
        id="groq-key"
        type="password"
        value={apiKey}
        onChange={(event) => setApiKey(event.target.value)}
        placeholder="gsk_…"
        className="control-input"
        autoComplete="off"
      />
      <label className="tool-label" htmlFor="vision-model">Vision model</label>
      <select id="vision-model" className="control-input" value={model} onChange={(event) => setModel(event.target.value)}>
        {VISION_MODELS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      <p className="model-caption">Choose the vision model that best matches your chart.</p>
      <label className="upload-dropzone" htmlFor="chart-image">
        {preview ? <img src={preview} alt="Selected chart preview" /> : <span>Choose or capture chart image</span>}
        <input id="chart-image" type="file" accept="image/*" capture="environment" onChange={selectFile} />
      </label>
      <div className="tool-actions">
        <button type="button" className="primary-button" disabled={busy || !file} onClick={analyze}>
          {busy ? 'Analyzing…' : 'Analyze image'}
        </button>
        <button type="button" className="secondary-button" onClick={onClear}>Reset graph</button>
      </div>
      {error && <p className="tool-error">{error}</p>}
      <p className="tool-footnote">Your key stays in this browser and is sent only with your request.</p>
    </div>
  )
}
