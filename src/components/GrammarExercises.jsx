import { useState } from 'react'
import { playCorrect, playWrong, speakJapanese } from '../sounds.js'
import RuaaMascot from './RuaaMascot.jsx'
import {
  ExerciseContainer,
  ExercisePane,
  ProgressHeader,
  QuestionCard,
  SentenceDisplay,
  AnswerOption,
  getOptionState,
  ResultCard,
  ActionButton,
  SpeakingPracticeQuiz,
  OutOfHeartsCard,
} from './exercise-ui/index.jsx'
import { useHearts } from '../hearts-context.jsx'
import { answersMatch } from '../utils/answerMatch.js'
import { readProgressState, trackAnswer, recordLessonStat } from '../progress/progressStorage.js'

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
function BuildExercise({ ex, lang, onAnswer, mascotCharacter }) {
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
    if (selected.length === 0) return
    const built = selected.map((x) => x.w).join(' ')
    const correct = answersMatch(built, ex.answer)
    setResult(correct ? 'correct' : 'wrong')
    setTimeout(() => onAnswer(correct), 1100)
  }

  const isParticle = (w) => ex.particles?.includes(w)

  const mascotMode = result ? (result === 'correct' ? 'cheer' : 'skeptical') : 'thinking'

  return (
    <ExercisePane>
      <RuaaMascot mode={mascotMode} character={mascotCharacter} />
      <QuestionCard
        prompt={lang === 'ar' ? 'رتّب الكلمات لتكوين الجملة:' : 'Arrange the words to form the sentence:'}
        hint={ex.ar}
      />

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

      {selected.length > 0 && !result && (
        <ActionButton onClick={check}>{lang === 'ar' ? 'تحقق' : 'Check'}</ActionButton>
      )}
    </ExercisePane>
  )
}

// ── Exercise 2: Fill the particle ───────────────────────────────
function FillExercise({ ex, lang, onAnswer, mascotCharacter }) {
  const [picked, setPicked] = useState(null)
  const parts = ex.sentence.split('___')

  const pick = (opt) => {
    if (picked) return
    setPicked(opt)
    setTimeout(() => onAnswer(opt === ex.answer), 1100)
  }

  const mascotMode = picked ? (picked === ex.answer ? 'cheer' : 'skeptical') : 'thinking'

  return (
    <ExercisePane>
      <RuaaMascot mode={mascotMode} character={mascotCharacter} />
      <QuestionCard prompt={lang === 'ar' ? 'اختر الأداة القواعدية الصحيحة:' : 'Choose the correct particle:'} />

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
          <AnswerOption
            key={opt}
            variant="plain"
            dir="ltr"
            disabled={Boolean(picked)}
            className="particle-btn"
            state={getOptionState(picked, opt, ex.answer)}
            onClick={() => pick(opt)}
          >
            {opt}
          </AnswerOption>
        ))}
      </div>
    </ExercisePane>
  )
}

// ── Exercise 3: Choose meaning ───────────────────────────────────
function MeaningExercise({ ex, lang, onAnswer, mascotCharacter }) {
  const [picked, setPicked] = useState(null)

  const pick = (opt) => {
    if (picked) return
    setPicked(opt)
    setTimeout(() => onAnswer(opt === ex.answer), 1100)
  }

  const mascotMode = picked ? (picked === ex.answer ? 'cheer' : 'skeptical') : 'calm'

  return (
    <ExercisePane>
      <RuaaMascot mode={mascotMode} character={mascotCharacter} />
      <QuestionCard prompt={lang === 'ar' ? 'ما معنى هذه الجملة؟' : 'What does this sentence mean?'} />

      <SentenceDisplay onClick={() => speakJapanese(ex.sentence)}>
        <HighlightSentence text={ex.sentence} particle={ex.particle} />
      </SentenceDisplay>

      <div className="meaning-options">
        {ex.options.map((opt) => (
          <AnswerOption
            key={opt}
            disabled={Boolean(picked)}
            state={getOptionState(picked, opt, ex.answer)}
            onClick={() => pick(opt)}
          >
            {opt}
          </AnswerOption>
        ))}
      </div>
    </ExercisePane>
  )
}

