import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ImageOff } from 'lucide-react'
import { api, CATS, rupees } from '../api'
import VortexText from '../components/VortexText'

export default function History() {
  const [scans, setScans] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => { api.history().then(setScans).catch((e) => setError(e.message)) }, [])

  return (
    <>
      <div className="page-head">
        <div>
          <VortexText as="h1" text="Scan history" spread={0.5} />
          <p className="muted">Every scan you have made. Each one feeds the digital twin.</p>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      {!scans && !error && <div className="hist">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 64 }} />)}</div>}
      {scans && !scans.length && (
        <div className="panel empty" style={{ marginBottom: 12 }}>
          <h3>No scans yet</h3>
          <p className="muted small">Scan a photo and it will appear here.</p>
          <Link to="/scan" className="btn">Scan waste</Link>
        </div>
      )}
      <div className="hist">
        {scans?.map((s, i) => (
          <motion.div key={s.id} className="hist-row" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.04 }}>
            {s.thumb ? <img className="thumb" src={s.thumb} alt="" /> : <div className="thumb"><ImageOff size={18} /></div>}
            <div>
              <b>{new Date(s.created * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</b>
              <div className="small muted">{new Date(s.created * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <b style={{ marginRight: 6 }}>{s.summary.total} items</b>
              {Object.entries(s.summary.counts || {}).filter(([, n]) => n).map(([k, n]) => (
                <span key={k} className="cat-chip" style={{ background: CATS[k].bg, color: CATS[k].color }}>{n} {CATS[k].label.toLowerCase()}</span>
              ))}
            </div>
            <div className="val" style={{ textAlign: 'right' }}>{rupees(s.summary.value_rs)}<div className="small muted">{s.summary.co2_saved_kg} kg CO₂e</div></div>
          </motion.div>
        ))}
      </div>
    </>
  )
}
