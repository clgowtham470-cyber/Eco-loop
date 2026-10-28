/**
 * Floating dock — port of Aceternity UI "floating-dock" (motion/react version)
 * to this project's stack: React + framer-motion + plain CSS + lucide icons.
 * Same behaviour: icons magnify as the pointer approaches, spring physics,
 * a label pops up above the hovered icon. Uses router links (no page reload).
 */
import { useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

const SPRING = { mass: 0.1, stiffness: 150, damping: 12 }

export default function FloatingDock({ items }) {
  const mouseX = useMotionValue(Infinity)
  return (
    <motion.nav
      className="dock"
      aria-label="Main"
      onMouseMove={(e) => mouseX.set(e.clientX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.15 }}
    >
      {items.map((item) => <DockIcon key={item.to} mouseX={mouseX} {...item} />)}
    </motion.nav>
  )
}

function DockIcon({ mouseX, title, icon: Icon, to, accent }) {
  const ref = useRef(null)
  const { pathname } = useLocation()
  const active = to === '/' ? pathname === '/' : pathname.startsWith(to)
  const [hovered, setHovered] = useState(false)

  const distance = useTransform(mouseX, (val) => {
    const b = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 }
    return val - b.x - b.width / 2
  })
  const size = useSpring(useTransform(distance, [-150, 0, 150], [44, 76, 44]), SPRING)
  const iconSize = useSpring(useTransform(distance, [-150, 0, 150], [20, 34, 20]), SPRING)

  return (
    <Link to={to} aria-label={title} aria-current={active ? 'page' : undefined} className="dock-link">
      <motion.div
        ref={ref}
        style={{ width: size, height: size }}
        className={`dock-item ${active ? 'active' : ''} ${accent ? 'accent' : ''}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        whileTap={{ scale: 0.9 }}
      >
        <AnimatePresence>
          {hovered && (
            <motion.div
              className="dock-tip"
              initial={{ opacity: 0, y: 10, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 2, x: '-50%' }}
              transition={{ duration: 0.18 }}
            >
              {title}
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div style={{ width: iconSize, height: iconSize }} className="dock-icon">
          <Icon width="100%" height="100%" strokeWidth={1.9} />
        </motion.div>
        {active && <motion.span layoutId="dock-dot" className="dock-dot" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
      </motion.div>
    </Link>
  )
}
