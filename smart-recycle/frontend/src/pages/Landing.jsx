import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import {
  ArrowRight, Bot, CupSoda, Droplets, Factory, Flame, Leaf, Menu, Package, Pause, Play, Recycle,
  ScanLine, ShoppingBag, Soup, Trash2, UtensilsCrossed, Volume2, VolumeX, Waves, Workflow, X,
} from 'lucide-react'
import CountUp from '../components/CountUp'
import VortexCanvas from '../components/VortexCanvas'
import ImpactCards from '../components/ImpactCards'
import ModelEmbed from '../components/ModelEmbed'
import { useAuth } from '../App'
import { CODES } from '../data/learn'
import { localMedia } from '../media'

const VIDEO_REMOTE = 'https://strvid.nyc3.cdn.digitaloceanspaces.com/motionsite/hero-bg-glass-ball-1_5mb.mp4'
const VIDEO_LOCAL = '/media/hero.mp4' // optional offline copy (see README)

const NAV = [
  { href: '#crisis', label: 'The crisis' },
  { href: '#damage', label: 'The damage' },
  { href: '#india', label: 'India' },
  { href: '#codes', label: 'Know your plastic' },
  { href: '#how', label: 'How it works' },
]

// OECD Global Plastics Outlook (2019 data)
const FATE = [
  { label: 'Landfilled', pct: 50, color: '#64748B' },
  { label: 'Mismanaged', pct: 22, color: '#F87171' },
  { label: 'Incinerated', pct: 19, color: '#F59E0B' },
  { label: 'Recycled', pct: 9, color: '#86d028' },
]


const SWAPS = [
  { icon: CupSoda, from: 'Bottled water', to: 'A steel or copper bottle you refill' },
  { icon: ShoppingBag, from: 'Plastic carry bags', to: 'A cloth bag kept in your backpack' },
  { icon: UtensilsCrossed, from: 'Disposable cutlery', to: 'Your own spoon and steel tiffin' },
  { icon: Soup, from: 'Thermocol plates', to: 'Areca leaf or steel plates' },
  { icon: Package, from: 'Small multilayer packets', to: 'Larger packs or loose refills' },
  { icon: Droplets, from: 'Cling film', to: 'Steel boxes with lids' },
]

const STEPS = [
  { icon: ScanLine, title: 'Scan', text: 'Photograph one item or a whole pile. Computer vision finds and names every object.' },
  { icon: Recycle, title: 'Sort', text: 'Each item is classed as recyclable, reusable, biodegradable or hazardous, with its bin and scrap value.' },
  { icon: Workflow, title: 'Track', text: 'A digital twin follows every item to recycling, compost, safe disposal or landfill.' },
  { icon: Bot, title: 'Improve', text: 'Generative AI turns your history into personal tips, in English, Kannada, Hindi, Tamil or Telugu.' },
]

const SOURCES = [
  { label: 'OECD, Global Plastics Outlook (2022, 2019 data)', url: 'https://www.oecd.org/newsroom/plastic-pollution-is-growing-relentlessly-as-waste-management-and-recycling-fall-short.htm' },
  { label: 'Cottom et al., Nature (2024), via Down To Earth', url: 'https://www.downtoearth.org.in/amp/story/waste/india-tops-plastic-pollution-rankings-emitting-a-fifth-of-global-plastic-waste' },
  { label: 'Pew Charitable Trusts, Breaking the Plastic Wave (2020)', url: 'https://www.pew.org/en/research-and-analysis/articles/2020/07/23/breaking-the-plastic-wave-top-findings' },
  { label: 'Government of India single-use plastic ban (2022), via Al Jazeera', url: 'https://www.aljazeera.com/news/2022/7/1/india-bans-19-single-use-plastic-items-to-combat-pollution' },
]

function Stat({ value, decimals = 0, prefix = '', suffix = '', label, sub }) {
  const ref = useRef(null)
  const seen = useInView(ref, { once: true, margin: '-60px' })
  return (
    <div className="lp-stat" ref={ref}>
      <div className="lp-stat-num">
        {prefix}<CountUp value={seen ? value : 0} duration={1.6} format={(v) => v.toFixed(decimals)} />{suffix}
      </div>
      <div className="lp-label">{label}</div>
      {sub && <p>{sub}</p>}
    </div>
  )
}

