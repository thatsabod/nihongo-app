import { useState, useMemo, useEffect } from 'react'
import AppIcon from './AppIcon.jsx'
import { playCorrect, playWrong, speakJapanese } from '../sounds.js'
import { ExerciseContainer, ProgressHeader, ResultCard, ActionButton } from './exercise-ui/index.jsx'
import JapaneseText from './JapaneseText.jsx'
import { readProgressState, writeProgressState, trackAnswer, recordLessonStat, recordReviewActivity } from '../progress/progressStorage.js'
import { resolveMistake } from '../progress/mistakeLog.js'
import { buildReviewSession } from '../progress/reviewQueue.js'
import kanjiMeanings from '../content/kanjiMeanings.js'

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

// Confidence → SM-2 quality (0–5). Forgot resets the interval; Hard keeps a
// short interval (ease dips); Easy stretches it (ease rises). These map onto the
// existing graded scheduler — see scheduleNext in srsModel.js.
const Q_FORGOT = 2
const Q_HARD = 3
const Q_EASY = 5

// Self-rate buttons shown AFTER the answer is revealed. `includeForgot` adds the
// "Forgot" option (used for self-graded grammar cards); the multiple-choice
// vocab/kanji cards only offer Hard/Easy once a correct pick is already known.
function ConfidenceButtons({ isAr, includeForgot, onGrade }) {
  return (
    <div className="review-confidence">
      {includeForgot && (
        <button className="btn confidence-btn confidence-forgot" onClick={() => onGrade(Q_FORGOT)}>
          {isAr ? 'نسيت' : 'Forgot'}
        </button>
      )}
      <button className="btn confidence-btn confidence-hard" onClick={() => onGrade(Q_HARD)}>
        {isAr ? 'صعب' : 'Hard'}
      </button>
      <button className="btn confidence-btn confidence-easy" onClick={() => onGrade(Q_EASY)}>
        {isAr ? 'سهل' : 'Easy'}
      </button>
    </div>
  )
}

