/**
 * Layout grid — expand-on-click card grid in the style of Aceternity UI's
 * "layout-grid", written for this project (React + framer-motion + plain CSS).
 * Click a card: it animates out of the grid to the centre with its details,
 * the other cards dim. Click outside, press Esc or the close button to return.
 *
 * cards: [{ id, span: 1|2, title, preview: <node>, detail: <node>, to?: '/path' }]
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Maximize2, X } from 'lucide-react'

const SPRING = { type: 'spring', stiffness: 260, damping: 30 }

export default function LayoutGrid({ cards }) {
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (!selected) return
    const esc = (e) => e.key === 'Escape' && setSelected(null)
    window.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = '' }
  }, [selected])

  const active = cards.find((c) => c.id === selected)

  return (
    <div className="lg">
      {cards.map((c) => (
        <div key={c.id} className={`lg-cell span-${c.span || 1}`}>
          {c.to ? (
            <Link to={c.to} className="lg-card lg-link" aria-label={c.title}>
              <div className="lg-preview">{c.preview}</div>
              <span className="lg-corner"><ArrowUpRight size={16} /></span>
            </Link>
          ) : (
            selected !== c.id && (
              <motion.button
                layoutId={`lg-${c.id}`}
                className="lg-card"
                onClick={() => setSelected(c.id)}
                transition={SPRING}
                aria-label={`Open ${c.title}`}
              >
                <motion.div layout="position" className="lg-preview">{c.preview}</motion.div>
                <span className="lg-corner"><Maximize2 size={14} /></span>
              </motion.button>
            )
          )}
        </div>
      ))}

      {createPortal(<AnimatePresence>
        {active && (
          <>
            <motion.div
              key="shade" className="lg-shade" onClick={() => setSelected(null)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}
            />
            <motion.div
              key="open" layoutId={`lg-${active.id}`} className="lg-card lg-open"
              transition={SPRING} role="dialog" aria-modal="true" aria-label={active.title}
            >
              <button className="lg-close" onClick={() => setSelected(null)} aria-label="Close"><X size={18} /></button>
              <motion.div
                className="lg-detail"
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
                transition={{ delay: 0.15, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                {active.detail}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>, document.body)}
    </div>
  )
}
