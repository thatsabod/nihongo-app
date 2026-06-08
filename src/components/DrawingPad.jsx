import { useEffect, useRef, useState } from 'react'

export default function DrawingPad({ char, lang = 'ar', onDone }) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [hasInk, setHasInk] = useState(false)

  const text = {
    ar: { clear: 'مسح', done: 'تم الرسم', hint: 'اتبع الحرف الشفاف مثل الكراس' },
    en: { clear: 'Clear', done: 'Done', hint: 'Trace the faint guide like a workbook' },
  }[lang] || {}

  const resize = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scale = window.devicePixelRatio || 1
    canvas.width = Math.floor(rect.width * scale)
    canvas.height = Math.floor(rect.height * scale)
    const ctx = canvas.getContext('2d')
    ctx.scale(scale, scale)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 12
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#e0523f'
  }

  useEffect(() => {
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const point = (event) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  const start = (event) => {
    event.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const p = point(event)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    setDrawing(true)
    setHasInk(true)
  }

  const move = (event) => {
    if (!drawing) return
    event.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const p = point(event)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }

  const stop = () => setDrawing(false)

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasInk(false)
  }

  return (
    <div className="drawing-pad">
      <div className="paper">
        <div className="guide-lines" aria-hidden="true" />
        <div className="trace-char" aria-hidden="true">{char}</div>
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={stop}
          onPointerCancel={stop}
          onPointerLeave={stop}
        />
      </div>
      <p>{text.hint}</p>
      <div className="split-actions">
        <button className="btn btn-secondary" onClick={clear}>{text.clear}</button>
        {onDone && <button className="btn btn-primary" disabled={!hasInk} onClick={onDone}>{text.done}</button>}
      </div>
    </div>
  )
}
