import { useEffect, useRef, useState } from 'react'
import { Layer, Rectangle, ResponsiveContainer, Sankey, Tooltip } from 'recharts'
import { motion } from 'framer-motion'
import { ArrowDownToLine, Leaf, Recycle, Trash2 } from 'lucide-react'
import RollingNumber from '../components/RollingNumber'
import { api, kg, rupees } from '../api'
import VortexText from '../components/VortexText'

const NODE_COLOR = {
  'Scanned waste': '#86d028',
  'Dry bin': '#60A5FA', 'Sorting centre': '#60A5FA', 'Recycled material': '#60A5FA',
  'Wet bin': '#4ADE80', 'Compost unit': '#4ADE80', Compost: '#4ADE80',
  'Hazard drop-off': '#F87171', 'Authorised handler': '#F87171', 'Safe disposal': '#F87171',
  'Reuse / donate': '#A78BFA', 'Second life': '#A78BFA', Reused: '#A78BFA',
  Landfill: '#94A3B8',
}

function Node({ x, y, width, height, payload }) {
  const color = NODE_COLOR[payload.name] || '#86d028'
  const right = !payload.targetLinks?.length // last column: label goes on the left
  return (
    <Layer>
      <Rectangle x={x} y={y} width={width} height={Math.max(height, 2)} fill={color} radius={6} />
      <text x={right ? x - 8 : x + width + 8} y={y + height / 2} textAnchor={right ? 'end' : 'start'} dominantBaseline="middle" fontSize={12.5} fontWeight={700} fill="#EAF5F2">
        {payload.name}
      </text>
    </Layer>
  )
}

function Link({ sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, payload }) {
  const color = NODE_COLOR[payload.target.name] || '#86d028'
  const d = `M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`
  const landfill = payload.target.name === 'Landfill'
  return (
    <g>
      <path d={d} fill="none" stroke={color} strokeOpacity={landfill ? 0.18 : 0.26} strokeWidth={Math.max(linkWidth, 1)} />
      <path d={d} fill="none" stroke={color} strokeOpacity={landfill ? 0.5 : 0.9} strokeWidth={Math.min(Math.max(linkWidth * 0.18, 1.5), 5)}
        strokeLinecap="round" className={`tw-flow ${landfill ? 'slow' : ''}`} />
    </g>
  )
}

export default function Twin() {
  const [scope, setScope] = useState('me')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [p, setP] = useState({ households: 1000, days: 30, segregation_pct: 60, contamination_pct: 25 })
  const [sim, setSim] = useState(null)
  const timer = useRef(null)

  useEffect(() => {
    setData(null)
    api.twin(scope).then(setData).catch((e) => setError(e.message))
  }, [scope])

  // debounce slider changes so the server is not hammered
  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => api.simulate(p).then(setSim).catch((e) => setError(e.message)), 180)
    return () => clearTimeout(timer.current)
  }, [p])

  const k = data?.kpis
  const set = (key) => (e) => setP({ ...p, [key]: Number(e.target.value) })

  return (
    <>
      <div className="page-head">
        <div>
          <VortexText as="h1" text="Digital twin of your waste" spread={0.5} />
          <p className="muted">Every scanned item is routed along the path it really takes: bin, collection, facility, outcome. Then test what changes if people sort better.</p>
        </div>
        <div className="seg" role="group" aria-label="Whose waste">
          <button className={scope === 'me' ? 'on' : ''} onClick={() => setScope('me')}>My waste</button>
          <button className={scope === 'all' ? 'on' : ''} onClick={() => setScope('all')}>All users</button>
        </div>
      </div>

      {error && <div className="error" style={{ marginBottom: 16 }}>{error}</div>}

      <section className="tw-kpis">
        <Kpi icon={ArrowDownToLine} color="#86d028" label="Entered the loop" value={k?.input_kg} fmt={(v) => `${v.toFixed(2)} kg`} />
        <Kpi icon={Recycle} color="#60A5FA" label="Kept out of landfill" value={k?.diverted_kg} fmt={(v) => `${v.toFixed(2)} kg`} />
        <Kpi icon={Trash2} color="#94A3B8" label="Still to landfill" value={k?.landfill_kg} fmt={(v) => `${v.toFixed(2)} kg`} />
        <div className="tw-tile tw-gauge-tile">
          <Gauge value={k?.diversion_rate || 0} />
          <span className="tw-label">Diversion rate</span>
        </div>
      </section>

      <section className="tw-card" style={{ marginTop: 18 }}>
        <div className="panel-head">
          <h2>Material flow</h2>
          <span className="small muted">Line thickness = weight in kg</span>
        </div>
        {!data && <div className="skeleton sankey-wrap" />}
        {data && !data.links.length && <p className="muted">Scan a few items and the flow appears here.</p>}
        {data?.links.length > 0 && (
          <div className="sankey-scroll"><div className="sankey-wrap">
            <ResponsiveContainer>
              <Sankey data={data} node={<Node />} link={<Link />} nodePadding={26} nodeWidth={12} margin={{ top: 10, bottom: 10, left: 4, right: 4 }} iterations={64}>
                <Tooltip formatter={(v) => kg(v)} contentStyle={{ borderRadius: 12, border: '1px solid rgba(255,255,255,.14)', background: '#0A2E29', color: '#EAF5F2' }} />
              </Sankey>
            </ResponsiveContainer>
          </div></div>
        )}
      </section>

      <div className="grid g-2" style={{ marginTop: 18 }}>
        <section className="tw-card">
          <div className="panel-head"><h2>What if more people sorted?</h2></div>
          <div style={{ display: 'grid', gap: 18 }}>
            <Slider label="Households" value={p.households} min={100} max={50000} step={100} onChange={set('households')} fmt={(v) => v.toLocaleString('en-IN')} />
            <Slider label="Households that segregate" value={p.segregation_pct} min={0} max={100} onChange={set('segregation_pct')} fmt={(v) => `${v}%`} />
            <Slider label="Dry waste that is dirty" value={p.contamination_pct} min={0} max={100} onChange={set('contamination_pct')} fmt={(v) => `${v}%`} />
            <Slider label="Period" value={p.days} min={1} max={365} onChange={set('days')} fmt={(v) => `${v} days`} />
            <p className="small muted">Compared with a baseline of 20% segregation and 40% contamination. Waste mix: {sim?.mix_source || '…'}.</p>
          </div>
        </section>

        <section className="tw-card">
          <div className="panel-head"><h2>Projected result</h2></div>
          {!sim ? <div className="skeleton" style={{ height: 260 }} /> : (
            <div className="compare">
              <Compare label="Sent to landfill" a={sim.baseline.landfill_kg} b={sim.scenario.landfill_kg} max={sim.scenario.total_kg} fmt={kg} color="#94A3B8" lowerIsBetter />
              <Compare label="Recycled" a={sim.baseline.recycled_kg} b={sim.scenario.recycled_kg} max={sim.scenario.total_kg} fmt={kg} color="#60A5FA" />
              <Compare label="Composted" a={sim.baseline.composted_kg} b={sim.scenario.composted_kg} max={sim.scenario.total_kg} fmt={kg} color="#4ADE80" />
              <Compare label="Hazardous handled safely" a={sim.baseline.hazard_safe_kg} b={sim.scenario.hazard_safe_kg} max={Math.max(1, sim.scenario.hazard_safe_kg + sim.scenario.hazard_unsafe_kg)} fmt={kg} color="#F87171" />
              <div className="deltas">
                <div><div className="small muted"><Leaf size={13} /> Extra CO₂e avoided</div><b className={sim.delta.co2_saved_kg >= 0 ? 'delta-up' : 'delta-down'}>{sim.delta.co2_saved_kg >= 0 ? '+' : '−'}<RollingNumber value={Math.abs(sim.delta.co2_saved_kg)} format={(v) => kg(v)} /></b></div>
                <div><div className="small muted">Extra scrap value</div><b className={sim.delta.value_rs >= 0 ? 'delta-up' : 'delta-down'}>{sim.delta.value_rs >= 0 ? '+' : '−'}<RollingNumber value={Math.abs(sim.delta.value_rs)} format={(v) => rupees(Math.round(v))} /></b></div>
                <div><div className="small muted">Diversion rate</div><b><span className="muted">{sim.baseline.diversion_rate}% → </span><RollingNumber value={sim.scenario.diversion_rate} format={(v) => `${v.toFixed(1)}%`} /></b></div>
              </div>
            </div>
          )}
        </section>
      </div>

      {data && (
        <details className="assume" style={{ marginTop: 20 }}>
          <summary>Model assumptions</summary>
          <pre>{JSON.stringify(data.assumptions, null, 2)}</pre>
        </details>
      )}
    </>
  )
}

