import { useState, useEffect } from 'react'
import { playCorrect, playWrong, speakJapanese } from '../sounds.js'
import RuaaMascot from './RuaaMascot.jsx'
import IconCircle from './IconCircle.jsx'
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
import { readProgressState, trackAnswer } from '../progress/progressStorage.js'

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

const KANJI_REGEX = /[㐀-鿿]/

// Record a kanji answer to the weakness/SRS log. Only true kanji glyphs are
// tracked as 'kanji' — kana drills (hiragana/katakana) are skipped so they
// don't pollute kanji weak-area detection.
function trackKanjiAnswer(item, correct) {
  if (!item?.kana || !KANJI_REGEX.test(item.kana)) return
  trackAnswer(readProgressState(), {
    itemId: item.kana,
    itemType: 'kanji',
    wasCorrect: correct,
    exerciseType: 'character',
    questionAr: item.answer,
  })
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

  if (pool.length >= 1) {
    exs.push({ type: 'speak', item: shuffle(pool)[0] })
  }

  return shuffle(exs)
}

// ── Exercise: see the character, pick its reading ────────────────────────────
function ReadingExercise({ ex, lang, renderChar, onAnswer, mascotCharacter }) {
  const [picked, setPicked] = useState(null)
  const item = ex.item

  const pick = (opt) => {
    if (picked) return
    setPicked(opt)
    setTimeout(() => onAnswer(opt === item.answer), 1000)
  }

  const mascotMode = picked ? (picked === item.answer ? 'cheer' : 'skeptical') : 'calm'

  return (
    <ExercisePane>
      <RuaaMascot mode={mascotMode} character={mascotCharacter} />
      <QuestionCard prompt={lang === 'ar' ? 'ما قراءة هذا الحرف؟' : 'What is the reading of this character?'} />

      <SentenceDisplay className="char-display" onClick={() => speakJapanese(item.kana)}>
        <span className="char-big">{renderChar(item)}</span>
      </SentenceDisplay>

      <div className="meaning-options vocab-option-grid">
        {ex.options.map((opt) => (
          <AnswerOption
            key={opt}
            dir="ltr"
            disabled={Boolean(picked)}
            state={getOptionState(picked, opt, item.answer)}
            onClick={() => pick(opt)}
          >
            {opt}
          </AnswerOption>
        ))}
      </div>
    </ExercisePane>
  )
}

// ── Exercise: see the reading, pick the matching character ──────────────────
function ReverseExercise({ ex, lang, renderChar, onAnswer, mascotCharacter }) {
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
    <ExercisePane>
      <RuaaMascot mode={mascotMode} character={mascotCharacter} />
      <QuestionCard prompt={lang === 'ar' ? 'أيّ حرف يُقرأ هكذا؟' : 'Which character is read like this?'} />
      <p className="ex-hint vocab-meaning-prompt" dir="ltr">{item.answer}</p>

      <div className="meaning-options vocab-option-grid char-option-grid">
        {ex.optionItems.map((opt, i) => (
          <AnswerOption
            key={i}
            disabled={Boolean(picked)}
            state={getOptionState(picked, opt, item)}
            onClick={() => pick(opt)}
          >
            <span className="char-big">{renderChar(opt)}</span>
          </AnswerOption>
        ))}
      </div>
    </ExercisePane>
  )
}

// ── Exercise: listen and pick the matching character ─────────────────────────
function AudioExercise({ ex, lang, renderChar, onAnswer, mascotCharacter }) {
  const [picked, setPicked] = useState(null)
  const item = ex.item

  const pick = (opt) => {
    if (picked) return
    setPicked(opt)
    setTimeout(() => onAnswer(opt === item), 1000)
  }

  const mascotMode = picked ? (picked === item ? 'cheer' : 'skeptical') : 'thinking'

  return (
    <ExercisePane>
      <RuaaMascot mode={mascotMode} character={mascotCharacter} />
      <QuestionCard prompt={lang === 'ar' ? 'استمع واختر الحرف الصحيح:' : 'Listen and choose the matching character:'} />

      <button className="sentence-display vocab-audio-btn" onClick={() => speakJapanese(item.kana)}>
        <IconCircle name="sound" size={38} className="vocab-audio-icon" />
        <small>{lang === 'ar' ? 'اضغط للاستماع' : 'Tap to listen'}</small>
      </button>

      <button type="button" className="muted-link" onClick={() => speakJapanese(item.kana)}>
        {lang === 'ar' ? 'لا أستطيع الاستماع الآن' : "Can't listen now"}
      </button>

      <div className="meaning-options vocab-option-grid char-option-grid">
        {ex.optionItems.map((opt, i) => (
          <AnswerOption
            key={i}
            disabled={Boolean(picked)}
            state={getOptionState(picked, opt, item)}
            onClick={() => pick(opt)}
          >
            <span className="char-big">{renderChar(opt)}</span>
          </AnswerOption>
        ))}
      </div>
    </ExercisePane>
  )
}

