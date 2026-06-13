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
  ImageOption,
  getOptionState,
  ResultCard,
  ActionButton,
  TranslationChoiceQuiz,
  SpeakingPracticeQuiz,
  SentenceBuilderQuiz,
  OutOfHeartsCard,
} from './exercise-ui/index.jsx'
import { getVocabImage } from '../constants/vocabImages.js'
import { useHearts } from '../hearts-context.jsx'
import { answersMatch } from '../utils/answerMatch.js'
import { readProgressState, trackAnswer, recordLessonStat } from '../progress/progressStorage.js'

// Feed a vocab drill answer into weakness detection + SRS (shared by both
// vocab engines). Correct answers enter SRS; wrong answers also log a mistake.
function trackVocabAnswer(item, correct, lessonId) {
  if (!item) return
  const state = lessonId ? recordLessonStat(readProgressState(), String(lessonId), correct) : readProgressState()
  trackAnswer(state, {
    itemId: item.id || item.jp,
    itemType: 'vocab',
    wasCorrect: correct,
    lessonId: lessonId ? String(lessonId) : undefined,
    exerciseType: 'vocab-drill',
    questionAr: item.meaning,
  })
}

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

  const imageable = pool.filter((v) => getVocabImage(v))
  if (imageable.length >= 4) {
    shuffle(imageable).slice(0, Math.min(2, imageable.length)).forEach((item) => {
      const distractors = shuffle(imageable.filter((p) => p !== item)).slice(0, 3)
      if (distractors.length < 3) return
      exs.push({ type: 'image', item, optionItems: shuffle([item, ...distractors]) })
    })
  }

  shuffle(pool).slice(0, Math.min(2, pool.length)).forEach((item) => {
    const distractors = shuffle(pool.filter((p) => p !== item)).slice(0, 2)
    if (distractors.length < 2) return
    exs.push({ type: 'translate', item, optionItems: shuffle([item, ...distractors]) })
  })

  if (pool.length >= 1) {
    exs.push({ type: 'speak', item: shuffle(pool)[0] })
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
function VocabMeaningExercise({ ex, lang, onAnswer, mascotCharacter }) {
  const [picked, setPicked] = useState(null)
  const item = ex.item

  const pick = (opt) => {
    if (picked) return
    setPicked(opt)
    setTimeout(() => onAnswer(opt === item.meaning), 1100)
  }

  const mascotMode = picked ? (picked === item.meaning ? 'cheer' : 'skeptical') : 'calm'

  return (
    <ExercisePane>
      <RuaaMascot mode={mascotMode} character={mascotCharacter} />
      <QuestionCard prompt={lang === 'ar' ? 'ما معنى هذه الكلمة؟' : 'What does this word mean?'} />

      <SentenceDisplay className="vocab-display" onClick={() => speakJapanese(speakableVocab(item))}>
        <VocabTerm item={item} />
      </SentenceDisplay>

      <div className="meaning-options">
        {ex.options.map((opt) => (
          <AnswerOption
            key={opt}
            disabled={Boolean(picked)}
            state={getOptionState(picked, opt, item.meaning)}
            onClick={() => pick(opt)}
          >
            {opt}
          </AnswerOption>
        ))}
      </div>
    </ExercisePane>
  )
}

// ── Exercise: listen and pick the matching word ──────────────────────────────
function VocabAudioExercise({ ex, lang, onAnswer, mascotCharacter }) {
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
    <ExercisePane>
      <RuaaMascot mode={mascotMode} character={mascotCharacter} />
      <QuestionCard prompt={lang === 'ar' ? 'استمع واختر الكلمة الصحيحة:' : 'Listen and choose the matching word:'} />

      <button className="sentence-display vocab-audio-btn" onClick={() => speakJapanese(speakableVocab(item))}>
        <IconCircle name="sound" size={38} className="vocab-audio-icon" />
        <small>{lang === 'ar' ? 'اضغط للاستماع' : 'Tap to listen'}</small>
      </button>

      <button type="button" className="muted-link" onClick={() => speakJapanese(speakableVocab(item))}>
        {lang === 'ar' ? 'لا أستطيع الاستماع الآن' : "Can't listen now"}
      </button>

      <div className="meaning-options vocab-option-grid">
        {ex.optionItems.map((opt, i) => (
          <AnswerOption
            key={i}
            dir="ltr"
            disabled={Boolean(picked)}
            state={getOptionState(picked, opt, item)}
            onClick={() => pick(opt)}
          >
            <VocabTerm item={opt} />
          </AnswerOption>
        ))}
      </div>
    </ExercisePane>
  )
}

