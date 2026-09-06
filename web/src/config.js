const strip = (u) => (u || "").replace(/\/+$/, "")

const envBase = strip(import.meta.env.VITE_API_BASE)
const isLocalHost = ["localhost", "127.0.0.1"].includes(location.hostname)
const productionApiBase = "https://ai-graph-finder-1.onrender.com"

// In Vite dev, proxy /api to the FastAPI server so CORS is not required.
export const API_BASE = envBase || (import.meta.env.DEV ? "" : isLocalHost ? `${location.protocol}//${location.hostname}:8000` : productionApiBase)
export const WS_BASE = API_BASE
  ? API_BASE.replace(/^http/, "ws")
  : `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}`
export const HAS_BACKEND = Boolean(envBase) || isLocalHost || import.meta.env.DEV

export const getAdminKey = () => localStorage.getItem("agf_admin_key") || ""
export const setAdminKey = (k) => {
  if (k) localStorage.setItem("agf_admin_key", k)
  else localStorage.removeItem("agf_admin_key")
}
export const adminHeaders = () => {
  const k = getAdminKey()
  return k ? { "X-Admin-Key": k } : {}
}

export function apiUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`
  return `${API_BASE}${p}`
}

export function wsUrl(pathAndQuery) {
  const p = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`
  return `${WS_BASE}${p}`
}
