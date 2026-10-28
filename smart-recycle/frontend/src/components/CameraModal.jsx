/**
 * In-app camera: live viewfinder + shutter, using getUserMedia.
 * Works on laptops (webcam) and phones (rear camera, can flip).
 * Needs a secure page (localhost or https, e.g. ngrok). If the camera can't be
 * opened, it explains why and offers the system camera / file picker instead.
 */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Camera, ImageUp, RefreshCcw, X } from 'lucide-react'

export default function CameraModal({ onCapture, onClose, onFallback }) {
  const video = useRef(null)
  const stream = useRef(null)
  const [facing, setFacing] = useState('environment')
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState(false)
  const [canFlip, setCanFlip] = useState(false)

  useEffect(() => {
    let cancelled = false
    const start = async () => {
      setReady(false); setError('')
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('This page cannot open the camera directly. Open it on localhost or the https (ngrok) link, or use the system camera below.')
        return
      }
      try {
        stream.current?.getTracks().forEach((t) => t.stop())
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false,
        })
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return }
        stream.current = s
        if (video.current) { video.current.srcObject = s; await video.current.play().catch(() => {}) }
        setReady(true)
        const cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput')
        setCanFlip(cams.length > 1)
      } catch (e) {
        setError(e.name === 'NotAllowedError'
          ? 'Camera permission was blocked. Allow camera access in the browser address bar, then try again.'
          : e.name === 'NotFoundError' ? 'No camera was found on this device.' : `Could not open the camera (${e.name}).`)
      }
    }
    start()
    return () => { cancelled = true }
  }, [facing])

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', esc)
      document.body.style.overflow = ''
      stream.current?.getTracks().forEach((t) => t.stop())
    }
  }, [onClose])

  const shoot = () => {
    const v = video.current
    if (!v || !v.videoWidth) return
    const c = document.createElement('canvas')
    c.width = v.videoWidth; c.height = v.videoHeight
    const ctx = c.getContext('2d')
    if (facing === 'user') { ctx.translate(c.width, 0); ctx.scale(-1, 1) }
    ctx.drawImage(v, 0, 0)
    setFlash(true)
    c.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], `scan-${Date.now()}.jpg`, { type: 'image/jpeg' })
      stream.current?.getTracks().forEach((t) => t.stop())
      setTimeout(() => onCapture(file), 180)
    }, 'image/jpeg', 0.9)
  }

  return createPortal(
    <motion.div className="cam" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="Camera">
      <motion.div className="cam-box" initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 28 }}>
        <div className="cam-view">
          <video ref={video} playsInline muted className={facing === 'user' ? 'mirror' : ''} />
          {!ready && !error && <div className="cam-msg"><span className="cam-spin" /> Opening camera…</div>}
          {error && (
            <div className="cam-msg cam-err">
              <p>{error}</p>
              <button className="btn" onClick={onFallback}><ImageUp size={17} /> Use system camera or files</button>
            </div>
          )}
          {ready && <div className="frame" aria-hidden="true"><i /><i /><i /><i /></div>}
          {flash && <motion.div className="cam-flash" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.4 }} />}
          <button className="cam-close" onClick={onClose} aria-label="Close camera"><X size={20} /></button>
        </div>
        <div className="cam-bar">
          <span className="cam-hint">Fit the whole pile in the frame</span>
          <button className="cam-shutter" onClick={shoot} disabled={!ready} aria-label="Take photo"><Camera size={22} /></button>
          <button className="cam-flip" onClick={() => setFacing(facing === 'environment' ? 'user' : 'environment')} disabled={!canFlip} aria-label="Switch camera"><RefreshCcw size={18} /></button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}
