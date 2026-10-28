/**
 * Background 3D scene from thrine.app (<model-embed> web component).
 * - The embed script is added once, and only when the section is about to
 *   scroll into view, so it doesn't slow down the first load of the page.
 * - If the script can't load (offline / blocked), nothing renders and the
 *   section keeps its CSS gradient background.
 */
import { useEffect, useRef, useState } from 'react'

const SRC = 'https://thrine.app/embed/v1.js'
const PROJECT = 'e_45d521cc2a5abac1514b'

function loadScript() {
  if (document.querySelector(`script[src="${SRC}"]`)) return
  const s = document.createElement('script')
  s.type = 'module'
  s.src = SRC
  s.async = true
  document.head.appendChild(s)
}

export default function ModelEmbed() {
  const box = useRef(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { loadScript(); setShow(true); io.disconnect() }
    }, { rootMargin: '600px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div className="lp-embed" ref={box} aria-hidden="true">
      {show && (
        <div className="lp-embed-inner">
          <model-embed project={PROJECT} style={{ display: 'block', width: '100%', height: '100%' }} />
        </div>
      )}
      <div className="lp-embed-fade" />
    </div>
  )
}
