import { useEffect, useRef, useState } from 'react'

export default function DrawingPad({ char, lang = 'ar', onDone, autoGrade = false }) {
  const canvasRef = useRef(null)
  const lastPointRef = useRef(null)
  const distanceRef = useRef(0)
  const pointsRef = useRef([])
  const strokesRef = useRef(0)
  const startedAtRef = useRef(0)
  const doneTimerRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [hasInk, setHasInk] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [score, setScore] = useState(null)

  const text = {
    ar: {
      clear: 'مسح',
      done: 'تم الرسم',
      hint: 'اتبع الحرف الشفاف مثل الكراس',
      good: 'رسم جيد',
      small: 'الرسم صغير جداً، كبره واتبع شكل الحرف',
      short: 'كمل الرسم، مجرد لمسة ما تكفي',
      narrow: 'حاول تغطي مساحة الحرف أكثر',
      retry: 'قريب، ارسمه ببطء واتبع الخطوط',
    },
    en: {
      clear: 'Clear',
      done: 'Done',
      hint: 'Trace the faint guide like a workbook',
      good: 'Good tracing',
      small: 'Too small. Make it larger and follow the guide',
      short: 'Keep drawing. A tap is not enough',
      narrow: 'Cover more of the character shape',
      retry: 'Close. Draw slowly and follow the guide',
    },
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
    if (doneTimerRef.current) window.clearTimeout(doneTimerRef.current)
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const p = point(event)
    lastPointRef.current = p
    if (!hasInk) {
      distanceRef.current = 0
      pointsRef.current = []
      startedAtRef.current = Date.now()
    }
    strokesRef.current += 1
    pointsRef.current.push(p)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    setDrawing(true)
    setHasInk(true)
    setFeedback('')
    setScore(null)
  }

  const move = (event) => {
    if (!drawing) return
    event.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const p = point(event)
    const last = lastPointRef.current || p
    distanceRef.current += Math.hypot(p.x - last.x, p.y - last.y)
    lastPointRef.current = p
    pointsRef.current.push(p)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }

  const complexity = () => {
    if (/[\u4e00-\u9faf]/.test(char)) return 3
    if ([...char].length > 1) return 2
    return 1
  }

  const evaluate = () => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const points = pointsRef.current
    const level = complexity()
    const width = rect.width || 1
    const height = rect.height || 1
    const diag = Math.hypot(width, height)

    if (points.length < 10 || Date.now() - startedAtRef.current < 320) {
      return { pass: false, score: 0, message: text.short }
    }

    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    const boxW = Math.max(...xs) - Math.min(...xs)
    const boxH = Math.max(...ys) - Math.min(...ys)
    const distanceRatio = distanceRef.current / diag
    const areaRatio = (boxW * boxH) / (width * height)
    const boxScore = Math.min(1, (boxW / width + boxH / height) / 0.9)
    const distanceScore = Math.min(1, distanceRatio / (0.22 + level * 0.12))
    const strokeScore = Math.min(1, strokesRef.current / level)

    const cells = new Set()
    for (const p of points) {
      const cx = Math.max(0, Math.min(3, Math.floor((p.x / width) * 4)))
      const cy = Math.max(0, Math.min(3, Math.floor((p.y / height) * 4)))
      cells.add(`${cx}-${cy}`)
    }
    const coverageScore = Math.min(1, cells.size / (4 + level * 2))

    const finalScore = Math.round(
      100 * (
        distanceScore * 0.34 +
        boxScore * 0.28 +
        coverageScore * 0.24 +
        strokeScore * 0.14
      )
    )

    if (distanceRatio < 0.12) return { pass: false, score: finalScore, message: text.short }
    if (areaRatio < 0.035) return { pass: false, score: finalScore, message: text.small }
    if (boxW / width < 0.18 || boxH / height < 0.18) return { pass: false, score: finalScore, message: text.narrow }

    return {
      pass: finalScore >= 68,
      score: finalScore,
      message: finalScore >= 68 ? text.good : text.retry,
    }
  }

  const stop = () => {
    if (!drawing) return
    setDrawing(false)
    if (!autoGrade || !onDone) return

    doneTimerRef.current = window.setTimeout(() => {
      const result = evaluate()
      setScore(result.score)
      setFeedback(result.message)
      if (result.pass) {
        onDone({ correct: true, score: result.score })
        window.setTimeout(clear, 250)
      }
    }, 420)
  }

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    lastPointRef.current = null
    distanceRef.current = 0
    pointsRef.current = []
    strokesRef.current = 0
    startedAtRef.current = 0
    setHasInk(false)
    setFeedback('')
    setScore(null)
  }

  useEffect(() => {
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  useEffect(() => {
    clear()
  }, [char])

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
      {feedback && (
        <div className={`draw-feedback ${score >= 68 ? 'good' : 'retry'}`}>
          <strong>{score}%</strong>
          <span>{feedback}</span>
        </div>
      )}
      <div className="split-actions">
        <button className="btn btn-secondary" onClick={clear}>{text.clear}</button>
        {onDone && !autoGrade && <button className="btn btn-primary" disabled={!hasInk} onClick={() => onDone({ correct: true })}>{text.done}</button>}
      </div>
    </div>
  )
}
