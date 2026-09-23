
import React, { useRef, useState, useEffect } from 'react'
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Copy,
  Layers,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import { analyzeImage } from '../api'

export default function ScannerStudio({ onDataExtracted, onNavigateToStudio }) {
  const [activeSource, setActiveSource] = useState('camera')
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
    setStatusMsg('')
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setErrorMsg('Camera requires HTTPS and a browser with camera support. Use the secure GitHub Pages URL or upload an image.')
      setCameraActive(false)
      return
    }
    try {
      stopCamera()
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        })
      } catch {
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
    } catch (error) {
      setCameraActive(false)
      const name = error?.name
      const message = name === 'NotAllowedError' || name === 'PermissionDeniedError'
        ? 'Camera permission was denied. Allow camera access in your browser settings, then press Start Camera again.'
        : name === 'NotFoundError' || name === 'DevicesNotFoundError'
          ? 'No camera was found. Connect a camera or upload an image file instead.'
          : name === 'NotReadableError'
            ? 'The camera is busy in another app. Close it and try again, or upload an image file.'
            : 'Camera access failed. Check browser permissions and use HTTPS, or upload an image file.'
      setErrorMsg(message)
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
    setStatusMsg('Extracting numerical series from image...')

    try {
      const result = await analyzeImage(file)
      if (result && result.x && result.y && result.x.length > 0) {
        setStatusMsg('Graph coordinates digitized.')
        setLastScanned(result)
        onDataExtracted(result)
        setLoading(false)
      } else {
        throw new Error('Could not identify coordinate markers from this image.')
      }
    } catch (err) {
      setErrorMsg(err.message || 'Image processing failed. Provide a high-contrast chart image.')
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
    <div className="space-y-4 max-w-3xl mx-auto p-4">
      {/* Header Banner */}
      <div className="p-4 glass-panel rounded-lg flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-pri)] flex items-center gap-2">
            <Camera className="w-4 h-4 text-[var(--accent)]" />
            Image Digitizer
            <span className="mono text-[10px] px-1.5 py-0.5 rounded bg-[#21262d] text-[var(--text-sec)] border border-[#30363d]">
              CV ENGINE
            </span>
          </h3>
          <p className="text-xs text-[var(--text-sec)] mt-0.5">
            Capture graph with camera, upload file, or press <kbd className="mono px-1 py-0.5 rounded bg-[#21262d] text-[var(--text-pri)] text-[10px] border border-[#30363d]">Ctrl+V</kbd>
          </p>
        </div>

        {/* Source Mode Switcher */}
        <div className="flex bg-[#0d1117] p-1 rounded-md border border-[#30363d]">
          <button
            onClick={() => setActiveSource('camera')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
              activeSource === 'camera'
                ? 'bg-[#21262d] text-[var(--text-pri)] border border-[#388bfd]/50'
                : 'text-[var(--text-sec)] hover:text-[var(--text-pri)]'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Camera
          </button>
          <button
            onClick={() => setActiveSource('upload')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
              activeSource === 'upload'
                ? 'bg-[#21262d] text-[var(--text-pri)] border border-[#388bfd]/50'
                : 'text-[var(--text-sec)] hover:text-[var(--text-pri)]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload
          </button>
        </div>
      </div>

      {/* Main Scanner Stage */}
      <div className="glass-panel rounded-lg p-5">
        {activeSource === 'camera' ? (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden bg-[#0d1117] border border-[#30363d] aspect-video flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              />
              {!cameraActive && (
                <div className="text-center p-6 space-y-2">
                  <Camera className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
                  <p className="text-xs text-[var(--text-sec)]">Camera is standby or inactive</p>
                  <button
                    onClick={startCamera}
                    className="px-3 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-xs font-medium text-[var(--text-pri)] border border-[#30363d] transition-colors"
                  >
                    Start Camera
                  </button>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {cameraActive && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={handleCapturePhoto}
                  disabled={loading}
                  className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-40 text-white rounded text-xs font-semibold flex items-center gap-2 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  Capture & Digitize
                </button>
              </div>
            )}
          </div>
        ) : (
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
            className={`border border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver
                ? 'border-[var(--accent)] bg-[#388bfd]/5'
                : 'border-[#30363d] hover:border-[#8b949e] bg-[#0d1117]/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
            />
            <Upload className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-xs font-medium text-[var(--text-pri)]">
              Drag and drop image here, or{' '}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[var(--accent)] hover:underline"
              >
                browse files
              </button>
            </p>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Supports PNG, JPG, WEBP.
            </p>
          </div>
        )}

        {/* Status Message */}
        {loading && (
          <div className="mt-4 p-3 rounded bg-[#161b22] border border-[#30363d] flex items-center gap-2 text-xs text-[var(--text-sec)]">
            <RefreshCw className="w-4 h-4 animate-spin text-[var(--accent)] shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3 rounded bg-[#2a1215] border border-[#f85149]/40 flex items-center gap-2 text-xs text-[#ff7b72]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Extraction Result */}
        {lastScanned && !loading && (
          <div className="mt-4 p-3.5 rounded bg-[#161b22] border border-[#30363d] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--success)]">
                <CheckCircle2 className="w-4 h-4" />
                <span>Extracted {lastScanned.x?.length || 0} Data Points</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigateToStudio('2d')}
                  className="px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-xs text-[var(--text-pri)] transition-colors"
                >
                  View in 2D
                </button>
                <button
                  onClick={() => onNavigateToStudio('3d')}
                  className="px-2.5 py-1 rounded bg-[#238636] hover:bg-[#2ea043] text-xs text-white transition-colors"
                >
                  View in 3D
                </button>
              </div>
            </div>
            <div className="mono text-[11px] text-[var(--text-muted)] truncate">
              X: [{lastScanned.x.slice(0, 8).join(', ')}{lastScanned.x.length > 8 ? '...' : ''}]
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
