import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, Bot, Coins, Droplets, ImageOff, Leaf, Package, ScanLine, Sparkles, Weight, Workflow,
} from 'lucide-react'
import { api, CATS, rupees } from '../api'
import { useAuth } from '../App'
import VortexText from '../components/VortexText'
import VortexCanvas from '../components/VortexCanvas'
import CountUp from '../components/CountUp'
import LoopRing from '../components/LoopRing'
import LayoutGrid from '../components/LayoutGrid'

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}
const MAT_COLOR = { organic: '#4ADE80', 'e-waste': '#F87171', battery: '#F87171', chemical: '#F87171', textile: '#A78BFA', wood: '#A78BFA' }
const when = (t) => new Date(t * 1000).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function Overview() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [twin, setTwin] = useState(null)
  const [scans, setScans] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.stats(), api.history(), api.twin('me')])
      .then(([s, h, t]) => { setStats(s); setScans(h); setTwin(t) })
      .catch((e) => setError(e.message))
  }, [])

  const first = (user?.name || '').split(' ')[0] || 'there'
  const counts = Object.fromEntries(Object.keys(CATS).map((k) => [k, stats?.by_category?.[k]?.count || 0]))
  const score = twin?.kpis?.diversion_rate || 0
  const latest = scans?.[0]
  const loading = !stats || !scans

  const cards = loading ? [] : [
    {
      id: 'loop', span: 2, title: 'Your loop',
      preview: <LoopPreview score={score} counts={counts} items={stats.items} />,
      detail: <LoopDetail score={score} counts={counts} stats={stats} kpis={twin?.kpis} />,
    },
    latest
      ? { id: 'latest', span: 1, title: 'Latest scan', preview: <LatestPreview s={latest} />, detail: <LatestDetail s={latest} total={scans.length} /> }
      : { id: 'latest', span: 1, title: 'Scan your first photo', to: '/scan', preview: <FirstScanPreview /> },
    {
      id: 'impact', span: 1, title: 'Impact',
      preview: <ImpactPreview stats={stats} />,
      detail: <ImpactDetail stats={stats} />,
    },
    {
      id: 'materials', span: 2, title: 'Material mix',
      preview: <MaterialsPreview data={stats.by_material} />,
      detail: <MaterialsDetail data={stats.by_material} />,
    },
    {
      id: 'insights', span: 2, title: 'Insights',
      preview: <InsightsPreview stats={stats} />,
      detail: <InsightsDetail stats={stats} />,
    },
    { id: 'coach', span: 1, title: 'AI coach', to: '/coach', preview: <CoachPreview /> },
  ]

  return (
    <>
      <div className="page-head dash-head">
        <div>
          <span className="eyebrow">{greeting()}</span>
          <VortexText as="h1" text={`${first}, here is your loop`} spread={0.5} />
        </div>
        <div className="dash-actions">
          <Link to="/twin" className="btn ghost"><Workflow size={17} /> Digital twin</Link>
          <Link to="/scan" className="btn"><ScanLine size={17} /> Scan waste</Link>
        </div>
      </div>

      {error && <div className="error" style={{ marginBottom: 20 }}>{error}</div>}
      {loading && !error && (
        <div className="lg">
          {[2, 1, 1, 2, 2, 1].map((s, i) => <div key={i} className={`lg-cell span-${s}`}><div className="skeleton" style={{ height: '100%' }} /></div>)}
        </div>
      )}
      {!loading && <LayoutGrid cards={cards} />}
    </>
  )
}

/* ---------------- previews (in the grid) ---------------- */

function LoopPreview({ score, counts, items }) {
  return (
    <div className="pv pv-loop">
      <VortexCanvas centerX={0.74} centerY={0.5} count={260} />
      <div className="pv-copy">
        <span className="pv-label">Your loop</span>
        <div className="pv-big"><CountUp value={score} format={(v) => `${Math.round(v)}%`} /></div>
        <p>of everything you scanned stays out of landfill</p>
        <span className="pv-foot">{items} items sorted so far</span>
      </div>
      <div className="pv-ring"><LoopRing counts={counts} score={score} size={190} /></div>
    </div>
  )
}

function LatestPreview({ s }) {
  return (
    <div className="pv pv-photo">
      {s.thumb ? <img src={s.thumb} alt="" /> : <div className="pv-nophoto"><ImageOff size={28} /></div>}
      <div className="pv-photo-shade" />
      <div className="pv-copy pv-bottom">
        <span className="pv-label">Latest scan</span>
        <div className="pv-mid">{s.summary.total} items</div>
        <MiniBar counts={s.summary.counts} total={s.summary.total} />
        <span className="pv-foot">{when(s.created)}</span>
      </div>
    </div>
  )
}

function FirstScanPreview() {
  return (
    <div className="pv pv-first">
      <ScanLine size={40} />
      <div className="pv-mid">Scan your first photo</div>
      <p>One item or a whole pile. Every object gets sorted.</p>
    </div>
  )
}

