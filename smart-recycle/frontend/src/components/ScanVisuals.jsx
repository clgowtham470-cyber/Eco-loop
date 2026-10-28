/**
 * Scan-page visuals (replaces the spinning loop logo):
 *  - ScanIdle: a viewfinder with a sweeping beam over a dot grid, and waste
 *    items drifting into the frame, each tagged with its category colour.
 *  - ScanBusy: shown while analysing — a laser sweep plus detection boxes that
 *    lock on one after another, like the model finding objects.
 * Pure CSS/transform animation: cheap to render.
 */
import { Battery, Apple, CupSoda, Newspaper, Smartphone, Package, ScanSearch, Aperture } from 'lucide-react'

const ITEMS = [
  { icon: CupSoda, label: 'Recyclable', c: '#60A5FA', x: '14%', y: '22%', d: 0 },
  { icon: Battery, label: 'Hazardous', c: '#F87171', x: '80%', y: '20%', d: 1.2 },
  { icon: Apple, label: 'Biodegradable', c: '#4ADE80', x: '10%', y: '70%', d: 2.1 },
  { icon: Package, label: 'Reusable', c: '#A78BFA', x: '84%', y: '68%', d: 0.6 },
  { icon: Newspaper, label: 'Recyclable', c: '#60A5FA', x: '28%', y: '86%', d: 1.7 },
  { icon: Smartphone, label: 'Hazardous', c: '#F87171', x: '70%', y: '88%', d: 2.6 },
]

export function ScanIdle() {
  return (
    <div className="sv-idle" aria-hidden="true">
      <div className="sv-grid" />
      <div className="sv-beam" />
      {ITEMS.map((it, i) => (
        <div key={i} className="sv-item" style={{ left: it.x, top: it.y, '--c': it.c, animationDelay: `${it.d}s` }}>
          <span className="sv-ic"><it.icon size={20} strokeWidth={1.8} /></span>
          <span className="sv-tag">{it.label}</span>
        </div>
      ))}
    </div>
  )
}

export function ScanBadge() {
  return (
    <div className="sv-badge" aria-hidden="true">
      <span className="sv-ring" /><span className="sv-ring r2" />
      <Aperture size={30} strokeWidth={1.6} />
    </div>
  )
}

const BOXES = [
  { l: 12, t: 18, w: 26, h: 34, c: '#60A5FA', d: 0.2 },
  { l: 55, t: 12, w: 22, h: 28, c: '#4ADE80', d: 0.9 },
  { l: 38, t: 52, w: 18, h: 26, c: '#F87171', d: 1.6 },
  { l: 66, t: 50, w: 24, h: 32, c: '#A78BFA', d: 2.3 },
]

export function ScanBusy() {
  return (
    <div className="sv-busy">
      <div className="sv-laser" />
      {BOXES.map((b, i) => (
        <span key={i} className="sv-box" style={{ left: `${b.l}%`, top: `${b.t}%`, width: `${b.w}%`, height: `${b.h}%`, '--c': b.c, animationDelay: `${b.d}s` }} />
      ))}
      <div className="sv-status"><ScanSearch size={18} /> Finding every item…</div>
    </div>
  )
}
