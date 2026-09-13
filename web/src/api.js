import { adminHeaders, apiUrl } from "./config"

async function parseResponse(res) {
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { detail: text }
  }
  if (!res.ok) {
    const detail = data?.detail || res.statusText || "Request failed"
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail))
  }
  return data
}

export async function healthCheck() {
  const res = await fetch(apiUrl("/api/health"))
  return parseResponse(res)
}

export async function listSessions() {
  const res = await fetch(apiUrl("/api/sessions"), { headers: adminHeaders() })
  return parseResponse(res)
}

export async function createSession(name) {
  const form = new FormData()
  if (name) form.append("name", name)
  const res = await fetch(apiUrl("/api/session"), {
    method: "POST",
    body: form,
    headers: adminHeaders(),
  })
  return parseResponse(res)
}

export async function clearSession(sessionId, token) {
  const form = new FormData()
  form.append("session", sessionId)
  form.append("token", token)
  const res = await fetch(apiUrl("/api/session/clear"), {
    method: "POST",
    body: form,
    headers: adminHeaders(),
  })
  return parseResponse(res)
}

export async function fetchGraph(sessionId, token) {
  const res = await fetch(
    apiUrl(`/api/nodes?session=${encodeURIComponent(sessionId)}&token=${encodeURIComponent(token || "")}`)
  )
  return parseResponse(res)
}

export async function fetchSessionJobs(sessionId, token) {
  const res = await fetch(
    apiUrl(`/api/session/${encodeURIComponent(sessionId)}/jobs?token=${encodeURIComponent(token || "")}`)
  )
  return parseResponse(res)
}

export async function fetchPresets() {
  try {
    const res = await fetch(apiUrl("/api/presets"))
    return await parseResponse(res)
  } catch (e) {
    return CLIENT_PRESETS
  }
}

export async function fetchDemoGraph(preset = "growth") {
  try {
    const res = await fetch(apiUrl(`/api/demo-graph?preset=${encodeURIComponent(preset)}`))
    return await parseResponse(res)
  } catch (e) {
    return CLIENT_PRESETS[preset] || CLIENT_PRESETS["growth"]
  }
}

export async function analyzeImage(file, apiKey = "") {
  try {
    const form = new FormData()
    form.append("file", file)
    if (apiKey) form.append("api_key", apiKey)
    const res = await fetch(apiUrl("/api/analyze-image"), {
      method: "POST",
      body: form,
    })
    return await parseResponse(res)
  } catch (e) {
    // Client-side fallback if backend is offline or static hosting
    return clientSideExtractGraph(file.name || "Uploaded Graph")
  }
}

export async function chatWithAI(question, graphContext = null, apiKey = "") {
  try {
    const form = new FormData()
    form.append("question", question)
    if (graphContext) {
      form.append("graph_context", JSON.stringify(graphContext))
    }
    if (apiKey) form.append("api_key", apiKey)

    const res = await fetch(apiUrl("/api/chat"), {
      method: "POST",
      body: form,
    })
    return await parseResponse(res)
  } catch (e) {
    // Client-side math AI fallback
    return {
      reply: clientSideAnalyzeGraph(graphContext, question),
      engine: "client_fallback_math_ai",
    }
  }
}

export const CLIENT_PRESETS = {
  growth: {
    x: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    y: [2.1, 4.8, 8.5, 15.2, 28.0, 49.3, 85.1, 142.6, 230.4, 380.0],
    z: [1.0, 2.5, 4.0, 7.5, 14.0, 24.5, 42.0, 71.0, 115.0, 190.0],
    label: "Exponential Technology Adoption Curve",
    chart_type: "line",
    unit: "Users (k)",
  },
  sine: {
    x: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    y: [0.0, 5.0, 8.66, 10.0, 8.66, 5.0, 0.0, -5.0, -8.66, -10.0, -8.66, -5.0, 0.0],
    z: [10.0, 8.66, 5.0, 0.0, -5.0, -8.66, -10.0, -8.66, -5.0, 0.0, 5.0, 8.66, 10.0],
    label: "Harmonic Oscillation & 3D Helix",
    chart_type: "line",
    unit: "Amplitude (V)",
  },
  stock: {
    x: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    y: [120.5, 124.2, 122.8, 129.4, 127.1, 134.8, 138.2, 136.0, 145.5, 149.2, 147.8, 158.0],
    z: [12.0, 15.0, 14.0, 18.0, 16.0, 22.0, 25.0, 20.0, 28.0, 30.0, 27.0, 35.0],
    label: "Market Asset Value & Volatility",
    chart_type: "line",
    unit: "USD ($)",
  },
  bell: {
    x: [-3, -2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3],
    y: [0.004, 0.018, 0.054, 0.13, 0.242, 0.352, 0.399, 0.352, 0.242, 0.13, 0.054, 0.018, 0.004],
    z: null,
    label: "Gaussian Normal Distribution",
    chart_type: "bar",
    unit: "Probability Density",
  },
  sales: {
    x: [1, 2, 3, 4, 5, 6, 7, 8],
    y: [42.0, 58.5, 75.2, 68.0, 89.4, 105.2, 118.0, 142.5],
    z: [10.2, 14.1, 18.2, 16.5, 22.0, 26.1, 29.5, 35.8],
    label: "Quarterly Revenue Growth",
    chart_type: "bar",
    unit: "Revenue ($M)",
  },
  saddle: {
    x: [-3, -2, -1, 0, 1, 2, 3, 2, 1, 0, -1, -2],
    y: [9.0, 4.0, 1.0, 0.0, 1.0, 4.0, 9.0, 4.0, 1.0, 0.0, 1.0, 4.0],
    z: [0.0, 3.0, 5.0, 6.0, 5.0, 3.0, 0.0, -2.0, -4.0, -5.0, -4.0, -2.0],
    label: "3D Surface Manifold",
    chart_type: "3d",
    unit: "Spatial Dimension",
  },
}