// ── Exercise: from meaning, pick the correct Japanese word ───────────────────
function VocabReverseExercise({ ex, lang, onAnswer, mascotCharacter }) {
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
    <ExercisePane>
      <RuaaMascot mode={mascotMode} character={mascotCharacter} />
      <QuestionCard prompt={lang === 'ar' ? 'أيّ كلمة تعني هذا؟' : 'Which word means this?'} />
      <p className="ex-hint vocab-meaning-prompt">{item.meaning}</p>

      <div className="meaning-options vocab-option-grid">
        {ex.optionItems.map((opt, i) => (
          <AnswerOption
            key={i}
            dir="ltr"
            disabled={Boolean(picked)}
            state={getOptionState(picked, opt, item)}
            onClick={() => pick(opt)}
          >
            <VocabTerm item={opt} />
          </AnswerOption>
        ))}
      </div>
    </ExercisePane>
  )
}

// ── Exercise: listen/read and pick the matching image ────────────────────────
function VocabImageExercise({ ex, lang, onAnswer, mascotCharacter }) {
  const [picked, setPicked] = useState(null)
  const item = ex.item

  const pick = (opt) => {
    if (picked) return
    setPicked(opt)
    setTimeout(() => onAnswer(opt === item), 1100)
  }

  const mascotMode = picked ? (picked === item ? 'cheer' : 'skeptical') : 'calm'

  return (
    <ExercisePane>
      <RuaaMascot mode={mascotMode} character={mascotCharacter} />
      <span className="vocab-new-word-badge">
        <IconCircle name="lessons" size={20} />
        {lang === 'ar' ? 'كلمة جديدة' : 'NEW WORD'}
      </span>
      <QuestionCard prompt={lang === 'ar' ? 'اختر الصورة الصحيحة' : 'Select the correct image'} />

      <button className="sentence-display vocab-word-chip" onClick={() => speakJapanese(speakableVocab(item))}>
        <IconCircle name="sound" size={32} className="vocab-audio-icon" />
        <VocabTerm item={item} />
      </button>

      <div className="meaning-options vocab-option-grid">
        {ex.optionItems.map((opt, i) => (
          <ImageOption
            key={i}
            emoji={getVocabImage(opt)}
            label={opt.meaning}
            disabled={Boolean(picked)}
            state={getOptionState(picked, opt, item)}
            onClick={() => pick(opt)}
          />
        ))}
      </div>
    </ExercisePane>
  )
}

// ── Exercise: pick the correct Japanese translation of the meaning ──────────
function VocabTranslateExercise({ ex, lang, onAnswer, mascotCharacter }) {
  const item = ex.item
  const options = ex.optionItems.map((opt, i) => ({
    value: String(i),
    label: opt.kanji || opt.jp,
    reading: opt.hiragana || opt.reading,
  }))
  const answer = String(ex.optionItems.indexOf(item))

  return (
    <TranslationChoiceQuiz
      prompt={item.meaning}
      speakText={speakableVocab(item)}
      options={options}
      answer={answer}
      lang={lang}
      mascotCharacter={mascotCharacter}
      onAnswer={onAnswer}
    />
  )
}

// ── Exercise: repeat the word out loud ───────────────────────────────────────
function VocabSpeakExercise({ ex, lang, onAnswer, mascotCharacter }) {
  const item = ex.item
  return (
    <SpeakingPracticeQuiz
      sentence={item.kanji || item.jp}
      reading={item.hiragana || item.reading}
      speakText={speakableVocab(item)}
      lang={lang}
      mascotCharacter={mascotCharacter}
      onAnswer={(passed) => onAnswer(passed)}
      onSkip={() => onAnswer(true)}
    />
  )
}

