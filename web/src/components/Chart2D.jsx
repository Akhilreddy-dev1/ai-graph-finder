
import React, { useMemo, useCallback } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

export default function Chart2D({ data, chartType = 'line', selectedIndex = null, onNodeClick }) {
  if (!data || !data.x || !data.y || data.x.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center" style={{ color: 'var(--text-muted)' }}>
        <p className="text-sm">No graph coordinates loaded.</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Select a preset or scan a graph.</p>
      </div>
    )
  }

  const ACCENT   = '#388bfd'
  const LINE_CLR = '#58a6ff'
  const DOT_CLR  = '#388bfd'
  const SEL_CLR  = '#f0f6fc'

  const chartData = useMemo(() => ({
    labels: data.x.map(v => typeof v === 'number' ? v.toFixed(2) : String(v)),
    datasets: [{
      label: data.label || 'Series',
      data: data.y,
      borderColor: LINE_CLR,
      backgroundColor: (ctx) => {
        const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height)
        g.addColorStop(0, 'rgba(56,139,253,0.22)')
        g.addColorStop(1, 'rgba(56,139,253,0.01)')
        return g
      },
      borderWidth: 1.8,
      pointBackgroundColor: data.y.map((_, i) => i === selectedIndex ? SEL_CLR : DOT_CLR),
      pointBorderColor: data.y.map((_, i) => i === selectedIndex ? '#fff' : 'rgba(56,139,253,0.4)'),
      pointBorderWidth: data.y.map((_, i) => i === selectedIndex ? 2 : 1),
      pointRadius: data.y.map((_, i) => i === selectedIndex ? 7 : 4),
      pointHoverRadius: 7,
      pointHoverBackgroundColor: SEL_CLR,
      tension: 0.3,
      fill: true,
    }]
  }), [data, selectedIndex])

  const onClick = useCallback((event, elements) => {
    if (elements.length > 0 && onNodeClick) {
      onNodeClick(elements[0].index)
    }
  }, [onNodeClick])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    onClick,
    plugins: {
      legend: {
        display: true, position: 'top',
        labels: { color: '#8b949e', font: { size: 11, family: 'Inter' }, boxWidth: 10, usePointStyle: true }
      },
      tooltip: {
        backgroundColor: 'rgba(22,27,34,0.97)',
        titleColor: '#e6edf3',
        bodyColor: '#8b949e',
        borderColor: 'rgba(48,54,61,0.9)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (item) => {
            const f = (v) => typeof v === 'number' ? v.toFixed(4) : v
            return ` y = ${f(item.parsed.y)}`
          },
          title: (items) => `Point #${items[0].dataIndex + 1}  x = ${f2(data.x[items[0].dataIndex])}`
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(48,54,61,0.5)', lineWidth: 0.5 },
        ticks: { color: '#484f58', font: { size: 10, family: 'JetBrains Mono, monospace' } }
      },
      y: {
        grid: { color: 'rgba(48,54,61,0.5)', lineWidth: 0.5 },
        ticks: { color: '#484f58', font: { size: 10, family: 'JetBrains Mono, monospace' } }
      }
    },
    animation: { duration: 150 }
  }), [data, onClick])

  const f2 = (v) => typeof v === 'number' ? v.toFixed(2) : v
  const effectiveType = chartType || data.chart_type || 'line'

  return (
    <div className="w-full h-full" style={{ cursor: 'crosshair' }}>
      {effectiveType === 'bar'
        ? <Bar data={chartData} options={options} />
        : <Line data={chartData} options={options} />}
    </div>
  )
}
