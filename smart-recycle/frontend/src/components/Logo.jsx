import { motion } from 'framer-motion'

// Broken ring = a loop that is almost closed. It slowly turns.
export function LogoMark({ size = 28, spin = true }) {
  return (
    <motion.svg
      className="brand-mark" width={size} height={size} viewBox="0 0 32 32"
      animate={spin ? { rotate: 360 } : undefined}
      transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="11" fill="none" stroke="#76b821" strokeWidth="4.5" strokeLinecap="round" strokeDasharray="52 17" />
      <circle cx="16" cy="16" r="4" fill="#86d028" />
    </motion.svg>
  )
}

export default function Brand() {
  return (
    <div className="brand"><LogoMark /> EcoLoop</div>
  )
}
