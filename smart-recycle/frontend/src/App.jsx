import { createContext, useContext, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { api, getToken, setToken } from './api'
import Layout from './components/Layout'
import Login from './pages/Login'
import Landing from './pages/Landing'
import Overview from './pages/Overview'
import Scan from './pages/Scan'
import Twin from './pages/Twin'
import Coach from './pages/Coach'
import History from './pages/History'
import Learn from './pages/Learn'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

function Page({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const location = useLocation()

  useEffect(() => {
    if (!getToken()) { setReady(true); return }
    api.me().then(setUser).catch(() => setToken(null)).finally(() => setReady(true))
  }, [])

  useEffect(() => {
    const out = () => setUser(null)
    window.addEventListener('ecoloop:logout', out)
    return () => window.removeEventListener('ecoloop:logout', out)
  }, [])

  const signIn = ({ token, user }) => { setToken(token); setUser(user) }
  const signOut = async () => { try { await api.logout() } catch { /* ignore */ } setToken(null); setUser(null) }

  if (!ready) return null

  return (
    <AuthCtx.Provider value={{ user, signIn, signOut }}>
      {!user ? (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      ) : location.pathname === '/about' ? (
        <Landing />
      ) : (
        <Layout>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Page><Overview /></Page>} />
              <Route path="/scan" element={<Page><Scan /></Page>} />
              <Route path="/twin" element={<Page><Twin /></Page>} />
              <Route path="/coach" element={<Page><Coach /></Page>} />
              <Route path="/history" element={<Page><History /></Page>} />
              <Route path="/learn" element={<Page><Learn /></Page>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </Layout>
      )}
    </AuthCtx.Provider>
  )
}
