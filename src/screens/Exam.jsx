import { useEffect, useState } from 'react'
import { playCorrect, playWrong, speakJapanese } from '../sounds.js'
import AppIcon from '../components/AppIcon.jsx'
import { AnswerOption, getOptionState, ActionButton } from '../components/exercise-ui/index.jsx'

function hasKanji(value = '') {
  return /[㐀-鿿]/.test(value)
}

function getRubyReadings(text, reading) {
  const parts = String(text || '').split(/([㐀-鿿]+)/g).filter(Boolean)
  const kanjiParts = parts.filter((part) => hasKanji(part))
  const rawReading = String(reading || '').trim()

  if (/[぀-ヿ]/.test(rawReading)) {
    let remaining = rawReading
    parts.forEach((part) => {
      if (hasKanji(part) || !part) return
      if (remaining.startsWith(part)) remaining = remaining.slice(part.length)
      else if (remaining.endsWith(part)) remaining = remaining.slice(0, -part.length)
    })
    if (kanjiParts.length === 1 && remaining) return [remaining]
  }

  const readingChunks = rawReading.split(/\s+/).filter(Boolean)
  if (readingChunks.length === kanjiParts.length) return readingChunks

  return kanjiParts.map(() => rawReading)
}

function RubyText({ text, reading, className = '' }) {
  const wrapperClass = ['jp-inline', className].filter(Boolean).join(' ')
  if (!reading || !hasKanji(text)) return <span className={wrapperClass}>{text}</span>
  const parts = String(text || '').split(/([㐀-鿿]+)/g).filter(Boolean)
  const readings = getRubyReadings(text, reading)
  return (
    <span className={wrapperClass}>
      {parts.map((part, index) => {
        if (!hasKanji(part)) return <span key={`${part}-${index}`}>{part}</span>
        const kanjiIndex = parts.slice(0, index).filter((previous) => hasKanji(previous)).length
        const rt = readings[kanjiIndex] || reading
        return (
          <ruby key={`${part}-${index}`}>
            {part}
            <rt>{rt}</rt>
          </ruby>
        )
      })}
    </span>
  )
}

function hasJapaneseText(value = '') {
  return /[぀-ヿ㐀-鿿]/.test(String(value || ''))
}

function speakQuizText(value, options = {}) {
  if (!hasJapaneseText(value)) return
  speakJapanese(value, options)
}

