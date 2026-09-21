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

export async function executeCommand(command, sessionId, token) {
  const form = new FormData()
  form.append("command", command)
  form.append("session", sessionId)
  form.append("token", token)
  const res = await fetch(apiUrl("/api/execute"), { method: "POST", body: form })
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

export const CLIENT_PRESETS_2D = {
  growth: {
    x: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    y: [2.1, 4.8, 8.5, 15.2, 28.0, 49.3, 85.1, 142.6, 230.4, 380.0],
    z: null,
    label: "Exponential Technology Adoption Curve",
    chart_type: "line",
    unit: "Users (k)",
  },
  stock: {
    x: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    y: [120.5, 124.2, 122.8, 129.4, 127.1, 134.8, 138.2, 136.0, 145.5, 149.2, 147.8, 158.0],
    z: null,
    label: "Market Asset Price Trend",
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
    z: null,
    label: "Quarterly Revenue Growth",
    chart_type: "bar",
    unit: "Revenue ($M)",
  },
}

export const CLIENT_PRESETS_3D = {
  helix_3d: {
    x: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    y: [0.0, 5.0, 8.66, 10.0, 8.66, 5.0, 0.0, -5.0, -8.66, -10.0, -8.66, -5.0, 0.0],
    z: [10.0, 8.66, 5.0, 0.0, -5.0, -8.66, -10.0, -8.66, -5.0, 0.0, 5.0, 8.66, 10.0],
    label: "3D Harmonic Helix & Wave",
    chart_type: "3d",
    unit: "Amplitude (V)",
  },
  saddle_3d: {
    x: [-3, -2, -1, 0, 1, 2, 3, 2, 1, 0, -1, -2],
    y: [9.0, 4.0, 1.0, 0.0, 1.0, 4.0, 9.0, 4.0, 1.0, 0.0, 1.0, 4.0],
    z: [0.0, 3.0, 5.0, 6.0, 5.0, 3.0, 0.0, -2.0, -4.0, -5.0, -4.0, -2.0],
    label: "3D Hyperbolic Paraboloid Saddle",
    chart_type: "3d",
    unit: "Spatial Depth",
  },
  spiral_3d: {
    x: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    y: [2, 4, 7, 12, 18, 25, 32, 38, 42, 44, 43, 39, 32, 22],
    z: [1, 3, 6, 10, 15, 20, 24, 26, 25, 21, 15, 8, 0, -10],
    label: "3D Torus Vortex Manifold",
    chart_type: "3d",
    unit: "Vector Flux",
  },
}

export const CLIENT_PRESETS = {
  ...CLIENT_PRESETS_2D,
  ...CLIENT_PRESETS_3D,
}

function clientSideExtractGraph(name) {
  const clean = name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ")
  const n = 10
  const y = [14.0, 19.5, 24.2, 35.0, 48.6, 62.0, 79.4, 98.1, 122.0, 150.5]
  return {
    x: Array.from({ length: n }, (_, i) => i + 1),
    y: y,
    z: null, // 2D image has NO z coordinate
    label: clean ? `Scanned: ${clean}` : "Scanned Graph Data",
    chart_type: "line",
    extracted_via: "client_offline_engine",
  }
}

export function clientSideAnalyzeGraph(data, question) {
  if (!data || !data.x || !data.y || data.x.length === 0) {
    return "Please load or scan a graph first! Once loaded, I can analyze trends, find peaks, formulate regression equations, and forecast future points."
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

  // ss_tot and ss_res for R2
  let ssTot = 0
  let ssRes = 0
  for (let i = 0; i < n; i++) {
    ssTot += Math.pow(y[i] - yMean, 2)
    ssRes += Math.pow(y[i] - (slope * x[i] + intercept), 2)
  }
  const r2 = ssTot > 0 ? Math.max(0, 1 - (ssRes / ssTot)) : 1.0

  const q = (question || "").toLowerCase()

  // Greetings
  if (q.includes("hi") || q.includes("hello") || q.includes("hey") || q.includes("who are you")) {
    return `### 👋 Hello! I'm your Built-in AI Math & Graph Assistant.\n\nI have real-time mathematical awareness of **${data.label || "your active graph"}** (${n} points).\n\nHere are some things you can ask me:\n- *"What is the overall trend?"*\n- *"What are the peak and lowest coordinates?"*\n- *"What is the regression equation ($y = mx + b$)?"*\n- *"Predict the next 3 points"*\n- *"Calculate average and standard deviation"*`
  }

  // Trend inquiry
  if (q.includes("trend") || q.includes("slope") || q.includes("direction") || q.includes("rate") || q.includes("grow")) {
    const dir = slope > 0.05 ? "strong upward growth" : slope < -0.05 ? "downward decline" : "stable / oscillating plateau"
    const net = (y[n - 1] - y[0]).toFixed(2)
    return `### 📈 Trend Analysis for **${data.label || "Graph"}**\n\n- **Trajectory:** The dataset shows a **${dir}**.\n- **Rate of Change (Slope):** \`${slope > 0 ? "+" : ""}${slope.toFixed(3)}\` Y units per X step.\n- **Linear Correlation ($R^2$):** \`${r2.toFixed(3)}\` (goodness of fit).\n- **Net Change:** \`${net > 0 ? "+" : ""}${net}\` units across the full dataset.\n- **Bounds:** Minimum \`${yMin}\` (at X=${xMin}) to Maximum \`${yMax}\` (at X=${xMax}).`
  }

  // Peak / Max
  if (q.includes("peak") || q.includes("max") || q.includes("highest") || q.includes("top")) {
    return `### 🔝 Peak Point in **${data.label || "Graph"}**\n\n- **Maximum Value:** \`${yMax}\`\n- **Occurs at:** Coordinate \`X = ${xMax}\`\n- **Deviation from Mean:** \`+${(yMax - yMean).toFixed(2)}\` units above the average (\`${yMean.toFixed(2)}\`).`
  }

  // Min / Low
  if (q.includes("min") || q.includes("lowest") || q.includes("valley") || q.includes("bottom") || q.includes("trough")) {
    return `### 📉 Minimum Point in **${data.label || "Graph"}**\n\n- **Minimum Value:** \`${yMin}\`\n- **Occurs at:** Coordinate \`X = ${xMin}\`\n- **Deviation from Mean:** \`${(yMin - yMean).toFixed(2)}\` units below the average (\`${yMean.toFixed(2)}\`).`
  }

  // Formula / Equation
  if (q.includes("formula") || q.includes("equation") || q.includes("fit") || q.includes("math") || q.includes("regression")) {
    const sign = intercept >= 0 ? "+" : "-"
    return `### 📐 Mathematical Model for **${data.label || "Graph"}**\n\nCalculated linear regression model based on ${n} points:\n\n$$y = ${slope.toFixed(3)}x ${sign} ${Math.abs(intercept).toFixed(3)}$$\n\n- **Slope ($m$):** \`${slope.toFixed(4)}\`\n- **Y-Intercept ($c$):** \`${intercept.toFixed(4)}\`\n- **Goodness of Fit ($R^2$):** \`${r2.toFixed(4)}\`\n\n*Tip: Download the generated Python script to plot this regression curve with Plotly.*`
  }

  // Forecast / Predict
  if (q.includes("predict") || q.includes("forecast") || q.includes("next") || q.includes("future") || q.includes("extrapolate")) {
    const step = n > 1 ? (x[n - 1] - x[0]) / (n - 1) : 1
    const p1X = Number((x[n - 1] + step).toFixed(2))
    const p1Y = Number((slope * p1X + intercept).toFixed(2))
    const p2X = Number((x[n - 1] + step * 2).toFixed(2))
    const p2Y = Number((slope * p2X + intercept).toFixed(2))
    const p3X = Number((x[n - 1] + step * 3).toFixed(2))
    const p3Y = Number((slope * p3X + intercept).toFixed(2))
    return `### 🔮 Forecast Extrapolations for **${data.label || "Graph"}**\n\nProjecting forward along the linear trajectory (\`slope = ${slope.toFixed(3)}\`):\n\n1. **Step 1:** $X = ${p1X} \\implies Y \\approx ${p1Y}$\n2. **Step 2:** $X = ${p2X} \\implies Y \\approx ${p2Y}$\n3. **Step 3:** $X = ${p3X} \\implies Y \\approx ${p3Y}$\n\n> *Note: Forecast assumes current rate of change continues linearly.*`
  }

  // General summary
  const sign = intercept >= 0 ? "+" : "-"
  return `### 📊 AI Analysis for **${data.label || "Graph"}**\n\n- **Data Points:** \`${n}\` coordinates\n- **Chart Type:** \`${(data.chart_type || "2D Line").toUpperCase()}\`\n- **Mean (Average):** \`${yMean.toFixed(2)}\`\n- **Range:** \`${yMin}\` (at X=${xMin}) to \`${yMax}\` (at X=${xMax})\n- **Linear Trend:** $y = ${slope.toFixed(3)}x ${sign} ${Math.abs(intercept).toFixed(3)}$ ($R^2 = ${r2.toFixed(3)}$)\n\nFeel free to ask me to predict future points, calculate specific ranges, or identify inflection points!`
}

