import { useState, useEffect } from 'react'
import { playCorrect, playWrong, speakJapanese } from '../sounds.js'
import RuaaMascot from './RuaaMascot.jsx'

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

// ── Generate a varied character-practice session from a group's items ───────
function generateCharacterExercises(items = []) {
  const pool = items.filter((it) => it.kana && it.answer)
  if (pool.length < 2) return []

  const exs = []

  shuffle(pool).slice(0, Math.min(4, pool.length)).forEach((item) => {
    const distractors = shuffle(pool.filter((p) => p !== item).map((p) => p.answer))
    const options = [...new Set([item.answer, ...distractors])].slice(0, 4)
    exs.push({ type: 'reading', item, options: shuffle(options) })
  })

  shuffle(pool).slice(0, Math.min(4, pool.length)).forEach((item) => {
    const distractors = shuffle(pool.filter((p) => p !== item)).slice(0, 3)
    if (distractors.length < 1) return
    exs.push({ type: 'reverse', item, optionItems: shuffle([item, ...distractors]) })
  })

  shuffle(pool).slice(0, Math.min(3, pool.length)).forEach((item) => {
    const distractors = shuffle(pool.filter((p) => p !== item)).slice(0, 3)
    if (distractors.length < 1) return
    exs.push({ type: 'audio', item, optionItems: shuffle([item, ...distractors]) })
  })

  shuffle(pool).slice(0, Math.min(4, pool.length)).forEach((item) => {
    const isTrue = Math.random() < 0.5
    const alt = shuffle(pool.filter((p) => p !== item))[0]
    const shown = isTrue || !alt ? item.answer : alt.answer
    exs.push({ type: 'truefalse', item, shown, isTrue: shown === item.answer })
  })

  if (pool.length >= 4) {
    exs.push({ type: 'match', pairs: shuffle(pool).slice(0, 4) })
  }

  return shuffle(exs)
}

