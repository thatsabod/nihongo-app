import { useState, useMemo } from 'react'
import AppIcon from './AppIcon.jsx'
import { playCorrect, playWrong, speakJapanese } from '../sounds.js'
import { ExerciseContainer, ProgressHeader, ResultCard, ActionButton } from './exercise-ui/index.jsx'
import { readProgressState, writeProgressState, trackAnswer, recordLessonStat, recordReviewActivity } from '../progress/progressStorage.js'
import { resolveMistake } from '../progress/mistakeLog.js'
import { buildReviewSession } from '../progress/reviewQueue.js'

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

// ── Vocab recall: show the Japanese word, pick its Arabic meaning ────────────
function VocabReviewCard({ entry, meaningPool, kanjiReadingMode, lang, onAnswer }) {
  const { item } = entry
  const isAr = lang === 'ar'
  const [picked, setPicked] = useState(null)
  const surface = item.kanji || item.jp
  const kana = item.hiragana || item.jp
  const reading = kanjiReadingMode === 'romaji' ? item.reading : kana
  const hasKanji = /[㐀-鿿]/.test(surface)

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
    setTimeout(() => onAnswer(correct), 1000)
  }

  return (
    <div className="iex-card review-card">
      <p className="ex-prompt">{isAr ? 'ما معنى هذه الكلمة؟' : 'What does this word mean?'}</p>
      <button className="sentence-display" dir="ltr" onClick={() => speakJapanese(kana)}>
        {hasKanji ? <ruby>{surface}<rt>{reading}</rt></ruby> : surface}
        <small>🔊</small>
      </button>
      <div className="meaning-options">
        {options.map((opt) => (
          <button
            key={opt}
            disabled={Boolean(picked)}
            className={`meaning-btn ${picked === opt ? opt === item.meaning ? 'correct' : 'wrong' : ''} ${picked && opt === item.meaning && picked !== opt ? 'reveal-correct' : ''}`}
            onClick={() => pick(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Kanji recall: show the kanji, pick its reading ──────────────────────────
function KanjiReviewCard({ entry, readingPool, lang, onAnswer }) {
  const { item } = entry
  const isAr = lang === 'ar'
  const [picked, setPicked] = useState(null)

  const options = useMemo(() => {
    const distractors = readingPool.filter((r) => r && r !== item.answer)
    return shuffle([item.answer, ...shuffle(distractors).slice(0, 3)])
  }, [item.answer, readingPool])

  const pick = (opt) => {
    if (picked) return
    setPicked(opt)
    const correct = opt === item.answer
    if (correct) playCorrect()
    else playWrong()
    setTimeout(() => onAnswer(correct), 1000)
  }

  return (
    <div className="iex-card review-card">
      <p className="ex-prompt">{isAr ? 'ما قراءة هذا الكانجي؟' : 'What is the reading of this kanji?'}</p>
      <button className="sentence-display" dir="ltr" onClick={() => speakJapanese(item.kana)}>
        <span className="char-big">{item.kana}</span>
        <small>🔊</small>
      </button>
      <div className="meaning-options">
        {options.map((opt) => (
          <button
            key={opt}
            dir="ltr"
            disabled={Boolean(picked)}
            className={`meaning-btn ${picked === opt ? opt === item.answer ? 'correct' : 'wrong' : ''} ${picked && opt === item.answer && picked !== opt ? 'reveal-correct' : ''}`}
            onClick={() => pick(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
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
          <div className="review-selfgrade">
            <button className="btn btn-secondary" onClick={() => { playWrong(); onAnswer(false) }}>
              {isAr ? 'نسيت' : 'Forgot'}
            </button>
            <button className="btn btn-primary" onClick={() => { playCorrect(); onAnswer(true) }}>
              {isAr ? 'تذكّرت' : 'Remembered'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── SCREEN: Smart Review ─────────────────────────────────────────────────────
export default function SmartReview({ allLessons, allKanji = [], lang, kanjiReadingMode, onClose }) {
  const isAr = lang === 'ar'
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  // Built once on mount so answering doesn't reshuffle the live queue.
  const session = useMemo(() => buildReviewSession(allLessons, readProgressState(), Date.now(), 15, allKanji), [allLessons, allKanji])
  const meaningPool = useMemo(() => {
    const all = (allLessons || []).flatMap((l) => (l.vocab || []).map((v) => v.meaning)).filter(Boolean)
    return [...new Set(all)]
  }, [allLessons])
  const kanjiReadingPool = useMemo(() => [...new Set((allKanji || []).map((k) => k.answer).filter(Boolean))], [allKanji])

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
  const handleAnswer = (correct) => {
    let state = readProgressState()
    state = recordLessonStat(state, String(entry.lessonId), correct)
    state = trackAnswer(state, {
      itemId: entry.itemId,
      itemType: entry.itemType,
      wasCorrect: correct,
      lessonId: entry.lessonId,
      exerciseType: 'review',
      questionAr: entry.kind === 'vocab' ? entry.item.meaning : entry.kind === 'kanji' ? entry.item.answer : entry.item.title,
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
        <KanjiReviewCard key={entry.key} entry={entry} readingPool={kanjiReadingPool} lang={lang} onAnswer={handleAnswer} />
      )}
      {entry.kind === 'grammar' && (
        <GrammarReviewCard key={entry.key} entry={entry} lang={lang} onAnswer={handleAnswer} />
      )}
    </ExerciseContainer>
  )
}