function ImpactPreview({ stats }) {
  return (
    <div className="pv pv-impact">
      <span className="pv-label">Impact</span>
      <div>
        <div className="pv-big"><CountUp value={stats.co2_saved_kg} format={(v) => v.toFixed(2)} /><small> kg</small></div>
        <p>CO₂e avoided by sorting right</p>
      </div>
      <div className="pv-row">
        <span><Coins size={14} /> {rupees(Math.round(stats.value_rs))}</span>
        <span><Weight size={14} /> {stats.weight_kg.toFixed(2)} kg</span>
      </div>
      <Leaf className="pv-watermark" size={150} strokeWidth={1} />
    </div>
  )
}

function MaterialsPreview({ data }) {
  const entries = Object.entries(data || {}).slice(0, 4)
  const max = Math.max(...entries.map(([, v]) => v), 0.001)
  return (
    <div className="pv pv-mats">
      <span className="pv-label">Material mix</span>
      {!entries.length && <p>Scan something to see what your waste is made of.</p>}
      <div className="mats">
        {entries.map(([m, v]) => (
          <div className="mat" key={m}>
            <div className="top"><span>{m}</span><span className="muted">{v.toFixed(2)} kg</span></div>
            <div className="track"><div style={{ width: `${(v / max) * 100}%`, background: MAT_COLOR[m] || '#60A5FA' }} /></div>
          </div>
        ))}
      </div>
    </div>
  )
}

