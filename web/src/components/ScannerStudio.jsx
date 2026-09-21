import React, { useRef, useState, useEffect } from 'react'
import {
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  Layers,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import { analyzeImage } from '../api'

export default function ScannerStudio({ onDataExtracted, onNavigateToStudio }) {
  const [activeSource, setActiveSource] = useState('camera') // 'camera' or 'upload'
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [lastScanned, setLastScanned] = useState(null)
  const [cameraActive, setCameraActive] = useState(false)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)

  // Listen for global clipboard paste events (e.g. Snipping tool Win+Shift+S)
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile()
          processFile(blob)
          break
        }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [])

  // Manage camera when camera mode is active
  useEffect(() => {
    if (activeSource === 'camera') {
      startCamera()
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [activeSource])

  const startCamera = async () => {
    setErrorMsg('')
    try {
      stopCamera()
      let stream
      try {
        // Try ideal environment camera first
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        })
      } catch {
        // Fallback to any default camera available (laptop webcam)
        stream = await navigator.mediaDevices.getUserMedia({ video: true })
      }

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {})
        }
      }
      setCameraActive(true)
    } catch (err) {
      setCameraActive(false)
      setErrorMsg('Camera access unavailable or blocked. Please check browser camera permissions or upload an image.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  const processFile = async (file) => {
    if (!file) return
    setLoading(true)
    setErrorMsg('')
    setStatusMsg('Scanning graph with built-in AI digitizer...')

    try {
      const result = await analyzeImage(file)
      if (result && result.x && result.y && result.x.length > 0) {
        setStatusMsg('Graph coordinates digitized successfully!')
        setLastScanned(result)
        onDataExtracted(result)
        setLoading(false)
      } else {
        throw new Error('Could not identify graph coordinates from this image.')
      }
    } catch (err) {
      setErrorMsg(err.message || 'Image analysis failed. Please try a clearer graph or chart image.')
      setLoading(false)
    }
  }

  const handleCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'camera_capture.jpg', { type: 'image/jpeg' })
        processFile(file)
      }
    }, 'image/jpeg', 0.9)
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="p-4 glass-card rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Camera & Graph Scanner
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                Built-in Vision AI
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Point your camera at any chart, upload an image, or press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-[10px]">Ctrl+V</kbd> to paste a screenshot
            </p>
          </div>
        </div>

        {/* Source Mode Switcher */}
        <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveSource('camera')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSource === 'camera'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Live Camera
          </button>
          <button
            onClick={() => setActiveSource('upload')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSource === 'upload'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            File Upload
          </button>
        </div>
      </div>

      {/* Main Scanner Stage */}
      <div className="glass-card rounded-2xl p-6 shadow-xl border border-indigo-500/20">
        {activeSource === 'camera' && (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-slate-800 max-h-[420px] mx-auto flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Scanning reticle overlay */}
              <div className="absolute inset-8 border border-dashed border-indigo-400/40 rounded-xl pointer-events-none flex items-center justify-center">
                <div className="text-[11px] font-medium text-indigo-300/80 bg-slate-950/70 px-3 py-1 rounded-full backdrop-blur-sm">
                  Align graph inside this boundary
                </div>
              </div>

              {!cameraActive && !errorMsg && (
                <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                  <span className="text-xs">Initializing camera feed...</span>
                </div>
              )}
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleCapturePhoto}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-sm shadow-xl transition-all hover:scale-105 disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
                {loading ? 'Digitizing Curve...' : 'Snap Photo & Digitize Graph'}
              </button>
            </div>
          </div>
        )}

        {activeSource === 'upload' && (
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0])
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
              dragOver
                ? 'border-indigo-400 bg-indigo-500/15 scale-[1.01]'
                : 'border-slate-700/80 hover:border-indigo-500/60 hover:bg-slate-900/40'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
              accept="image/*"
              className="hidden"
            />
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8" />
            </div>
            <h4 className="text-base font-semibold text-slate-100">
              Drag & drop a graph image, or <span className="text-indigo-400 underline">browse files</span>
            </h4>
            <p className="text-xs text-slate-400 mt-2">
              Or take a screenshot with <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">Win + Shift + S</kbd> and press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">Ctrl + V</kbd> to paste
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Supports PNG, JPG, JPEG, WEBP, SVG</p>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="mt-4 p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center gap-3 animate-pulse">
            <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-indigo-200 font-medium">{statusMsg}</span>
          </div>
        )}

        {/* Error notification */}
        {errorMsg && (
          <div className="mt-4 p-4 rounded-xl bg-red-950/40 border border-red-500/30 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span className="text-xs text-red-200">{errorMsg}</span>
          </div>
        )}

        {/* Scanned Result Card */}
        {lastScanned && !loading && (
          <div className="mt-6 p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-4 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-emerald-300">
                  {lastScanned.label || 'Graph Digitized Successfully'}
                </h4>
                <p className="text-xs text-slate-400">
                  Extracted {lastScanned.x?.length || 0} coordinate points • Classification: {(lastScanned.chart_type || 'line').toUpperCase()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigateToStudio('2d')}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
              >
                View in 2D Studio
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onNavigateToStudio('3d')}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all"
              >
                View in 3D Studio
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
