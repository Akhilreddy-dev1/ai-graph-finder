const COLORS = {
  root: '#7c3aed',
  line: '#06b6d4',
  bar: '#10b981',
  scatter: '#f97316',
  three: '#8b5cf6',
}

export function chartToGraph(chart) {
  if (!chart) return null
  const x = Array.isArray(chart.x) ? chart.x : []
  const y = Array.isArray(chart.y) ? chart.y : []
  const z = Array.isArray(chart.z) ? chart.z : []
  const chartType = chart.chart_type || 'line'
  const label = chart.label || 'Untitled graph'
  const nodes = [{
    id: 'chart-root',
    label,
    title: `${chartType} chart`,
    color: { background: COLORS.root },
    chart,
  }]
  const links = []

  x.forEach((value, index) => {
    const id = `point-${index}`
    const pointLabel = z.length > index
      ? `(${value}, ${y[index]}, ${z[index]})`
      : `(${value}, ${y[index]})`
    nodes.push({
      id,
      label: pointLabel,
      title: `${label} · point ${index + 1}`,
      color: { background: COLORS[chartType] || COLORS.line },
      chart: { x: value, y: y[index], z: z[index] },
    })
    links.push({ source: 'chart-root', target: id })
    if (index > 0) links.push({ source: `point-${index - 1}`, target: id })
  })

  return { nodes, links }
}