function InsightsPreview({ stats }) {
  const list = insights(stats).slice(0, 2)
  return (
    <div className="pv pv-insights">
      <span className="pv-label">Insights</span>
      <div className="pv-ins">
        {list.map((x) => (
          <div key={x.title} className="pv-in">
            <span className="ic" style={{ background: `${x.color}22`, color: x.color }}><x.icon size={18} /></span>
            <div><b>{x.title}</b><p>{x.text}</p></div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CoachPreview() {
  return (
    <div className="pv pv-coach">
      <span className="pv-label">AI coach</span>
      <Bot size={44} strokeWidth={1.5} />
      <div className="pv-mid">Ask anything about your waste</div>
      <p>Answers built from your scans, in 5 languages.</p>
    </div>
  )
}

function MiniBar({ counts = {}, total = 1 }) {
  return (
    <div className="mini-bar">
      {Object.keys(CATS).map((k) => counts[k] ? <div key={k} style={{ width: `${(counts[k] / (total || 1)) * 100}%`, background: CATS[k].color }} /> : null)}
    </div>
  )
}

/* ---------------- details (expanded) ---------------- */

function DetailHead({ label, title, text }) {
  return (
    <div className="dt-head">
      <span className="pv-label">{label}</span>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  )
}

function LoopDetail({ score, counts, stats, kpis }) {
  return (
    <div className="dt dt-split">
      <div>
        <DetailHead label="Your loop" title={`${Math.round(score)}% kept out of landfill`} text="The outer ring is your mix of material classes. The inner ring is how much of it ends up recycled, composted, reused or safely handled." />
        <div className="dt-cats">
          {Object.entries(CATS).map(([k, c]) => (
            <div key={k} className="dt-cat">
              <span className="cat-dot" style={{ background: c.color }} />
              <span>{c.label}</span>
              <b>{counts[k]}</b>
              <span className="muted small">{(stats.by_category?.[k]?.kg || 0).toFixed(2)} kg</span>
            </div>
          ))}
        </div>
        {kpis && <p className="muted small" style={{ marginTop: 14 }}>{kpis.diverted_kg} kg diverted, {kpis.landfill_kg} kg still headed to landfill.</p>}
        <div className="dash-actions" style={{ marginTop: 18 }}>
          <Link to="/scan" className="btn"><ScanLine size={17} /> Scan more</Link>
          <Link to="/twin" className="btn ghost"><Workflow size={17} /> See the flow</Link>
        </div>
      </div>
      <div className="dt-ring"><LoopRing counts={counts} score={score} size={250} /></div>
    </div>
  )
}

function LatestDetail({ s, total }) {
  const sm = s.summary
  return (
    <div className="dt dt-split">
      <div className="dt-photo">{s.thumb ? <img src={s.thumb} alt="Latest scan" /> : <div className="pv-nophoto"><ImageOff size={32} /></div>}</div>
      <div>
        <DetailHead label={when(s.created)} title={`${sm.total} items found`} />
        <div className="dt-cats">
          {Object.entries(CATS).map(([k, c]) => (
            <div key={k} className="dt-cat"><span className="cat-dot" style={{ background: c.color }} /><span>{c.label}</span><b>{sm.counts?.[k] || 0}</b></div>
          ))}
        </div>
        <div className="facts">
          <span><b>{rupees(sm.value_rs)}</b> <span className="muted">scrap value</span></span>
          <span><b>{sm.co2_saved_kg} kg</b> <span className="muted">CO₂e if sorted</span></span>
        </div>
        {sm.hazardous?.length > 0 && <div className="hazard" style={{ marginTop: 14 }}><AlertTriangle size={18} /><span>Hazardous: {sm.hazardous.join(', ')}</span></div>}
        {sm.needs_cleaning?.length > 0 && <p className="muted small" style={{ marginTop: 12 }}>Needs cleaning first: {sm.needs_cleaning.join(', ')}</p>}
        <div className="dash-actions" style={{ marginTop: 18 }}>
          <Link to="/history" className="btn ghost">All {total} scans</Link>
          <Link to="/scan" className="btn"><ScanLine size={17} /> New scan</Link>
        </div>
      </div>
    </div>
  )
}

function ImpactDetail({ stats }) {
  const rows = [
    { icon: Package, color: '#60A5FA', v: stats.items, f: (v) => Math.round(v), l: 'items sorted' },
    { icon: Weight, color: '#A78BFA', v: stats.weight_kg, f: (v) => `${v.toFixed(2)} kg`, l: 'waste tracked' },
    { icon: Leaf, color: '#86d028', v: stats.co2_saved_kg, f: (v) => `${v.toFixed(2)} kg`, l: 'CO₂e avoided' },
    { icon: Coins, color: '#FBBF24', v: stats.value_rs, f: (v) => rupees(v.toFixed(0)), l: 'scrap value recovered' },
  ]
  return (
    <div className="dt">
      <DetailHead label="Impact" title="What your sorting adds up to" text="Estimated from typical item weights, indicative Indian kabadiwala rates (Aug 2026) and emission factors per material." />
      <div className="dt-metrics">
        {rows.map((r) => (
          <div key={r.l}>
            <span className="ic" style={{ background: `${r.color}22`, color: r.color }}><r.icon size={18} /></span>
            <b><CountUp value={r.v} format={r.f} /></b>
            <span className="muted">{r.l}</span>
          </div>
        ))}
      </div>
      {stats.needs_cleaning > 0 && <p className="muted" style={{ marginTop: 18 }}>{stats.needs_cleaning} items were dirty or capped. Cleaning them first would raise both numbers.</p>}
    </div>
  )
}

function MaterialsDetail({ data }) {
  const entries = Object.entries(data || {})
  const max = Math.max(...entries.map(([, v]) => v), 0.001)
  const total = entries.reduce((a, [, v]) => a + v, 0)
  return (
    <div className="dt">
      <DetailHead label="Material mix" title="What your waste is made of" text="By estimated weight. Cutting your top material moves your numbers the most." />
      <div className="mats">
        {entries.map(([m, v]) => (
          <div className="mat" key={m}>
            <div className="top"><span>{m}</span><span className="muted">{v.toFixed(2)} kg · {total ? Math.round((v / total) * 100) : 0}%</span></div>
            <div className="track"><div style={{ width: `${(v / max) * 100}%`, background: MAT_COLOR[m] || '#60A5FA' }} /></div>
          </div>
        ))}
      </div>
    </div>
  )
}

function InsightsDetail({ stats }) {
  return (
    <div className="dt">
      <DetailHead label="Insights" title="What to do next" />
      <div className="insights">
        {insights(stats).map((x) => (
          <div className="insight" key={x.title}>
            <span className="ic" style={{ background: `${x.color}22`, color: x.color }}><x.icon size={18} /></span>
            <div><b>{x.title}</b><p>{x.text}</p></div>
          </div>
        ))}
      </div>
      <Link to="/coach" className="btn" style={{ marginTop: 18 }}><Sparkles size={17} /> Get personal advice</Link>
    </div>
  )
}

function insights(stats) {
  const list = []
  const haz = stats.by_category?.hazardous?.count || 0
  const top = Object.entries(stats.by_material || {})[0]
  if (haz) list.push({ icon: AlertTriangle, color: '#F87171', title: `${haz} hazardous item${haz > 1 ? 's' : ''} found`, text: 'Keep them in a separate box and drop them at an e-waste or hazardous collection point.' })
  if (stats.needs_cleaning) list.push({ icon: Droplets, color: '#FBBF24', title: `${stats.needs_cleaning} item${stats.needs_cleaning > 1 ? 's' : ''} need cleaning`, text: 'Dirty or capped recyclables lose most of their value. Rinse and remove caps first.' })
  if (top) list.push({ icon: Package, color: '#60A5FA', title: `Most of your waste is ${top[0]}`, text: `${top[1].toFixed(2)} kg so far. Reducing this one material moves your numbers the most.` })
  if (!list.length) list.push({ icon: ScanLine, color: '#86d028', title: 'Nothing to flag yet', text: 'Scan a few photos and EcoLoop will point out what to fix first.' })
  list.push({ icon: Sparkles, color: '#86d028', title: 'Ask the AI coach', text: 'Get advice built from your own scans, in your language.' })
  return list
}