// ── Exercise 5: Repeat the sentence out loud ──────────────────────
function SpeakExercise({ ex, lang, onAnswer, mascotCharacter }) {
  return (
    <SpeakingPracticeQuiz
      sentence={ex.sentence}
      speakText={ex.sentence}
      lang={lang}
      mascotCharacter={mascotCharacter}
      onAnswer={(passed) => onAnswer(passed)}
      onSkip={() => onAnswer(true)}
    />
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
    <ExercisePane>
      <QuestionCard prompt={lang === 'ar' ? 'أيّ جملة صحيحة؟' : 'Which sentence is correct?'} hint={ex.ar} />

      <div className="error-options">
        {ex.options.map((opt) => (
          <AnswerOption
            key={opt}
            variant="plain"
            dir="ltr"
            disabled={Boolean(picked)}
            className="error-btn jp-line"
            state={getOptionState(picked, opt, ex.answer)}
            onClick={() => pick(opt)}
          >
            {opt}
          </AnswerOption>
        ))}
      </div>
    </ExercisePane>
  )
}

// Insert a "repeat the sentence" speaking exercise after the first
// sentence-meaning exercise, reusing its sentence (spaces stripped).
function withSpeakingExercise(exercises) {
  const out = []
  let added = false
  exercises.forEach((ex) => {
    out.push(ex)
    if (!added && ex.type === 'meaning' && ex.sentence) {
      out.push({ type: 'speak', sentence: ex.sentence.replace(/\s+/g, '') })
      added = true
    }
  })
  return out
}

// ── Main wrapper ─────────────────────────────────────────────────
export default function GrammarExercises({ exercises: rawExercises, lang, onClose, lessonId, ruleTitle }) {
  const [exercises] = useState(() => withSpeakingExercise(rawExercises))
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const isAr = lang === 'ar'
  const heartsApi = useHearts()

  if (heartsApi && heartsApi.hearts <= 0) {
    return <OutOfHeartsCard lang={lang} onClose={onClose} />
  }

  const handleAnswer = (correct) => {
    if (correct) playCorrect()
    else {
      playWrong()
      heartsApi?.consumeHeart()
    }
    // Feed weakness detection + SRS so grammar drills aren't a learning blind
    // spot (correct answers enter SRS; wrong answers also log a mistake).
    if (lessonId) {
      let state = recordLessonStat(readProgressState(), String(lessonId), correct)
      if (ruleTitle) {
        trackAnswer(state, {
          itemId: ruleTitle,
          itemType: 'grammar',
          wasCorrect: correct,
          lessonId: String(lessonId),
          exerciseType: 'grammar-drill',
          questionAr: ruleTitle,
        })
      }
    }
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
      <ResultCard
        icon={perfect ? 'star' : good ? 'correct' : 'goal'}
        score={score}
        total={total}
        message={isAr ? (perfect ? 'ممتاز! أتقنت القاعدة.' : good ? 'جيد! راجع الأمثلة مرة ثانية.' : 'حاول مرة ثانية — القاعدة تحتاج مراجعة.') : (perfect ? 'Perfect mastery!' : good ? 'Good! Review the examples once more.' : 'Keep practicing!')}
      >
        <ActionButton onClick={onClose}>{isAr ? 'إغلاق' : 'Close'}</ActionButton>
      </ResultCard>
    )
  }

  const ex = exercises[idx]
  const mascotCharacter = idx % 2 === 0 ? 'joni' : 'ruaa'

  return (
    <ExerciseContainer>
      <ProgressHeader
        onClose={onClose}
        progress={(idx / exercises.length) * 100}
        counter={`${idx + 1}/${exercises.length}`}
      />

      {ex.type === 'build' && <BuildExercise key={idx} ex={ex} lang={lang} mascotCharacter={mascotCharacter} onAnswer={handleAnswer} />}
      {ex.type === 'fill' && <FillExercise key={idx} ex={ex} lang={lang} mascotCharacter={mascotCharacter} onAnswer={handleAnswer} />}
      {ex.type === 'meaning' && <MeaningExercise key={idx} ex={ex} lang={lang} mascotCharacter={mascotCharacter} onAnswer={handleAnswer} />}
      {ex.type === 'error' && <ErrorExercise key={idx} ex={ex} lang={lang} onAnswer={handleAnswer} />}
      {ex.type === 'speak' && <SpeakExercise key={idx} ex={ex} lang={lang} mascotCharacter={mascotCharacter} onAnswer={handleAnswer} />}
    </ExerciseContainer>
  )
}
