const strip = (u) => (u || '').replace(/\/+$/, '')

const envBase = strip(import.meta.env.VITE_API_BASE)
const host = window.location.hostname || 'localhost'

export const API_BASE = envBase || `${window.location.protocol}//${host}:8000`
export const WS_BASE = API_BASE.replace(/^http/, 'ws')
export const HAS_BACKEND = Boolean(envBase) || host === 'localhost' || host === '127.0.0.1'

// Admin key is typed by you into the UI, never baked into the public bundle.
export const getAdminKey = () => localStorage.getItem('agf_admin_key') || ''
export const setAdminKey = (k) => localStorage.setItem('agf_admin_key', k)
export const adminHeaders = () => {
  const k = getAdminKey()
  return k ? { 'X-Admin-Key': k } : {}
}
