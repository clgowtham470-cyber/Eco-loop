import { motion, useReducedMotion } from 'framer-motion'
import { useMemo } from 'react'

/**
 * Letters start scattered on a spiral, spinning and blurred, then get pulled
 * into place - like material being drawn back into the loop.
 *   <VortexText as="h1" text="Waste is a resource" />
 */
export default function VortexText({ text, as = 'span', delay = 0, stagger = 0.028, spread = 1, className = '' }) {
  const reduce = useReducedMotion()
  const Tag = motion[as] || motion.span

  const words = useMemo(() => {
    let i = 0
    return text.split(' ').map((w) => w.split('').map((ch) => {
      const n = i++
      const angle = n * 0.75
      const r = (140 + (n % 5) * 40) * spread
      return { ch, n, x: Math.cos(angle) * r, y: Math.sin(angle) * r, rot: 220 + (n % 4) * 90 }
    }))
  }, [text, spread])

  if (reduce) return <Tag className={className}>{text}</Tag>

  return (
    <Tag className={`vortex-text ${className}`} aria-label={text}>
      {words.map((w, wi) => (
        <span className="word" key={wi} aria-hidden="true">
          {w.map(({ ch, n, x, y, rot }) => (
            <motion.span
              key={n}
              className="ch"
              initial={{ opacity: 0, x, y, rotate: rot, scale: 0.2 }}
              animate={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
              transition={{ delay: delay + n * stagger, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            >
              {ch}
            </motion.span>
          ))}
          {wi < words.length - 1 && <span className="ch">&nbsp;</span>}
        </span>
      ))}
    </Tag>
  )
}
