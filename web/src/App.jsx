import React, { useEffect, useState } from 'react'
import { LineChart, Box, Camera, Bot, Sparkles } from 'lucide-react'
import GraphStudio from './components/GraphStudio'
import Studio3D from './components/Studio3D'
import ScannerStudio from './components/ScannerStudio'
import AIAssistant from './components/AIAssistant'
import LandingPage3D from './components/LandingPage3D'
import { healthCheck, CLIENT_PRESETS_2D, CLIENT_PRESETS_3D } from './api'
import { HAS_BACKEND } from './config'

export default function App() {
  const [activeTab, setActiveTab] = useState('studio_2d') // 'studio_2d', 'studio_3d', 'scanner', 'chat'

  // Show landing page on first visit; skip if returning user
  const [showLanding, setShowLanding] = useState(() => {
    try { return !localStorage.getItem('agf_seen_landing') } catch { return true }
  })

  const handleEnterApp = () => {
    try { localStorage.setItem('agf_seen_landing', '1') } catch {}
    setShowLanding(false)
  }
  const [backendOk, setBackendOk] = useState(null)

  // Active graph data state (persists in localStorage)
  const [graphData, setGraphData] = useState(() => {
    try {
      const stored = localStorage.getItem('agf_active_graph')
      return stored ? JSON.parse(stored) : CLIENT_PRESETS_2D.growth
    } catch {
      return CLIENT_PRESETS_2D.growth
    }
  })

  // Save graph data changes to localStorage
  useEffect(() => {
    if (graphData) {
      try {
        localStorage.setItem('agf_active_graph', JSON.stringify(graphData))
      } catch (e) {}
    }
  }, [graphData])

  // Probe backend health
  useEffect(() => {
    let mounted = true
    healthCheck()
      .then((res) => {
        if (mounted) setBackendOk(res?.status === 'ok')
      })
      .catch(() => {
        if (mounted) setBackendOk(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  // Seamless tab switching with proper 2D / 3D preset auto-selection
  const handleTabSwitch = (tab) => {
    if (tab === 'studio_3d' && graphData.chart_type !== '3d') {
      setGraphData(CLIENT_PRESETS_3D.helix_3d)
    } else if (tab === 'studio_2d' && graphData.chart_type === '3d') {
      setGraphData(CLIENT_PRESETS_2D.growth)
    }
    setActiveTab(tab)
  }

  const handleScannerExtracted = (scannedData) => {
    setGraphData(scannedData)
  }

  const handleNavigateFromScanner = (targetMode) => {
    if (targetMode === '3d') {
      // If 3D is requested from a 2D scan, generate smooth Z depth values
      if (!graphData.z || graphData.chart_type !== '3d') {
        const synZ = graphData.y.map((v, i) => Number((v * 0.4 + i * 2.5).toFixed(1)))
        setGraphData({ ...graphData, z: synZ, chart_type: '3d' })
      }
      setActiveTab('studio_3d')
    } else {
      setActiveTab('studio_2d')
    }
  }

  return (
    <>
      {showLanding && <LandingPage3D onEnter={handleEnterApp} />}
      <div className="min-h-screen bg-[#080c16] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#0a0e1c]/85 backdrop-blur-xl border-b border-indigo-500/15 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Brand & Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-[#0b1021] rounded-[11px] flex items-center justify-center text-indigo-400">
                <LineChart className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold bg-gradient-to-r from-slate-100 via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                  AI Graph Finder
                </h1>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  2.0 PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Intelligent 2D/3D Graph Digitizer & Math Assistant</p>
            </div>
          </div>

          {/* Primary View Switcher Tabs */}
          <nav className="flex items-center p-1 rounded-xl bg-slate-900/90 border border-slate-800 shadow-inner">
            <button
              onClick={() => handleTabSwitch('studio_2d')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'studio_2d'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <LineChart className="w-3.5 h-3.5" />
              2D Studio
            </button>

            <button
              onClick={() => handleTabSwitch('studio_3d')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'studio_3d'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              3D Studio
            </button>

            <button
              onClick={() => setActiveTab('scanner')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'scanner'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Camera Scanner
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'chat'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              AI Assistant
            </button>
          </nav>

          {/* Right Status Badges */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-950/60 border border-indigo-500/30 text-indigo-300">
              <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span className="font-medium text-[11px]">Built-in AI Active</span>
            </div>

            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-colors ${
                backendOk
                  ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-400'
                  : backendOk === false
                  ? HAS_BACKEND
                    ? 'bg-amber-950/50 border-amber-500/30 text-amber-300'
                    : 'bg-slate-800/70 border-slate-700 text-slate-400'
                  : 'bg-slate-800/50 border-slate-700 text-slate-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  backendOk ? 'bg-emerald-400' : backendOk === false ? 'bg-amber-400' : 'bg-slate-400'
                }`}
              />
              {backendOk ? 'API Connected' : backendOk === false ? (HAS_BACKEND ? 'API Offline' : 'Demo Standalone') : 'Checking API…'}
            </div>
          </div>
        </div>
      </header>

      {/* Main App Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-6">
        {activeTab === 'studio_2d' && (
          <GraphStudio graphData={graphData} setGraphData={setGraphData} />
        )}

        {activeTab === 'studio_3d' && (
          <Studio3D graphData={graphData} setGraphData={setGraphData} />
        )}

        {activeTab === 'scanner' && (
          <ScannerStudio
            onDataExtracted={handleScannerExtracted}
            onNavigateToStudio={handleNavigateFromScanner}
          />
        )}

        {activeTab === 'chat' && (
          <AIAssistant graphData={graphData} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-4 text-center text-xs text-slate-500">
        AI Graph Finder • Built-in AI Vision & Math Engine • Interactive 2D & 3D Spatial Canvas
      </footer>
    </div>
    </>
  )
}