// ── Exercise: spell the word by tapping kana in order ────────────────────────
function VocabBuildExercise({ ex, lang, onAnswer, mascotCharacter }) {
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
    if (selected.length === 0) return
    const built = selected.map((x) => x.c).join('')
    const correct = answersMatch(built, target.join(''))
    setResult(correct ? 'correct' : 'wrong')
    if (correct) playCorrect()
    else playWrong()
    setTimeout(() => onAnswer(correct), 1100)
  }

  const mascotMode = result ? (result === 'correct' ? 'cheer' : 'skeptical') : 'thinking'

  return (
    <ExercisePane>
      <RuaaMascot mode={mascotMode} character={mascotCharacter} />
      <QuestionCard prompt={lang === 'ar' ? 'رتّب الحروف لتهجئة الكلمة:' : 'Tap the kana to spell the word:'} />
      <SentenceDisplay onClick={() => speakJapanese(speakableVocab(item))}>
        <span>{item.meaning}{item.kanji ? ` · ${item.kanji}` : ''}</span>
      </SentenceDisplay>

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

      {selected.length > 0 && !result && (
        <ActionButton onClick={check}>{lang === 'ar' ? 'تحقق' : 'Check'}</ActionButton>
      )}

      {result === 'wrong' && (
        <p className="iex-result wrong">{lang === 'ar' ? `الجواب: ${target.join('')}` : `Answer: ${target.join('')}`}</p>
      )}
    </ExercisePane>
  )
}

// ── Exercise: match words to their meanings ──────────────────────────────────
function VocabMatchExercise({ ex, lang, onAnswer }) {
  const heartsApi = useHearts()
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
      heartsApi?.consumeHeart()
      setWrongPair(it.pairId)
      setTimeout(() => setWrongPair(null), 500)
      setSelectedLeft(null)
    }
  }

  return (
    <ExercisePane>
      <QuestionCard prompt={lang === 'ar' ? 'وصّل كل كلمة بمعناها:' : 'Match each word to its meaning:'} />
      <div className="vocab-match-grid">
        <div className="vocab-match-col">
          {leftItems.map((it) => (
            <AnswerOption
              key={it.pairId}
              variant="plain"
              dir="ltr"
              disabled={matched.includes(it.pairId)}
              className={`vocab-match-card ${matched.includes(it.pairId) ? 'matched' : ''} ${selectedLeft?.pairId === it.pairId ? 'selected' : ''}`}
              onClick={() => pickLeft(it)}
            >
              <VocabTerm item={it} />
            </AnswerOption>
          ))}
        </div>
        <div className="vocab-match-col">
          {rightItems.map((it) => (
            <AnswerOption
              key={it.pairId}
              variant="plain"
              disabled={matched.includes(it.pairId)}
              className={`vocab-match-card ${matched.includes(it.pairId) ? 'matched' : ''} ${wrongPair === it.pairId ? 'wrong' : ''}`}
              onClick={() => pickRight(it)}
            >
              {it.meaning}
            </AnswerOption>
          ))}
        </div>
      </div>
      <p className="iex-counter">{matched.length}/{total}</p>
    </ExercisePane>
  )
}

