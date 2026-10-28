import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, RefreshCw, Send, Volume2 } from 'lucide-react'
import { api } from '../api'
import VortexText from '../components/VortexText'

const LANGS = [
  { code: 'en', label: 'English', voice: 'en-IN' },
  { code: 'kn', label: 'ಕನ್ನಡ', voice: 'kn-IN' },
  { code: 'hi', label: 'हिन्दी', voice: 'hi-IN' },
  { code: 'ta', label: 'தமிழ்', voice: 'ta-IN' },
  { code: 'te', label: 'తెలుగు', voice: 'te-IN' },
]
const STARTERS = ['Where do I throw a dead battery?', 'Can greasy pizza boxes be recycled?', 'How do I start composting at home?', 'Which of my waste can I sell?']
const TYPE_COLOR = { reduce: '#4ADE80', reuse: '#A78BFA', recycle: '#60A5FA', safety: '#F87171', earn: '#FBBF24' }

function speak(text, lang) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = LANGS.find((l) => l.code === lang)?.voice || 'en-IN'
  window.speechSynthesis.speak(u)
}

export default function Coach() {
  const [lang, setLang] = useState('en')
  const [tips, setTips] = useState(null)
  const [tipSource, setTipSource] = useState('')
  const [loadingTips, setLoadingTips] = useState(false)
  const [msgs, setMsgs] = useState([{ role: 'bot', text: 'Ask me about any item, bin rule or how to earn from your dry waste. I know what you have scanned.' }])
  const [q, setQ] = useState('')
  const [asking, setAsking] = useState(false)
  const end = useRef(null)

  const loadTips = () => {
    setLoadingTips(true)
    api.recommend(lang).then((r) => { setTips(r.items); setTipSource(r.source) }).catch((e) => setTips([{ title: 'Could not load tips', detail: e.message }])).finally(() => setLoadingTips(false))
  }
  useEffect(loadTips, [lang]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [msgs, asking])

  const ask = async (text) => {
    const question = (text ?? q).trim()
    if (!question || asking) return
    setQ('')
    const next = [...msgs, { role: 'user', text: question }]
    setMsgs(next); setAsking(true)
    try {
      const r = await api.coach({ question, history: next.slice(-6), lang })
      setMsgs([...next, { role: 'bot', text: r.answer }])
    } catch (e) {
      setMsgs([...next, { role: 'bot', text: e.message }])
    } finally {
      setAsking(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <VortexText as="h1" text="Your recycling coach" spread={0.5} />
          <p className="muted">Advice built from your own scans and Indian waste rules, in your language.</p>
        </div>
        <select className="select" value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
          {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
      </div>

      <div className="grid g-2">
        <section className="panel">
          <div className="panel-head">
            <h2>For you</h2>
            <button className="btn ghost sm" onClick={loadTips} disabled={loadingTips}>
              <RefreshCw size={15} className={loadingTips ? 'spin' : ''} /> Refresh
            </button>
          </div>
          <div className="tips">
            {!tips && [0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 92 }} />)}
            <AnimatePresence mode="popLayout">
              {tips?.map((t, i) => (
                <motion.div key={`${lang}-${i}-${t.title}`} className="tip" style={{ borderLeft: `4px solid ${TYPE_COLOR[t.type] || '#86d028'}` }}
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <h3>{t.title}</h3>
                    <button className="linkish" style={{ color: 'var(--ink-2)' }} onClick={() => speak(`${t.title}. ${t.detail}`, lang)} aria-label="Read aloud"><Volume2 size={16} /></button>
                  </div>
                  <p className="small">{t.detail}</p>
                  {t.impact && <span className="impact-line">{t.impact}</span>}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {tipSource === 'rules' && <p className="small muted" style={{ marginTop: 12 }}>Showing rule-based tips. Add a Gemini key on the server for AI-written advice.</p>}
        </section>

        <section className="panel chat">
          <div className="panel-head"><h2>Ask anything</h2></div>
          <div className="msgs" aria-live="polite">
            {msgs.map((m, i) => (
              <motion.div key={i} className={`bubble ${m.role}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                {m.text}
                {m.role === 'bot' && i > 0 && (
                  <button className="linkish" style={{ display: 'flex', marginTop: 6, color: 'var(--ink-2)', fontSize: 12 }} onClick={() => speak(m.text, lang)}><Volume2 size={14} /> Listen</button>
                )}
              </motion.div>
            ))}
            {asking && <div className="bubble bot"><Loader2 size={16} className="spin" /></div>}
            <div ref={end} />
          </div>
          {msgs.length < 3 && (
            <div className="chips">{STARTERS.map((s) => <button key={s} onClick={() => ask(s)}>{s}</button>)}</div>
          )}
          <form className="composer" onSubmit={(e) => { e.preventDefault(); ask() }}>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. what do I do with old medicines?" aria-label="Your question" />
            <button className="btn" disabled={asking || !q.trim()} aria-label="Send"><Send size={17} /></button>
          </form>
        </section>
      </div>
    </>
  )
}
