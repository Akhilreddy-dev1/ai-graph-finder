import React, { useState } from 'react'
import {
  Camera,
  Layers,
  Box,
  Columns,
  Table,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Activity,
  Code2,
  FileSpreadsheet,
  BarChart3,
  LineChart,
} from 'lucide-react'
import Chart2D from './Chart2D'
import Chart3D from './Chart3D'
import DataGrid from './DataGrid'
import CodeExport from './CodeExport'
import ScannerModal from './ScannerModal'
import { CLIENT_PRESETS } from '../api'

export default function GraphStudio({ graphData, setGraphData, onOpenScanner }) {
  const [viewMode, setViewMode] = useState('2d') // '2d', '3d', 'split', 'table'
  const [chartType, setChartType] = useState('line')
  const [bottomTab, setBottomTab] = useState('data') // 'data', 'code', 'insights'
  const [scannerOpen, setScannerOpen] = useState(false)

  const handlePresetSelect = (presetKey) => {
    if (CLIENT_PRESETS[presetKey]) {
      setGraphData(CLIENT_PRESETS[presetKey])
    }
  }

  // Calculate metrics
  const x = graphData?.x || []
  const y = graphData?.y || []
  const n = x.length
  const yMin = n > 0 ? Math.min(...y) : 0
  const yMax = n > 0 ? Math.max(...y) : 0
  const yMean = n > 0 ? y.reduce((a, b) => a + b, 0) / n : 0

  let slope = 0
  if (n > 1) {
    const xMean = x.reduce((a, b) => a + b, 0) / n
    let num = 0, den = 0
    for (let i = 0; i < n; i++) {
      num += (x[i] - xMean) * (y[i] - yMean)
      den += Math.pow(x[i] - xMean, 2)
    }
    slope = den !== 0 ? num / den : 0
  }

  const isUpward = slope > 0.05
  const isDownward = slope < -0.05

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 glass-card rounded-2xl">
        {/* Preset Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
            Presets:
          </span>
          <button
            onClick={() => handlePresetSelect('growth')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              graphData?.label?.includes('Growth') || graphData?.label?.includes('Technology')
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Growth Curve
          </button>
          <button
            onClick={() => handlePresetSelect('sine')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              graphData?.label?.includes('Harmonic') || graphData?.label?.includes('Sine')
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Sine 3D Helix
          </button>
          <button
            onClick={() => handlePresetSelect('stock')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              graphData?.label?.includes('Stock') || graphData?.label?.includes('Market')
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Stock Volatility
          </button>
          <button
            onClick={() => handlePresetSelect('bell')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              graphData?.label?.includes('Normal') || graphData?.label?.includes('Gaussian')
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Bell Curve
          </button>
          <button
            onClick={() => handlePresetSelect('sales')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              graphData?.label?.includes('Revenue') || graphData?.label?.includes('Sales')
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Quarterly Sales
          </button>
          <button
            onClick={() => handlePresetSelect('saddle')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              graphData?.label?.includes('Surface') || graphData?.label?.includes('Saddle')
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            3D Saddle
          </button>
        </div>

        {/* Scan & View Controls */}
        <div className="flex items-center gap-2">
          {/* Scan Action */}
          <button
            onClick={() => setScannerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all hover:scale-105"
          >
            <Camera className="w-3.5 h-3.5" />
            Scan / Upload Graph
          </button>

          {/* View Mode Switcher */}
          <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('2d')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                viewMode === '2d' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="2D Interactive Chart"
            >
              <LineChart className="w-3.5 h-3.5" />
              2D
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                viewMode === '3d' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="3D Spatial Visualizer"
            >
              <Box className="w-3.5 h-3.5" />
              3D
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'split' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Split View"
            >
              <Columns className="w-3.5 h-3.5" />
              Dual
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 glass-card rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Data Points</div>
            <div className="text-lg font-bold text-slate-100">{n} pairs</div>
          </div>
        </div>

        <div className="p-3 glass-card rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Maximum Peak</div>
            <div className="text-lg font-bold text-emerald-400">{yMax}</div>
          </div>
        </div>

        <div className="p-3 glass-card rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Minimum Trough</div>
            <div className="text-lg font-bold text-amber-400">{yMin}</div>
          </div>
        </div>

        <div className="p-3 glass-card rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Trajectory</div>
            <div className="text-sm font-bold text-purple-300">
              {isUpward ? '📈 Upward Growth' : isDownward ? '📉 Declining' : '〰️ Periodic / Stable'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Visualizer Stage */}
      <div className="glass-card rounded-2xl p-4 min-h-[420px] shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-100">{graphData?.label || 'Active Graph'}</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              {graphData?.chart_type?.toUpperCase() || 'LINE'}
            </span>
          </div>

          {viewMode === '2d' && (
            <div className="flex items-center gap-1 bg-slate-900/60 p-0.5 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setChartType('line')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                  chartType === 'line' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Line
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                  chartType === 'bar' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Bar
              </button>
            </div>
          )}
        </div>

        {viewMode === '2d' && (
          <div className="h-[400px]">
            <Chart2D data={graphData} chartType={chartType} />
          </div>
        )}

        {viewMode === '3d' && (
          <div className="h-[400px]">
            <Chart3D data={graphData} />
          </div>
        )}

        {viewMode === 'split' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[400px]">
            <div className="h-full">
              <Chart2D data={graphData} chartType={chartType} />
            </div>
            <div className="h-full">
              <Chart3D data={graphData} />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sub-Panels: Data Points & Python Code */}
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
            Data Points Editor
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
            Python & Data Export
          </button>
        </div>

        {bottomTab === 'data' && (
          <DataGrid
            data={graphData}
            onUpdateData={setGraphData}
            onResetData={() => handlePresetSelect('growth')}
          />
        )}

        {bottomTab === 'code' && <CodeExport data={graphData} />}
      </div>

      {/* Scanner Modal */}
      <ScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDataExtracted={(data) => setGraphData(data)}
      />
    </div>
  )
}