// ── Main wrapper ───────────────────────────────────────────────────────────
export default function VocabExercises({ vocab, lang, onClose, lessonId }) {
  const [exercises] = useState(() => generateVocabExercises(vocab))
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
    trackVocabAnswer(exercises[idx]?.item, correct, lessonId)
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
          ? (perfect ? 'ممتاز! أتقنت مفردات هذا الدرس.' : good ? 'جيد! راجع الكلمات مرة ثانية.' : 'حاول مرة ثانية — راجع المفردات.')
          : (perfect ? 'Perfect! You mastered this vocab set.' : good ? 'Good! Review the words once more.' : 'Keep practicing the vocabulary!')
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

      {ex.type === 'meaning' && <VocabMeaningExercise key={idx} ex={ex} lang={lang} mascotCharacter={mascotCharacter} onAnswer={handleAnswer} />}
      {ex.type === 'audio' && <VocabAudioExercise key={idx} ex={ex} lang={lang} mascotCharacter={mascotCharacter} onAnswer={handleAnswer} />}
      {ex.type === 'reverse' && <VocabReverseExercise key={idx} ex={ex} lang={lang} mascotCharacter={mascotCharacter} onAnswer={handleAnswer} />}
      {ex.type === 'build' && <VocabBuildExercise key={idx} ex={ex} lang={lang} mascotCharacter={mascotCharacter} onAnswer={handleAnswer} />}
      {ex.type === 'match' && <VocabMatchExercise key={idx} ex={ex} lang={lang} onAnswer={handleAnswer} />}
      {ex.type === 'image' && <VocabImageExercise key={idx} ex={ex} lang={lang} mascotCharacter={mascotCharacter} onAnswer={handleAnswer} />}
      {ex.type === 'translate' && <VocabTranslateExercise key={idx} ex={ex} lang={lang} mascotCharacter={mascotCharacter} onAnswer={handleAnswer} />}
      {ex.type === 'speak' && <VocabSpeakExercise key={idx} ex={ex} lang={lang} mascotCharacter={mascotCharacter} onAnswer={handleAnswer} />}
    </ExerciseContainer>
  )
}

// ── "Practice all vocab" mode ────────────────────────────────────────────────

function vocabKey(lessonId, item) {
  return `lesson:${lessonId}:vocab:${item.reading || item.jp}`
}

// Pick one exercise for a single vocab item, drawing distractors from the
// full lesson vocab pool. Always falls back to a `speak` exercise.
function exerciseForItem(item, allVocab) {
  const meanings = [...new Set(allVocab.map((v) => v.meaning).filter(Boolean))]
  const distractorPool = allVocab.filter((v) => v !== item)
  const candidates = []

  const meaningDistractors = shuffle(meanings.filter((m) => m !== item.meaning)).slice(0, 3)
  if (meaningDistractors.length >= 1) {
    candidates.push({ type: 'meaning', item, options: shuffle([item.meaning, ...meaningDistractors]), vocabItem: item })
  }

  if (distractorPool.length >= 3) {
    candidates.push({ type: 'audio', item, optionItems: shuffle([item, ...shuffle(distractorPool).slice(0, 3)]), vocabItem: item })
    candidates.push({ type: 'reverse', item, optionItems: shuffle([item, ...shuffle(distractorPool).slice(0, 3)]), vocabItem: item })
  }

  if (distractorPool.length >= 2) {
    candidates.push({ type: 'translate', item, optionItems: shuffle([item, ...shuffle(distractorPool).slice(0, 2)]), vocabItem: item })
  }

  const kana = item.hiragana || item.jp || ''
  if (kana.length >= 2 && kana.length <= 5) {
    candidates.push({ type: 'build', item, vocabItem: item })
  }

  candidates.push({ type: 'speak', item, vocabItem: item })

  return shuffle(candidates)[0]
}

// Build a "build the sentence" exercise from a random lesson example,
// using SentenceBuilderQuiz with the example's characters as the word bank.
function buildSentenceExercise(lesson) {
  const examples = lesson?.examples || []
  if (!examples.length) return null
  const example = shuffle(examples)[0]
  const chars = (example.jp || '').replace(/\s+/g, '').split('')
  if (chars.length < 2 || chars.length > 10) return null
  const distractors = shuffle(HIRAGANA_POOL.filter((c) => !chars.includes(c))).slice(0, Math.max(2, Math.min(4, chars.length)))
  return {
    type: 'sentenceBuilder',
    prompt: example.ar,
    sentence: example.jp,
    reading: example.romaji,
    bank: shuffle([...chars, ...distractors]),
    answer: chars,
  }
}

function generatePracticeRound(items, allVocab, lesson) {
  const exs = items.map((item) => exerciseForItem(item, allVocab))
  const sentenceEx = buildSentenceExercise(lesson)
  if (sentenceEx && Math.random() < 0.6) exs.push(sentenceEx)
  return shuffle(exs)
}

