import { animate, useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'

// Number that counts up smoothly whenever its value changes.
export default function CountUp({ value = 0, format = (v) => Math.round(v).toLocaleString('en-IN'), duration = 1.2 }) {
  const ref = useRef(null)
  const prev = useRef(0)
  const reduce = useReducedMotion()

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (reduce) { node.textContent = format(value); prev.current = value; return }
    const ctrl = animate(prev.current, value, {
      duration, ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => { node.textContent = format(v) },
    })
    prev.current = value
    return () => ctrl.stop()
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  return <span ref={ref}>{format(0)}</span>
}
