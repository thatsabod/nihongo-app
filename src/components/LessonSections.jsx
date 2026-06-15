import { useState, useMemo, useEffect } from 'react'
import { playCorrect, playWrong, speakJapanese } from '../sounds.js'
import AppIcon from './AppIcon.jsx'
import { SpeakingPracticeQuiz, ExerciseContainer, ProgressHeader, ResultCard, ActionButton, OutOfHeartsCard, MistakeFeedback } from './exercise-ui/index.jsx'
import { useHearts } from '../hearts-context.jsx'
import { readProgressState, trackAnswer, recordLessonStat } from '../progress/progressStorage.js'
import { getLessonMastery, masteryStatusLabel } from '../progress/masteryModel.js'
import GrammarExercises from './GrammarExercises.jsx'
import VocabExercises from './VocabExercises.jsx'
import { answersMatch } from '../utils/answerMatch.js'
import { LessonJP, buildReadingMap } from './JapaneseText.jsx'
import useExerciseSettings from '../hooks/useExerciseSettings.js'

export { LessonJP }

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
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
  // No confident match — return null rather than a misleading first rule
  // (the feedback panel would otherwise blame an unrelated grammar point).
  return null
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
export function WarmupSection({ lesson, lang, kanjiReadingMode, onGo }) {
  const isAr = lang === 'ar'
  const readingMap = useMemo(() => buildReadingMap(lesson.vocab || [], kanjiReadingMode), [lesson.vocab, kanjiReadingMode])
  const sampleVocab = (lesson.vocab || []).slice(0, 4)
  const sampleExample = lesson.examples?.[0] || lesson.grammar?.[0]?.example

  return (
    <div className="review-wrap">
      <div className="review-focus">
        <span className="review-focus-label">{isAr ? 'تهيئة الدرس' : 'Lesson warm-up'}</span>
        <p>{lesson.focus || (isAr ? 'ابدأ بهدوء، استمع للكلمات الأساسية، ثم انتقل للدرس.' : 'Start calmly, listen to the key items, then continue.')}</p>
      </div>

      {sampleExample?.jp && (
        <section className="review-block">
          <h3 className="review-block-title">{isAr ? 'جملة البداية' : 'Starter sentence'}</h3>
          <button className="review-example-btn" onClick={() => speakJapanese(sampleExample.jp)}>
            <LessonJP text={sampleExample.jp} readingMap={readingMap} />
            {sampleExample.romaji && <small dir="ltr">{sampleExample.romaji}</small>}
            <span>{sampleExample.ar}</span>
          </button>
        </section>
      )}

      {sampleVocab.length > 0 && (
        <section className="review-block">
          <h3 className="review-block-title">{isAr ? 'استمع لأول كلمات الدرس' : 'Listen to the first words'}</h3>
          <div className="review-vocab-list">
            {sampleVocab.map((item) => {
              const surface = item.kanji || item.jp
              const kana = item.hiragana || item.jp
              return (
                <button key={item.id || item.jp} className="review-vocab-chip" onClick={() => speakJapanese(kana)}>
                  <LessonJP text={surface} readingMap={readingMap} />
                  <small>{item.meaning}</small>
                </button>
              )
            })}
          </div>
        </section>
      )}

      <div className="review-actions">
        <button className="btn btn-primary" onClick={() => onGo?.('vocabulary')}>
          {isAr ? 'ابدأ المفردات' : 'Start vocabulary'}
          <AppIcon name="next" size={16} />
        </button>
      </div>
    </div>
  )
}

