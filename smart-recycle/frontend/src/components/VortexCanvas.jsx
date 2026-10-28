import { useEffect, useRef } from 'react'

const COLORS = ['#60A5FA', '#A78BFA', '#86d028', '#F87171', '#86d028', '#C8F08F']

/**
 * Particle vortex: coloured particles (one colour per material category)
 * spiral into a centre that gently follows the pointer.
 * Performance: only animates while visible on screen and while the tab is
 * active, caps pixel density, and pre-renders the glow once.
 */
export default function VortexCanvas({ centerX = 0.68, centerY = 0.5, count = 520 }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d', { alpha: false })
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0, h = 0, raf = 0, visible = true, running = false
    const target = { x: centerX, y: centerY }
    const c = { x: centerX, y: centerY }
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)

    // glow sprite rendered once
    const glow = document.createElement('canvas')
    glow.width = glow.height = 140
    const g = glow.getContext('2d')
    const grad = g.createRadialGradient(70, 70, 0, 70, 70, 70)
    grad.addColorStop(0, 'rgba(134,208,40,0.3)'); grad.addColorStop(1, 'rgba(134,208,40,0)')
    g.fillStyle = grad; g.fillRect(0, 0, 140, 140)

    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight
      canvas.width = Math.max(1, w * dpr); canvas.height = Math.max(1, h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = '#0b191e'; ctx.fillRect(0, 0, w, h)
    }
    resize()

    const maxR = () => Math.hypot(w, h) * 0.6
    const spawn = (p, fresh) => {
      p.a = Math.random() * Math.PI * 2
      p.r = fresh ? 30 + Math.random() * maxR() : maxR() * (0.7 + Math.random() * 0.3)
      p.s = 0.6 + Math.random() * 1.4
      p.size = 0.6 + Math.random() * 1.6
      p.color = COLORS[(Math.random() * COLORS.length) | 0]
      return p
    }
    const n = w < 700 ? Math.round(count * 0.4) : count
    const ps = Array.from({ length: n }, () => spawn({}, true))

    const frame = () => {
      c.x += (target.x - c.x) * 0.03
      c.y += (target.y - c.y) * 0.03
      const cx = c.x * w, cy = c.y * h
      ctx.globalAlpha = 1
      ctx.fillStyle = 'rgba(11,25,30,0.18)'
      ctx.fillRect(0, 0, w, h)
      for (const p of ps) {
        p.a += (p.s * 1.9) / Math.max(p.r, 18)
        p.r -= 0.25 + p.s * 0.35 + 140 / Math.max(p.r, 30)
        if (p.r < 14) spawn(p, false)
        ctx.globalAlpha = Math.min(1, p.r / 120) * 0.9
        ctx.fillStyle = p.color
        ctx.fillRect(cx + Math.cos(p.a) * p.r, cy + Math.sin(p.a) * p.r * 0.82, p.size * 1.6, p.size * 1.6)
      }
      ctx.globalAlpha = 1
      ctx.drawImage(glow, cx - 70, cy - 70)
      raf = requestAnimationFrame(frame)
    }

    const start = () => { if (!running && visible && !document.hidden && !reduce) { running = true; raf = requestAnimationFrame(frame) } }
    const stop = () => { running = false; cancelAnimationFrame(raf) }

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop() })
    io.observe(canvas)
    const onVis = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVis)

    const move = (e) => {
      if (!running) return
      const rect = canvas.getBoundingClientRect()
      target.x = centerX + ((e.clientX - rect.left) / rect.width - 0.5) * 0.12
      target.y = centerY + ((e.clientY - rect.top) / rect.height - 0.5) * 0.12
    }
    window.addEventListener('pointermove', move, { passive: true })

    if (reduce) { for (let i = 0; i < 40; i++) { frame(); cancelAnimationFrame(raf) } }
    else start()

    let t = 0
    const onResize = () => { clearTimeout(t); t = setTimeout(resize, 120) }
    window.addEventListener('resize', onResize)
    return () => {
      stop(); io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', move)
    }
  }, [centerX, centerY, count])

  return <canvas ref={ref} aria-hidden="true" />
}