// ── Exercise: see the character, pick its reading ────────────────────────────
function ReadingExercise({ ex, lang, renderChar, onAnswer }) {
  const [picked, setPicked] = useState(null)
  const item = ex.item

  const pick = (opt) => {
    if (picked) return
    setPicked(opt)
    setTimeout(() => onAnswer(opt === item.answer), 1000)
  }

  const mascotMode = picked ? (picked === item.answer ? 'cheer' : 'skeptical') : 'calm'

  return (
    <div className="grammar-ex">
      <RuaaMascot mode={mascotMode} />
      <p className="ex-prompt">{lang === 'ar' ? 'ما قراءة هذا الحرف؟' : 'What is the reading of this character?'}</p>

      <button className="sentence-display char-display" onClick={() => speakJapanese(item.kana)}>
        <span className="char-big">{renderChar(item)}</span>
        <small>🔊</small>
      </button>

      <div className="meaning-options vocab-option-grid">
        {ex.options.map((opt) => (
          <button
            key={opt}
            dir="ltr"
            disabled={Boolean(picked)}
            className={`meaning-btn ${picked === opt ? (opt === item.answer ? 'correct' : 'wrong') : ''} ${picked && opt === item.answer && picked !== opt ? 'reveal-correct' : ''}`}
            onClick={() => pick(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Exercise: see the reading, pick the matching character ──────────────────
function ReverseExercise({ ex, lang, renderChar, onAnswer }) {
  const [picked, setPicked] = useState(null)
  const item = ex.item

  const pick = (opt) => {
    if (picked) return
    setPicked(opt)
    speakJapanese(opt.kana)
    setTimeout(() => onAnswer(opt === item), 1000)
  }

  const mascotMode = picked ? (picked === item ? 'cheer' : 'skeptical') : 'thinking'

  return (
    <div className="grammar-ex">
      <RuaaMascot mode={mascotMode} />
      <p className="ex-prompt">{lang === 'ar' ? 'أيّ حرف يُقرأ هكذا؟' : 'Which character is read like this?'}</p>
      <p className="ex-hint vocab-meaning-prompt" dir="ltr">{item.answer}</p>

      <div className="meaning-options vocab-option-grid char-option-grid">
        {ex.optionItems.map((opt, i) => (
          <button
            key={i}
            disabled={Boolean(picked)}
            className={`meaning-btn ${picked === opt ? (opt === item ? 'correct' : 'wrong') : ''} ${picked && opt === item && picked !== opt ? 'reveal-correct' : ''}`}
            onClick={() => pick(opt)}
          >
            <span className="char-big">{renderChar(opt)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Exercise: listen and pick the matching character ─────────────────────────
function AudioExercise({ ex, lang, renderChar, onAnswer }) {
  const [picked, setPicked] = useState(null)
  const item = ex.item

  const pick = (opt) => {
    if (picked) return
    setPicked(opt)
    setTimeout(() => onAnswer(opt === item), 1000)
  }

  const mascotMode = picked ? (picked === item ? 'cheer' : 'skeptical') : 'thinking'

  return (
    <div className="grammar-ex">
      <RuaaMascot mode={mascotMode} />
      <p className="ex-prompt">{lang === 'ar' ? 'استمع واختر الحرف الصحيح:' : 'Listen and choose the matching character:'}</p>

      <button className="sentence-display vocab-audio-btn" onClick={() => speakJapanese(item.kana)}>
        <span className="vocab-audio-icon">🔊</span>
        <small>{lang === 'ar' ? 'اضغط للاستماع' : 'Tap to listen'}</small>
      </button>

      <div className="meaning-options vocab-option-grid char-option-grid">
        {ex.optionItems.map((opt, i) => (
          <button
            key={i}
            disabled={Boolean(picked)}
            className={`meaning-btn ${picked === opt ? (opt === item ? 'correct' : 'wrong') : ''} ${picked && opt === item && picked !== opt ? 'reveal-correct' : ''}`}
            onClick={() => pick(opt)}
          >
            <span className="char-big">{renderChar(opt)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Exercise: true / false ────────────────────────────────────────────────────
function TrueFalseExercise({ ex, lang, renderChar, onAnswer }) {
  const [picked, setPicked] = useState(null)
  const item = ex.item

  const pick = (val) => {
    if (picked !== null) return
    setPicked(val)
    setTimeout(() => onAnswer(val === ex.isTrue), 1000)
  }

  const mascotMode = picked === null ? 'thinking' : (picked === ex.isTrue ? 'cheer' : 'skeptical')

  return (
    <div className="grammar-ex">
      <RuaaMascot mode={mascotMode} />
      <p className="ex-prompt">{lang === 'ar' ? 'هل هذا صحيح؟' : 'Is this correct?'}</p>

      <button className="sentence-display char-display" onClick={() => speakJapanese(item.kana)}>
        <span className="char-big">{renderChar(item)}</span>
        <span className="char-tf-reading" dir="ltr">{ex.shown}</span>
        <small>🔊</small>
      </button>

      <div className="meaning-options vocab-option-grid">
        <button
          disabled={picked !== null}
          className={`meaning-btn ${picked === true ? (ex.isTrue ? 'correct' : 'wrong') : ''} ${picked !== null && ex.isTrue && picked !== true ? 'reveal-correct' : ''}`}
          onClick={() => pick(true)}
        >
          {lang === 'ar' ? '✓ صحيح' : '✓ Correct'}
        </button>
        <button
          disabled={picked !== null}
          className={`meaning-btn ${picked === false ? (!ex.isTrue ? 'correct' : 'wrong') : ''} ${picked !== null && !ex.isTrue && picked !== false ? 'reveal-correct' : ''}`}
          onClick={() => pick(false)}
        >
          {lang === 'ar' ? '✗ خطأ' : '✗ Wrong'}
        </button>
      </div>
    </div>
  )
}

// ── Exercise: match characters to their readings ─────────────────────────────
function MatchExercise({ ex, lang, renderChar, onAnswer }) {
  const pairs = ex.pairs
  const total = pairs.length
  const [leftItems] = useState(() => shuffle(pairs.map((p, i) => ({ ...p, pairId: i }))))
  const [rightItems] = useState(() => shuffle(pairs.map((p, i) => ({ answer: p.answer, pairId: i }))))
  const [selectedLeft, setSelectedLeft] = useState(null)
  const [matched, setMatched] = useState([])
  const [wrongPair, setWrongPair] = useState(null)

  useEffect(() => {
    if (matched.length === total && total > 0) {
      const timer = setTimeout(() => onAnswer(true), 600)
      return () => clearTimeout(timer)
    }
  }, [matched, total, onAnswer])

  const pickLeft = (it) => {
    if (matched.includes(it.pairId)) return
    setSelectedLeft(it)
    speakJapanese(it.kana)
  }

  const pickRight = (it) => {
    if (!selectedLeft || matched.includes(it.pairId)) return
    if (selectedLeft.pairId === it.pairId) {
      playCorrect()
      setMatched((m) => [...m, it.pairId])
      setSelectedLeft(null)
    } else {
      playWrong()
      setWrongPair(it.pairId)
      setTimeout(() => setWrongPair(null), 500)
      setSelectedLeft(null)
    }
  }

  return (
    <div className="grammar-ex">
      <p className="ex-prompt">{lang === 'ar' ? 'وصّل كل حرف بقراءته:' : 'Match each character to its reading:'}</p>
      <div className="vocab-match-grid">
        <div className="vocab-match-col">
          {leftItems.map((it) => (
            <button
              key={it.pairId}
              disabled={matched.includes(it.pairId)}
              className={`vocab-match-card ${matched.includes(it.pairId) ? 'matched' : ''} ${selectedLeft?.pairId === it.pairId ? 'selected' : ''}`}
              onClick={() => pickLeft(it)}
            >
              <span className="char-big">{renderChar(it)}</span>
            </button>
          ))}
        </div>
        <div className="vocab-match-col">
          {rightItems.map((it) => (
            <button
              key={it.pairId}
              dir="ltr"
              disabled={matched.includes(it.pairId)}
              className={`vocab-match-card ${matched.includes(it.pairId) ? 'matched' : ''} ${wrongPair === it.pairId ? 'wrong' : ''}`}
              onClick={() => pickRight(it)}
            >
              {it.answer}
            </button>
          ))}
        </div>
      </div>
      <p className="iex-counter">{matched.length}/{total}</p>
    </div>
  )
}

// ── Main wrapper ───────────────────────────────────────────────────────────
export default function CharacterExercises({ items, lang, renderChar, onClose }) {
  const [exercises] = useState(() => generateCharacterExercises(items))
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const isAr = lang === 'ar'

  if (!exercises.length) return null

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
          <p>{isAr
            ? (perfect ? 'ممتاز! أتقنت هذه المجموعة.' : good ? 'جيد! راجع الحروف مرة ثانية.' : 'حاول مرة ثانية — راجع الحروف.')
            : (perfect ? 'Perfect! You mastered this group.' : good ? 'Good! Review the characters once more.' : 'Keep practicing these characters!')
          }</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={onClose}>{isAr ? 'إغلاق' : 'Close'}</button>
          </div>
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

      {ex.type === 'reading' && <ReadingExercise key={idx} ex={ex} lang={lang} renderChar={renderChar} onAnswer={handleAnswer} />}
      {ex.type === 'reverse' && <ReverseExercise key={idx} ex={ex} lang={lang} renderChar={renderChar} onAnswer={handleAnswer} />}
      {ex.type === 'audio' && <AudioExercise key={idx} ex={ex} lang={lang} renderChar={renderChar} onAnswer={handleAnswer} />}
      {ex.type === 'truefalse' && <TrueFalseExercise key={idx} ex={ex} lang={lang} renderChar={renderChar} onAnswer={handleAnswer} />}
      {ex.type === 'match' && <MatchExercise key={idx} ex={ex} lang={lang} renderChar={renderChar} onAnswer={handleAnswer} />}
    </div>
  )
}
