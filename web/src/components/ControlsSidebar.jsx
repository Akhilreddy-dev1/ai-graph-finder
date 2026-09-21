
import React, { useState } from 'react'
import { Search, ChevronDown, ChevronRight, RotateCcw, Download, FileCode, FileSpreadsheet, Eye, EyeOff, Camera, Bot } from 'lucide-react'
import { CLIENT_PRESETS_2D, CLIENT_PRESETS_3D } from '../api'

export default function ControlsSidebar({
  graphData, setGraphData,
  activeTab, setActiveTab,
  chartType, setChartType,
  physicsOpts, setPhysicsOpts,
  backendOk
}) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState({ datasets: true, type: true, physics: true, export: false })

  const toggle = (key) => setExpanded(p => ({ ...p, [key]: !p[key] }))

  // Download helpers
  const dl = (content, name, mime) => {
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([content], { type: mime })), download: name })
    a.click(); URL.revokeObjectURL(a.href)
  }
  const downloadCSV = () => {
    let csv = 'x,y' + (graphData.z ? ',z\n' : '\n')
    graphData.x.forEach((v, i) => { csv += `${v},${graphData.y[i]}` + (graphData.z ? `,${graphData.z[i]}\n` : '\n') })
    dl(csv, 'graph_data.csv', 'text/csv')
  }
  const downloadJSON = () => dl(JSON.stringify(graphData, null, 2), 'graph_data.json', 'application/json')
  const downloadPY = () => {
    const py = `import pandas as pd\nimport plotly.express as px\ndata = ${JSON.stringify(graphData, null, 2)}\ndf = pd.DataFrame({"X": data["x"], "Y": data["y"]})\nfig = px.line(df, x="X", y="Y", title=data["label"])\nfig.update_layout(template="plotly_dark")\nfig.show()\n`
    dl(py, 'graph.py', 'text/x-python')
  }

  const allPresets = [
    { key: 'growth',   label: 'Growth Curve',   group: '2D' },
    { key: 'stock',    label: 'Stock Trend',     group: '2D' },
    { key: 'bell',     label: 'Bell Curve',      group: '2D' },
    { key: 'sales',    label: 'Quarterly Sales', group: '2D' },
    { key: 'helix_3d',  label: 'Helix (3D)',     group: '3D' },
    { key: 'saddle_3d', label: 'Saddle (3D)',    group: '3D' },
    { key: 'spiral_3d', label: 'Vortex (3D)',    group: '3D' },
  ]
  const filtered = allPresets.filter(p => p.label.toLowerCase().includes(search.toLowerCase()))

  const selectPreset = (key) => {
    const preset = CLIENT_PRESETS_2D[key] || CLIENT_PRESETS_3D[key]
    if (!preset) return
    setGraphData(preset)
    if (key.endsWith('_3d') && activeTab !== 'studio_3d') setActiveTab('studio_3d')
    else if (!key.endsWith('_3d') && activeTab !== 'studio_2d') setActiveTab('studio_2d')
  }

  const activeLabel = graphData?.label || ''
  const isActivePreset = (key) => {
    const p = CLIENT_PRESETS_2D[key] || CLIENT_PRESETS_3D[key]
    return p?.label === activeLabel
  }

  const SectionHeader = ({ id, title }) => (
    <button
      onClick={() => toggle(id)}
      className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-sec)] transition-colors"
    >
      <span>{title}</span>
      {expanded[id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
    </button>
  )

  return (
    <aside className="glass-panel panel-slide-left fixed left-0 top-10 bottom-0 w-56 z-30 flex flex-col overflow-hidden" style={{ borderRight: '1px solid var(--border)', borderTop: 'none' }}>
      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-[rgba(13,17,23,0.8)] border border-[var(--border)]">
          <Search className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter datasets..."
            className="bg-transparent text-[11px] text-[var(--text-pri)] placeholder-[var(--text-muted)] outline-none w-full"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* View switcher */}
        <div className="px-3 pb-2 flex gap-1">
          {[
            { id: 'studio_2d', label: '2D' },
            { id: 'studio_3d', label: '3D' },
            { id: 'scanner',   label: <Camera className="w-3 h-3" /> },
            { id: 'chat',      label: <Bot className="w-3 h-3" /> },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 flex items-center justify-center py-1 rounded text-[10px] font-semibold transition-all ${
                activeTab === t.id
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[rgba(48,54,61,0.4)] text-[var(--text-sec)] hover:bg-[rgba(48,54,61,0.8)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="h-px bg-[var(--border)] mx-3 mb-1" />

        {/* Datasets */}
        <SectionHeader id="datasets" title="Dataset" />
        {expanded.datasets && (
          <div className="px-2 pb-2 space-y-0.5">
            {['2D','3D'].map(grp => {
              const items = filtered.filter(p => p.group === grp)
              if (!items.length) return null
              return (
                <div key={grp}>
                  <div className="px-1 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{grp}</div>
                  {items.map(p => (
                    <button
                      key={p.key}
                      onClick={() => selectPreset(p.key)}
                      className={`w-full text-left px-2 py-1.5 rounded text-[11px] flex items-center gap-2 transition-all ${
                        isActivePreset(p.key)
                          ? 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[rgba(56,139,253,0.3)]'
                          : 'text-[var(--text-sec)] hover:bg-[rgba(48,54,61,0.5)] hover:text-[var(--text-pri)]'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActivePreset(p.key) ? 'bg-[var(--accent)]' : 'bg-[var(--text-muted)]'}`} />
                      {p.label}
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        )}

        <div className="h-px bg-[var(--border)] mx-3 mb-1" />

        {/* Chart type (2D only) */}
        {(activeTab === 'studio_2d') && (
          <>
            <SectionHeader id="type" title="Chart Type" />
            {expanded.type && (
              <div className="px-3 pb-2 flex gap-1">
                {['line','bar','scatter'].map(t => (
                  <button
                    key={t}
                    onClick={() => setChartType(t)}
                    className={`flex-1 py-1 rounded text-[10px] font-semibold capitalize transition-all ${
                      chartType === t
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[rgba(48,54,61,0.4)] text-[var(--text-sec)] hover:bg-[rgba(48,54,61,0.8)]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
            <div className="h-px bg-[var(--border)] mx-3 mb-1" />
          </>
        )}

        {/* Physics */}
        {(activeTab === 'studio_3d' || activeTab === 'studio_2d') && (
          <>
            <SectionHeader id="physics" title="Render Options" />
            {expanded.physics && (
              <div className="px-3 pb-2 space-y-1">
                {[
                  { key: 'autoRotate', label: 'Auto-rotate', only3d: true },
                  { key: 'showStems',  label: 'Vertical stems', only3d: true },
                  { key: 'showCurve', label: 'Curve / line', only3d: false },
                  { key: 'showGrid',  label: 'Grid', only3d: false },
                ].filter(o => activeTab === 'studio_3d' ? true : !o.only3d).map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setPhysicsOpts(p => ({ ...p, [opt.key]: !p[opt.key] }))}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-[rgba(48,54,61,0.4)] transition-colors"
                  >
                    <span className="text-[11px] text-[var(--text-sec)]">{opt.label}</span>
                    <span className={`w-7 h-4 rounded-full relative transition-colors ${physicsOpts[opt.key] ? 'bg-[var(--accent)]' : 'bg-[rgba(48,54,61,0.8)]'}`}>
                      <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${physicsOpts[opt.key] ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="h-px bg-[var(--border)] mx-3 mb-1" />
          </>
        )}

        {/* Export */}
        <SectionHeader id="export" title="Export" />
        {expanded.export && (
          <div className="px-3 pb-3 space-y-1">
            {[
              { label: 'Python Script', icon: <FileCode className="w-3 h-3" />, fn: downloadPY },
              { label: 'CSV Data',      icon: <FileSpreadsheet className="w-3 h-3" />, fn: downloadCSV },
              { label: 'JSON',          icon: <Download className="w-3 h-3" />, fn: downloadJSON },
            ].map(btn => (
              <button key={btn.label} onClick={btn.fn}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-[var(--text-sec)] hover:bg-[rgba(48,54,61,0.5)] hover:text-[var(--text-pri)] transition-all">
                {btn.icon}
                {btn.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer status */}
      <div className="px-3 py-2 border-t border-[var(--border)] flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${backendOk ? 'bg-[var(--success)]' : 'bg-[var(--text-muted)]'}`} />
        <span className="text-[10px] text-[var(--text-muted)]">{backendOk ? 'API online' : 'Standalone mode'}</span>
      </div>
    </aside>
  )
}
