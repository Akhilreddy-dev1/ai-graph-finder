
import React, { useEffect, useState } from 'react'
import {
  PanelLeftClose,
  PanelLeft,
  Box,
  BarChart3,
  Camera,
  Terminal,
  Table2,
  X,
  Sparkles,
} from 'lucide-react'
import Chart2D from './components/Chart2D'
import Chart3D from './components/Chart3D'
import ControlsSidebar from './components/ControlsSidebar'
import NodeDetailsPanel from './components/NodeDetailsPanel'
import ScannerStudio from './components/ScannerStudio'
import AIAssistant from './components/AIAssistant'
import DataGrid from './components/DataGrid'
import LandingPage3D from './components/LandingPage3D'
import { healthCheck, CLIENT_PRESETS_2D, CLIENT_PRESETS_3D } from './api'

export default function App() {
  const [activeTab, setActiveTab] = useState('studio_3d')
  const [chartType, setChartType] = useState('line')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedNode, setSelectedNode] = useState(null)
  const [showTableModal, setShowTableModal] = useState(false)
  const [backendOk, setBackendOk] = useState(null)
  const [cameraCoords, setCameraCoords] = useState(null)
  const [currentCameraCoords, setCurrentCameraCoords] = useState(null)

  const [physicsOpts, setPhysicsOpts] = useState({
    autoRotate: true,
    showStems: true,
    showCurve: true,
    showGrid: true,
  })

  // Landing page: always show on fresh session; re-openable via navbar / sidebar button
  const [showLanding, setShowLanding] = useState(() => {
    try {
      return !sessionStorage.getItem('agf_entered')
    } catch {
      return true
    }
  })

  const handleEnterApp = () => {
    try { sessionStorage.setItem('agf_entered', '1') } catch {}
    setShowLanding(false)
  }

  const [graphData, setGraphData] = useState(() => {
    try {
      const stored = localStorage.getItem('agf_active_graph')
      return stored ? JSON.parse(stored) : CLIENT_PRESETS_3D.helix_3d
    } catch {
      return CLIENT_PRESETS_3D.helix_3d
    }
  })

  useEffect(() => {
    if (graphData) {
      try { localStorage.setItem('agf_active_graph', JSON.stringify(graphData)) } catch {}
    }
  }, [graphData])

  useEffect(() => {
    let mounted = true
    healthCheck()
      .then(res => { if (mounted) setBackendOk(res?.status === 'ok') })
      .catch(() => { if (mounted) setBackendOk(false) })
    return () => { mounted = false }
  }, [])

  const handleTabSwitch = (tab) => {
    if (tab === 'studio_3d' && graphData.chart_type !== '3d') setGraphData(CLIENT_PRESETS_3D.helix_3d)
    else if (tab === 'studio_2d' && graphData.chart_type === '3d') setGraphData(CLIENT_PRESETS_2D.growth)
    setActiveTab(tab)
  }

  const handleScannerExtracted = (scannedData) => {
    setGraphData(scannedData)
    setSelectedNode(null)
  }

  const handleNavigateFromScanner = (targetMode) => {
    if (targetMode === '3d') {
      if (!graphData.z || graphData.chart_type !== '3d') {
        const synZ = graphData.y.map((v, i) => Number((v * 0.4 + i * 2.5).toFixed(1)))
        setGraphData({ ...graphData, z: synZ, chart_type: '3d' })
      }
      setActiveTab('studio_3d')
    } else {
      setActiveTab('studio_2d')
    }
  }

  const nPoints = graphData?.x?.length || 0
  const yVals   = graphData?.y || []
  const yMax    = yVals.length ? Math.max(...yVals).toFixed(2) : '0'
  const yMean   = yVals.length ? (yVals.reduce((a, b) => a + b, 0) / yVals.length).toFixed(2) : '0'

  return (
    <>
      {showLanding && <LandingPage3D onEnter={handleEnterApp} />}

      <div className="relative w-screen h-screen overflow-hidden bg-[#0d1117] text-[#e6edf3] select-none font-sans">
        {/* ── Slim Top Bar ── */}
        <header className="fixed top-0 inset-x-0 h-10 bg-[#0d1117]/85 backdrop-blur-md border-b border-[#30363d] px-3 flex items-center justify-between z-40">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 rounded text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors"
              title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#f0f6fc] tracking-tight">AI Graph Finder</span>
              <span className="mono text-[10px] text-[#8b949e] px-1.5 rounded bg-[#161b22] border border-[#30363d]">2.0 PRO</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 ml-2 pl-2 border-l border-[#30363d]">
              <span className="mono text-[11px] text-[#8b949e]">dataset:</span>
              <span className="mono text-[11px] text-[var(--accent)] font-medium">{graphData?.label || 'Active Graph'}</span>
            </div>
          </div>

          {/* Centre nav */}
          <div className="flex items-center gap-1 bg-[#161b22] p-0.5 rounded border border-[#30363d]">
            <button
              onClick={() => setShowLanding(true)}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium text-[#79c0ff] hover:text-white hover:bg-[#21262d] transition-colors"
              title="Show Landing Page"
            >
              <Sparkles className="w-3 h-3 text-[#38bdf8]" />
              <span>Landing</span>
            </button>
            {[
              { id: 'studio_3d', icon: <Box className="w-3 h-3 text-[#58a6ff]" />, label: '3D' },
              { id: 'studio_2d', icon: <BarChart3 className="w-3 h-3 text-[#3fb950]" />, label: '2D' },
              { id: 'scanner',   icon: <Camera className="w-3 h-3" />,   label: '' },
              { id: 'chat',      icon: <Terminal className="w-3 h-3" />, label: '' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => t.id === 'scanner' || t.id === 'chat' ? setActiveTab(t.id) : handleTabSwitch(t.id)}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  activeTab === t.id
                    ? 'bg-[#21262d] text-[#f0f6fc] border border-[#388bfd]/40'
                    : 'text-[#8b949e] hover:text-[#e6edf3]'
                }`}
                title={t.id}
              >
                {t.icon}
                {t.label && <span>{t.label}</span>}
              </button>
            ))}
          </div>

          {/* Right status */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTableModal(true)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-[11px] text-[#8b949e] hover:text-[#e6edf3] transition-colors"
            >
              <Table2 className="w-3 h-3" />
              <span className="hidden md:inline">Table</span>
            </button>
            <div className="hidden lg:flex items-center gap-2 mono text-[11px] text-[#8b949e] border-l border-[#30363d] pl-2">
              <span>n={nPoints}</span>
              <span>max={yMax}</span>
              <span>mean={yMean}</span>
            </div>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#161b22] border border-[#30363d] mono text-[10px] text-[#8b949e]">
              <span className={`w-1.5 h-1.5 rounded-full ${backendOk ? 'bg-[var(--success)]' : backendOk === false ? 'bg-[var(--warn)]' : 'bg-[#484f58]'}`} />
              <span className="hidden sm:inline">{backendOk ? 'api' : backendOk === false ? 'local' : 'sync'}</span>
            </div>
          </div>
        </header>

        {/* ── Full-screen canvas layer ── */}
        <div className="absolute inset-0 pt-10 w-full h-full z-0 overflow-hidden bg-[#0d1117]">
          {activeTab === 'studio_3d' && (
            <Chart3D
              data={graphData}
              physicsOpts={physicsOpts}
              selectedIndex={selectedNode}
              onNodeClick={(idx) => setSelectedNode(idx)}
              cameraCoords={cameraCoords}
              onCameraChange={setCurrentCameraCoords}
            />
          )}

          {activeTab === 'studio_2d' && (
            <div className="w-full h-full p-4 flex items-center justify-center">
              <div className="w-full h-full max-w-6xl max-h-[85vh]">
                <Chart2D
                  data={graphData}
                  chartType={chartType}
                  selectedIndex={selectedNode}
                  onNodeClick={(idx) => setSelectedNode(idx)}
                />
              </div>
            </div>
          )}

          {activeTab === 'scanner' && (
            <div className="w-full h-full overflow-y-auto pt-6 px-4 pb-12 z-10 relative">
              <ScannerStudio
                onDataExtracted={handleScannerExtracted}
                onNavigateToStudio={handleNavigateFromScanner}
              />
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="w-full h-full max-w-3xl mx-auto pt-6 px-4 pb-12 z-10 relative">
              <div className="h-[80vh] glass-panel rounded-lg shadow-2xl border border-[#30363d] overflow-hidden">
                <AIAssistant graphData={graphData} />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
          <ControlsSidebar
            graphData={graphData}
            setGraphData={(d) => { setGraphData(d); setSelectedNode(null) }}
            activeTab={activeTab}
            setActiveTab={handleTabSwitch}
            chartType={chartType}
            setChartType={setChartType}
            physicsOpts={physicsOpts}
            setPhysicsOpts={setPhysicsOpts}
            backendOk={backendOk}
            onOpenLanding={() => setShowLanding(true)}
            onMoveCamera={setCameraCoords}
            currentCameraCoords={currentCameraCoords}
          />
        )}

        {/* Node Details Panel */}
        {selectedNode !== null && (
          <NodeDetailsPanel
            node={selectedNode}
            graphData={graphData}
            onUpdateData={setGraphData}
            onClose={(nextIdx) => {
              if (typeof nextIdx === 'number') setSelectedNode(nextIdx)
              else setSelectedNode(null)
            }}
            onMoveCamera={setCameraCoords}
          />
        )}

        {/* Table Modal */}
        {showTableModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto glass-panel rounded-xl shadow-2xl border border-[#30363d]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d]">
                <span className="mono text-xs font-semibold text-[#f0f6fc]">DATA_TABLE: {graphData?.label || 'Graph'}</span>
                <button
                  onClick={() => setShowTableModal(false)}
                  className="p-1 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4">
                <DataGrid
                  data={graphData}
                  onUpdateData={setGraphData}
                  onResetData={() => setGraphData(CLIENT_PRESETS_3D.helix_3d)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
