import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Bot, History, LayoutDashboard, ScanLine, Workflow } from 'lucide-react'
import { api } from '../api'
import Brand from './Logo'
import FloatingDock from './FloatingDock'
import ProfileMenu from './ProfileMenu'

const DOCK = [
  { to: '/', title: 'Overview', icon: LayoutDashboard },
  { to: '/scan', title: 'Scan waste', icon: ScanLine, accent: true },
  { to: '/twin', title: 'Digital twin', icon: Workflow },
  { to: '/coach', title: 'AI coach', icon: Bot },
  { to: '/history', title: 'History', icon: History },
  { to: '/learn', title: 'Learn about plastic', icon: BookOpen },
]

export default function Layout({ children }) {
  const [status, setStatus] = useState(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => { api.health().then((h) => setStatus(h.detector)).catch(() => {}) }, [])
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  const engine = status
    ? [status.yolo && 'YOLO', status.gemini && 'Gemini', status.mode === 'demo' && 'Demo mode'].filter(Boolean).join(' + ') || 'No model loaded'
    : 'Connecting…'
  const engineOk = !!(status && (status.yolo || status.gemini))

  return (
    <div className="shell">
      <div className="ambient" aria-hidden="true"><div className="grid-lines" /></div>
      <header className={`topbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="topbar-inner">
          <Link to="/" className="brand-link"><Brand /></Link>
          <ProfileMenu engine={engine} engineOk={engineOk} />
        </div>
      </header>
      <main className="main">{children}</main>
      <FloatingDock items={DOCK} />
    </div>
  )
}