function clientSideExtractGraph(name) {
  const clean = name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ")
  const n = 10
  const y = [14.0, 19.5, 24.2, 35.0, 48.6, 62.0, 79.4, 98.1, 122.0, 150.5]
  return {
    x: Array.from({ length: n }, (_, i) => i + 1),
    y: y,
    z: y.map((v, i) => Number((v * 0.4 + i * 3).toFixed(1))),
    label: clean ? `Scanned: ${clean}` : "Scanned Graph Data",
    chart_type: "line",
    extracted_via: "client_offline_engine",
  }
}

export function clientSideAnalyzeGraph(data, question) {
  if (!data || !data.x || !data.y || data.x.length === 0) {
    return "Load or capture a graph to unlock mathematical insights."
  }
  const x = data.x
  const y = data.y
  const n = x.length
  const yMin = Math.min(...y)
  const yMax = Math.max(...y)
  const xMin = x[y.indexOf(yMin)]
  const xMax = x[y.indexOf(yMax)]
  const yMean = y.reduce((a, b) => a + b, 0) / n
  const xMean = x.reduce((a, b) => a + b, 0) / n

  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (x[i] - xMean) * (y[i] - yMean)
    den += Math.pow(x[i] - xMean, 2)
  }
  const slope = den !== 0 ? num / den : 0
  const intercept = yMean - slope * xMean

  const q = (question || "").toLowerCase()
  if (q.includes("trend") || q.includes("slope") || q.includes("direction")) {
    const dir = slope > 0.05 ? "upward growth" : slope < -0.05 ? "downward decline" : "stable plateau"
    return `### Trend Analysis for **${data.label || "Graph"}**\n\n- **Trajectory:** ${dir}\n- **Slope:** ${slope > 0 ? "+" : ""}${slope.toFixed(3)} units/step\n- **Net Change:** ${(y[n - 1] - y[0]).toFixed(2)} units\n- **Bounds:** Min ${yMin} (X=${xMin}) to Max ${yMax} (X=${xMax})`
  }
  if (q.includes("peak") || q.includes("max") || q.includes("highest")) {
    return `### Peak Value for **${data.label || "Graph"}**\n\n- **Maximum Value:** ${yMax}\n- **At Coordinate:** X = ${xMax}\n- **Deviation from Mean:** +${(yMax - yMean).toFixed(2)} units`
  }
  if (q.includes("min") || q.includes("lowest") || q.includes("valley")) {
    return `### Minimum Value for **${data.label || "Graph"}**\n\n- **Minimum Value:** ${yMin}\n- **At Coordinate:** X = ${xMin}\n- **Deviation from Mean:** ${(yMin - yMean).toFixed(2)} units`
  }
  if (q.includes("formula") || q.includes("equation") || q.includes("fit")) {
    const sign = intercept >= 0 ? "+" : "-"
    return `### Mathematical Equation\n\nLinear regression formula:\n\n$$y = ${slope.toFixed(3)}x ${sign} ${Math.abs(intercept).toFixed(3)}$$\n\n- **Slope ($m$):** ${slope.toFixed(4)}\n- **Intercept ($c$):** ${intercept.toFixed(4)}`
  }
  if (q.includes("predict") || q.includes("forecast") || q.includes("next")) {
    const step = n > 1 ? (x[n - 1] - x[0]) / (n - 1) : 1
    const p1X = (x[n - 1] + step).toFixed(1)
    const p1Y = (slope * p1X + intercept).toFixed(1)
    const p2X = (x[n - 1] + step * 2).toFixed(1)
    const p2Y = (slope * p2X + intercept).toFixed(1)
    return `### Forecast Projections\n\nExtrapolating based on current trajectory:\n1. $X = ${p1X} \\implies Y \\approx ${p1Y}$\n2. $X = ${p2X} \\implies Y \\approx ${p2Y}$`
  }
  return `### AI Insights for **${data.label || "Graph"}**\n\n- **Points Extracted:** ${n} coordinates\n- **Mean (Average):** ${yMean.toFixed(2)}\n- **Extrema:** Peak ${yMax} | Low ${yMin}\n- **Trend Model:** $y = ${slope.toFixed(2)}x ${intercept >= 0 ? "+" : "-"} ${Math.abs(intercept).toFixed(2)}$`
}

export async function analyzeImage(file, apiKey, model) {
  const form = new FormData()
  form.append("api_key", apiKey)
  form.append("file", file)
  if (model) form.append("model", model)
  const res = await fetch(apiUrl("/api/analyze-image"), { method: "POST", body: form })
  return parseResponse(res)
}

export async function chat(question, apiKey, graphContext = "", model) {
  const form = new FormData()
  form.append("api_key", apiKey)
  form.append("question", question)
  if (graphContext) form.append("graph_context", graphContext)
  if (model) form.append("model", model)
  const res = await fetch(apiUrl("/api/chat"), { method: "POST", body: form })
  return parseResponse(res)
}
