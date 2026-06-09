import { useEffect, useRef, useState } from 'react'

export default function DrawingPad({ char, lang = 'ar', onDone, autoGrade = false }) {
  const canvasRef = useRef(null)
  const lastPointRef = useRef(null)
  const distanceRef = useRef(0)
  const pointsRef = useRef([])
  const strokesRef = useRef(0)
  const startedAtRef = useRef(0)
  const doneTimerRef = useRef(null)
  const guideRef = useRef(null)
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
      missing: 'باقي ستروكات ما متغطية، اتبع كل خطوط الحرف',
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
      missing: 'Some strokes are still missing. Trace every part of the character',
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

  const buildGuide = () => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const width = Math.max(1, Math.round(rect.width))
    const height = Math.max(1, Math.round(rect.height))
    const offscreen = document.createElement('canvas')
    offscreen.width = width
    offscreen.height = height
    const ctx = offscreen.getContext('2d')
    const fontSize = Math.min(210, Math.max(110, width * 0.55))

    ctx.fillStyle = '#000'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `800 ${fontSize}px Inter, "Segoe UI", "Hiragino Sans", "Yu Gothic", sans-serif`
    ctx.fillText(char, width / 2, height / 2 + fontSize * 0.04)

    const data = ctx.getImageData(0, 0, width, height).data
    const step = Math.max(7, Math.round(width / 34))
    const cols = Math.ceil(width / step)
    const rows = Math.ceil(height / step)
    const guideCells = []
    const active = new Uint8Array(cols * rows)

    for (let gy = 0; gy < rows; gy += 1) {
      for (let gx = 0; gx < cols; gx += 1) {
        let ink = 0
        let total = 0
        for (let y = gy * step; y < Math.min(height, (gy + 1) * step); y += 2) {
          for (let x = gx * step; x < Math.min(width, (gx + 1) * step); x += 2) {
            total += 1
            if (data[(y * width + x) * 4 + 3] > 20) ink += 1
          }
        }
        if (total && ink / total > 0.08) {
          const index = gy * cols + gx
          active[index] = 1
          guideCells.push({ gx, gy, x: gx * step + step / 2, y: gy * step + step / 2, index })
        }
      }
    }

    const visited = new Uint8Array(cols * rows)
    const components = []
    const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]]

    for (const cell of guideCells) {
      if (visited[cell.index]) continue
      const queue = [cell]
      const component = []
      visited[cell.index] = 1
      while (queue.length) {
        const current = queue.pop()
        component.push(current)
        for (const [dx, dy] of neighbors) {
          const nx = current.gx + dx
          const ny = current.gy + dy
          if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue
          const ni = ny * cols + nx
          if (!active[ni] || visited[ni]) continue
          visited[ni] = 1
          queue.push({ gx: nx, gy: ny, x: nx * step + step / 2, y: ny * step + step / 2, index: ni })
        }
      }
      if (component.length >= 2) components.push(component)
    }

    components.sort((a, b) => b.length - a.length)
    const minComponentSize = Math.max(3, guideCells.length * 0.025)

    return {
      step,
      cells: guideCells,
      components: components.filter((component) => component.length >= minComponentSize).slice(0, 12),
    }
  }

  const guideCoverage = (points) => {
    if (!guideRef.current) guideRef.current = buildGuide()
    const guide = guideRef.current
    if (!guide?.cells?.length) return { coverage: 1, componentCoverage: 1, missingComponents: 0 }

    const hitRadius = guide.step * 1.35
    const hitRadiusSq = hitRadius * hitRadius
    const hitCells = new Set()

    for (const cell of guide.cells) {
      for (const p of points) {
        const dx = p.x - cell.x
        const dy = p.y - cell.y
        if (dx * dx + dy * dy <= hitRadiusSq) {
          hitCells.add(cell.index)
          break
        }
      }
    }

    const componentRatios = guide.components.map((component) => {
      const hit = component.filter((cell) => hitCells.has(cell.index)).length
      return hit / component.length
    })
    const requiredComponentRatio = complexity() >= 3 ? 0.36 : 0.42
    const missingComponents = componentRatios.filter((ratio) => ratio < requiredComponentRatio).length
    const componentCoverage = componentRatios.length
      ? componentRatios.reduce((sum, ratio) => sum + Math.min(1, ratio / requiredComponentRatio), 0) / componentRatios.length
      : 1

    return {
      coverage: hitCells.size / guide.cells.length,
      componentCoverage,
      missingComponents,
    }
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
    const guideScore = guideCoverage(points)

    const finalScore = Math.round(
      100 * (
        distanceScore * 0.24 +
        boxScore * 0.18 +
        coverageScore * 0.16 +
        strokeScore * 0.12 +
        guideScore.coverage * 0.16 +
        guideScore.componentCoverage * 0.14
      )
    )

    if (distanceRatio < 0.12) return { pass: false, score: finalScore, message: text.short }
    if (areaRatio < 0.035) return { pass: false, score: finalScore, message: text.small }
    if (boxW / width < 0.18 || boxH / height < 0.18) return { pass: false, score: finalScore, message: text.narrow }
    if (guideScore.coverage < (level >= 3 ? 0.34 : 0.4)) return { pass: false, score: finalScore, message: text.missing }
    if (guideScore.missingComponents > 0) return { pass: false, score: finalScore, message: text.missing }

    return {
      pass: finalScore >= 74,
      score: finalScore,
      message: finalScore >= 74 ? text.good : text.retry,
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
    guideRef.current = null
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