// ── "Practice all vocab" — drills randomly-composed rounds of 5 words
// until every word's progress counter reaches `masteryTarget`. ───────────────
export function VocabPracticeAll({ vocab, lessonId, lesson, progress, setProgress, lang, onClose, masteryTarget = 5 }) {
  const isAr = lang === 'ar'
  const allVocab = vocab || []
  const heartsApi = useHearts()

  const [round, setRound] = useState(() => {
    const remaining = allVocab.filter((v) => (progress[vocabKey(lessonId, v)] || 0) < masteryTarget)
    return shuffle(remaining).slice(0, 5)
  })
  const [exercises, setExercises] = useState(() => generatePracticeRound(round, allVocab, lesson))
  const [idx, setIdx] = useState(0)
  const [finished, setFinished] = useState(round.length === 0)

  if (heartsApi && heartsApi.hearts <= 0) {
    return <OutOfHeartsCard lang={lang} onClose={onClose} />
  }

  const handleAnswer = (correct) => {
    if (correct) playCorrect()
    else {
      playWrong()
      heartsApi?.consumeHeart()
    }
    const ex = exercises[idx]
    trackVocabAnswer(ex.vocabItem, correct, lessonId)
    if (correct && ex.vocabItem) {
      const key = vocabKey(lessonId, ex.vocabItem)
      setProgress((p) => ({ ...p, [key]: Math.min((p[key] || 0) + 1, masteryTarget) }))
    }
    setIdx((i) => i + 1)
  }

  useEffect(() => {
    if (idx < exercises.length) return
    const remaining = allVocab.filter((v) => (progress[vocabKey(lessonId, v)] || 0) < masteryTarget)
    if (remaining.length === 0) {
      setFinished(true)
      return
    }
    const nextRound = shuffle(remaining).slice(0, 5)
    setRound(nextRound)
    setExercises(generatePracticeRound(nextRound, allVocab, lesson))
    setIdx(0)
  }, [idx, exercises.length, progress, allVocab, lessonId, lesson, masteryTarget])

  if (finished) {
    return (
      <ResultCard
        icon="star"
        score={masteryTarget}
        total={masteryTarget}
        message={isAr ? 'رائع! أتقنت جميع مفردات هذا الدرس.' : 'Awesome! You mastered all the vocabulary in this lesson.'}
      >
        <ActionButton onClick={onClose}>{isAr ? 'إغلاق' : 'Close'}</ActionButton>
      </ResultCard>
    )
  }

  if (idx >= exercises.length) return null

  const ex = exercises[idx]
  const mascotCharacter = idx % 2 === 0 ? 'joni' : 'ruaa'

  return (
    <ExerciseContainer>
      <ProgressHeader
        onClose={onClose}
        progress={exercises.length ? (idx / exercises.length) * 100 : 0}
        counter={`${idx + 1}/${exercises.length}`}
      />

      {ex.type === 'meaning' && <VocabMeaningExercise key={idx} ex={ex} lang={lang} mascotCharacter={mascotCharacter} onAnswer={handleAnswer} />}
      {ex.type === 'audio' && <VocabAudioExercise key={idx} ex={ex} lang={lang} mascotCharacter={mascotCharacter} onAnswer={handleAnswer} />}
      {ex.type === 'reverse' && <VocabReverseExercise key={idx} ex={ex} lang={lang} mascotCharacter={mascotCharacter} onAnswer={handleAnswer} />}
      {ex.type === 'build' && <VocabBuildExercise key={idx} ex={ex} lang={lang} mascotCharacter={mascotCharacter} onAnswer={handleAnswer} />}
      {ex.type === 'translate' && <VocabTranslateExercise key={idx} ex={ex} lang={lang} mascotCharacter={mascotCharacter} onAnswer={handleAnswer} />}
      {ex.type === 'speak' && <VocabSpeakExercise key={idx} ex={ex} lang={lang} mascotCharacter={mascotCharacter} onAnswer={handleAnswer} />}
      {ex.type === 'sentenceBuilder' && (
        <SentenceBuilderQuiz
          prompt={ex.prompt}
          sentence={ex.sentence}
          reading={ex.reading}
          bank={ex.bank}
          answer={ex.answer}
          lang={lang}
          mascotCharacter={mascotCharacter}
          onAnswer={handleAnswer}
        />
      )}
    </ExerciseContainer>
  )
}