export function ExamplesSection({ lesson, lang, kanjiReadingMode, onNext }) {
  const isAr = lang === 'ar'
  const readingMap = useMemo(() => buildReadingMap(lesson.vocab || [], kanjiReadingMode), [lesson.vocab, kanjiReadingMode])
  const examples = lesson.examples?.length
    ? lesson.examples
    : (lesson.grammar || []).map((rule) => rule.example).filter(Boolean)

  return (
    <div className="review-wrap">
      <div className="review-focus">
        <span className="review-focus-label">{isAr ? 'أمثلة الدرس' : 'Lesson examples'}</span>
        <p>{isAr ? 'اضغط على أي جملة حتى تسمع اللفظ، ثم اقرأ المعنى.' : 'Tap any sentence to hear it, then read the meaning.'}</p>
      </div>

      <section className="review-block">
        <h3 className="review-block-title">{isAr ? 'الجمل الأساسية' : 'Core sentences'}</h3>
        <div className="review-examples-list">
          {examples.map((ex, i) => (
            <button key={`${ex.jp}-${i}`} className="review-example-btn" onClick={() => speakJapanese(ex.jp)}>
              <LessonJP text={ex.jp} readingMap={readingMap} />
              {ex.romaji && <small dir="ltr">{ex.romaji}</small>}
              <span>{ex.ar}</span>
            </button>
          ))}
        </div>
      </section>

      {onNext && (
        <div className="review-actions">
          <button className="btn btn-primary" onClick={onNext}>
            {isAr ? 'التالي' : 'Next'}
            <AppIcon name="next" size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

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
    const correct = answersMatch(built, ex.answer)
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
// `onSkip` advances neutrally (no score, no mastery credit) — skipping a
// speaking item must not hand out free correct answers and inflate accuracy.
function SpeakSectionExercise({ ex, lang, onAnswer, onSkip }) {
  return (
    <SpeakingPracticeQuiz
      sentence={ex.sentence}
      reading={ex.reading}
      speakText={ex.sentence}
      lang={lang}
      onAnswer={(passed) => onAnswer(passed)}
      onSkip={onSkip || (() => onAnswer(false))}
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
export function ExercisesSection({ lesson, lang, kanjiReadingMode, onStudyComplete }) {
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [retryNonce, setRetryNonce] = useState(0)
  const isAr = lang === 'ar'
  const heartsApi = useHearts()

  // Finishing the practice set counts as a real study action (streak + XP).
  useEffect(() => {
    if (done) onStudyComplete?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

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
            <SpeakSectionExercise ex={exercises[0]} lang={lang} onAnswer={(passed) => recordLessonStat(readProgressState(), String(lesson.id), passed !== false)} />
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

    // Track the grammar/vocab this item exercises into SRS on BOTH correct and
    // wrong answers — otherwise the scheduler only ever sees already-missed
    // items and learned material never enters spaced repetition. trackAnswer
    // only logs a *mistake* when wasCorrect is false, so correct answers just
    // advance the SRS interval.
    const grammarRule = findGrammarRule(lesson, ex)
    const vocabMatches = findVocabMatches(lesson, ex)
    if (grammarRule) {
      state = trackAnswer(state, {
        itemId: grammarRule.title,
        itemType: 'grammar',
        wasCorrect: correct,
        lessonId: String(lesson.id),
        exerciseType: ex.type,
        questionAr: grammarRule.title,
      })
    }
    vocabMatches.forEach((item) => {
      state = trackAnswer(state, {
        itemId: item.id || item.jp,
        itemType: 'vocab',
        wasCorrect: correct,
        lessonId: String(lesson.id),
        exerciseType: ex.type,
        questionAr: item.meaning,
      })
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

  // Skip a speaking item without scoring it (neutral — no correct, no mistake).
  const skipQuestion = () => {
    const nextIdx = idx + 1
    if (nextIdx >= exercises.length) setDone(true)
    else setIdx(nextIdx)
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
            <SpeakSectionExercise key={`${idx}-${retryNonce}`} ex={ex} lang={lang} onAnswer={handleAnswer} onSkip={skipQuestion} />
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

// ── SECTION: Mistake Review — this lesson's wrong answers, made useful ───────
export function MistakeReviewSection({ lesson, lang, onGo }) {
  const isAr = lang === 'ar'
  const { settings } = useExerciseSettings()
  const readingMap = useMemo(
    () => buildReadingMap(lesson.vocab || [], settings.pronunciationMode === 'romanized' ? 'romaji' : 'hiragana'),
    [lesson.vocab, settings.pronunciationMode],
  )
  const mistakes = useMemo(() => {
    const all = Object.values(readProgressState().mistakes || {})
    return all.filter((m) => m.lessonId === String(lesson.id))
  }, [lesson.id])

  const open = mistakes.filter((m) => !m.resolved).sort((a, b) => (b.wrongCount || 0) - (a.wrongCount || 0))
  const resolved = mistakes.filter((m) => m.resolved)

  // Resolve a mistake record back to displayable content.
  const describe = (m) => {
    if (m.itemType === 'grammar') {
      const rule = (lesson.grammar || []).find((r) => r.title === m.itemId)
      return { title: m.itemId, rule, answer: null }
    }
    const exMatch = /-ex-(\d+)$/.exec(m.itemId)
    if (exMatch) {
      const ex = (lesson.exercises || [])[Number(exMatch[1])]
      if (ex) return { title: m.questionAr || ex.prompt, rule: findGrammarRule(lesson, ex), answer: ex.answer }
    }
    if (m.itemType === 'vocab') {
      const v = (lesson.vocab || []).find((item) => (item.id || item.jp) === m.itemId)
      if (v) return { title: `${v.kanji || v.jp} — ${v.meaning}`, rule: null, answer: v.hiragana || v.jp }
    }
    return { title: m.questionAr || m.itemId, rule: null, answer: null }
  }

  if (mistakes.length === 0) {
    return (
      <div className="review-wrap">
        <div className="mistake-clean-card">
          <span className="mistake-clean-emoji" aria-hidden="true">🌸</span>
          <h3>{isAr ? 'سجلّك في هذا الدرس نظيف!' : 'Your record in this lesson is clean!'}</h3>
          <p>{isAr
            ? 'لم تسجَّل أي أخطاء بعد. حُلَّ التمارين — وأي خطأ سيظهر هنا مع شرحه حتى يتحوّل إلى نقطة قوة.'
            : 'No mistakes recorded yet. Do the practice — any miss will appear here with its explanation until it becomes a strength.'}</p>
          <button className="btn btn-primary" onClick={() => onGo('practice')}>
            {isAr ? 'ابدأ التدريب' : 'Start practicing'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="review-wrap">
      <div className="review-focus">
        <span className="review-focus-label">{isAr ? 'لماذا هذا القسم؟' : 'Why this section?'}</span>
        <p>{isAr
          ? 'كل خطأ هنا فرصة. راجع السبب، ثم عُد للتدريب — الإجابة الصحيحة في المراجعة الذكية تشطب الخطأ من القائمة.'
          : 'Every mistake here is an opportunity. Review the why, then practice again — a correct recall in Smart Review clears it.'}</p>
      </div>

      {open.length > 0 && (
        <section className="review-block">
          <h3 className="review-block-title">{isAr ? `تحتاج مراجعة (${open.length})` : `Needs review (${open.length})`}</h3>
          <div className="mistake-rev-list">
            {open.map((m) => {
              const d = describe(m)
              return (
                <article key={`${m.itemType}:${m.itemId}`} className="mistake-rev-card">
                  <div className="mistake-rev-head">
                    <strong>{d.title}</strong>
                    <span className="mistake-rev-count">{isAr ? `أخطأت ${m.wrongCount}×` : `missed ${m.wrongCount}×`}</span>
                  </div>
                  {d.answer && (
                    <p className="mistake-rev-answer" dir="ltr">✓ {d.answer}</p>
                  )}
                  {d.rule && (
                    <div className="mistake-rev-rule">
                      <p className="example-rule-name">
                        {d.rule.particle && <span className="grammar-particle-badge" dir="ltr" style={{ fontSize: '0.72rem', padding: '1px 8px' }}>{d.rule.particle}</span>}
                        {d.rule.title}
                      </p>
                      {d.rule.explanation && <p className="mistake-rev-explain">{d.rule.explanation}</p>}
                      {d.rule.example?.jp && (
                        <button className="review-example-btn" onClick={() => speakJapanese(d.rule.example.jp)}>
                          <LessonJP text={d.rule.example.jp} readingMap={readingMap} />
                          <span>{d.rule.example.ar}</span>
                        </button>
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      )}

      {resolved.length > 0 && (
        <section className="review-block">
          <h3 className="review-block-title">{isAr ? `تم إتقانها ✓ (${resolved.length})` : `Mastered ✓ (${resolved.length})`}</h3>
          <div className="mistake-rev-list">
            {resolved.map((m) => (
              <div key={`${m.itemType}:${m.itemId}`} className="mistake-rev-card resolved">
                <AppIcon name="correct" size={16} />
                <span>{describe(m).title}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <button className="btn btn-primary section-next-cta" onClick={() => onGo('practice')}>
        {isAr ? 'تدرّب على نقاط ضعفك الآن' : 'Practice your weak spots now'}
      </button>
    </div>
  )
}

// ── SECTION: Mastery Check — completion ≠ mastery ────────────────────────────
export function MasteryCheckSection({ lesson, lang, kanjiReadingMode, sectionsDone = 0, sectionsTotal = 5 }) {
  const isAr = lang === 'ar'
  const [challenge, setChallenge] = useState(null) // 'grammar' | 'vocab' | 'speak'

  const mastery = useMemo(
    () => getLessonMastery(readProgressState().lessons, lesson.id, sectionsDone, sectionsTotal),
    // Recompute when a challenge closes so fresh attempts show up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lesson.id, sectionsDone, sectionsTotal, challenge],
  )

  const grammarPool = useMemo(
    () => (Array.isArray(lesson.grammar) ? lesson.grammar.flatMap((r) => r.exercises || []) : []),
    [lesson.grammar],
  )

  const speakingItems = useMemo(() => {
    const fromExamples = (lesson.examples || []).map((ex) => ({ sentence: ex.jp.replace(/\s+/g, ''), reading: ex.romaji }))
    const fromVocab = (lesson.vocab || []).map((v) => ({ sentence: v.kanji || v.jp, reading: v.hiragana || v.reading }))
    return shuffle([...fromExamples, ...fromVocab]).slice(0, 5)
  }, [lesson])

  if (challenge === 'grammar') {
    return <GrammarExercises exercises={grammarPool} lang={lang} lessonId={lesson.id} onClose={() => setChallenge(null)} />
  }
  if (challenge === 'vocab') {
    return <VocabExercises vocab={lesson.vocab} lang={lang} lessonId={lesson.id} onClose={() => setChallenge(null)} />
  }
  if (challenge === 'speak') {
    return <ReviewSpeakingSession items={speakingItems} lang={lang} onClose={() => setChallenge(null)} />
  }

  const checks = [
    {
      label: isAr ? 'أكمل كل أقسام الدرس' : 'Complete every lesson section',
      detail: `${sectionsDone}/${sectionsTotal}`,
      ok: sectionsDone >= sectionsTotal,
    },
    {
      label: isAr ? 'دقة 80% أو أعلى' : 'Accuracy 80% or higher',
      detail: `${mastery.accuracyPct}%`,
      ok: mastery.accuracy >= 0.8 && mastery.attempts > 0,
    },
    {
      label: isAr ? 'أجب على 10 أسئلة على الأقل' : 'Answer at least 10 questions',
      detail: `${mastery.attempts}`,
      ok: mastery.attempts >= 10,
    },
  ]

  return (
    <div className="review-wrap">
      <div className="review-focus">
        <span className="review-focus-label">{isAr ? 'الإكمال ≠ الإتقان' : 'Completion ≠ mastery'}</span>
        <p>{isAr
          ? 'إنهاء الأقسام يثبت أنك مررت بالدرس — الإتقان يثبت أنك تتذكره. أكمل التحديات الثلاثة لرفع مستواك.'
          : 'Finishing sections proves you went through the lesson — mastery proves you remember it. Take the three challenges below.'}</p>
      </div>

      {/* Mastery snapshot */}
      <section className="review-block">
        <h3 className="review-block-title">{isAr ? 'مستواك الحالي' : 'Your current level'}</h3>
        <div className={`lesson-preview-mastery status-${mastery.status}`}>
          <div className="mastery-stat">
            <span className="mastery-stat-label">{isAr ? 'الإتقان' : 'Mastery'}</span>
            <span className="mastery-dots" aria-label={`${mastery.masteryLevel}/5`}>
              {Array.from({ length: 5 }, (_, i) => (
                <i key={i} className={i < mastery.masteryLevel ? 'on' : ''} />
              ))}
            </span>
            <span className="mastery-status-tag">{masteryStatusLabel(mastery.status, isAr)}</span>
          </div>
          {mastery.attempts > 0 && (
            <div className="mastery-stat">
              <span className="mastery-stat-label">{isAr ? 'الدقة' : 'Accuracy'}</span>
              <strong className="mastery-accuracy">{mastery.accuracyPct}%</strong>
            </div>
          )}
        </div>

        <ul className="mastery-checklist">
          {checks.map((c) => (
            <li key={c.label} className={c.ok ? 'ok' : ''}>
              <AppIcon name={c.ok ? 'correct' : 'goal'} size={16} />
              <span>{c.label}</span>
              <small>{c.detail}</small>
            </li>
          ))}
        </ul>
      </section>

      {/* The three mastery challenges */}
      <section className="review-block">
        <h3 className="review-block-title">{isAr ? 'تحديات الإتقان' : 'Mastery challenges'}</h3>
        <div className="mastery-challenges">
          {grammarPool.length > 0 && (
            <button className="mastery-challenge-btn" onClick={() => setChallenge('grammar')}>
              <span className="mastery-challenge-icon"><AppIcon name="grammar" size={22} /></span>
              <span className="mastery-challenge-copy">
                <strong>{isAr ? 'الاختبار الشامل للقواعد' : 'Full grammar test'}</strong>
                <small>{isAr ? `${grammarPool.length} سؤالًا من كل قواعد الدرس` : `${grammarPool.length} questions across all rules`}</small>
              </span>
              <AppIcon name="next" size={16} />
            </button>
          )}
          {lesson.vocab?.length > 1 && (
            <button className="mastery-challenge-btn" onClick={() => setChallenge('vocab')}>
              <span className="mastery-challenge-icon"><AppIcon name="vocabulary" size={22} /></span>
              <span className="mastery-challenge-copy">
                <strong>{isAr ? 'تحدي المفردات' : 'Vocabulary challenge'}</strong>
                <small>{isAr ? `كل مفردات الدرس (${lesson.vocab.length})` : `All ${lesson.vocab.length} lesson words`}</small>
              </span>
              <AppIcon name="next" size={16} />
            </button>
          )}
          {speakingItems.length > 0 && (
            <button className="mastery-challenge-btn" onClick={() => setChallenge('speak')}>
              <span className="mastery-challenge-icon"><AppIcon name="quiz" size={22} /></span>
              <span className="mastery-challenge-copy">
                <strong>{isAr ? 'تحدي النطق 🎙️' : 'Speaking challenge 🎙️'}</strong>
                <small>{isAr ? '٥ جمل تكررها بصوتك' : '5 sentences to repeat out loud'}</small>
              </span>
              <AppIcon name="next" size={16} />
            </button>
          )}
        </div>
      </section>
    </div>
  )
}

// ── SECTION: Dialogue — a real conversation using this lesson's grammar ──────
export function DialogueSection({ lesson, lang, kanjiReadingMode, onNext }) {
  const isAr = lang === 'ar'
  const readingMap = useMemo(() => buildReadingMap(lesson.vocab || [], kanjiReadingMode), [lesson.vocab, kanjiReadingMode])
  const dialogue = lesson.dialogue
  if (!dialogue?.lines?.length) return <div className="review-wrap" />

  const speakers = [...new Set(dialogue.lines.map((l) => l.speaker))]

  return (
    <div className="review-wrap">
      <div className="review-focus">
        <span className="review-focus-label">{isAr ? 'حوار الدرس' : 'Lesson dialogue'}</span>
        <p>{dialogue.titleAr}</p>
      </div>

      <section className="review-block">
        <h3 className="review-block-title">{isAr ? 'اضغط أي جملة للاستماع، وكرّرها بصوتك 🔊' : 'Tap a line to hear it, then repeat 🔊'}</h3>
        <div className="dialogue-thread">
          {dialogue.lines.map((line, i) => (
            <button
              key={i}
              className={`dialogue-bubble ${speakers.indexOf(line.speaker) % 2 === 0 ? 'side-a' : 'side-b'}`}
              onClick={() => speakJapanese(line.jp)}
            >
              <span className="dialogue-speaker">{line.speaker}</span>
              <LessonJP text={line.jp} readingMap={readingMap} />
              {line.romaji && <small dir="ltr" className="dialogue-romaji">{line.romaji}</small>}
              <span className="dialogue-ar">{line.ar}</span>
            </button>
          ))}
        </div>
      </section>
      {onNext && (
        <button className="btn btn-primary section-continue" onClick={onNext}>
          {isAr ? 'متابعة ←' : 'Continue →'}
        </button>
      )}
    </div>
  )
}

// ── SECTION: Reading — short passage + comprehension questions ───────────────
export function ReadingSection({ lesson, lang, kanjiReadingMode, onNext }) {
  const isAr = lang === 'ar'
  const readingMap = useMemo(() => buildReadingMap(lesson.vocab || [], kanjiReadingMode), [lesson.vocab, kanjiReadingMode])
  const reading = lesson.reading
  const [picked, setPicked] = useState({}) // questionIndex -> chosen option
  if (!reading?.sentences?.length) return <div className="review-wrap" />

  const questions = reading.questions || []

  const choose = (qi, opt, answer) => {
    if (picked[qi] != null) return
    const correct = opt === answer
    if (correct) playCorrect()
    else playWrong()
    // Reading comprehension feeds lesson accuracy (mastery system).
    recordLessonStat(readProgressState(), String(lesson.id), correct)
    setPicked((p) => ({ ...p, [qi]: opt }))
  }

  return (
    <div className="review-wrap">
      <div className="review-focus">
        <span className="review-focus-label">{isAr ? 'نص القراءة' : 'Reading passage'}</span>
        <p>{reading.titleAr}</p>
      </div>

      {/* The passage, sentence by sentence (tap to hear) */}
      <section className="review-block">
        <h3 className="review-block-title">{isAr ? 'اقرأ ثم اضغط للاستماع 🔊' : 'Read, then tap to listen 🔊'}</h3>
        <div className="reading-passage">
          {reading.sentences.map((s, i) => (
            <button key={i} className="reading-sentence" onClick={() => speakJapanese(s.jp)}>
              <LessonJP text={s.jp} readingMap={readingMap} />
              {s.romaji && <small dir="ltr">{s.romaji}</small>}
              <span>{s.ar}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Comprehension questions */}
      {questions.length > 0 && (
        <section className="review-block">
          <h3 className="review-block-title">{isAr ? `أسئلة الفهم (${questions.length})` : `Comprehension (${questions.length})`}</h3>
          <div className="reading-questions">
            {questions.map((q, qi) => (
              <div key={qi} className="reading-question">
                <p className="reading-question-text">{q.q}</p>
                <div className="reading-options">
                  {q.options.map((opt) => {
                    const chosen = picked[qi]
                    const state = chosen == null
                      ? ''
                      : opt === q.answer
                        ? 'correct'
                        : opt === chosen
                          ? 'wrong'
                          : 'dimmed'
                    return (
                      <button
                        key={opt}
                        disabled={chosen != null}
                        className={`reading-option ${state}`}
                        onClick={() => choose(qi, opt, q.answer)}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {onNext && (
        <button className="btn btn-primary section-continue" onClick={onNext}>
          {isAr ? 'متابعة ←' : 'Continue →'}
        </button>
      )}
    </div>
  )
}
