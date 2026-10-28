/**
 * Fanned card deck (port of the pasted "Cards" component to React + framer-motion
 * + plain CSS). Click a card: it straightens, grows and shows its story while the
 * others drop back. Click anywhere else to reset.
 * Each card = one harm caused by plastic, with a real photo (Wikimedia Commons).
 * Photo order: local file in /media/effects/ (optional) -> Commons -> designed fallback.
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion'
import { Fish, Flame, Mountain, Microscope, Waves, Hourglass } from 'lucide-react'
import { localMedia } from '../media'

const commons = (file, w = 720) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/ /g, '_'))}?width=${w}`

export const EFFECTS = [
  {
    slug: 'marine-life', title: 'It strangles marine life', icon: Fish, stat: '11 Mt / year',
    text: 'Sea turtles, birds and fish get tangled in lost nets and mistake floating plastic for food. About 11 million tonnes of plastic enter the ocean every year.',
    photo: 'Turtle entangled in marine debris (ghost net).jpg', tint: '#0e4a5c', cfg: { y: -20, rotate: -14 },
  },
  {
    slug: 'microplastics', title: 'It breaks into microplastics', icon: Microscope, stat: '< 5 mm',
    text: 'Plastic never really disappears. Sun and waves shatter it into fragments smaller than a grain of rice, now found in water, soil, salt and our own bodies.',
    photo: 'Microplastics (7656713582).jpg', tint: '#3b3f7a', cfg: { y: 18, rotate: 7 },
  },
  {
    slug: 'land', title: 'It buries our land', icon: Mountain, stat: '9.3 Mt / year',
    text: 'India emits 9.3 million tonnes of plastic pollution a year, mostly from waste that is never collected and ends up dumped on open land and roadsides.',
    photo: 'Plastic waste at Batlapalem, Andhra Pradesh.jpg', tint: '#5a4a1e', cfg: { y: -70, rotate: -4 },
  },
  {
    slug: 'drains', title: 'It chokes rivers and drains', icon: Waves, stat: 'Floods',
    text: 'Bags and wrappers block drains and streams. In monsoon cities, clogged drains turn heavy rain into street flooding and stagnant water that breeds disease.',
    photo: 'Plastic Pollution in Ghana.jpg', tint: '#1f4d3a', cfg: { y: 22, rotate: 11 },
  },
  {
    slug: 'burning', title: 'It poisons the air we breathe', icon: Flame, stat: 'Toxic smoke',
    text: 'Burning plastic in the open releases dioxins, black carbon and other toxic fumes that harm lungs, especially for people living and working near dumps.',
    photo: null, tint: '#6b2a14', cfg: { y: -10, rotate: -8 },
  },
  {
    slug: 'centuries', title: 'It outlives us all', icon: Hourglass, stat: '9% recycled',
    text: 'Most plastic ever made still exists in some form. Only 9% of plastic waste is recycled; the rest is landfilled, burned or leaks into nature.',
    photo: 'Plastic Waste 0089.jpg', tint: '#3d3d3d', cfg: { y: 20, rotate: 5 },
  },
]

const SPRING = { type: 'spring', visualDuration: 0.6, bounce: 0.22 }

function Photo({ e }) {
  const local = `media/effects/${e.slug}.jpg`
  const [sources, setSources] = useState(null)
  const [i, setI] = useState(0)
  useEffect(() => {
    let on = true
    localMedia().then((set) => on && setSources([set.has(local) && `/${local}`, e.photo && commons(e.photo)].filter(Boolean)))
    return () => { on = false }
  }, [local, e.photo])
  if (!sources) return null
  if (i >= sources.length) {
    return (
      <div className="ic-fallback" style={{ '--tint': e.tint }}>
        <e.icon size={96} strokeWidth={1} />
      </div>
    )
  }
  return <img src={sources[i]} alt="" loading="lazy" decoding="async" draggable="false" onError={() => setI(i + 1)} />
}

export default function ImpactCards({ activeScale = 1.12, cardSpacing = 175 }) {
  const reduce = useReducedMotion()
  const [active, setActive] = useState(null)
  const [spacing, setSpacing] = useState(cardSpacing)
  const [tilt, setTilt] = useState(1)
  const ref = useRef(null)
  const seen = useInView(ref, { once: true, margin: '-80px' })

  useEffect(() => {
    const away = (ev) => ref.current && !ref.current.contains(ev.target) && setActive(null)
    const esc = (ev) => ev.key === 'Escape' && setActive(null)
    document.addEventListener('pointerdown', away)
    window.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', away); window.removeEventListener('keydown', esc) }
  }, [])

  useEffect(() => {
    const fit = () => {
      const w = window.innerWidth
      setSpacing(w >= 1180 ? cardSpacing : w >= 760 ? Math.round(cardSpacing * 0.62) : Math.round(cardSpacing * 0.2))
      setTilt(w >= 760 ? 1 : 0.5)
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [cardSpacing])

  const middle = (EFFECTS.length - 1) / 2
  const transition = reduce ? { duration: 0 } : SPRING

  return (
    <div className="ic-stage" ref={ref} onClick={() => setActive(null)}>
      {EFFECTS.map((e, index) => {
        const offsetX = (index - middle) * spacing
        const isActive = active === e.slug
        const any = !!active
        return (
          <motion.button
            key={e.slug}
            className={`ic-card ${isActive ? 'active' : ''}`}
            initial={{ x: 0, y: 40, scale: 0.6, opacity: 0 }}
            animate={!seen ? { x: 0, y: 40, scale: 0.6, opacity: 0 } : {
              x: isActive ? 0 : any ? offsetX * 0.42 : offsetX,
              y: isActive ? -10 : any ? 330 : e.cfg.y * tilt,
              rotate: isActive ? 0 : any ? e.cfg.rotate * 0.2 : e.cfg.rotate * tilt,
              scale: isActive ? activeScale : any ? 0.7 : 1,
              opacity: 1,
            }}
            whileHover={!any ? { scale: 1.05, y: e.cfg.y - 14 } : undefined}
            transition={seen && !any ? { ...transition, delay: reduce ? 0 : index * 0.05 } : transition}
            style={{ zIndex: isActive ? 50 : index + 2 }}
            onClick={(ev) => { ev.stopPropagation(); setActive(isActive ? null : e.slug) }}
            aria-pressed={isActive}
            aria-label={e.title}
          >
            <div className="ic-photo"><Photo e={e} /></div>
            <div className="ic-shade" />
            <span className="ic-stat">{e.stat}</span>
            <div className="ic-body">
              <h3>{e.title}</h3>
              <AnimatePresence mode="popLayout">
                {isActive && (
                  <motion.p
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.35, delay: 0.12 }}
                  >
                    {e.text}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
