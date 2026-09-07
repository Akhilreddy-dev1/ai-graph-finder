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

export async function fetchJob(jobId) {
  const res = await fetch(apiUrl(`/api/job/${encodeURIComponent(jobId)}`))
  return parseResponse(res)
}

export async function fetchSessionJobs(sessionId, token) {
  const res = await fetch(
    apiUrl(`/api/session/${encodeURIComponent(sessionId)}/jobs?token=${encodeURIComponent(token || "")}`)
  )
  return parseResponse(res)
}

export async function fetchDemoGraph() {
  const res = await fetch(apiUrl("/api/demo-graph"))
  return parseResponse(res)
}

export async function analyzeImage(file, apiKey) {
  const form = new FormData()
  form.append("api_key", apiKey)
  form.append("file", file)
  const res = await fetch(apiUrl("/api/analyze-image"), { method: "POST", body: form })
  return parseResponse(res)
}

export async function chat(question, apiKey, graphContext = "") {
  const form = new FormData()
  form.append("api_key", apiKey)
  form.append("question", question)
  if (graphContext) form.append("graph_context", graphContext)
  const res = await fetch(apiUrl("/api/chat"), { method: "POST", body: form })
  return parseResponse(res)
}
