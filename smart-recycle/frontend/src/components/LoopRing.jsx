import { motion, useReducedMotion } from 'framer-motion'
import { CATS } from '../api'
import CountUp from './CountUp'

/**
 * The loop score: outer ring = share of items per category,
 * inner ring = diversion rate (how much stays out of landfill).
 */
export default function LoopRing({ counts = {}, score = 0, size = 260 }) {
  const reduce = useReducedMotion()
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const R = 46, r = 36
  const C = 2 * Math.PI * R, c = 2 * Math.PI * r
  const gap = total > 1 ? 1.6 : 0
  let offset = 0
  const arcs = Object.keys(CATS).map((k) => {
    const n = counts[k] || 0
    const len = total ? (n / total) * C : 0
    const a = { k, len: Math.max(0, len - gap), offset }
    offset += len
    return a
  }).filter((a) => a.len > 0)

  return (
    <div>
      <div className="ring-wrap" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <linearGradient id="ring-score" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#C8F08F" />
              <stop offset="100%" stopColor="#86d028" />
            </linearGradient>
            <filter id="ring-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="1.6" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="5" />
          {arcs.map((a, i) => (
            <motion.circle
              key={a.k} cx="50" cy="50" r={R} fill="none" stroke={CATS[a.k].color} strokeWidth="5" strokeLinecap="round"
              strokeDasharray={`${a.len} ${C}`} filter="url(#ring-glow)"
              initial={{ strokeDashoffset: -a.offset + a.len, opacity: 0 }}
              animate={{ strokeDashoffset: -a.offset, opacity: 1 }}
              transition={{ delay: reduce ? 0 : 0.3 + i * 0.15, duration: reduce ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="2.5" />
          <motion.circle
            cx="50" cy="50" r={r} fill="none" stroke="url(#ring-score)" strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c - (Math.min(100, score) / 100) * c }}
            transition={{ delay: reduce ? 0 : 0.6, duration: reduce ? 0 : 1.4, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="ring-center">
          <div>
            <div className="big"><CountUp value={score} format={(v) => `${Math.round(v)}%`} /></div>
            <div className="cap">kept out of landfill</div>
          </div>
        </div>
      </div>
      <div className="ring-legend">
        {Object.entries(CATS).map(([k, v]) => (
          <span key={k}><i className="cat-dot" style={{ background: v.color }} />{v.label} {counts[k] || 0}</span>
        ))}
      </div>
    </div>
  )
}
