import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, CheckCircle2, RotateCcw, ScanLine, Trophy, X, XCircle } from 'lucide-react'
import VortexText from '../components/VortexText'
import { BINS, CODES, MYTHS, QUIZ } from '../data/learn'

const TABS = [
  { id: 'bins', label: 'Bin guide' },
  { id: 'codes', label: 'Plastic codes' },
  { id: 'myths', label: 'Myth or fact' },
  { id: 'quiz', label: 'Quick quiz' },
]

const readTab = () => { try { return localStorage.getItem('ecoloop_learn_tab') || 'bins' } catch { return 'bins' } }

export default function Learn() {
  const [tab, setTab] = useState(readTab)
  const go = (t) => { setTab(t); try { localStorage.setItem('ecoloop_learn_tab', t) } catch { /* ignore */ } }

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Learn</span>
          <VortexText as="h1" text="Sort it right, every time" spread={0.5} />
          <p className="muted">A practical guide to what goes where, what the plastic codes mean, and the myths that keep recycling from working.</p>
        </div>
        <Link to="/about" className="btn ghost">Why it matters <ArrowRight size={16} /></Link>
      </div>

      <div className="ln-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => go(t.id)}>
            {tab === t.id && <motion.span layoutId="ln-pill" className="ln-pill" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
          {tab === 'bins' && <Bins />}
          {tab === 'codes' && <Codes />}
          {tab === 'myths' && <Myths />}
          {tab === 'quiz' && <Quiz />}
        </motion.div>
      </AnimatePresence>
    </>
  )
}

function Bins() {
  return (
    <div className="ln-bins">
      {BINS.map((b) => (
        <section key={b.key} className="ln-bin" style={{ '--c': b.color }}>
          <div className="ln-bin-head">
            <span className="ln-lid" />
            <div><h2>{b.name}</h2><span className="ln-sub">{b.sub}</span></div>
          </div>
          <ul className="ln-list yes">{b.yes.map((x) => <li key={x}><Check size={15} /> {x}</li>)}</ul>
          <ul className="ln-list no">{b.no.map((x) => <li key={x}><X size={15} /> {x}</li>)}</ul>
          <p className="ln-tip">{b.tip}</p>
        </section>
      ))}
    </div>
  )
}

function Codes() {
  const label = ['', 'Rarely recycled', 'Sometimes recycled', 'Widely recycled']
  return (
    <div className="ln-codes">
      {CODES.map((c) => (
        <div key={c.n} className="ln-code">
          <div className="ln-code-top">
            <svg viewBox="0 0 48 44" className="lp-tri" aria-hidden="true">
              <path d="M24 3 L45 40 L3 40 Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
              <text x="24" y="33" textAnchor="middle" fontSize="17" fontWeight="700" fill="currentColor">{c.n}</text>
            </svg>
            <div>
              <b>{c.code}</b>
              <span className={`lp-meter l${c.level}`}><i /><i /><i /> <em>{label[c.level]}</em></span>
            </div>
          </div>
          <p className="ln-uses">{c.uses}</p>
          <p className="ln-note">{c.note}</p>
        </div>
      ))}
      <Link to="/scan" className="ln-code ln-code-cta">
        <ScanLine size={26} />
        <b>Not sure which plastic it is?</b>
        <p className="ln-note">Scan it and EcoLoop tells you the material and the right bin.</p>
      </Link>
    </div>
  )
}

function Myths() {
  const [open, setOpen] = useState({})
  return (
    <div className="ln-myths">
      {MYTHS.map((m, i) => {
        const flipped = !!open[i]
        return (
          <button key={i} className={`ln-flip ${flipped ? 'flipped' : ''}`} onClick={() => setOpen({ ...open, [i]: !flipped })} aria-pressed={flipped}>
            <span className="ln-face front">
              <span className="ln-q">Myth or fact?</span>
              <b>{m.claim}</b>
              <span className="ln-hint">Tap to reveal</span>
            </span>
            <span className={`ln-face back ${m.fact ? 'fact' : 'myth'}`}>
              <span className="ln-verdict">{m.fact ? <><CheckCircle2 size={18} /> Fact</> : <><XCircle size={18} /> Myth</>}</span>
              <span className="ln-why">{m.why}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

const BEST_KEY = 'ecoloop_quiz_best'
const readBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0 } catch { return 0 } }

function Quiz() {
  const [i, setI] = useState(0)
  const [pick, setPick] = useState(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [best, setBest] = useState(readBest)
  const q = QUIZ[i]

  const choose = (k) => {
    if (pick) return
    setPick(k)
    if (k === q.answer) setScore((s) => s + 1)
  }
  const next = () => {
    if (i + 1 < QUIZ.length) { setI(i + 1); setPick(null); return }
    setDone(true)
    if (score > best) { setBest(score); try { localStorage.setItem(BEST_KEY, String(score)) } catch { /* ignore */ } }
  }
  const restart = () => { setI(0); setPick(null); setScore(0); setDone(false) }

  if (done) {
    return (
      <div className="ln-quiz ln-done">
        <Trophy size={40} />
        <h2>{score} / {QUIZ.length}</h2>
        <p className="muted">{score === QUIZ.length ? 'Perfect sorting. You are ready to teach your neighbours.' : score >= QUIZ.length / 2 ? 'Good sorting. Check the bin guide for the ones you missed.' : 'A few mix-ups. The bin guide will sort them out.'}</p>
        <span className="small muted">Best score: {Math.max(best, score)} / {QUIZ.length}</span>
        <button className="btn" onClick={restart}><RotateCcw size={16} /> Try again</button>
      </div>
    )
  }

  return (
    <div className="ln-quiz">
      <div className="ln-progress"><span style={{ width: `${(i / QUIZ.length) * 100}%` }} /></div>
      <div className="ln-qmeta"><span>Question {i + 1} of {QUIZ.length}</span><span>Score {score}</span></div>
      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.28 }}>
          <span className="ln-q">Which bin does this go in?</span>
          <h2 className="ln-item">{q.item}</h2>
          <div className="ln-opts">
            {BINS.map((b) => {
              const state = !pick ? '' : b.key === q.answer ? 'right' : b.key === pick ? 'wrong' : 'dim'
              return (
                <button key={b.key} className={`ln-opt ${state}`} style={{ '--c': b.color }} onClick={() => choose(b.key)} disabled={!!pick}>
                  <span className="ln-dot" /> {b.name}
                </button>
              )
            })}
          </div>
          {pick && (
            <motion.div className={`ln-feedback ${pick === q.answer ? 'ok' : 'bad'}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <b>{pick === q.answer ? 'Correct.' : 'Not quite.'}</b> {q.why}
              <button className="btn sm" onClick={next}>{i + 1 < QUIZ.length ? 'Next' : 'See score'} <ArrowRight size={14} /></button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
