import { useState, useEffect } from 'react'
import { playCorrect, playWrong, speakJapanese } from '../sounds.js'
import RuaaMascot from './RuaaMascot.jsx'

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

const HIRAGANA_POOL = [
  'あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ', 'さ', 'し', 'す', 'せ', 'そ',
  'た', 'ち', 'つ', 'て', 'と', 'な', 'に', 'ぬ', 'ね', 'の', 'は', 'ひ', 'ふ', 'へ', 'ほ',
  'ま', 'み', 'む', 'め', 'も', 'や', 'ゆ', 'よ', 'ら', 'り', 'る', 'れ', 'ろ', 'わ', 'を', 'ん',
  'が', 'ぎ', 'ぐ', 'げ', 'ご', 'ざ', 'じ', 'ず', 'ぜ', 'ぞ', 'だ', 'で', 'ど', 'ば', 'び', 'ぶ',
  'べ', 'ぼ', 'ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ', 'ゃ', 'ゅ', 'ょ', 'っ', 'ー',
]

function speakableVocab(item) {
  return item.hiragana || item.jp
}

// ── Generate a varied vocab-practice session from a lesson's vocab list ─────
function generateVocabExercises(vocab = []) {
  const pool = (vocab || []).filter((v) => v.meaning && (v.jp || v.kanji))
  if (pool.length < 2) return []

  const exs = []
  const meanings = [...new Set(pool.map((v) => v.meaning))]

  shuffle(pool).slice(0, Math.min(4, pool.length)).forEach((item) => {
    const distractors = shuffle(meanings.filter((m) => m !== item.meaning)).slice(0, 3)
    if (distractors.length < 1) return
    exs.push({ type: 'meaning', item, options: shuffle([item.meaning, ...distractors]) })
  })

  shuffle(pool).slice(0, Math.min(4, pool.length)).forEach((item) => {
    const distractors = shuffle(pool.filter((p) => p !== item)).slice(0, 3)
    if (distractors.length < 1) return
    exs.push({ type: 'audio', item, optionItems: shuffle([item, ...distractors]) })
  })

  shuffle(pool).slice(0, Math.min(3, pool.length)).forEach((item) => {
    const distractors = shuffle(pool.filter((p) => p !== item)).slice(0, 3)
    if (distractors.length < 1) return
    exs.push({ type: 'reverse', item, optionItems: shuffle([item, ...distractors]) })
  })

  const buildable = pool.filter((v) => {
    const kana = (v.hiragana || v.jp || '')
    return kana.length >= 2 && kana.length <= 5
  })
  shuffle(buildable).slice(0, Math.min(3, buildable.length)).forEach((item) => {
    exs.push({ type: 'build', item })
  })

  if (pool.length >= 4) {
    exs.push({ type: 'match', pairs: shuffle(pool).slice(0, 4) })
  }

  return shuffle(exs)
}

// ── Shared: render a vocab term with furigana ────────────────────────────────
function VocabTerm({ item }) {
  const surface = item.kanji || item.jp
  const reading = item.hiragana || item.reading || item.jp
  const hasKanji = /[㐀-鿿]/.test(surface)
  return (
    <span className="jp-line" dir="ltr">
      {hasKanji ? <ruby>{surface}<rt>{reading}</rt></ruby> : surface}
    </span>
  )
}

