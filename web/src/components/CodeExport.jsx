
import React, { useState } from 'react'
import { Copy, Check, Download, FileCode, FileSpreadsheet } from 'lucide-react'

export default function CodeExport({ data }) {
  const [copied, setCopied] = useState(false)

  if (!data) return null

  const pythonCode = `import json
import pandas as pd
import plotly.express as px

# Dataset extracted with AI Graph Finder 2.0
data = {
    "label": "${data.label || 'Extracted Graph'}",
    "chart_type": "${data.chart_type || 'line'}",
    "x": ${JSON.stringify(data.x || [])},
    "y": ${JSON.stringify(data.y || [])},
    "z": ${JSON.stringify(data.z || null)}
}

df = pd.DataFrame({"X": data["x"], "Y": data["y"]})

# 2D visualization
fig = px.line(df, x="X", y="Y", title=data["label"], markers=True)
fig.update_layout(template="plotly_dark")
fig.show()

# 3D visualization (if Z axis exists)
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
    <div className="p-3.5 glass-panel rounded-lg text-[var(--text-pri)]">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5">
          <FileCode className="w-3.5 h-3.5 text-[var(--text-sec)]" />
          <span className="text-xs font-semibold">Python Plotly & Export</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#21262d] hover:bg-[#30363d] text-[var(--text-pri)] rounded text-[11px] border border-[#30363d] transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-[var(--success)]" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={downloadPython}
            className="mono flex items-center gap-1 px-2.5 py-1 bg-[#238636] hover:bg-[#2ea043] text-white rounded text-[11px] font-medium transition-colors"
          >
            <Download className="w-3 h-3" />
            .py
          </button>
          <button
            onClick={downloadCSV}
            className="mono flex items-center gap-1 px-2.5 py-1 bg-[#21262d] hover:bg-[#30363d] text-[var(--text-pri)] rounded text-[11px] border border-[#30363d] transition-colors"
          >
            <FileSpreadsheet className="w-3 h-3" />
            .csv
          </button>
          <button
            onClick={downloadJSON}
            className="mono flex items-center gap-1 px-2.5 py-1 bg-[#21262d] hover:bg-[#30363d] text-[var(--text-pri)] rounded text-[11px] border border-[#30363d] transition-colors"
          >
            <Download className="w-3 h-3" />
            .json
          </button>
        </div>
      </div>

      <pre className="mono bg-[#0d1117] p-2.5 text-[11px] rounded text-[#79c0ff] overflow-x-auto max-h-52 border border-[#30363d]">
        {pythonCode}
      </pre>
    </div>
  )
}