// ── Exercise: true / false ────────────────────────────────────────────────────
function TrueFalseExercise({ ex, lang, renderChar, onAnswer, mascotCharacter }) {
  const [picked, setPicked] = useState(null)
  const item = ex.item

  const pick = (val) => {
    if (picked !== null) return
    setPicked(val)
    setTimeout(() => onAnswer(val === ex.isTrue), 1000)
  }

  const mascotMode = picked === null ? 'thinking' : (picked === ex.isTrue ? 'cheer' : 'skeptical')

  return (
    <ExercisePane>
      <RuaaMascot mode={mascotMode} character={mascotCharacter} />
      <QuestionCard prompt={lang === 'ar' ? 'هل هذا صحيح؟' : 'Is this correct?'} />

      <SentenceDisplay className="char-display" onClick={() => speakJapanese(item.kana)}>
        <span className="char-big">{renderChar(item)}</span>
        <span className="char-tf-reading" dir="ltr">{ex.shown}</span>
      </SentenceDisplay>

      <div className="meaning-options vocab-option-grid">
        <AnswerOption
          disabled={picked !== null}
          state={picked === true ? (ex.isTrue ? 'correct' : 'wrong') : (picked !== null && ex.isTrue && picked !== true ? 'reveal-correct' : '')}
          onClick={() => pick(true)}
        >
          {lang === 'ar' ? '✓ صحيح' : '✓ Correct'}
        </AnswerOption>
        <AnswerOption
          disabled={picked !== null}
          state={picked === false ? (!ex.isTrue ? 'correct' : 'wrong') : (picked !== null && !ex.isTrue && picked !== false ? 'reveal-correct' : '')}
          onClick={() => pick(false)}
        >
          {lang === 'ar' ? '✗ خطأ' : '✗ Wrong'}
        </AnswerOption>
      </div>
    </ExercisePane>
  )
}

// ── Exercise: match characters to their readings ─────────────────────────────
function MatchExercise({ ex, lang, renderChar, onAnswer }) {
  const heartsApi = useHearts()
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
      heartsApi?.consumeHeart()
      setWrongPair(it.pairId)
      setTimeout(() => setWrongPair(null), 500)
      setSelectedLeft(null)
    }
  }

  return (
    <ExercisePane>
      <QuestionCard prompt={lang === 'ar' ? 'وصّل كل حرف بقراءته:' : 'Match each character to its reading:'} />
      <div className="vocab-match-grid">
        <div className="vocab-match-col">
          {leftItems.map((it) => (
            <AnswerOption
              key={it.pairId}
              variant="plain"
              disabled={matched.includes(it.pairId)}
              className={`vocab-match-card ${matched.includes(it.pairId) ? 'matched' : ''} ${selectedLeft?.pairId === it.pairId ? 'selected' : ''}`}
              onClick={() => pickLeft(it)}
            >
              <span className="char-big">{renderChar(it)}</span>
            </AnswerOption>
          ))}
        </div>
        <div className="vocab-match-col">
          {rightItems.map((it) => (
            <AnswerOption
              key={it.pairId}
              variant="plain"
              dir="ltr"
              disabled={matched.includes(it.pairId)}
              className={`vocab-match-card ${matched.includes(it.pairId) ? 'matched' : ''} ${wrongPair === it.pairId ? 'wrong' : ''}`}
              onClick={() => pickRight(it)}
            >
              {it.answer}
            </AnswerOption>
          ))}
        </div>
      </div>
      <p className="iex-counter">{matched.length}/{total}</p>
    </ExercisePane>
  )
}

// ── Exercise: repeat the character's reading out loud ────────────────────────
function SpeakExercise({ ex, lang, onAnswer, mascotCharacter }) {
  const item = ex.item
  return (
    <SpeakingPracticeQuiz
      sentence={item.kana}
      speakText={item.kana}
      lang={lang}
      mascotCharacter={mascotCharacter}
      onAnswer={(passed) => onAnswer(passed)}
      onSkip={() => onAnswer(true)}
    />
  )
}

// ── Main wrapper ───────────────────────────────────────────────────────────
export default function CharacterExercises({ items, lang, renderChar, onClose }) {
  const [exercises] = useState(() => generateCharacterExercises(items))
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const isAr = lang === 'ar'
  const heartsApi = useHearts()

  if (!exercises.length) return null

  if (heartsApi && heartsApi.hearts <= 0) {
    return <OutOfHeartsCard lang={lang} onClose={onClose} />
  }

  const handleAnswer = (correct) => {
    if (correct) playCorrect()
    else {
      playWrong()
      heartsApi?.consumeHeart()
    }
    // Passive kanji weakness/SRS tracking (kana drills are ignored inside).
    trackKanjiAnswer(exercises[idx]?.item, correct)
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
        message={isAr
          ? (perfect ? 'ممتاز! أتقنت هذه المجموعة.' : good ? 'جيد! راجع الحروف مرة ثانية.' : 'حاول مرة ثانية — راجع الحروف.')
          : (perfect ? 'Perfect! You mastered this group.' : good ? 'Good! Review the characters once more.' : 'Keep practicing these characters!')
        }
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

      {ex.type === 'reading' && <ReadingExercise key={idx} ex={ex} lang={lang} mascotCharacter={mascotCharacter} renderChar={renderChar} onAnswer={handleAnswer} />}
      {ex.type === 'reverse' && <ReverseExercise key={idx} ex={ex} lang={lang} mascotCharacter={mascotCharacter} renderChar={renderChar} onAnswer={handleAnswer} />}
      {ex.type === 'audio' && <AudioExercise key={idx} ex={ex} lang={lang} mascotCharacter={mascotCharacter} renderChar={renderChar} onAnswer={handleAnswer} />}
      {ex.type === 'truefalse' && <TrueFalseExercise key={idx} ex={ex} lang={lang} mascotCharacter={mascotCharacter} renderChar={renderChar} onAnswer={handleAnswer} />}
      {ex.type === 'match' && <MatchExercise key={idx} ex={ex} lang={lang} renderChar={renderChar} onAnswer={handleAnswer} />}
      {ex.type === 'speak' && <SpeakExercise key={idx} ex={ex} lang={lang} mascotCharacter={mascotCharacter} onAnswer={handleAnswer} />}
    </ExerciseContainer>
  )
}
