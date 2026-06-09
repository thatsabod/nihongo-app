import { useState } from 'react'
import { playCorrect, playWrong, speakJapanese } from '../sounds.js'
import RuaaMascot from './RuaaMascot.jsx'

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

export function HighlightSentence({ text, particle, readingMap = {} }) {
  const sortedKeys = Object.keys(readingMap).sort((a, b) => b.length - a.length)

  function tokenize(str) {
    const parts = []
    let remaining = str
    let i = 0
    while (remaining.length > 0) {
      let matched = false
      for (const key of sortedKeys) {
        if (remaining.startsWith(key)) {
          parts.push(<ruby key={i++}>{key}<rt>{readingMap[key]}</rt></ruby>)
          remaining = remaining.slice(key.length)
          matched = true
          break
        }
      }
      if (!matched) {
        const last = parts[parts.length - 1]
        if (typeof last === 'string') {
          parts[parts.length - 1] = last + remaining[0]
        } else {
          parts.push(remaining[0])
        }
        remaining = remaining.slice(1)
      }
    }
    return parts
  }

  if (!particle || !text.includes(particle)) {
    return <span dir="ltr">{tokenize(text)}</span>
  }
  const idx = text.indexOf(particle)
  return (
    <span dir="ltr">
      {tokenize(text.slice(0, idx))}
      <mark className="grammar-particle-mark">{particle}</mark>
      {tokenize(text.slice(idx + particle.length))}
    </span>
  )
}

// ── Exercise 1: Build the sentence ──────────────────────────────
function BuildExercise({ ex, lang, onAnswer }) {
  const [selected, setSelected] = useState([])
  const [pool, setPool] = useState(() => shuffle(ex.words.map((w, i) => ({ w, key: i }))))
  const [result, setResult] = useState(null)

  const addWord = (item) => {
    if (result) return
    setSelected((s) => [...s, item])
    setPool((p) => p.filter((x) => x.key !== item.key))
  }

  const removeWord = (item) => {
    if (result) return
    setPool((p) => [...p, item])
    setSelected((s) => s.filter((x) => x.key !== item.key))
  }

  const check = () => {
    const built = selected.map((x) => x.w).join(' ')
    const correct = built === ex.answer
    setResult(correct ? 'correct' : 'wrong')
    setTimeout(() => onAnswer(correct), 1100)
  }

  const isParticle = (w) => ex.particles?.includes(w)

  const mascotMode = result ? (result === 'correct' ? 'cheer' : 'skeptical') : 'thinking'

  return (
    <div className="grammar-ex">
      <RuaaMascot mode={mascotMode} />
      <p className="ex-prompt">{lang === 'ar' ? 'رتّب الكلمات لتكوين الجملة:' : 'Arrange the words to form the sentence:'}</p>
      <p className="ex-hint">{ex.ar}</p>

      <div className={`build-answer ${result || ''}`}>
        {selected.length === 0
          ? <span className="build-placeholder">{lang === 'ar' ? 'اضغط الكلمات بالترتيب...' : 'Tap words in order...'}</span>
          : selected.map((item) => (
            <button key={item.key} dir="ltr" className={`word-chip ${isParticle(item.w) ? 'particle-chip' : ''}`} onClick={() => removeWord(item)}>
              {item.w}
            </button>
          ))
        }
      </div>

      <div className="build-pool">
        {pool.map((item) => (
          <button key={item.key} dir="ltr" className={`word-chip ${isParticle(item.w) ? 'particle-chip' : ''}`} onClick={() => addWord(item)}>
            {item.w}
          </button>
        ))}
      </div>

      {selected.length === ex.words.length && !result && (
        <button className="btn btn-primary" onClick={check}>{lang === 'ar' ? 'تحقق' : 'Check'}</button>
      )}
    </div>
  )
}