// ── Vocab recall: show the Japanese word, pick its Arabic meaning ────────────
function VocabReviewCard({ entry, meaningPool, kanjiReadingMode, lang, onAnswer }) {
  const { item } = entry
  const isAr = lang === 'ar'
  const [picked, setPicked] = useState(null)
  const surface = item.kanji || item.jp
  const kana = item.hiragana || item.jp
  const reading = kanjiReadingMode === 'romaji' ? item.reading : kana

  const options = useMemo(() => {
    const distractors = meaningPool.filter((m) => m && m !== item.meaning)
    return shuffle([item.meaning, ...shuffle(distractors).slice(0, 3)])
  }, [item.meaning, meaningPool])

  const pick = (opt) => {
    if (picked) return
    setPicked(opt)
    const correct = opt === item.meaning
    if (correct) playCorrect()
    else playWrong()
    // No auto-advance: wait for the learner to self-rate recall (correct pick)
    // or acknowledge the revealed answer (wrong pick).
  }

  const answered = Boolean(picked)
  const wasCorrect = picked === item.meaning

  return (
    <div className="iex-card review-card">
      <p className="ex-prompt">{isAr ? 'ما معنى هذه الكلمة؟' : 'What does this word mean?'}</p>
      <button className="sentence-display" dir="ltr" onClick={() => speakJapanese(kana)}>
        <JapaneseText text={surface} reading={reading} />
        <small>🔊</small>
      </button>
      <div className="meaning-options">
        {options.map((opt) => (
          <button
            key={opt}
            disabled={answered}
            className={`meaning-btn ${picked === opt ? opt === item.meaning ? 'correct' : 'wrong' : ''} ${picked && opt === item.meaning && picked !== opt ? 'reveal-correct' : ''}`}
            onClick={() => pick(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
      {answered && (wasCorrect ? (
        <ConfidenceButtons isAr={isAr} onGrade={(q) => onAnswer(true, q)} />
      ) : (
        <button className="btn btn-primary review-next" onClick={() => onAnswer(false, Q_FORGOT)}>
          {isAr ? 'التالي' : 'Next'}
        </button>
      ))}
    </div>
  )
}

// ── Kanji recall: show the kanji, pick its Arabic MEANING ───────────────────
// Meaning-recall is the dimension that was entirely missing; the reading is
// revealed afterwards so the learner reinforces both.
function KanjiReviewCard({ entry, meaningPool, lang, onAnswer }) {
  const { item } = entry
  const isAr = lang === 'ar'
  const [picked, setPicked] = useState(null)
  const gloss = kanjiMeanings[item.kana]
  const answer = gloss?.meaningAr || item.answer

  const options = useMemo(() => {
    const distractors = meaningPool.filter((r) => r && r !== answer)
    return shuffle([answer, ...shuffle(distractors).slice(0, 3)])
  }, [answer, meaningPool])

  const pick = (opt) => {
    if (picked) return
    setPicked(opt)
    const correct = opt === answer
    if (correct) playCorrect()
    else playWrong()
    // No auto-advance: the reading is revealed below; the learner then self-rates
    // (correct pick) or acknowledges the answer (wrong pick).
  }

  const answered = Boolean(picked)
  const wasCorrect = picked === answer

  return (
    <div className="iex-card review-card">
      <p className="ex-prompt">{isAr ? 'ما معنى هذا الكانجي؟' : 'What does this kanji mean?'}</p>
      <button className="sentence-display" dir="ltr" onClick={() => speakJapanese(item.kana)}>
        <span className="char-big">{item.kana}</span>
        <small>🔊</small>
      </button>
      {picked && gloss && (
        <p className="kanji-reading-reveal" dir="ltr">
          {[...(gloss.onyomi || []), ...(gloss.kunyomi || [])].join('・') || item.answer}
        </p>
      )}
      <div className="meaning-options">
        {options.map((opt) => (
          <button
            key={opt}
            disabled={answered}
            className={`meaning-btn ${picked === opt ? opt === answer ? 'correct' : 'wrong' : ''} ${picked && opt === answer && picked !== opt ? 'reveal-correct' : ''}`}
            onClick={() => pick(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
      {answered && (wasCorrect ? (
        <ConfidenceButtons isAr={isAr} onGrade={(q) => onAnswer(true, q)} />
      ) : (
        <button className="btn btn-primary review-next" onClick={() => onAnswer(false, Q_FORGOT)}>
          {isAr ? 'التالي' : 'Next'}
        </button>
      ))}
    </div>
  )
}

// ── Grammar recall: flashcard the student self-grades ────────────────────────
function GrammarReviewCard({ entry, lang, onAnswer }) {
  const { item } = entry
  const isAr = lang === 'ar'
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="iex-card review-card">
      <p className="ex-prompt">{isAr ? 'هل تتذكر هذه القاعدة؟' : 'Do you remember this point?'}</p>
      <div className="review-grammar-head">
        {item.particle && (
          <span className="grammar-particle-badge" dir="ltr" style={{ fontSize: '0.85rem', padding: '3px 12px' }}>
            {item.particle}
          </span>
        )}
        <strong>{item.title}</strong>
        {item.pattern && <span className="grammar-pattern" dir="ltr">{item.pattern}</span>}
      </div>

      {!revealed ? (
        <button className="btn btn-primary" onClick={() => setRevealed(true)}>
          {isAr ? 'أظهر الشرح' : 'Show explanation'}
        </button>
      ) : (
        <>
          {item.explanation && <p className="mistake-explanation" dir="rtl">{item.explanation}</p>}
          {item.example && (
            <button className="mistake-example" dir="ltr" onClick={() => speakJapanese(item.example.jp)} style={{ cursor: 'pointer', width: '100%', textAlign: 'inherit' }}>
              <span className="mistake-example-jp" dir="ltr">{item.example.jp}</span>
              {item.example.romaji && <small className="mistake-example-romaji" dir="ltr">{item.example.romaji}</small>}
              <span className="mistake-example-ar" dir="rtl">{item.example.ar}</span>
            </button>
          )}
          <ConfidenceButtons
            isAr={isAr}
            includeForgot
            onGrade={(q) => { if (q >= 3) playCorrect(); else playWrong(); onAnswer(q >= 3, q) }}
          />
        </>
      )}
    </div>
  )
}

// ── Speaking recall: a correction captured from a live Call Sensei session ───
// Self-graded flashcard (mirrors GrammarReviewCard): show what the learner said,
// reveal the better phrasing + why, then self-rate. The item carries its own
// { you, better, why } payload — no lesson resolution needed.
function SpeakingReviewCard({ entry, lang, onAnswer }) {
  const { item } = entry
  const isAr = lang === 'ar'
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="iex-card review-card">
      <p className="ex-prompt">{isAr ? 'صحّح هذه الجملة من مكالمتك' : 'Fix this sentence from your call'}</p>
      {item.you && <p className="speaking-review-you" dir="auto">{item.you}</p>}

      {!revealed ? (
        <button className="btn btn-primary" onClick={() => setRevealed(true)}>
          {isAr ? 'أظهر التصحيح' : 'Show correction'}
        </button>
      ) : (
        <>
          {item.better && (
            <button
              className="mistake-example"
              dir="ltr"
              onClick={() => speakJapanese(item.better)}
              style={{ cursor: 'pointer', width: '100%', textAlign: 'inherit' }}
            >
              <span className="mistake-example-jp" dir="ltr">{item.better}</span>
              <small>🔊</small>
            </button>
          )}
          {item.why && <p className="mistake-explanation" dir="rtl">{item.why}</p>}
          <ConfidenceButtons
            isAr={isAr}
            includeForgot
            onGrade={(q) => { if (q >= 3) playCorrect(); else playWrong(); onAnswer(q >= 3, q) }}
          />
        </>
      )}
    </div>
  )
}

// ── SCREEN: Smart Review ─────────────────────────────────────────────────────
export default function SmartReview({ allLessons, allKanji = [], lang, kanjiReadingMode, onClose, onStudyComplete, reviewFilter = null }) {
  const isAr = lang === 'ar'
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  // Completing a review session counts as real study (streak + review-streak + XP).
  useEffect(() => {
    if (done) onStudyComplete?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  // Built once on mount so answering doesn't reshuffle the live queue. When a
  // `reviewFilter` (e.g. 'grammar' | 'vocab' | 'kanji') is supplied — from the
  // home weak-area shortcuts — restrict the queue to that skill.
  const session = useMemo(() => {
    const full = buildReviewSession(allLessons, readProgressState(), Date.now(), 15, allKanji)
    return reviewFilter ? full.filter((entry) => entry.itemType === reviewFilter) : full
  }, [allLessons, allKanji, reviewFilter])
  const meaningPool = useMemo(() => {
    const all = (allLessons || []).flatMap((l) => (l.vocab || []).map((v) => v.meaning)).filter(Boolean)
    return [...new Set(all)]
  }, [allLessons])
  const kanjiMeaningPool = useMemo(() => [...new Set(Object.values(kanjiMeanings).map((g) => g.meaningAr).filter(Boolean))], [])

  if (session.length === 0) {
    return (
      <ResultCard
        icon="star"
        message={isAr ? 'لا توجد عناصر للمراجعة الآن. أحسنت! 🎉' : 'Nothing to review right now. Great job! 🎉'}
      >
        <ActionButton onClick={onClose}>{isAr ? 'العودة' : 'Back'}</ActionButton>
      </ResultCard>
    )
  }

  if (done) {
    const perfect = score === session.length
    return (
      <ResultCard
        icon={perfect ? 'star' : 'correct'}
        score={score}
        total={session.length}
        message={isAr
          ? (perfect ? 'مراجعة مثالية! ثبّتّ كل النقاط.' : 'أحسنت! استمر في المراجعة يوميًا.')
          : (perfect ? 'Perfect review! Everything reinforced.' : 'Nice work — keep reviewing daily.')}
      >
        <ActionButton onClick={onClose}>{isAr ? 'إنهاء' : 'Finish'}</ActionButton>
      </ResultCard>
    )
  }

  const entry = session[idx]

  // Record the answer against SRS + mistake log, resolving weak items on recall.
  // `quality` is the optional Forgot/Hard/Easy confidence grade (0–5); when
  // present it drives SRS scheduling, while `correct` still drives lesson stats,
  // mistake resolution, and the session score.
  const handleAnswer = (correct, quality) => {
    let state = readProgressState()
    state = recordLessonStat(state, String(entry.lessonId), correct)
    state = trackAnswer(state, {
      itemId: entry.itemId,
      itemType: entry.itemType,
      wasCorrect: correct,
      quality,
      lessonId: entry.lessonId,
      exerciseType: 'review',
      questionAr: entry.kind === 'vocab' ? entry.item.meaning : entry.kind === 'kanji' ? entry.item.answer : entry.kind === 'speaking' ? entry.item.better : entry.item.title,
    })
    if (correct) {
      // Clear it from the weak-areas list once recalled correctly in review.
      const nextMistakes = resolveMistake(state.mistakes, entry.itemType, entry.itemId)
      writeProgressState({ ...state, mistakes: nextMistakes })
    }

    const nextScore = score + (correct ? 1 : 0)
    if (idx + 1 >= session.length) {
      // Completing a review session advances the review streak (once/day).
      recordReviewActivity(readProgressState())
      setScore(nextScore)
      setDone(true)
    } else {
      setScore(nextScore)
      setIdx((i) => i + 1)
    }
  }

  return (
    <ExerciseContainer>
      <ProgressHeader
        onClose={onClose}
        closeLabel={isAr ? 'إغلاق' : 'Close'}
        progress={(idx / session.length) * 100}
        counter={`${idx + 1}/${session.length}`}
      />
      <div className="review-session-meta">
        <span className="iex-section-label">{isAr ? 'المراجعة الذكية' : 'Smart Review'}</span>
        {entry.wrongCount >= 2 && (
          <span className="review-weak-tag">{isAr ? 'نقطة ضعف' : 'Weak spot'}</span>
        )}
      </div>
      {entry.kind === 'vocab' && (
        <VocabReviewCard key={entry.key} entry={entry} meaningPool={meaningPool} kanjiReadingMode={kanjiReadingMode} lang={lang} onAnswer={handleAnswer} />
      )}
      {entry.kind === 'kanji' && (
        <KanjiReviewCard key={entry.key} entry={entry} meaningPool={kanjiMeaningPool} lang={lang} onAnswer={handleAnswer} />
      )}
      {entry.kind === 'grammar' && (
        <GrammarReviewCard key={entry.key} entry={entry} lang={lang} onAnswer={handleAnswer} />
      )}
      {entry.kind === 'speaking' && (
        <SpeakingReviewCard key={entry.key} entry={entry} lang={lang} onAnswer={handleAnswer} />
      )}
    </ExerciseContainer>
  )
}
