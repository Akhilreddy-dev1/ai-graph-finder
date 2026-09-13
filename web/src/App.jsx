import React, { useEffect, useState } from 'react'
import { BarChart3, Bot, Network, Sparkles, Activity, CheckCircle2, CloudOff } from 'lucide-react'
import GraphStudio from './components/GraphStudio'
import AIAssistant from './components/AIAssistant'
import NodeStudio from './components/NodeStudio'
import { healthCheck, CLIENT_PRESETS } from './api'
import { HAS_BACKEND } from './config'
import CameraPanel from './components/CameraPanel'
import ManualGraphBuilder from './components/ManualGraphBuilder'
import AssistantPanel from './components/AssistantPanel'
import LandingPage from './components/LandingPage'

function SignalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 19a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm0-7a9 9 0 0 1 9 9m-9-16a16 16 0 0 1 16 16" />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Zm7 14 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" />
    </svg>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState('studio') // 'studio', 'chat', 'nodes'
  const [backendOk, setBackendOk] = useState(null)

  // Active graph data state (shared across Graph Studio & AI Assistant)
  const [graphData, setGraphData] = useState(() => {
    try {
      const stored = localStorage.getItem('agf_active_graph')
      return stored ? JSON.parse(stored) : CLIENT_PRESETS.growth
    } catch {
      return CLIENT_PRESETS.growth
    }
  })

  // Session state for Node Network studio
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('agf_session') || 'null')
    } catch {
      return null
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

  // Save session changes
  useEffect(() => {
    if (session) localStorage.setItem('agf_session', JSON.stringify(session))
    else localStorage.removeItem('agf_session')
  }, [session])

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

  function enterStudio() {
    window.history.replaceState(null, '', '#studio')
    setShowLanding(false)
  }

  function returnToOverview() {
    window.history.replaceState(null, '', window.location.pathname)
    setShowLanding(true)
  }

  if (showLanding) return <LandingPage onEnter={enterStudio} />

  return (
    <div className="min-h-screen bg-[#080c16] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#0a0e1c]/80 backdrop-blur-xl border-b border-indigo-500/15 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Brand & Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-[#0b1021] rounded-[11px] flex items-center justify-center text-indigo-400">
                <BarChart3 className="w-5 h-5" />
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
              onClick={() => setActiveTab('studio')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'studio'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Graph Studio
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

            <button
              onClick={() => setActiveTab('nodes')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'nodes'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              Node Network
            </button>
          </nav>

          {/* Right Status Indicators */}
          <div className="flex items-center gap-2 text-xs">
            {/* Built-in AI Status */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-950/60 border border-indigo-500/30 text-indigo-300">
              <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span className="font-medium text-[11px]">Built-in AI Active</span>
            </div>

            {/* Backend connection pill */}
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

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-6">
        {activeTab === 'studio' && (
          <GraphStudio graphData={graphData} setGraphData={setGraphData} />
        )}

        {activeTab === 'chat' && (
          <AIAssistant graphData={graphData} />
        )}

        {activeTab === 'nodes' && (
          <NodeStudio session={session} setSession={setSession} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-4 text-center text-xs text-slate-500">
        AI Graph Finder — Node Studio • Powered by Built-in AI & Spatial 3D Engine
      </footer>
    </div>
  )
}
