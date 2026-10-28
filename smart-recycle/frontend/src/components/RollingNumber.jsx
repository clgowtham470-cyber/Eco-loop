/**
 * Odometer-style number: each digit rolls to its new value, staggered right to left.
 * <RollingNumber value={12.5} format={(v) => `${v.toFixed(1)} kg`} />
 */
import { useEffect, useState } from 'react'

const DIGITS = '0123456789'

export default function RollingNumber({ value = 0, format = (v) => String(Math.round(v)), className = '' }) {
  const [shown, setShown] = useState(() => format(0))
  useEffect(() => {
    // let the zero state paint first so the roll is visible on mount
    const t = requestAnimationFrame(() => setShown(format(value)))
    return () => cancelAnimationFrame(t)
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  const chars = shown.split('')
  return (
    <span className={`roll ${className}`} aria-label={shown}>
      {chars.map((ch, i) => {
        const fromRight = chars.length - i
        const d = DIGITS.indexOf(ch)
        if (d < 0) return <span key={`s${fromRight}`} className="roll-static" aria-hidden="true">{ch === ' ' ? '\u00A0' : ch}</span>
        return (
          <span key={`d${fromRight}`} className="roll-col" aria-hidden="true">
            <span className="roll-strip" style={{ transform: `translateY(-${d * 10}%)`, transitionDelay: `${fromRight * 45}ms` }}>
              {DIGITS.split('').map((n) => <span key={n}>{n}</span>)}
            </span>
          </span>
        )
      })}
    </span>
  )
}