// ── Exercise: choose the meaning of a word ───────────────────────────────────
function VocabMeaningExercise({ ex, lang, onAnswer }) {
  const [picked, setPicked] = useState(null)
  const item = ex.item

  const pick = (opt) => {
    if (picked) return
    setPicked(opt)
    setTimeout(() => onAnswer(opt === item.meaning), 1100)
  }

  const mascotMode = picked ? (picked === item.meaning ? 'cheer' : 'skeptical') : 'calm'

  return (
    <div className="grammar-ex">
      <RuaaMascot mode={mascotMode} />
      <p className="ex-prompt">{lang === 'ar' ? 'ما معنى هذه الكلمة؟' : 'What does this word mean?'}</p>

      <button className="sentence-display vocab-display" dir="ltr" onClick={() => speakJapanese(speakableVocab(item))}>
        <VocabTerm item={item} />
        <small>🔊</small>
      </button>

      <div className="meaning-options">
        {ex.options.map((opt) => (
          <button
            key={opt}
            disabled={Boolean(picked)}
            className={`meaning-btn ${picked === opt ? (opt === item.meaning ? 'correct' : 'wrong') : ''} ${picked && opt === item.meaning && picked !== opt ? 'reveal-correct' : ''}`}
            onClick={() => pick(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Exercise: listen and pick the matching word ──────────────────────────────
function VocabAudioExercise({ ex, lang, onAnswer }) {
  const [picked, setPicked] = useState(null)
  const item = ex.item

  const pick = (opt) => {
    if (picked) return
    setPicked(opt)
    speakJapanese(speakableVocab(opt))
    setTimeout(() => onAnswer(opt === item), 1100)
  }

  const mascotMode = picked ? (picked === item ? 'cheer' : 'skeptical') : 'thinking'

  return (
    <div className="grammar-ex">
      <RuaaMascot mode={mascotMode} />
      <p className="ex-prompt">{lang === 'ar' ? 'استمع واختر الكلمة الصحيحة:' : 'Listen and choose the matching word:'}</p>

      <button className="sentence-display vocab-audio-btn" onClick={() => speakJapanese(speakableVocab(item))}>
        <span className="vocab-audio-icon">🔊</span>
        <small>{lang === 'ar' ? 'اضغط للاستماع' : 'Tap to listen'}</small>
      </button>

      <div className="meaning-options vocab-option-grid">
        {ex.optionItems.map((opt, i) => (
          <button
            key={i}
            dir="ltr"
            disabled={Boolean(picked)}
            className={`meaning-btn ${picked === opt ? (opt === item ? 'correct' : 'wrong') : ''} ${picked && opt === item && picked !== opt ? 'reveal-correct' : ''}`}
            onClick={() => pick(opt)}
          >
            <VocabTerm item={opt} />
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Exercise: from meaning, pick the correct Japanese word ───────────────────
function VocabReverseExercise({ ex, lang, onAnswer }) {
  const [picked, setPicked] = useState(null)
  const item = ex.item

  const pick = (opt) => {
    if (picked) return
    setPicked(opt)
    speakJapanese(speakableVocab(opt))
    setTimeout(() => onAnswer(opt === item), 1100)
  }

  const mascotMode = picked ? (picked === item ? 'cheer' : 'skeptical') : 'thinking'

  return (
    <div className="grammar-ex">
      <RuaaMascot mode={mascotMode} />
      <p className="ex-prompt">{lang === 'ar' ? 'أيّ كلمة تعني هذا؟' : 'Which word means this?'}</p>
      <p className="ex-hint vocab-meaning-prompt">{item.meaning}</p>

      <div className="meaning-options vocab-option-grid">
        {ex.optionItems.map((opt, i) => (
          <button
            key={i}
            dir="ltr"
            disabled={Boolean(picked)}
            className={`meaning-btn ${picked === opt ? (opt === item ? 'correct' : 'wrong') : ''} ${picked && opt === item && picked !== opt ? 'reveal-correct' : ''}`}
            onClick={() => pick(opt)}
          >
            <VocabTerm item={opt} />
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Exercise: spell the word by tapping kana in order ────────────────────────
function VocabBuildExercise({ ex, lang, onAnswer }) {
  const item = ex.item
  const target = (item.hiragana || item.jp).split('')

  const [pool, setPool] = useState(() => {
    const distractors = shuffle(HIRAGANA_POOL.filter((c) => !target.includes(c))).slice(0, Math.max(2, 6 - target.length))
    return shuffle([
      ...target.map((c, i) => ({ c, key: `t${i}` })),
      ...distractors.map((c, i) => ({ c, key: `d${i}` })),
    ])
  })
  const [selected, setSelected] = useState([])
  const [result, setResult] = useState(null)

  const add = (it) => {
    if (result) return
    speakJapanese(it.c, { rate: 0.6 })
    setSelected((s) => [...s, it])
    setPool((p) => p.filter((x) => x.key !== it.key))
  }

  const remove = (it) => {
    if (result) return
    setPool((p) => [...p, it])
    setSelected((s) => s.filter((x) => x.key !== it.key))
  }

  const check = () => {
    const built = selected.map((x) => x.c).join('')
    const correct = built === target.join('')
    setResult(correct ? 'correct' : 'wrong')
    if (correct) playCorrect()
    else playWrong()
    setTimeout(() => onAnswer(correct), 1100)
  }

  const mascotMode = result ? (result === 'correct' ? 'cheer' : 'skeptical') : 'thinking'

  return (
    <div className="grammar-ex">
      <RuaaMascot mode={mascotMode} />
      <p className="ex-prompt">{lang === 'ar' ? 'رتّب الحروف لتهجئة الكلمة:' : 'Tap the kana to spell the word:'}</p>
      <button className="sentence-display" onClick={() => speakJapanese(speakableVocab(item))}>
        <span>{item.meaning}{item.kanji ? ` · ${item.kanji}` : ''}</span>
        <small>🔊</small>
      </button>

      <div className={`build-answer ${result || ''}`}>
        {selected.length === 0
          ? <span className="build-placeholder">{lang === 'ar' ? 'اضغط الحروف بالترتيب...' : 'Tap kana in order...'}</span>
          : selected.map((it) => (
            <button key={it.key} dir="ltr" className="word-chip kana-chip" onClick={() => remove(it)}>{it.c}</button>
          ))
        }
      </div>

      <div className="build-pool">
        {pool.map((it) => (
          <button key={it.key} dir="ltr" className="word-chip kana-chip" onClick={() => add(it)}>{it.c}</button>
        ))}
      </div>

      {selected.length === target.length && !result && (
        <button className="btn btn-primary" onClick={check}>{lang === 'ar' ? 'تحقق' : 'Check'}</button>
      )}

      {result === 'wrong' && (
        <p className="iex-result wrong">{lang === 'ar' ? `الجواب: ${target.join('')}` : `Answer: ${target.join('')}`}</p>
      )}
    </div>
  )
}

// ── Exercise: match words to their meanings ──────────────────────────────────
function VocabMatchExercise({ ex, lang, onAnswer }) {
  const pairs = ex.pairs
  const total = pairs.length
  const [leftItems] = useState(() => shuffle(pairs.map((p, i) => ({ ...p, pairId: i }))))
  const [rightItems] = useState(() => shuffle(pairs.map((p, i) => ({ meaning: p.meaning, pairId: i }))))
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
    speakJapanese(speakableVocab(it))
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
      <p className="ex-prompt">{lang === 'ar' ? 'وصّل كل كلمة بمعناها:' : 'Match each word to its meaning:'}</p>
      <div className="vocab-match-grid">
        <div className="vocab-match-col">
          {leftItems.map((it) => (
            <button
              key={it.pairId}
              dir="ltr"
              disabled={matched.includes(it.pairId)}
              className={`vocab-match-card ${matched.includes(it.pairId) ? 'matched' : ''} ${selectedLeft?.pairId === it.pairId ? 'selected' : ''}`}
              onClick={() => pickLeft(it)}
            >
              <VocabTerm item={it} />
            </button>
          ))}
        </div>
        <div className="vocab-match-col">
          {rightItems.map((it) => (
            <button
              key={it.pairId}
              disabled={matched.includes(it.pairId)}
              className={`vocab-match-card ${matched.includes(it.pairId) ? 'matched' : ''} ${wrongPair === it.pairId ? 'wrong' : ''}`}
              onClick={() => pickRight(it)}
            >
              {it.meaning}
            </button>
          ))}
        </div>
      </div>
      <p className="iex-counter">{matched.length}/{total}</p>
    </div>
  )
}

// ── Main wrapper ───────────────────────────────────────────────────────────
export default function VocabExercises({ vocab, lang, onClose }) {
  const [exercises] = useState(() => generateVocabExercises(vocab))
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
            ? (perfect ? 'ممتاز! أتقنت مفردات هذا الدرس.' : good ? 'جيد! راجع الكلمات مرة ثانية.' : 'حاول مرة ثانية — راجع المفردات.')
            : (perfect ? 'Perfect! You mastered this vocab set.' : good ? 'Good! Review the words once more.' : 'Keep practicing the vocabulary!')
          }</p>
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

      {ex.type === 'meaning' && <VocabMeaningExercise key={idx} ex={ex} lang={lang} onAnswer={handleAnswer} />}
      {ex.type === 'audio' && <VocabAudioExercise key={idx} ex={ex} lang={lang} onAnswer={handleAnswer} />}
      {ex.type === 'reverse' && <VocabReverseExercise key={idx} ex={ex} lang={lang} onAnswer={handleAnswer} />}
      {ex.type === 'build' && <VocabBuildExercise key={idx} ex={ex} lang={lang} onAnswer={handleAnswer} />}
      {ex.type === 'match' && <VocabMatchExercise key={idx} ex={ex} lang={lang} onAnswer={handleAnswer} />}
    </div>
  )
}
