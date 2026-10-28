import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, Camera, Coins, Leaf, LogOut, Package, Trash2 } from 'lucide-react'
import { useAuth } from '../App'
import { api, rupees } from '../api'

const photoKey = (u) => `ecoloop_photo_${u?.id}`
const readPhoto = (u) => { try { return localStorage.getItem(photoKey(u)) } catch { return null } }

// shrink a picked image to a small square avatar (keeps localStorage tiny)
function toAvatar(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const s = 160, c = document.createElement('canvas')
      c.width = c.height = s
      const m = Math.min(img.width, img.height)
      c.getContext('2d').drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, s, s)
      resolve(c.toDataURL('image/jpeg', 0.85))
      URL.revokeObjectURL(img.src)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

export function Avatar({ user, photo, size = 40 }) {
  const initial = (user?.name || '?').trim()[0]?.toUpperCase()
  return photo
    ? <img className="avatar-img" src={photo} alt="" style={{ width: size, height: size }} />
    : <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.42 }}>{initial}</span>
}

export default function ProfileMenu({ engine, engineOk }) {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [photo, setPhoto] = useState(() => readPhoto(user))
  const [stats, setStats] = useState(null)
  const box = useRef(null)
  const file = useRef(null)

  useEffect(() => {
    if (!open) return
    api.stats().then(setStats).catch(() => {})
    const away = (e) => box.current && !box.current.contains(e.target) && setOpen(false)
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', away)
    window.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', away); window.removeEventListener('keydown', esc) }
  }, [open])

  const pick = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const url = await toAvatar(f)
      setPhoto(url)
      try { localStorage.setItem(photoKey(user), url) } catch { /* storage full or blocked */ }
    } catch { /* unreadable image */ }
  }
  const removePhoto = () => { setPhoto(null); try { localStorage.removeItem(photoKey(user)) } catch { /* ignore */ } }

  return (
    <div className="profile" ref={box}>
      <button className={`profile-btn ${open ? 'on' : ''}`} onClick={() => setOpen(!open)} aria-haspopup="dialog" aria-expanded={open} aria-label="Your profile">
        <Avatar user={user} photo={photo} size={40} />
        <i className={`profile-dot ${engineOk ? 'ok' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="profile-panel" role="dialog" aria-label="Profile"
            initial={{ opacity: 0, scale: 0.92, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          >
            <div className="pp-head">
              <div className="pp-photo">
                <Avatar user={user} photo={photo} size={64} />
                <button className="pp-cam" onClick={() => file.current.click()} aria-label="Change photo"><Camera size={14} /></button>
                <input ref={file} type="file" accept="image/*" hidden onChange={pick} />
              </div>
              <div className="pp-id">
                <b>{user?.name}</b>
                <span>{user?.email}</span>
                <span className="status-dot"><i className={engineOk ? 'ok' : ''} /> {engine}</span>
              </div>
            </div>

            <div className="pp-stats">
              <div><Package size={15} /><b>{stats ? stats.items : '–'}</b><span>items</span></div>
              <div><Leaf size={15} /><b>{stats ? `${stats.co2_saved_kg.toFixed(1)} kg` : '–'}</b><span>CO₂e saved</span></div>
              <div><Coins size={15} /><b>{stats ? rupees(Math.round(stats.value_rs)) : '–'}</b><span>scrap value</span></div>
            </div>

            <div className="pp-actions">
              <button onClick={() => file.current.click()}><Camera size={16} /> {photo ? 'Change photo' : 'Add a photo'}</button>
              {photo && <button onClick={removePhoto}><Trash2 size={16} /> Remove photo</button>}
              <Link to="/learn" onClick={() => setOpen(false)}><BookOpen size={16} /> Learn about plastic</Link>
              <button className="danger" onClick={signOut}><LogOut size={16} /> Log out</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
