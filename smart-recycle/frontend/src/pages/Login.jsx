import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../App'
import VortexCanvas from '../components/VortexCanvas'
import VortexText from '../components/VortexText'
import Brand from '../components/Logo'

export default function Login() {
  const { signIn } = useAuth()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      const res = mode === 'login'
        ? await api.login({ email: form.email, password: form.password })
        : await api.register(form)
      signIn(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <VortexCanvas />
      <section className="auth-hero">
        <Link to="/" className="brand" aria-label="Back to home"><Brand /></Link>
        <div>
          <VortexText as="h1" text="Every item back into the loop." delay={0.2} />
          <motion.p className="lede" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6, duration: 0.8 }}>
            Point your camera at any pile of waste. EcoLoop names every item, tells you which bin it
            goes in, and tracks where it ends up.
          </motion.p>
        </div>
        <motion.div className="auth-points" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2, duration: 0.8 }}>
          <div><b>4</b>material classes</div>
          <div><b>Live</b>digital twin</div>
          <div><b>5</b>languages</div>
        </motion.div>
      </section>

      <section className="auth-panel">
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="auth-tabs" role="tablist">
            <motion.span className="pill" animate={{ x: mode === 'login' ? 0 : '100%' }} transition={{ type: 'spring', stiffness: 420, damping: 36 }} />
            <button role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setError('') }}>Log in</button>
            <button role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'on' : ''} onClick={() => { setMode('register'); setError('') }}>Create account</button>
          </div>

          <form className="auth-form" onSubmit={submit}>
            <AnimatePresence initial={false}>
              {mode === 'register' && (
                <motion.div className="field" key="name" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <label htmlFor="name">Your name</label>
                  <input id="name" className="input" value={form.name} onChange={set('name')} placeholder="Suzuka" required />
                </motion.div>
              )}
            </AnimatePresence>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" className="input" value={form.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" required />
            </div>
            <div className="field">
              <label htmlFor="pw">Password</label>
              <input id="pw" type="password" className="input" value={form.password} onChange={set('password')} placeholder="At least 6 characters" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={6} required />
            </div>
            {error && <motion.div className="error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>{error}</motion.div>}
            <button className="btn" disabled={busy} style={{ marginTop: 6 }}>
              {busy && <Loader2 size={18} className="spin" />}
              {mode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </form>
        </motion.div>
      </section>
    </div>
  )
}
