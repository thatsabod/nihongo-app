import { useState, useMemo } from 'react'
import { playCorrect, playWrong, speakJapanese } from '../sounds.js'
import AppIcon from './AppIcon.jsx'
import { SpeakingPracticeQuiz, ExerciseContainer, ProgressHeader, ResultCard, ActionButton, OutOfHeartsCard, MistakeFeedback } from './exercise-ui/index.jsx'
import { useHearts } from '../hearts-context.jsx'
import { readProgressState, trackAnswer, recordLessonStat } from '../progress/progressStorage.js'

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

// ── Furigana text — matches vocab from lesson and adds ruby above kanji ──────
function buildReadingMap(vocab, mode) {
  const map = {}
  vocab.forEach((item) => {
    const surface = item.kanji || item.jp
    if (!surface || !/[㐀-鿿]/.test(surface)) return
    map[surface] = mode === 'romaji' ? (item.reading || '') : (item.hiragana || item.jp || '')
  })
  return map
}

export function LessonJP({ text, readingMap = {}, className = '' }) {
  if (!text) return null
  const sortedKeys = Object.keys(readingMap).sort((a, b) => b.length - a.length)
  const parts = []
  let remaining = text
  let i = 0

  while (remaining.length > 0) {
    let matched = false
    for (const key of sortedKeys) {
      if (remaining.startsWith(key)) {
        parts.push(
          <ruby key={i++}>
            {key}
            <rt>{readingMap[key]}</rt>
          </ruby>
        )
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

  return (
    <span className={`jp-line ${className}`} dir="ltr">
      {parts}
    </span>
  )
}

// ── Extract Japanese text from exercise prompt (after Arabic colon label) ────
function extractJP(prompt = '') {
  const m = prompt.match(/[:：]\s*(.+)$/)
  return m ? m[1].trim() : prompt
}

const COMMON_PARTICLES = ['は', 'が', 'も', 'の', 'か', 'で', 'に', 'を', 'と', 'へ', 'から', 'まで', 'じゃありません', 'ですか', 'です', 'より']

// Matches hiragana/katakana/kanji — used to keep Japanese sentences out of
// the Arabic/English meaning-choice options.
const JP_CHAR_REGEX = /[぀-ヿ㐀-鿿]/

// Find the grammar rule most relevant to an exercise (by particle/answer match,
// then text substring, then hint label). Returns null when no match found.
function findGrammarRule(lesson, ex) {
  const rules = lesson.grammar || []
  if (!rules.length) return null
  const byParticle = rules.find((r) => r.particle && r.particle === ex.answer)
  if (byParticle) return byParticle
  const inText = rules.find((r) => r.particle && (
    (ex.prompt || '').includes(r.particle) || (ex.answer || '').includes(r.particle)
  ))
  if (inText) return inText
  if (ex.hint) {
    const byHint = rules.find((r) => r.title && ex.hint.includes(r.title.split(' ')[0]))
    if (byHint) return byHint
  }
  return rules[0] || null
}

// Find vocab items whose surface form (kanji or kana) appears in the exercise text.
function findVocabMatches(lesson, ex) {
  const vocab = lesson.vocab || []
  if (!vocab.length) return []
  const text = (ex.prompt || '') + ' ' + (ex.answer || '')
  return vocab.filter((item) => {
    const surface = item.kanji || item.jp
    return surface && text.includes(surface)
  }).slice(0, 3)
}

// ── Exercise: choose meaning ──────────────────────────────────────────────────
function ChooseExercise({ ex, allAnswers, lang, readingMap, onAnswer }) {
  const [picked, setPicked] = useState(null)
  const jpText = extractJP(ex.prompt)
  const options = useMemo(() => {
    const distractors = allAnswers.filter((a) => a !== ex.answer && a && !a.includes('/') && !JP_CHAR_REGEX.test(a))
    return shuffle([ex.answer, ...shuffle(distractors).slice(0, 3)]).slice(0, 4)
  }, [ex.answer, allAnswers])

  const pick = (opt) => {
    if (picked) return
    setPicked(opt)
    setTimeout(() => onAnswer(opt === ex.answer, opt), 1000)
  }

  return (
    <div className="iex-card">
      <p className="ex-prompt">{lang === 'ar' ? 'ما معنى هذه الجملة؟' : 'What does this sentence mean?'}</p>
      <button className="sentence-display" dir="ltr" onClick={() => speakJapanese(jpText)}>
        <LessonJP text={jpText} readingMap={readingMap} />
        <small>🔊</small>
      </button>
      <div className="meaning-options">
        {options.map((opt) => (
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

// ── Exercise: fill in the blank ───────────────────────────────────────────────
function CompleteExercise({ ex, lang, readingMap, onAnswer }) {
  const [picked, setPicked] = useState(null)
  const sentence = extractJP(ex.prompt)
  const parts = sentence.split('___')
  const options = useMemo(() => {
    const pool = COMMON_PARTICLES.filter((p) => p !== ex.answer)
    return shuffle([ex.answer, ...shuffle(pool).slice(0, 3)])
  }, [ex.answer])

  const pick = (opt) => {
    if (picked) return
    setPicked(opt)
    setTimeout(() => onAnswer(opt === ex.answer, opt), 1000)
  }

  return (
    <div className="iex-card">
      <p className="ex-prompt">{lang === 'ar' ? 'اختر الكلمة الصحيحة للفراغ:' : 'Fill in the blank:'}</p>
      {ex.hint && <p className="ex-hint">{ex.hint}</p>}
      <div className="fill-sentence" dir="ltr">
        <LessonJP text={parts[0]} readingMap={readingMap} />
        <span className={`fill-blank ${picked ? picked === ex.answer ? 'correct' : 'wrong' : ''}`}>
          {picked || '＿＿'}
        </span>
        <LessonJP text={parts[1]} readingMap={readingMap} />
      </div>
      <div className="fill-options">
        {options.map((opt) => (
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

// ── Exercise: arrange words ───────────────────────────────────────────────────
function OrderExercise({ ex, lang, onAnswer }) {
  const rawWords = useMemo(() => extractJP(ex.prompt).split(/\s*\/\s*/).filter(Boolean), [ex.prompt])
  const [pool, setPool] = useState(() => shuffle(rawWords.map((w, i) => ({ w, key: i }))))
  const [selected, setSelected] = useState([])
  const [result, setResult] = useState(null)

  const add = (item) => {
    if (result) return
    speakJapanese(item.w, { rate: 0.56 })
    setSelected((s) => [...s, item])
    setPool((p) => p.filter((x) => x.key !== item.key))
  }

  const remove = (item) => {
    if (result) return
    speakJapanese(item.w, { rate: 0.56 })
    setPool((p) => [...p, item])
    setSelected((s) => s.filter((x) => x.key !== item.key))
  }

  const check = () => {
    if (selected.length === 0) return
    const built = selected.map((x) => x.w).join('')
    const normal = (s) => s.replace(/\s/g, '')
    const correct = normal(built) === normal(ex.answer)
    setResult(correct ? 'correct' : 'wrong')
    if (correct) playCorrect()
    else playWrong()
    setTimeout(() => onAnswer(correct, built), 1100)
  }

  return (
    <div className="iex-card">
      <p className="ex-prompt">{lang === 'ar' ? 'رتّب الكلمات لتكوين الجملة الصحيحة:' : 'Arrange the words to form the sentence:'}</p>

      <div className={`build-answer ${result || ''}`}>
        {selected.length === 0
          ? <span className="build-placeholder">{lang === 'ar' ? 'اضغط الكلمات بالترتيب...' : 'Tap words in order...'}</span>
          : selected.map((item) => (
            <button key={item.key} dir="ltr" className="word-chip" onClick={() => remove(item)}>{item.w}</button>
          ))
        }
      </div>

      <div className="build-pool">
        {pool.map((item) => (
          <button key={item.key} dir="ltr" className="word-chip" onClick={() => add(item)}>{item.w}</button>
        ))}
      </div>

      {selected.length > 0 && !result && (
        <button className="btn btn-primary" onClick={check}>{lang === 'ar' ? 'تحقق' : 'Check'}</button>
      )}

      {result && (
        <p className={`iex-result ${result}`}>
          {result === 'correct'
            ? (lang === 'ar' ? '✓ صحيح!' : '✓ Correct!')
            : (lang === 'ar' ? `✗ الجواب: ${ex.answer}` : `✗ Answer: ${ex.answer}`)}
        </p>
      )}
    </div>
  )
}

// ── Exercise: repeat a sentence out loud ──────────────────────────────────────
function SpeakSectionExercise({ ex, lang, onAnswer }) {
  return (
    <SpeakingPracticeQuiz
      sentence={ex.sentence}
      reading={ex.reading}
      speakText={ex.sentence}
      lang={lang}
      onAnswer={(passed) => onAnswer(passed)}
      onSkip={() => onAnswer(true)}
    />
  )
}

// Insert a "repeat the sentence" speaking exercise after the first
// choose/complete exercise, reusing the lesson's first example sentence.
function withSpeakingExercise(exercises, lesson) {
  const example = lesson.examples?.[0]
  if (!example?.jp) return exercises
  const out = []
  let added = false
  exercises.forEach((ex) => {
    out.push(ex)
    if (!added && ['choose', 'complete'].includes(ex.type)) {
      out.push({ type: 'speak', sentence: example.jp.replace(/\s+/g, ''), reading: example.romaji })
      added = true
    }
  })
  if (!added) out.push({ type: 'speak', sentence: example.jp.replace(/\s+/g, ''), reading: example.romaji })
  return out
}

// ── SECTION: Interactive Exercises ───────────────────────────────────────────
export function ExercisesSection({ lesson, lang, kanjiReadingMode }) {
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [retryNonce, setRetryNonce] = useState(0)
  const isAr = lang === 'ar'
  const heartsApi = useHearts()

  const readingMap = useMemo(() => buildReadingMap(lesson.vocab || [], kanjiReadingMode), [lesson.vocab, kanjiReadingMode])
  const baseExercises = lesson.exercises || []
  const exercises = useMemo(() => withSpeakingExercise(baseExercises, lesson), [baseExercises, lesson])

  if (!baseExercises.length && !lesson.examples?.length) {
    return <div className="iex-wrap" />
  }

  // Allow feedback panel to remain visible even at 0 hearts — the student
  // deserves to read the explanation before getting the out-of-hearts screen.
  if (heartsApi && heartsApi.hearts <= 0 && !feedback) {
    return (
      <div className="iex-wrap">
        <OutOfHeartsCard lang={lang} bare />
      </div>
    )
  }

  if (!baseExercises.length) {
    return (
      <div className="iex-wrap">
        <div className="example-list">
          {(lesson.examples || []).map((ex, i) => (
            <button key={i} onClick={() => speakJapanese(ex.jp)}>
              <LessonJP text={ex.jp} readingMap={readingMap} className="jp-line" />
              <small dir="ltr">{ex.romaji}</small>
              <span>{ex.ar}</span>
            </button>
          ))}
        </div>
        {exercises[0]?.type === 'speak' && (
          <div className="iex-card" style={{ marginTop: 16 }}>
            <SpeakSectionExercise ex={exercises[0]} lang={lang} onAnswer={() => {}} />
          </div>
        )}
      </div>
    )
  }

  if (done) {
    const perfect = score === exercises.length
    const good = score >= Math.ceil(exercises.length / 2)
    return (
      <div className="iex-wrap">
        <div className="grammar-finish">
          <span className="finish-icon"><AppIcon name={perfect ? 'star' : good ? 'correct' : 'goal'} size={54} /></span>
          <strong>{score}/{exercises.length}</strong>
          <p>{isAr
            ? (perfect ? 'ممتاز! أكملت جميع التمارين.' : good ? 'جيد! راجع الدرس مرة ثانية.' : 'حاول مرة ثانية، أنت تتطور.')
            : (perfect ? 'Perfect! All exercises done.' : good ? 'Good! Review the lesson once more.' : 'Keep practicing — you\'re improving!')
          }</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => { setIdx(0); setScore(0); setDone(false); setFeedback(null) }}>
              {isAr ? 'إعادة التمارين' : 'Retry exercises'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const ex = exercises[idx]
  const allAnswers = exercises.map((e) => e.answer).filter(Boolean)
  const completionPct = Math.round((idx / exercises.length) * 100)

  // Called by child exercise components: correct=bool, picked=the student's answer.
  const handleAnswer = (correct, picked) => {
    let state = readProgressState()
    // One lesson-accuracy tick per question (before the per-item sub-tracking).
    state = recordLessonStat(state, String(lesson.id), correct)
    state = trackAnswer(state, {
      itemId: `${lesson.id}-ex-${idx}`,
      itemType: 'mistake',
      wasCorrect: correct,
      lessonId: String(lesson.id),
      exerciseType: ex.type,
      questionAr: ex.prompt,
    })

    const nextScore = score + (correct ? 1 : 0)
    const nextIdx = idx + 1

    if (correct) {
      playCorrect()
      if (nextIdx >= exercises.length) {
        setScore(nextScore)
        setDone(true)
      } else {
        setScore(nextScore)
        setIdx(nextIdx)
      }
    } else {
      playWrong()
      heartsApi?.consumeHeart()

      // Track per-grammar and per-vocab mistakes for weak-area detection.
      const grammarRule = findGrammarRule(lesson, ex)
      const vocabMatches = findVocabMatches(lesson, ex)
      if (grammarRule) {
        state = trackAnswer(state, {
          itemId: grammarRule.title,
          itemType: 'grammar',
          wasCorrect: false,
          lessonId: String(lesson.id),
          exerciseType: ex.type,
          questionAr: grammarRule.title,
        })
      }
      vocabMatches.forEach((item) => {
        state = trackAnswer(state, {
          itemId: item.id || item.jp,
          itemType: 'vocab',
          wasCorrect: false,
          lessonId: String(lesson.id),
          exerciseType: ex.type,
          questionAr: item.meaning,
        })
      })

      setFeedback({ grammarRule, vocabMatches, nextScore, nextIdx })
    }
  }

  // Advance to next question after the student reads the feedback panel.
  const advance = () => {
    const { nextScore, nextIdx } = feedback
    setFeedback(null)
    if (nextIdx >= exercises.length) {
      setScore(nextScore)
      setDone(true)
    } else {
      setScore(nextScore)
      setIdx(nextIdx)
    }
  }

  // Re-attempt the SAME question. Score isn't changed (the miss already counted),
  // but the student gets to apply what the explanation just taught them.
  const retry = () => {
    setFeedback(null)
    setRetryNonce((n) => n + 1)
  }

  return (
    <div className="iex-wrap">
      <div className="iex-header">
        <div className="iex-section-info">
          <span className="iex-section-label">{isAr ? 'تمارين' : 'Exercises'}</span>
          <span className="iex-completion">{completionPct}%</span>
        </div>
        <div className="ex-progress-bar">
          <span style={{ width: `${completionPct}%` }} />
        </div>
        <span className="iex-counter">{idx + 1}/{exercises.length}</span>
      </div>

      {feedback ? (
        <MistakeFeedback
          isAr={isAr}
          correctAnswer={ex.answer}
          grammarRule={feedback.grammarRule}
          vocabMatches={feedback.vocabMatches}
          onContinue={advance}
          onRetry={['choose', 'complete', 'order'].includes(ex.type) ? retry : null}
        />
      ) : (
        <>
          {ex.type === 'choose' && (
            <ChooseExercise key={`${idx}-${retryNonce}`} ex={ex} allAnswers={allAnswers} lang={lang} readingMap={readingMap} onAnswer={handleAnswer} />
          )}
          {ex.type === 'complete' && (
            <CompleteExercise key={`${idx}-${retryNonce}`} ex={ex} lang={lang} readingMap={readingMap} onAnswer={handleAnswer} />
          )}
          {ex.type === 'order' && (
            <OrderExercise key={`${idx}-${retryNonce}`} ex={ex} lang={lang} onAnswer={handleAnswer} />
          )}
          {ex.type === 'speak' && (
            <SpeakSectionExercise key={`${idx}-${retryNonce}`} ex={ex} lang={lang} onAnswer={handleAnswer} />
          )}
          {!['choose', 'complete', 'order', 'speak'].includes(ex.type) && (
            <div className="iex-card">
              <p className="ex-prompt">{ex.prompt}</p>
              <p style={{ color: 'var(--green)', fontWeight: 700 }}>{ex.answer}</p>
              <button className="btn btn-primary" onClick={() => handleAnswer(true, ex.answer)}>
                {isAr ? 'التالي' : 'Next'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Review speaking-practice session: repeat a handful of sentences/words ────
function ReviewSpeakingSession({ items, lang, onClose }) {
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const isAr = lang === 'ar'
  const heartsApi = useHearts()

  if (heartsApi && heartsApi.hearts <= 0) {
    return <OutOfHeartsCard lang={lang} onClose={onClose} />
  }

  const handleAnswer = (passed) => {
    if (!passed) heartsApi?.consumeHeart()
    const next = score + (passed ? 1 : 0)
    if (idx + 1 >= items.length) {
      setScore(next)
      setFinished(true)
    } else {
      setScore(next)
      setIdx((i) => i + 1)
    }
  }

  if (finished) {
    const total = items.length
    const perfect = score === total
    return (
      <ResultCard
        icon={perfect ? 'star' : 'correct'}
        score={score}
        total={total}
        message={isAr ? 'أحسنت! انتهى تمرين التكرار.' : 'Great! Speaking practice complete.'}
      >
        <ActionButton onClick={onClose}>{isAr ? 'إغلاق' : 'Close'}</ActionButton>
      </ResultCard>
    )
  }

  const item = items[idx]

  return (
    <ExerciseContainer>
      <ProgressHeader
        onClose={onClose}
        progress={(idx / items.length) * 100}
        counter={`${idx + 1}/${items.length}`}
      />
      <SpeakingPracticeQuiz
        key={idx}
        sentence={item.sentence}
        reading={item.reading}
        speakText={item.sentence}
        lang={lang}
        onAnswer={handleAnswer}
        onSkip={() => handleAnswer(true)}
      />
    </ExerciseContainer>
  )
}

// ── SECTION: Review ───────────────────────────────────────────────────────────
export function ReviewSection({ lesson, lang, kanjiReadingMode }) {
  const [showAll, setShowAll] = useState(false)
  const [speakingSession, setSpeakingSession] = useState(false)
  const isAr = lang === 'ar'
  const readingMap = useMemo(() => buildReadingMap(lesson.vocab || [], kanjiReadingMode), [lesson.vocab, kanjiReadingMode])
  const displayVocab = showAll ? lesson.vocab : lesson.vocab?.slice(0, 6)

  const speakingItems = useMemo(() => {
    const fromExamples = (lesson.examples || []).map((ex) => ({ sentence: ex.jp.replace(/\s+/g, ''), reading: ex.romaji }))
    const fromVocab = (lesson.vocab || []).map((v) => ({ sentence: v.kanji || v.jp, reading: v.hiragana || v.reading }))
    return shuffle([...fromExamples, ...fromVocab]).slice(0, 5)
  }, [lesson])

  if (speakingSession) {
    return <ReviewSpeakingSession items={speakingItems} lang={lang} onClose={() => setSpeakingSession(false)} />
  }

  return (
    <div className="review-wrap">
      {speakingItems.length > 0 && (
        <button className="btn btn-primary" onClick={() => setSpeakingSession(true)}>
          {isAr ? '🎙️ تمرين التكرار الشفوي' : '🎙️ Speaking review'}
        </button>
      )}
      {/* Focus banner */}
      <div className="review-focus">
        <span className="review-focus-label">{isAr ? 'محور الدرس' : 'Lesson focus'}</span>
        <p>{lesson.focus}</p>
      </div>

      {/* Grammar summary */}
      {Array.isArray(lesson.grammar) && (
        <section className="review-block">
          <h3 className="review-block-title">{isAr ? 'القواعد' : 'Grammar'}</h3>
          <div className="review-grammar-list">
            {lesson.grammar.map((rule) => (
              <div key={rule.title} className="review-grammar-chip">
                {rule.particle && (
                  <span className="grammar-particle-badge" dir="ltr" style={{ fontSize: '0.78rem', padding: '2px 8px' }}>
                    {rule.particle}
                  </span>
                )}
                <div>
                  <strong>{rule.title}</strong>
                  <span dir="ltr">{rule.pattern}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Grammar examples */}
      {Array.isArray(lesson.grammar) && (
        <section className="review-block">
          <h3 className="review-block-title">{isAr ? 'أمثلة القواعد' : 'Grammar examples'}</h3>
          <div className="review-examples-list">
            {lesson.grammar.map((rule) => (
              <button key={rule.title} className="review-example-btn" onClick={() => speakJapanese(rule.example.jp)}>
                <LessonJP text={rule.example.jp} readingMap={readingMap} />
                <span>{rule.example.ar}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Vocabulary */}
      <section className="review-block">
        <h3 className="review-block-title">{isAr ? 'المفردات' : 'Vocabulary'}</h3>
        <div className="review-vocab-grid">
          {displayVocab?.map((item) => {
            const surface = item.kanji || item.jp
            const kana = item.hiragana || item.jp
            const reading = kanjiReadingMode === 'romaji' ? item.reading : kana
            const hasKanji = /[㐀-鿿]/.test(surface)
            return (
              <button key={item.jp} className="review-vocab-chip" onClick={() => speakJapanese(kana)}>
                <span dir="ltr">
                  {hasKanji ? (
                    <ruby>{surface}<rt>{reading}</rt></ruby>
                  ) : (
                    surface
                  )}
                </span>
                <small>{item.meaning}</small>
              </button>
            )
          })}
        </div>
        {lesson.vocab?.length > 6 && (
          <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={() => setShowAll((v) => !v)}>
            {showAll ? (isAr ? 'عرض أقل' : 'Show less') : (isAr ? `عرض الكل (${lesson.vocab.length})` : `Show all (${lesson.vocab.length})`)}
          </button>
        )}
      </section>

      {/* Sentence examples */}
      {lesson.examples?.length > 0 && (
        <section className="review-block">
          <h3 className="review-block-title">{isAr ? 'جمل الدرس' : 'Lesson sentences'}</h3>
          <div className="review-examples-list">
            {lesson.examples.slice(0, 6).map((ex, i) => (
              <button key={i} className="review-example-btn" onClick={() => speakJapanese(ex.jp)}>
                <LessonJP text={ex.jp} readingMap={readingMap} />
                <span>{ex.ar}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