function Slider({ label, value, fmt, min, max, ...rest }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <label className="slider">
      <span className="row"><span>{label}</span><span className="slider-val">{fmt(value)}</span></span>
      <input type="range" value={value} min={min} max={max} style={{ '--p': `${pct}%` }} {...rest} />
    </label>
  )
}

function Kpi({ icon: Icon, color, label, value, fmt }) {
  return (
    <div className="tw-tile">
      <span className="tw-ic" style={{ color, background: `${color}1f` }}><Icon size={18} /></span>
      <div className="tw-num"><RollingNumber value={value || 0} format={fmt} /></div>
      <span className="tw-label">{label}</span>
    </div>
  )
}

function Gauge({ value }) {
  const r = 52, C = Math.PI * r
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className="tw-gauge">
      <svg viewBox="0 0 128 72" aria-hidden="true">
        <defs>
          <linearGradient id="tw-g" x1="0" x2="1">
            <stop offset="0%" stopColor="#F87171" /><stop offset="50%" stopColor="#FBBF24" /><stop offset="100%" stopColor="#86d028" />
          </linearGradient>
        </defs>
        <path d="M12 64 A52 52 0 0 1 116 64" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="10" strokeLinecap="round" />
        <motion.path d="M12 64 A52 52 0 0 1 116 64" fill="none" stroke="url(#tw-g)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C - (v / 100) * C }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }} />
      </svg>
      <div className="tw-gauge-num"><RollingNumber value={v} format={(x) => `${x.toFixed(1)}%`} /></div>
    </div>
  )
}

function Compare({ label, a, b, max, fmt, color, lowerIsBetter }) {
  const better = lowerIsBetter ? b <= a : b >= a
  const pct = (v) => `${Math.min(100, (v / Math.max(max, 1)) * 100)}%`
  return (
    <div className="cmp-row">
      <div className="top"><span>{label}</span><span><span className="muted">{fmt(a)} → </span><b className={better ? 'delta-up' : 'delta-down'}><RollingNumber value={b} format={fmt} /></b></span></div>
      <div className="bar"><span style={{ width: pct(a), background: 'rgba(255,255,255,.2)' }} /></div>
      <div className="bar bar-main" style={{ marginTop: 5 }}><span style={{ width: pct(b), background: `linear-gradient(90deg, ${color}99, ${color})`, boxShadow: `0 0 12px ${color}66` }} /></div>
    </div>
  )
}