function shuffle(array) {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(Math.max(0, totalSeconds) / 60)
  const seconds = Math.max(0, totalSeconds) % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

const text = {
  ar: {
    section: 'القسم',
    of: 'من',
    question: 'السؤال',
    meaningPrompt: 'اختر معنى الكلمة الصحيح',
    audioWordPrompt: 'استمع واختر الكلمة الصحيحة',
    sentencePrompt: 'أكمل الجملة بالكلمة المناسبة',
    wordProductionPrompt: 'اختر الكلمة اليابانية المناسبة لهذا المعنى',
    audioSentencePrompt: 'استمع للجملة واختر معناها الصحيح',
    buildPrompt: 'رتّب الكلمات لتكوين الجملة',
    buildPlaceholder: 'اضغط الكلمات بالترتيب...',
    checkBtn: 'تحقق',
    matchingPrompt: 'طابق الكلمات مع معانيها',
    leftColumn: 'الكلمات',
    rightColumn: 'المعاني',
    hear: 'اسمع النطق',
    correct: 'صحيح',
    wrong: 'الصحيح',
    next: 'ينتقل تلقائيا...',
    startSection: 'ابدأ القسم',
    sectionIntroNote: 'سيبدأ العداد فور الضغط على ابدأ',
    minutes: 'دقيقة',
    questionsCount: 'سؤال',
  },
  en: {
    section: 'Section',
    of: 'of',
    question: 'Question',
    meaningPrompt: 'Choose the correct meaning',
    audioWordPrompt: 'Listen and choose the correct word',
    sentencePrompt: 'Complete the sentence',
    wordProductionPrompt: 'Choose the Japanese word for this meaning',
    audioSentencePrompt: 'Listen to the sentence and choose its meaning',
    buildPrompt: 'Arrange the words to form the sentence',
    buildPlaceholder: 'Tap words in order...',
    checkBtn: 'Check',
    matchingPrompt: 'Match each word with its meaning',
    leftColumn: 'Words',
    rightColumn: 'Meanings',
    hear: 'Hear pronunciation',
    correct: 'Correct',
    wrong: 'Correct answer',
    next: 'Moving on...',
    startSection: 'Start section',
    sectionIntroNote: 'The timer starts when you press start',
    minutes: 'min',
    questionsCount: 'questions',
  },
}

export default function Exam({ examState, lang, onAnswer, onSectionStart, onTimeUp, onBack }) {
  const t = text[lang] || text.en
  const { exam, sectionIndex, qIndex, selected, phase } = examState
  const section = exam.sections[sectionIndex]
  const q = section.questions[qIndex]
  const [matchingState, setMatchingState] = useState({ qIndex: -1, selected: null, matched: [] })
  const matchingSelected = matchingState.qIndex === qIndex ? matchingState.selected : null
  const matchedIds = matchingState.qIndex === qIndex ? matchingState.matched : []
  const [buildState, setBuildState] = useState({ qIndex: -1, selected: [], pool: [] })
  const buildSelected = buildState.qIndex === qIndex ? buildState.selected : []
  const buildPool = buildState.qIndex === qIndex ? buildState.pool : []
  const [timeLeft, setTimeLeft] = useState(section.minutes * 60)

  useEffect(() => {
    const resetTimer = setTimeout(() => setTimeLeft(section.minutes * 60), 0)
    return () => clearTimeout(resetTimer)
  }, [sectionIndex, section.minutes])

  useEffect(() => {
    if (phase !== 'active') return
    if (timeLeft <= 0) {
      onTimeUp()
      return
    }
    const timer = setTimeout(() => setTimeLeft((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [phase, timeLeft, onTimeUp])

  useEffect(() => {
    if (q?.soundEnabled !== false && q?.speakText) speakJapanese(q.speakText, { rate: 0.6496 })
    else if (q?.soundEnabled !== false && q?.kana && q?.type !== 'matching') speakJapanese(q.kana, { rate: 0.6496 })
  }, [q])

  useEffect(() => {
    if (q?.type === 'sentence_build' && buildState.qIndex !== qIndex) {
      const resetBuild = setTimeout(() => {
        setBuildState({ qIndex, selected: [], pool: shuffle(q.words.map((w, i) => ({ w, key: i }))) })
      }, 0)
      return () => clearTimeout(resetBuild)
    }
  }, [q, qIndex, buildState.qIndex])

  if (phase === 'section-intro') {
    return (
      <main className="quiz-screen exam-screen">
        <header className="quiz-head">
          <button className="icon-btn" onClick={onBack}><AppIcon name="wrong" label="Close" size={26} /></button>
          <strong>{t.section} {sectionIndex + 1} {t.of} {exam.sections.length}</strong>
        </header>
        <section className="quiz-body exam-section-intro">
          <h1>{section.label[lang] || section.label.en}</h1>
          <p className="eyebrow">{section.questions.length} {t.questionsCount} · {section.minutes} {t.minutes}</p>
          <p>{t.sectionIntroNote}</p>
          <ActionButton onClick={onSectionStart}>{t.startSection}</ActionButton>
        </section>
      </main>
    )
  }

  if (!q) return null

  const isMatching = q.type === 'matching'
  const isAudioWord = q.type === 'audio_word'
  const isSentence = q.type === 'sentence'
  const isMeaning = q.type === 'vocab_meaning'
  const isWordProduction = q.type === 'word_production'
  const isAudioSentence = q.type === 'audio_sentence'
  const isSentenceBuild = q.type === 'sentence_build'
  const isCorrect = selected === q.answer

  const answer = (opt) => {
    if (selected) return
    if (opt === q.answer) playCorrect()
    else playWrong()
    onAnswer(opt)
  }

  const speakOption = (opt) => {
    const textToSpeak = q.optionSpeakTexts?.[opt] || q.optionReadings?.[opt] || opt
    speakQuizText(textToSpeak, { rate: 0.6264 })
  }

  const addBuildWord = (item) => {
    if (selected) return
    setBuildState((prev) => ({ ...prev, selected: [...prev.selected, item], pool: prev.pool.filter((x) => x.key !== item.key) }))
  }

  const removeBuildWord = (item) => {
    if (selected) return
    setBuildState((prev) => ({ ...prev, pool: [...prev.pool, item], selected: prev.selected.filter((x) => x.key !== item.key) }))
  }

  const submitBuild = () => {
    if (selected) return
    const built = buildSelected.map((item) => item.w).join(' ')
    answer(built)
  }

  const chooseMatch = (side, pair) => {
    if (selected || matchedIds.includes(pair.id)) return
    speakQuizText(side === 'left' ? (pair.leftSpeak || pair.leftReading || pair.left) : (pair.rightSpeak || pair.right), { rate: 0.6264 })
    if (!matchingSelected || matchingSelected.side === side) {
      setMatchingState({ qIndex, selected: { side, id: pair.id }, matched: matchedIds })
      return
    }
    if (matchingSelected.id !== pair.id) {
      playWrong()
      setMatchingState({ qIndex, selected: null, matched: matchedIds })
      return
    }
    playCorrect()
    const next = [...matchedIds, pair.id]
    setMatchingState({ qIndex, selected: null, matched: next })
    if (next.length === q.pairs.length) onAnswer(q.answer)
  }

  const prompt = isMatching
    ? t.matchingPrompt
    : isSentenceBuild
      ? t.buildPrompt
      : isAudioSentence
        ? t.audioSentencePrompt
        : isAudioWord
          ? t.audioWordPrompt
          : isSentence
            ? t.sentencePrompt
            : isWordProduction
              ? t.wordProductionPrompt
              : isMeaning
                ? t.meaningPrompt
                : t.meaningPrompt

  return (
    <main className="quiz-screen exam-screen">
      <header className="quiz-head">
        <button className="icon-btn" onClick={onBack}><AppIcon name="wrong" label="Close" size={26} /></button>
        <strong>{t.section} {sectionIndex + 1} {t.of} {exam.sections.length}</strong>
        <span className="exam-timer" dir="ltr"><AppIcon name="timer" size={24} /> {formatTime(timeLeft)}</span>
      </header>

      <div className="progress-line">
        <span style={{ width: `${((qIndex + 1) / section.questions.length) * 100}%` }} />
      </div>

      <section className={`quiz-body quiz-type-${q.type} no-ruaa`}>
        <p className="eyebrow">{t.question} {qIndex + 1} {t.of} {section.questions.length}</p>
        {isMatching ? (
          <>
            <h1>{prompt}</h1>
            <div className="matching-board">
              <div>
                <strong>{t.leftColumn}</strong>
                {q.pairs.map((pair) => (
                  <AnswerOption
                    key={pair.id}
                    variant="plain"
                    state={`${matchingSelected?.side === 'left' && matchingSelected.id === pair.id ? 'active' : ''} ${matchedIds.includes(pair.id) ? 'matched' : ''}`.trim()}
                    disabled={matchedIds.includes(pair.id)}
                    onClick={() => chooseMatch('left', pair)}
                  >
                    <RubyText text={pair.left} reading={pair.leftReading} />
                  </AnswerOption>
                ))}
              </div>
              <div>
                <strong>{t.rightColumn}</strong>
                {q.rightOptions.map((pair) => (
                  <AnswerOption
                    key={pair.id}
                    variant="plain"
                    state={`${matchingSelected?.side === 'right' && matchingSelected.id === pair.id ? 'active' : ''} ${matchedIds.includes(pair.id) ? 'matched' : ''}`.trim()}
                    disabled={matchedIds.includes(pair.id)}
                    onClick={() => chooseMatch('right', pair)}
                  >
                    {pair.right}
                  </AnswerOption>
                ))}
              </div>
            </div>
          </>
        ) : isSentenceBuild ? (
          <>
            <h1>{prompt}</h1>
            <p className="ex-hint">{q.prompt}</p>
            <div className={`build-answer ${selected ? (isCorrect ? 'correct' : 'wrong') : ''}`}>
              {buildSelected.length === 0
                ? <span className="build-placeholder">{t.buildPlaceholder}</span>
                : buildSelected.map((item) => (
                  <button
                    key={item.key}
                    dir="ltr"
                    className={`word-chip ${q.particles?.includes(item.w) ? 'particle-chip' : ''}`}
                    disabled={Boolean(selected)}
                    onClick={() => removeBuildWord(item)}
                  >
                    {item.w}
                  </button>
                ))}
            </div>
            <div className="build-pool">
              {buildPool.map((item) => (
                <button
                  key={item.key}
                  dir="ltr"
                  className={`word-chip ${q.particles?.includes(item.w) ? 'particle-chip' : ''}`}
                  disabled={Boolean(selected)}
                  onClick={() => addBuildWord(item)}
                >
                  {item.w}
                </button>
              ))}
            </div>
            {selected && <strong>{isCorrect ? t.correct : `${t.wrong}: ${q.answer}`}</strong>}
            {!selected && buildSelected.length === q.words.length && (
              <ActionButton onClick={submitBuild}>{t.checkBtn}</ActionButton>
            )}
          </>
        ) : (
          <>
            <h1>{prompt}</h1>
            <button className={`kana-focus ${selected ? isCorrect ? 'correct' : 'wrong' : ''}`} onClick={() => q.soundEnabled !== false && speakQuizText(q.speakText || q.kana, { rate: 0.6264 })}>
              {isSentence
                ? <span className="sentence-focus-text" style={{ fontSize: `${Math.max(28, Math.min(74, 620 / Math.max(q.sentence.length, 8)))}px` }}>{q.sentence}</span>
                : (isAudioWord || isAudioSentence)
                  ? <span className="listen-focus"><AppIcon name="sound" size={82} /></span>
                  : <RubyText text={q.kana} reading={q.kanaReading} className="quiz-ruby-main" />}
              <small>{t.hear}</small>
              {selected && <strong>{isCorrect ? t.correct : `${t.wrong}: ${q.answer}`}</strong>}
            </button>
            <div className="answer-grid">
              {q.options.map((opt) => (
                <AnswerOption
                  key={opt}
                  variant="plain"
                  dir="ltr"
                  state={getOptionState(selected, opt, q.answer)}
                  disabled={Boolean(selected)}
                  onClick={() => {
                    speakOption(opt)
                    answer(opt)
                  }}
                >
                  <RubyText text={opt} reading={q.optionReadings?.[opt]} />
                </AnswerOption>
              ))}
            </div>
          </>
        )}
        {selected && <p className="next-note">{t.next}</p>}
      </section>
    </main>
  )
}
