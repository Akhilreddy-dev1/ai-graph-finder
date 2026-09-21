import React, { useState } from 'react'
import { Box, Sparkles, Activity, Layers, RotateCcw, Table, Code2 } from 'lucide-react'
import Chart3D from './Chart3D'
import DataGrid from './DataGrid'
import CodeExport from './CodeExport'
import { CLIENT_PRESETS_3D } from '../api'

export default function Studio3D({ graphData, setGraphData }) {
  const [bottomTab, setBottomTab] = useState('data') // 'data' or 'code'

  const handlePresetSelect = (presetKey) => {
    if (CLIENT_PRESETS_3D[presetKey]) {
      setGraphData(CLIENT_PRESETS_3D[presetKey])
    }
  }

  // Ensure active graph has 3D properties
  const is3D = Boolean(graphData?.chart_type === '3d' && Array.isArray(graphData?.z) && graphData.z.length === graphData.x?.length)

  const x = graphData?.x || []
  const y = graphData?.y || []
  const z = graphData?.z || []
  const n = x.length

  const zMin = z.length > 0 ? Math.min(...z) : 0
  const zMax = z.length > 0 ? Math.max(...z) : 0
  const yMax = y.length > 0 ? Math.max(...y) : 0

  return (
    <div className="space-y-4">
      {/* Top 3D Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 glass-card rounded-2xl">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
            <Box className="w-3.5 h-3.5" />
            3D Spatial Presets:
          </span>
          <button
            onClick={() => handlePresetSelect('helix_3d')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              graphData?.label?.includes('Helix')
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            3D Harmonic Helix
          </button>
          <button
            onClick={() => handlePresetSelect('saddle_3d')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              graphData?.label?.includes('Saddle')
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            3D Hyperbolic Saddle
          </button>
          <button
            onClick={() => handlePresetSelect('spiral_3d')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              graphData?.label?.includes('Torus') || graphData?.label?.includes('Vortex')
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            3D Torus Vortex
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 font-medium text-[11px]">
            Spatial Dimension Mode
          </span>
        </div>
      </div>

      {/* 3D Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 glass-card rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">3D Coordinates</div>
            <div className="text-lg font-bold text-slate-100">{n} triplets (X,Y,Z)</div>
          </div>
        </div>

        <div className="p-3 glass-card rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Max Z Elevation</div>
            <div className="text-lg font-bold text-cyan-400">{zMax}</div>
          </div>
        </div>

        <div className="p-3 glass-card rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Min Z Depth</div>
            <div className="text-lg font-bold text-purple-400">{zMin}</div>
          </div>
        </div>

        <div className="p-3 glass-card rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Peak Y Amplitude</div>
            <div className="text-lg font-bold text-emerald-400">{yMax}</div>
          </div>
        </div>
      </div>

      {/* Main 3D Spatial Canvas Stage */}
      <div className="glass-card rounded-2xl p-4 min-h-[460px] shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Box className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-slate-100">{graphData?.label || '3D Spatial Graph'}</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              3D SPATIAL STAGE
            </span>
          </div>
        </div>

        <div className="h-[440px]">
          <Chart3D data={graphData} />
        </div>
      </div>

      {/* Sub-Panels: 3D Data Points & Python Code */}
      <div className="space-y-3">
        <div className="flex gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setBottomTab('data')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              bottomTab === 'data'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            3D Coordinates Table (X, Y, Z)
          </button>
          <button
            onClick={() => setBottomTab('code')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              bottomTab === 'code'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Python Plotly 3D Code Export
          </button>
        </div>

        {bottomTab === 'data' && (
          <DataGrid
            data={graphData}
            onUpdateData={setGraphData}
            onResetData={() => handlePresetSelect('helix_3d')}
          />
        )}

        {bottomTab === 'code' && <CodeExport data={graphData} />}
      </div>
    </div>
  )
}