// ── Exercise 2: Fill the particle ───────────────────────────────
function FillExercise({ ex, lang, onAnswer }) {
  const [picked, setPicked] = useState(null)
  const parts = ex.sentence.split('___')

  const pick = (opt) => {
    if (picked) return
    setPicked(opt)
    setTimeout(() => onAnswer(opt === ex.answer), 1100)
  }

  const mascotMode = picked ? (picked === ex.answer ? 'cheer' : 'skeptical') : 'thinking'

  return (
    <div className="grammar-ex">
      <RuaaMascot mode={mascotMode} />
      <p className="ex-prompt">{lang === 'ar' ? 'اختر الأداة القواعدية الصحيحة:' : 'Choose the correct particle:'}</p>

      <div className="fill-sentence" dir="ltr">
        <span>{parts[0]}</span>
        <span className={`fill-blank ${picked ? picked === ex.answer ? 'correct' : 'wrong' : ''}`}>
          {picked || '＿＿'}
        </span>
        <span>{parts[1]}</span>
      </div>
      {ex.ar && <p className="ex-hint">{ex.ar}</p>}

      <div className="fill-options">
        {ex.options.map((opt) => (
          <button
            key={opt}
            dir="ltr"
            disabled={Boolean(picked)}
            className={`particle-btn ${picked === opt ? opt === ex.answer ? 'correct' : 'wrong' : ''} ${picked && opt === ex.answer && picked !== opt ? 'reveal-correct' : ''}`}
            onClick={() => pick(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Exercise 3: Choose meaning ───────────────────────────────────
function MeaningExercise({ ex, lang, onAnswer }) {
  const [picked, setPicked] = useState(null)

  const pick = (opt) => {
    if (picked) return
    setPicked(opt)
    setTimeout(() => onAnswer(opt === ex.answer), 1100)
  }

  const mascotMode = picked ? (picked === ex.answer ? 'cheer' : 'skeptical') : 'calm'

  return (
    <div className="grammar-ex">
      <RuaaMascot mode={mascotMode} />
      <p className="ex-prompt">{lang === 'ar' ? 'ما معنى هذه الجملة؟' : 'What does this sentence mean?'}</p>

      <button className="sentence-display" dir="ltr" onClick={() => speakJapanese(ex.sentence)}>
        <HighlightSentence text={ex.sentence} particle={ex.particle} />
        <small>🔊</small>
      </button>

      <div className="meaning-options">
        {ex.options.map((opt) => (
          <button
            key={opt}
            disabled={Boolean(picked)}
            className={`meaning-btn ${picked === opt ? opt === ex.answer ? 'correct' : 'wrong' : ''} ${picked && opt === ex.answer && picked !== opt ? 'reveal-correct' : ''}`}
            onClick={() => pick(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Exercise 4: Error detection ──────────────────────────────────
function ErrorExercise({ ex, lang, onAnswer }) {
  const [picked, setPicked] = useState(null)

  const pick = (opt) => {
    if (picked) return
    setPicked(opt)
    setTimeout(() => onAnswer(opt === ex.answer), 1100)
  }

  return (
    <div className="grammar-ex">
      <p className="ex-prompt">{lang === 'ar' ? 'أيّ جملة صحيحة؟' : 'Which sentence is correct?'}</p>
      {ex.ar && <p className="ex-hint">{ex.ar}</p>}

      <div className="error-options">
        {ex.options.map((opt) => (
          <button
            key={opt}
            dir="ltr"
            disabled={Boolean(picked)}
            className={`error-btn jp-line ${picked === opt ? opt === ex.answer ? 'correct' : 'wrong' : ''} ${picked && opt === ex.answer && picked !== opt ? 'reveal-correct' : ''}`}
            onClick={() => pick(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main wrapper ─────────────────────────────────────────────────
export default function GrammarExercises({ exercises, lang, onClose }) {
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const isAr = lang === 'ar'

  const handleAnswer = (correct) => {
    if (correct) playCorrect()
    else playWrong()
    const next = score + (correct ? 1 : 0)
    if (idx + 1 >= exercises.length) {
      setScore(next)
      setFinished(true)
    } else {
      setScore(next)
      setIdx((i) => i + 1)
    }
  }

  if (finished) {
    const total = exercises.length
    const perfect = score === total
    const good = score >= Math.ceil(total / 2)
    return (
      <div className="grammar-ex-wrap">
        <div className="grammar-finish">
          <span className="finish-icon">{perfect ? '🌟' : good ? '👍' : '💪'}</span>
          <strong>{score}/{total}</strong>
          <p>{isAr ? (perfect ? 'ممتاز! أتقنت القاعدة.' : good ? 'جيد! راجع الأمثلة مرة ثانية.' : 'حاول مرة ثانية — القاعدة تحتاج مراجعة.') : (perfect ? 'Perfect mastery!' : good ? 'Good! Review the examples once more.' : 'Keep practicing!')}</p>
          <button className="btn btn-primary" onClick={onClose}>{isAr ? 'إغلاق' : 'Close'}</button>
        </div>
      </div>
    )
  }

  const ex = exercises[idx]

  return (
    <div className="grammar-ex-wrap">
      <div className="grammar-ex-header">
        <button className="icon-btn" onClick={onClose}>×</button>
        <div className="ex-progress-bar">
          <span style={{ width: `${(idx / exercises.length) * 100}%` }} />
        </div>
        <span>{idx + 1}/{exercises.length}</span>
      </div>

      {ex.type === 'build' && <BuildExercise key={idx} ex={ex} lang={lang} onAnswer={handleAnswer} />}
      {ex.type === 'fill' && <FillExercise key={idx} ex={ex} lang={lang} onAnswer={handleAnswer} />}
      {ex.type === 'meaning' && <MeaningExercise key={idx} ex={ex} lang={lang} onAnswer={handleAnswer} />}
      {ex.type === 'error' && <ErrorExercise key={idx} ex={ex} lang={lang} onAnswer={handleAnswer} />}
    </div>
  )
}
