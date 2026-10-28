import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import imageCompression from 'browser-image-compression'
import { AlertTriangle, Camera, ClipboardPaste, ImageUp, Layers, RotateCcw, Sparkles, Sun } from 'lucide-react'
import CameraModal from '../components/CameraModal'
import { ScanBadge, ScanBusy, ScanIdle } from '../components/ScanVisuals'
import { api, CATS, rupees } from '../api'
import VortexText from '../components/VortexText'
import CountUp from '../components/CountUp'

const SOURCE_LABEL = { yolo: 'YOLO', gemini: 'Gemini', 'yolo+gemini': 'YOLO + Gemini', demo: 'Demo' }

export default function Scan() {
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [hot, setHot] = useState(null)
  const [hidden, setHidden] = useState({})
  const [over, setOver] = useState(false)
  const [camOpen, setCamOpen] = useState(false)
  const camRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  // paste an image from the clipboard (handy on a laptop demo)
  useEffect(() => {
    const onPaste = (e) => {
      const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/'))
      if (f) run(f)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  })

  async function run(file) {
    if (!file) return
    const okType = file.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp|gif|bmp|tiff?)$/i.test(file.name || '')
    if (!okType) { setError('Choose a photo (JPG, PNG, WEBP or HEIC).'); return }
    if (busy) return
    setError(''); setResult(null); setHidden({}); setHot(null); setBusy(true)
    try {
      const upload = await toJpeg(file)
      setPreview(upload.decoded ? URL.createObjectURL(upload.file) : null)
      const res = await api.detect(upload.file)
      setResult(res)
      if (!upload.decoded && res.preview) setPreview(res.preview) // browser can't show HEIC: use the server's copy
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const pick = (e) => { run(e.target.files?.[0]); e.target.value = '' }
  const reset = () => { setPreview(null); setResult(null); setError(''); setHidden({}); setHot(null) }
  const items = result?.items || []
  const s = result?.summary

  return (
    <>
      <div className="page-head">
        <div>
          <VortexText as="h1" text="Scan your waste" spread={0.5} />
          <p className="muted">One item or a whole pile. Every item is detected, classified and given a disposal instruction.</p>
        </div>
        {preview && !busy && <button className="btn ghost" onClick={reset}><RotateCcw size={17} /> New scan</button>}
      </div>

      <input ref={camRef} type="file" accept="image/*,.heic,.heif" capture="environment" hidden onChange={pick} />
      <input ref={fileRef} type="file" accept="image/*,.heic,.heif" hidden onChange={pick} />

      {error && <div className="error" style={{ marginBottom: 16 }}>{error}</div>}

      <AnimatePresence>
        {camOpen && (
          <CameraModal
            onClose={() => setCamOpen(false)}
            onCapture={(file) => { setCamOpen(false); run(file) }}
            onFallback={() => { setCamOpen(false); camRef.current.click() }}
          />
        )}
      </AnimatePresence>

      {!preview && !busy && !result && (
        <div
          className={`drop ${over ? 'over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); run(e.dataTransfer.files?.[0]) }}
        >
          <ScanIdle />
          <div className="frame" aria-hidden="true"><i /><i /><i /><i /></div>
          <div className="drop-inner">
            <ScanBadge />
            <h2>Drop a photo of your waste</h2>
            <p className="muted">One item or a whole pile. Every object is found, boxed and sorted.</p>
            <div className="drop-actions">
              <button className="btn" onClick={() => setCamOpen(true)}><Camera size={18} /> Take photo</button>
              <button className="btn ghost" onClick={() => fileRef.current.click()}><ImageUp size={18} /> Upload photo</button>
            </div>
            <div className="tips-row">
              <span><Sun size={14} /> Good light</span>
              <span><Layers size={14} /> Spread items out</span>
              <span><ClipboardPaste size={14} /> Ctrl+V to paste</span>
            </div>
          </div>
        </div>
      )}

      {(preview || busy || result) && (
        <div className="grid g-3">
          <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
            <div className="stage">
              {preview ? <img src={preview} alt="Your scanned photo" onError={() => result?.preview && preview !== result.preview && setPreview(result.preview)} /> : <div className="stage-ph" />}
              <div className="frame" aria-hidden="true"><i /><i /><i /><i /></div>
              {result && (
                <svg viewBox={`0 0 ${result.width} ${result.height}`} preserveAspectRatio="xMidYMid meet">
                  {items.map((it, i) => it.box && !hidden[it.category] && hot !== it.id && (
                    <Box key={it.id} it={it} i={i} W={result.width} hot={false} onHover={setHot} />
                  ))}
                  {items.map((it, i) => it.box && !hidden[it.category] && hot === it.id && (
                    <Box key={`hot-${it.id}`} it={it} i={i} W={result.width} hot onHover={setHot} />
                  ))}
                </svg>
              )}
              <AnimatePresence>
                {busy && (
                  <motion.div className="scan-veil" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <ScanBusy />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {s?.hazardous?.length > 0 && (
              <motion.div className="hazard" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                <AlertTriangle size={22} style={{ flex: 'none', marginTop: 2 }} />
                <div>
                  <b>Hazardous items found: {s.hazardous.join(', ')}</b>
                  <p className="small">Keep these out of wet and dry bins. Take them to an authorised e-waste or hazardous waste collection point.</p>
                </div>
              </motion.div>
            )}
            {result?.notes?.map((n) => <div key={n} className="tag warn">{n}</div>)}
          </div>

          <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
            {busy && <><div className="skeleton" style={{ height: 120 }} /><div className="skeleton" style={{ height: 260 }} /></>}
            {result && (
              <>
                <section className="panel">
                  <div className="panel-head">
                    <h2><CountUp value={s.total} /> items found</h2>
                    <span className="tag"><Sparkles size={13} /> {SOURCE_LABEL[result.source] || result.source}</span>
                  </div>
                  <div className="summary-row">
                    {Object.entries(CATS).map(([k, c]) => (
                      <button key={k} className={`sum-cat ${hidden[k] ? 'off' : ''}`} style={{ borderColor: hidden[k] ? 'transparent' : c.bg }}
                        onClick={() => setHidden({ ...hidden, [k]: !hidden[k] })} aria-pressed={!hidden[k]} title="Show or hide on the photo">
                        <div className="n" style={{ color: c.color }}>{s.counts[k]}</div>
                        <div className="small">{c.label}</div>
                      </button>
                    ))}
                  </div>
                  <div className="facts">
                    <span><b>{rupees(s.value_rs)}</b> <span className="muted">scrap value at kabadiwala rates (Aug 2026)</span></span>
                    <span><b>{s.co2_saved_kg} kg</b> <span className="muted">CO₂e saved if sorted</span></span>
                    <span><b>{s.weight_kg} kg</b> <span className="muted">estimated weight</span></span>
                  </div>
                </section>

                <section className="panel">
                  <div className="panel-head"><h2>What to do with each item</h2></div>
                  {!items.length && <p className="muted">No waste items found. Try a closer, well-lit photo.</p>}
                  <div className="item-list">
                    {items.map((it, i) => {
                      const c = CATS[it.category]
                      const dirty = it.condition && !['clean', 'ok'].includes(it.condition)
                      return (
                        <motion.div key={it.id} className={`item ${hot === it.id ? 'hot' : ''}`}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
                          onMouseEnter={() => setHot(it.id)} onMouseLeave={() => setHot(null)} onClick={() => setHot(it.id)}>
                          <span className="num-badge" style={{ background: c.color }}>{i + 1}</span>
                          <div>
                            <div className="name">{it.label}</div>
                            <div className="ins">{it.instruction}</div>
                            <div className="meta">
                              <span className="cat-chip" style={{ background: c.bg, color: c.color }}>{c.label}</span>
                              <span className="tag">{it.material}</span>
                              {dirty && <span className="tag warn">{it.condition}</span>}
                              <span className="tag">{SOURCE_LABEL[it.source] || it.source}{it.confidence ? ` · ${Math.round(it.confidence * 100)}%` : ''}</span>
                            </div>
                          </div>
                          <div className="val">{rupees(it.value_rs)}<div className="small muted">{c.bin}</div></div>
                        </motion.div>
                      )
                    })}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function Box({ it, i, W, hot, onHover }) {
  const [x1, y1, x2, y2] = it.box
  const color = CATS[it.category].color
  const fs = Math.max(12, W / 48)
  const r = fs * 0.95
  const label = it.label.length > 22 ? it.label.slice(0, 21) + '…' : it.label
  const tw = label.length * fs * 0.6 + fs
  const ty = Math.max(0, y1 - fs * 1.6)
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformOrigin: `${(x1 + x2) / 2}px ${(y1 + y2) / 2}px`, cursor: 'pointer' }}
      onMouseEnter={() => onHover(it.id)} onMouseLeave={() => onHover(null)} onClick={() => onHover(it.id)}
    >
      <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1} rx={fs * 0.4} fill={hot ? `${color}33` : `${color}10`} stroke={color} strokeWidth={hot ? fs / 4 : fs / 7} strokeOpacity={hot ? 1 : 0.85} />
      <circle cx={x1 + r * 0.9} cy={y1 + r * 0.9} r={r} fill={color} stroke="#0b191e" strokeWidth={fs / 8} />
      <text x={x1 + r * 0.9} y={y1 + r * 0.9} textAnchor="middle" dominantBaseline="central" fill="#0b191e" fontSize={fs * 0.95} fontWeight="800" fontFamily="Geist, sans-serif">{i + 1}</text>
      {hot && (
        <g>
          <rect x={x1} y={ty} width={tw} height={fs * 1.5} rx={fs * 0.3} fill={color} />
          <text x={x1 + fs / 2} y={ty + fs * 1.08} fill="#0b191e" fontSize={fs} fontWeight="700" fontFamily="Geist, sans-serif">{label}</text>
        </g>
      )}
    </motion.g>
  )
}

/**
 * Turn any photo into a small JPEG before upload: fixes rotation, shrinks big
 * phone photos (5 MB -> ~300 KB) and makes PNG/WEBP/etc. uniform. Runs on the
 * main thread (no CDN worker download). If the browser cannot decode the file
 * (e.g. HEIC in Chrome), the original is sent and the server converts it.
 */
async function toJpeg(file) {
  try {
    const out = await imageCompression(file, {
      maxSizeMB: 0.6, maxWidthOrHeight: 1280, useWebWorker: false, fileType: 'image/jpeg', initialQuality: 0.85,
    })
    if (out && out.size > 0) {
      const bmp = await createImageBitmap(out)
      bmp.close?.()
      return { file: new File([out], 'scan.jpg', { type: 'image/jpeg' }), decoded: true }
    }
  } catch { /* fall through */ }
  return { file, decoded: false }
}
