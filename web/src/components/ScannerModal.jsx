import React, { useRef, useState, useEffect } from 'react'
import { X, Upload, Camera, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'
import { analyzeImage } from '../api'

export default function ScannerModal({ isOpen, onClose, onDataExtracted }) {
  const [activeMode, setActiveMode] = useState('upload') // 'upload' or 'camera'
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)

  // Start webcam when camera tab is selected
  useEffect(() => {
    if (!isOpen) {
      stopCamera()
      return
    }

    if (activeMode === 'camera') {
      startCamera()
    } else {
      stopCamera()
    }

    return () => stopCamera()
  }, [isOpen, activeMode])

  const startCamera = async () => {
    setErrorMsg('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      setErrorMsg('Camera access denied or unavailable. Please use file upload.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  const processFile = async (file) => {
    if (!file) return
    setLoading(true)
    setErrorMsg('')
    setStatusMsg('Scanning graph with built-in AI...')

    try {
      const result = await analyzeImage(file)
      if (result && result.x && result.y && result.x.length > 0) {
        setStatusMsg('Graph coordinates digitized successfully!')
        setTimeout(() => {
          onDataExtracted(result)
          onClose()
          setLoading(false)
          setStatusMsg('')
        }, 600)
      } else {
        throw new Error('Could not extract coordinates from this image.')
      }
    } catch (err) {
      setErrorMsg(err.message || 'Analysis failed. Please try a clearer graph image.')
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg glass-card border border-indigo-500/30 p-6 rounded-2xl shadow-2xl bg-[#0b0f1d]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">Scan & Extract Graph</h3>
            <p className="text-xs text-slate-400">Digitize any chart or plot into interactive 2D/3D data</p>
          </div>
        </div>

        {/* Tab selector */}
        <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 mb-4">
          <button
            onClick={() => setActiveMode('upload')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${
              activeMode === 'upload'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload Image
          </button>
          <button
            onClick={() => setActiveMode('camera')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${
              activeMode === 'camera'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            Live Camera
          </button>
        </div>

        {/* Upload Mode */}
        {activeMode === 'upload' && (
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
            className={`cursor-pointer border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              dragOver
                ? 'border-indigo-400 bg-indigo-500/10'
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
            <div className="w-12 h-12 rounded-full bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-200">
              Drag and drop your graph image here, or <span className="text-indigo-400 underline">browse</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">Supports PNG, JPG, JPEG, WEBP, SVG</p>
          </div>
        )}

        {/* Camera Mode */}
        {activeMode === 'camera' && (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-slate-800 flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <button
              onClick={handleCapturePhoto}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              Capture and Analyze Graph
            </button>
          </div>
        )}

        {/* Status indicator */}
        {loading && (
          <div className="mt-4 p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-indigo-200 font-medium">{statusMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-red-950/40 border border-red-500/30 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-xs text-red-200">{errorMsg}</span>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <span>⚡ Built-in AI vision enabled</span>
          <button onClick={onClose} className="hover:text-slate-300">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
