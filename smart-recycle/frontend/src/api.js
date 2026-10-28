// Tiny API client. Token lives in localStorage so a refresh keeps you logged in.
const KEY = 'ecoloop_token'

export const getToken = () => {
  try { return localStorage.getItem(KEY) } catch { return null }
}
export const setToken = (t) => {
  try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY) } catch { /* private mode */ }
}

async function request(path, { method = 'GET', body, form } = {}) {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body) headers['Content-Type'] = 'application/json'
  let res
  try {
    res = await fetch(`/api${path}`, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) })
  } catch {
    throw new Error('Cannot reach the server. Check that the backend is running on port 8000.')
  }
  const data = await res.json().catch(() => ({}))
  if (res.status === 401 && path !== '/auth/login') {
    setToken(null)
    window.dispatchEvent(new Event('ecoloop:logout'))
  }
  if (!res.ok) {
    const d = data.detail
    const msg = typeof d === 'string' ? d
      : Array.isArray(d) ? 'Some of the values sent were not valid. Check the form and try again.'
      : res.status >= 500 ? 'The server had a problem. Try again in a moment.'
      : `Request failed (${res.status})`
    throw new Error(msg)
  }
  return data
}

export const api = {
  register: (b) => request('/auth/register', { method: 'POST', body: b }),
  login: (b) => request('/auth/login', { method: 'POST', body: b }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/me'),
  health: () => request('/health'),
  detect: (file) => {
    const f = new FormData()
    f.append('file', file, file.name || 'scan.jpg')
    return request('/detect', { method: 'POST', form: f })
  },
  twin: (scope = 'me') => request(`/twin?scope=${scope}`),
  simulate: (b) => request('/simulate', { method: 'POST', body: b }),
  stats: () => request('/stats'),
  history: () => request('/history'),
  recommend: (lang) => request('/recommend', { method: 'POST', body: { lang } }),
  coach: (b) => request('/coach', { method: 'POST', body: b }),
}

export const CATS = {
  recyclable: { label: 'Recyclable', color: '#60A5FA', bg: 'rgba(96,165,250,.14)', bin: 'Dry waste bin' },
  reusable: { label: 'Reusable', color: '#A78BFA', bg: 'rgba(167,139,250,.14)', bin: 'Keep or donate' },
  biodegradable: { label: 'Biodegradable', color: '#4ADE80', bg: 'rgba(74,222,128,.13)', bin: 'Wet waste bin' },
  hazardous: { label: 'Hazardous', color: '#F87171', bg: 'rgba(248,113,113,.14)', bin: 'Hazardous drop-off' },
}

export const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
export const kg = (n) => {
  const v = Number(n || 0)
  return v >= 1000 ? `${(v / 1000).toLocaleString('en-IN', { maximumFractionDigits: 1 })} t` : `${v.toLocaleString('en-IN', { maximumFractionDigits: v < 1 ? 3 : 1 })} kg`
}
