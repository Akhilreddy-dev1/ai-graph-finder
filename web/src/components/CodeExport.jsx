import React, { useState } from 'react'
import { Copy, Check, Download, FileCode, FileSpreadsheet } from 'lucide-react'

export default function CodeExport({ data }) {
  const [copied, setCopied] = useState(false)

  if (!data) return null

  const pythonCode = `import json
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

# Extracted dataset from AI Graph Finder 2.0
data = {
    "label": "${data.label || 'Extracted Graph'}",
    "chart_type": "${data.chart_type || 'line'}",
    "x": ${JSON.stringify(data.x || [])},
    "y": ${JSON.stringify(data.y || [])},
    "z": ${JSON.stringify(data.z || null)}
}

df = pd.DataFrame({"X": data["x"], "Y": data["y"]})

# 2D Interactive Plot
chart_type = data.get("chart_type", "line")
if chart_type == "bar":
    fig = px.bar(df, x="X", y="Y", title=data["label"], color="Y", color_continuous_scale="Viridis")
elif chart_type == "scatter":
    fig = px.scatter(df, x="X", y="Y", title=data["label"], size="Y", color="Y")
else:
    fig = px.line(df, x="X", y="Y", title=data["label"], markers=True)

fig.update_layout(template="plotly_dark")
fig.show()

# 3D Spatial Plot
if data.get("z"):
    df_3d = pd.DataFrame({"X": data["x"], "Y": data["y"], "Z": data["z"]})
    fig_3d = px.scatter_3d(df_3d, x="X", y="Y", z="Z", title=f'{data["label"]} (3D)', color="Z")
    fig_3d.update_layout(template="plotly_dark")
    fig_3d.show()
`

  const copyToClipboard = () => {
    navigator.clipboard.writeText(pythonCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadPython = () => downloadFile(pythonCode, 'replicate_graph.py', 'text/x-python')
  const downloadJSON = () => downloadFile(JSON.stringify(data, null, 2), 'graph_data.json', 'application/json')
  const downloadCSV = () => {
    let csv = 'x,y' + (data.z ? ',z\n' : '\n')
    for (let i = 0; i < data.x.length; i++) {
      csv += `${data.x[i]},${data.y[i]}` + (data.z ? `,${data.z[i]}\n` : '\n')
    }
    downloadFile(csv, 'graph_data.csv', 'text/csv')
  }

  return (
    <div className="p-4 glass-card rounded-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-indigo-400" />
          <h4 className="text-sm font-semibold text-slate-200">Recreation Code & Export</h4>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors border border-slate-700"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy Python'}
          </button>
          <button
            onClick={downloadPython}
            className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded text-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            .py Script
          </button>
          <button
            onClick={downloadCSV}
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded text-xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            .csv
          </button>
          <button
            onClick={downloadJSON}
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-600/80 hover:bg-amber-600 text-white rounded text-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            .json
          </button>
        </div>
      </div>

      <div className="relative">
        <pre className="bg-[#050811] p-3 text-xs rounded-lg text-indigo-200 font-mono overflow-x-auto max-h-56 border border-slate-800/80">
          {pythonCode}
        </pre>
      </div>
    </div>
  )
}
