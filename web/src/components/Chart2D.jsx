import React, { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

export default function Chart2D({ data, chartType = 'line' }) {
  if (!data || !data.x || !data.y || data.x.length === 0) {
    return (
      <div className="h-full min-h-[380px] flex flex-col items-center justify-center text-gray-500 glass-card">
        <p className="text-sm">No graph coordinates loaded.</p>
        <p className="text-xs text-gray-600 mt-1">Capture a graph or select a preset to visualize.</p>
      </div>
    )
  }

  const chartData = useMemo(() => {
    const labels = data.x.map(val => (typeof val === 'number' ? `X: ${val}` : String(val)))
    return {
      labels,
      datasets: [
        {
          label: data.label || 'Extracted Curve',
          data: data.y,
          borderColor: '#818cf8',
          backgroundColor: (context) => {
            const ctx = context.chart.ctx
            const gradient = ctx.createLinearGradient(0, 0, 0, 360)
            gradient.addColorStop(0, 'rgba(99, 102, 241, 0.45)')
            gradient.addColorStop(0.7, 'rgba(99, 102, 241, 0.08)')
            gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)')
            return gradient
          },
          borderWidth: 2.5,
          pointBackgroundColor: '#06b6d4',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1.5,
          pointRadius: 4.5,
          pointHoverRadius: 7,
          pointHoverBackgroundColor: '#a855f7',
          pointHoverBorderColor: '#ffffff',
          tension: 0.35,
          fill: true,
        },
      ],
    }
  }, [data])

  const options = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#cbd5e1',
            font: { size: 12, family: 'Inter', weight: '500' },
            boxWidth: 12,
            boxHeight: 12,
            usePointStyle: true,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(99, 102, 241, 0.3)',
          borderWidth: 1,
          padding: 12,
          boxPadding: 6,
          usePointStyle: true,
          callbacks: {
            label: (item) => ` Value (Y): ${item.parsed.y} ${data.unit ? `(${data.unit})` : ''}`,
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
          },
          ticks: {
            color: '#94a3b8',
            font: { size: 11, family: 'Inter' },
          },
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.06)',
          },
          ticks: {
            color: '#94a3b8',
            font: { size: 11, family: 'Inter' },
          },
        },
      },
    }
  }, [data.unit])

  const effectiveType = chartType || data.chart_type || 'line'

  return (
    <div className="w-full h-full min-h-[380px] p-3">
      {effectiveType === 'bar' ? (
        <Bar data={chartData} options={options} />
      ) : (
        <Line data={chartData} options={options} />
      )}
    </div>
  )
}