export default function Landing() {
  const { user } = useAuth() || {}
  const video = useRef(null)
  const modalVideo = useRef(null)
  const [muted, setMuted] = useState(true)
  const [playing, setPlaying] = useState(true)
  const [menu, setMenu] = useState(false)
  const [modal, setModal] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const [hasLocal, setHasLocal] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const hero = useRef(null)
  const userPaused = useRef(false)

  useEffect(() => { localMedia().then((set) => setHasLocal(set.has('media/hero.mp4'))) }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const el = hero.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      const v = video.current
      if (!v || userPaused.current) return
      if (e.isIntersecting) v.play().catch(() => {}); else v.pause()
    }, { threshold: 0.05 })
    io.observe(el)
    return () => io.disconnect()
  }, [videoFailed])

  useEffect(() => {
    if (!modal) { modalVideo.current?.pause(); return }
    modalVideo.current?.play().catch(() => {})
    const esc = (e) => e.key === 'Escape' && setModal(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [modal])

  const toggleSound = () => { if (video.current) { video.current.muted = !muted; setMuted(!muted) } }
  const togglePlay = () => {
    if (!video.current) return
    if (playing) video.current.pause(); else video.current.play().catch(() => {})
    userPaused.current = playing
    setPlaying(!playing)
  }

  const cta = user ? { to: '/', label: 'Open dashboard' } : { to: '/login', label: 'Get started' }

  return (
    <div className="lp">
      {/* ---------- background video ---------- */}
      <div className="lp-bg" aria-hidden="true">
        {videoFailed ? (
          <VortexCanvas centerX={0.6} centerY={0.45} count={420} />
        ) : (
          hasLocal !== null && (
            <video ref={video} autoPlay loop muted playsInline preload="auto">
              {hasLocal && <source src={VIDEO_LOCAL} type="video/mp4" />}
              <source src={VIDEO_REMOTE} type="video/mp4" onError={() => setVideoFailed(true)} />
            </video>
          )
        )}
        <div className="lp-overlay" />
      </div>

      {/* ---------- header ---------- */}
      <header className={`lp-nav ${scrolled ? 'solid' : ''}`}>
        <div className="lp-wrap lp-nav-inner">
          <a href="#top" className="lp-logo">
            <span className="lp-logo-ic"><Leaf size={18} /><i /></span>
            <span><b>ECOLOOP</b><small>Every item back into the loop</small></span>
          </a>
          <nav className="lp-links" aria-label="Sections">
            {NAV.map((n) => <a key={n.href} href={n.href}>{n.label}</a>)}
          </nav>
          <Link to={cta.to} className="lp-pill">{cta.label} <ArrowRight size={14} /></Link>
          <button className="lp-burger" onClick={() => setMenu(!menu)} aria-label="Menu" aria-expanded={menu}>
            {menu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {menu && (
          <div className="lp-mobile">
            {NAV.map((n) => <a key={n.href} href={n.href} onClick={() => setMenu(false)}>{n.label}</a>)}
            <Link to={cta.to} className="btn" style={{ width: '100%' }}>{cta.label}</Link>
          </div>
        )}
      </header>

      {/* ---------- hero ---------- */}
      <section className="lp-hero" id="top" ref={hero}>
        <div className="lp-wrap lp-hero-grid">
          <div className="lp-hero-copy">
            <div className="lp-tag"><span /> Plastic awareness for tomorrow</div>
            <h1>
              <span className="lp-h1">Plastic lasts centuries.</span>
              <span className="lp-h1-serif">Your choices last longer.</span>
            </h1>
            <p className="lp-lede">
              Only 9% of the world's plastic waste is recycled. EcoLoop uses AI to tell you what every piece of your waste is, where it should go, and what it is worth.
            </p>
            <div className="lp-actions">
              <Link to={cta.to} className="btn lp-btn"><Leaf size={17} /> {user ? 'Open dashboard' : 'Start scanning'}</Link>
              <button className="btn ghost lp-btn" onClick={() => setModal(true)}>
                <span className="lp-play"><Play size={12} fill="currentColor" /></span> Watch video
              </button>
            </div>
          </div>
          <div className="lp-hero-space" />
          <div className="lp-hero-stats">
            <div className="lp-glass lp-mini">
              <Waves size={22} />
              <div><b>11 Mt</b><span className="lp-label">plastic into the ocean every year</span></div>
            </div>
            <div className="lp-glass lp-mini">
              <Factory size={22} />
              <div><b>460 Mt</b><span className="lp-label">plastic produced in a single year</span></div>
            </div>
          </div>
        </div>

        <div className="lp-wrap lp-controls">
          <div className="lp-ctrl-btns">
            {!videoFailed && (
              <>
                <button onClick={toggleSound} aria-label={muted ? 'Unmute background' : 'Mute background'}>{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
                <button onClick={togglePlay} aria-label={playing ? 'Pause background' : 'Play background'}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>
              </>
            )}
          </div>
          <a href="#crisis" className="lp-scroll"><span className="lp-mouse"><i /></span>Scroll down</a>
          <span className="lp-sys">EcoLoop eco OS v1.0</span>
        </div>
      </section>

      {/* ---------- crisis ---------- */}
      <section className="lp-section" id="crisis">
        <div className="lp-wrap">
          <div className="lp-head">
            <div className="lp-tag"><span /> The crisis</div>
            <h2>We made it to last. <em className="serif">Then we threw it away.</em></h2>
            <p>Plastic production and plastic waste have both roughly doubled in twenty years. Most of it is never recycled.</p>
          </div>

          <div className="lp-stats">
            <Stat value={460} suffix=" Mt" label="Plastic produced in 2019" sub="About double the amount made in 2000." />
            <Stat value={353} suffix=" Mt" label="Plastic waste in 2019" sub="Most of it from short-lived products like packaging." />
            <Stat value={9} suffix="%" label="Actually recycled" sub="15% is collected for recycling, but 40% of that is lost as residue." />
            <Stat value={22} suffix="%" label="Mismanaged" sub="Dumped, burned in the open, or leaked into land and water." />
          </div>

          <div className="lp-glass lp-fate">
            <div className="lp-fate-head">
              <h3>Where the world's plastic waste ends up</h3>
              <span className="lp-label">OECD, 2019</span>
            </div>
            <div className="lp-fate-bar" role="img" aria-label="Landfilled 50%, mismanaged 22%, incinerated 19%, recycled 9%">
              {FATE.map((f, i) => (
                <motion.div key={f.label} style={{ background: f.color }}
                  initial={{ width: 0 }} whileInView={{ width: `${f.pct}%` }} viewport={{ once: true }}
                  transition={{ delay: 0.1 + i * 0.15, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
                  <span>{f.pct}%</span>
                </motion.div>
              ))}
            </div>
            <div className="lp-fate-legend">
              {FATE.map((f) => <span key={f.label}><i style={{ background: f.color }} />{f.label} {f.pct}%</span>)}
            </div>
          </div>

          <div className="lp-ocean">
            <div className="lp-glass lp-ocean-card">
              <Waves size={26} />
              <div>
                <b>11 → 29 million tonnes</b>
                <p>Plastic entering the ocean each year today, and by 2040 if nothing changes. With known solutions, that flow could fall by about 80%.</p>
              </div>
            </div>
            <div className="lp-glass lp-ocean-card">
              <Flame size={26} />
              <div>
                <b>Contamination kills recycling</b>
                <p>Food residue, wet paper and mixed bins turn recyclable material into landfill. Sorting at the source is the cheapest fix there is.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- damage cards ---------- */}
      <section className="lp-section lp-damage" id="damage">
        <div className="lp-wrap">
          <div className="lp-head">
            <div className="lp-tag"><span /> The damage</div>
            <h2>What one plastic bag <em className="serif">really costs.</em></h2>
            <p>Tap a card to see how plastic harms the planet, from the ocean floor to the air above our cities.</p>
          </div>
        </div>
        <ImpactCards />
      </section>

      {/* ---------- india ---------- */}
      <section className="lp-section lp-alt" id="india">
        <div className="lp-wrap lp-india">
          <div className="lp-head">
            <div className="lp-tag"><span /> India</div>
            <h2>The world's largest plastic polluter. <em className="serif">For now.</em></h2>
            <p>A 2024 study in Nature found India emits more plastic pollution than any other country, mostly because waste is never collected.</p>
          </div>
          <div className="lp-india-grid">
            <Stat value={9.3} decimals={1} suffix=" Mt" label="Plastic pollution a year" sub="About one fifth of the global total of 52 Mt (2020 data)." />
            <Stat value={19} label="Single-use items banned" sub="Straws, cutlery, earbuds, balloon sticks and more, since 1 July 2022." />
            <div className="lp-stat">
              <div className="lp-stat-num">3 bins</div>
              <div className="lp-label">Required by law</div>
              <p>Solid Waste Management Rules, 2016: households must separate wet, dry and domestic hazardous waste.</p>
            </div>
          </div>
          <div className="lp-glass lp-quote">
            <Trash2 size={22} />
            <p>Uncollected waste, not recycling technology, is the biggest gap. <b>Every correctly sorted item is one less item burned or dumped.</b></p>
          </div>
        </div>
      </section>

      {/* ---------- resin codes ---------- */}
      <section className="lp-section" id="codes">
        <div className="lp-wrap">
          <div className="lp-head">
            <div className="lp-tag"><span /> Know your plastic</div>
            <h2>The number in the triangle <em className="serif">tells its future.</em></h2>
            <p>Look for the small recycling triangle on any plastic item. The number inside is its resin code.</p>
          </div>
          <div className="lp-codes">
            {CODES.map((c) => (
              <div className="lp-glass lp-code" key={c.n}>
                <div className="lp-code-top">
                  <svg viewBox="0 0 48 44" className="lp-tri" aria-hidden="true">
                    <path d="M24 3 L45 40 L3 40 Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
                    <text x="24" y="33" textAnchor="middle" fontSize="17" fontWeight="700" fill="currentColor">{c.n}</text>
                  </svg>
                  <div><b>{c.code}</b><Meter level={c.level} /></div>
                </div>
                <p className="lp-uses">{c.uses}</p>
                <p className="lp-note">{c.note}</p>
              </div>
            ))}
            <div className="lp-glass lp-code lp-code-cta">
              <ScanLine size={24} />
              <b>Not sure what it is?</b>
              <p className="lp-note">Scan it. EcoLoop names the material and tells you which bin it goes in.</p>
              <Link to={cta.to} className="lp-link">Try it <ArrowRight size={14} /></Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- how ---------- */}
      <section className="lp-section lp-alt" id="how">
        <div className="lp-wrap">
          <div className="lp-head">
            <div className="lp-tag"><span /> How EcoLoop works</div>
            <h2>From one photo <em className="serif">to a closed loop.</em></h2>
          </div>
          <div className="lp-steps">
            {STEPS.map((s, i) => (
              <div className="lp-glass lp-step" key={s.title}>
                <div className="lp-step-top"><span className="lp-step-n">{String(i + 1).padStart(2, '0')}</span><s.icon size={22} /></div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- swaps ---------- */}
      <section className="lp-section" id="swaps">
        <div className="lp-wrap">
          <div className="lp-head">
            <div className="lp-tag"><span /> Everyday swaps</div>
            <h2>The best plastic <em className="serif">is the one you never buy.</em></h2>
          </div>
          <div className="lp-swaps">
            {SWAPS.map((s) => (
              <div className="lp-glass lp-swap" key={s.from}>
                <s.icon size={22} />
                <div><span className="lp-from">{s.from}</span><b>{s.to}</b></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- final cta ---------- */}
      <section className="lp-section lp-final">
        <ModelEmbed />
        <div className="lp-wrap lp-final-inner">
          <h2>Every piece counts. <em className="serif">Start with one photo.</em></h2>
          <p>Scan your waste, see where it goes, and get advice that fits your home.</p>
          <Link to={cta.to} className="btn lp-btn"><Leaf size={17} /> {user ? 'Open dashboard' : 'Start scanning'}</Link>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="lp-foot-top">
            <span className="lp-logo"><span className="lp-logo-ic"><Leaf size={16} /></span><b>ECOLOOP</b></span>
            <span className="lp-label">Smart recycling assistant, problem statement 06</span>
          </div>
          <div className="lp-sources">
            <span className="lp-label">Sources</span>
            {SOURCES.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.label}</a>)}
            <span className="lp-credit">Photos: Wikimedia Commons contributors, used under their Creative Commons licences.</span>
          </div>
        </div>
      </footer>

      {/* ---------- video modal ---------- */}
      {modal && (
        <div className="lp-modal" onClick={(e) => e.target === e.currentTarget && setModal(false)} role="dialog" aria-modal="true" aria-label="EcoLoop video">
          <div className="lp-modal-box">
            <div className="lp-modal-head">
              <b>EcoLoop — Keep plastic in the loop</b>
              <button onClick={() => setModal(false)} aria-label="Close video"><X size={18} /></button>
            </div>
            <video ref={modalVideo} controls playsInline>
              {hasLocal && <source src={VIDEO_LOCAL} type="video/mp4" />}
              <source src={VIDEO_REMOTE} type="video/mp4" />
            </video>
          </div>
        </div>
      )}
    </div>
  )
}

function Meter({ level }) {
  const label = ['', 'Rarely recycled', 'Sometimes recycled', 'Widely recycled'][level]
  return (
    <span className={`lp-meter l${level}`} title={label}>
      <i /><i /><i /> <em>{label}</em>
    </span>
  )
}
