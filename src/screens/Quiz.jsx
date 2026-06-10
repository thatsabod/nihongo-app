import { useEffect, useState } from 'react'
import { playCorrect, playWrong, speakJapanese } from '../sounds.js'
import DrawingPad from '../components/DrawingPad.jsx'
import RuaaMascot from '../components/RuaaMascot.jsx'

const MAX_HEARTS = 10

function hasKanji(value = '') {
  return /[\u3400-\u9fff]/.test(value)
}

function getRubyReadings(text, reading) {
  const parts = String(text || '').split(/([\u3400-\u9fff]+)/g).filter(Boolean)
  const kanjiParts = parts.filter((part) => hasKanji(part))
  const rawReading = String(reading || '').trim()

  if (/[\u3040-\u30ff]/.test(rawReading)) {
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
  const parts = String(text || '').split(/([\u3400-\u9fff]+)/g).filter(Boolean)
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
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(String(value || ''))
}

function speakQuizText(value, options = {}) {
  if (!hasJapaneseText(value)) return
  speakJapanese(value, options)
}

const text = {
  ar: {
    question: 'السؤال',
    of: 'من',
    prompt: 'ما قراءة هذا الرمز؟',
    reversePrompt: 'اختر شكل الحرف الصحيح',
    drawPrompt: 'ارسم هذا الحرف بيدك',
    meaningPrompt: 'اختر معنى الكلمة الصحيح',
    audioWordPrompt: 'استمع واختر الكلمة الصحيحة',
    matchingPrompt: 'طابق الكلمات مع معانيها',
    sentencePrompt: 'أكمل الجملة بالكلمة المناسبة',
    hear: 'اسمع النطق',
    leftColumn: 'الكلمات',
    rightColumn: 'المعاني',
    correct: 'صحيح',
    wrong: 'الصحيح',
    next: 'ينتقل تلقائيا...',
  },
  en: {
    question: 'Question',
    of: 'of',
    prompt: 'What is the reading?',
    reversePrompt: 'Choose the correct character',
    drawPrompt: 'Draw this character by hand',
    meaningPrompt: 'Choose the correct meaning',
    audioWordPrompt: 'Listen and choose the correct word',
    matchingPrompt: 'Match each word with its meaning',
    sentencePrompt: 'Complete the sentence',
    hear: 'Hear pronunciation',
    leftColumn: 'Words',
    rightColumn: 'Meanings',
    correct: 'Correct',
    wrong: 'Correct answer',
    next: 'Moving on...',
  },
}

function ruaaMode({ q, selected, isCorrect }) {
  if (selected) return isCorrect ? 'cheer' : 'skeptical'
  if (q?.type === 'audio_word') return 'wave'
  if (q?.type === 'matching') return 'calm'
  if (q?.type === 'sentence') return 'thinking'
  if (q?.type === 'draw') return 'surprise'
  return 'thinking'
}


export default function Quiz({ questions, qIndex, selected, score, xp, hearts, lang, onAnswer, onBack }) {
  const q = questions[qIndex]
  const t = text[lang] || text.en
  const voiceIndex = Math.floor(qIndex / 3)
  const [matchingState, setMatchingState] = useState({ qIndex: -1, selected: null, matched: [] })
  const matchingSelected = matchingState.qIndex === qIndex ? matchingState.selected : null
  const matchedIds = matchingState.qIndex === qIndex ? matchingState.matched : []

  useEffect(() => {
    if (q?.soundEnabled !== false && q?.speakText) speakJapanese(q.speakText, { rate: 0.56, voiceIndex })
    else if (q?.soundEnabled !== false && q?.kana && q?.type !== 'matching') speakJapanese(q.kana, { rate: 0.56, voiceIndex })
  }, [q, voiceIndex])

  if (!q) return null

  const isDraw = q.type === 'draw'
  const isReverse = q.type === 'reverse'
  const isMatching = q.type === 'matching'
  const isAudioWord = q.type === 'audio_word'
  const isSentence = q.type === 'sentence'
  const isMeaning = q.type === 'vocab_meaning'
  const isCorrect = selected === q.answer
  const showRuaa = isAudioWord || (isSentence && String(q.sentence || '').length <= 30)
  const mascotMode = ruaaMode({ q, selected, isCorrect })
  const quizClass = [
    'quiz-body',
    `quiz-type-${q.type}`,
    showRuaa ? 'has-ruaa' : 'no-ruaa',
  ].join(' ')

  const answer = (opt) => {
    if (selected) return
    if (opt === q.answer) playCorrect()
    else playWrong()
    onAnswer(opt)
  }

  const speakOption = (opt) => {
    const textToSpeak = q.optionSpeakTexts?.[opt] || q.optionReadings?.[opt] || opt
    speakQuizText(textToSpeak, { rate: 0.54, voiceIndex })
  }

  const chooseMatch = (side, pair) => {
    if (selected || matchedIds.includes(pair.id)) return
    speakQuizText(side === 'left' ? (pair.leftSpeak || pair.leftReading || pair.left) : (pair.rightSpeak || pair.right), { rate: 0.54, voiceIndex })
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

  const prompt = isReverse
    ? t.reversePrompt
    : isMatching
      ? t.matchingPrompt
      : isAudioWord
        ? t.audioWordPrompt
        : isSentence
          ? t.sentencePrompt
          : isMeaning
            ? t.meaningPrompt
            : t.prompt

  return (
    <main className="quiz-screen">
      <header className="quiz-head">
        <button className="icon-btn" onClick={onBack}>×</button>
        <div className="quiz-battery" style={{ '--battery-fill': `${Math.max(0, (hearts / MAX_HEARTS) * 100)}%` }}>
          <span />
          <b>{hearts}</b>
        </div>
        <strong>{xp} XP</strong>
      </header>

      <div className="progress-line">
        <span style={{ width: `${((qIndex + 1) / questions.length) * 100}%` }} />
      </div>

      <section className={quizClass}>
        <p className="eyebrow">{t.question} {qIndex + 1} {t.of} {questions.length} · {score} ✓</p>
        {isDraw ? (
          <>
            <div className={`quiz-character-scene ${showRuaa ? '' : 'no-mascot'}`}>
              <RuaaMascot mode={mascotMode} visible={showRuaa} />
              <div className="ruaa-speech">
                <h1>{t.drawPrompt}</h1>
              </div>
            </div>
            <DrawingPad char={q.kana} lang={lang} autoGrade onDone={({ correct }) => answer(correct ? q.answer : '__draw_wrong__')} />
          </>
        ) : isMatching ? (
          <>
            <div className={`quiz-character-scene ${showRuaa ? '' : 'no-mascot'}`}>
              <RuaaMascot mode={mascotMode} visible={showRuaa} />
              <div className="ruaa-speech">
                <h1>{prompt}</h1>
              </div>
            </div>
            <div className="matching-board">
              <div>
                <strong>{t.leftColumn}</strong>
                {q.pairs.map((pair) => (
                  <button
                    key={pair.id}
                    className={`${matchingSelected?.side === 'left' && matchingSelected.id === pair.id ? 'active' : ''} ${matchedIds.includes(pair.id) ? 'matched' : ''}`}
                    disabled={matchedIds.includes(pair.id)}
                    onClick={() => chooseMatch('left', pair)}
                  >
                    <RubyText text={pair.left} reading={pair.leftReading} />
                  </button>
                ))}
              </div>
              <div>
                <strong>{t.rightColumn}</strong>
                {q.rightOptions.map((pair) => (
                  <button
                    key={pair.id}
                    className={`${matchingSelected?.side === 'right' && matchingSelected.id === pair.id ? 'active' : ''} ${matchedIds.includes(pair.id) ? 'matched' : ''}`}
                    disabled={matchedIds.includes(pair.id)}
                    onClick={() => chooseMatch('right', pair)}
                  >
                    {pair.right}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <h1>{prompt}</h1>
            <div className={`quiz-character-scene ${showRuaa ? '' : 'no-mascot'}`}>
              <RuaaMascot mode={mascotMode} visible={showRuaa} />
              <button className={`kana-focus ruaa-speech ${selected ? isCorrect ? 'correct' : 'wrong' : ''}`} onClick={() => q.soundEnabled !== false && speakQuizText(q.speakText || q.kana, { rate: 0.54, voiceIndex })}>
                {isSentence ? <span className="sentence-focus-text" style={{ fontSize: `${Math.max(28, Math.min(74, 620 / Math.max(q.sentence.length, 8)))}px` }}>{q.sentence}</span> : isAudioWord ? <span className="listen-focus">♪</span> : isReverse ? <span>{q.answerLabel}</span> : <RubyText text={q.kana} reading={q.kanaReading} className="quiz-ruby-main" />}
                <small>{t.hear}</small>
                {selected && <strong>{isCorrect ? t.correct : `${t.wrong}: ${q.answer}`}</strong>}
              </button>
            </div>
            <div className="answer-grid">
              {q.options.map((opt) => {
                let state = ''
                if (selected && opt === q.answer) state = 'correct'
                if (selected && opt === selected && opt !== q.answer) state = 'wrong'
                return (
                  <button
                    key={opt}
                    dir="ltr"
                    className={state}
                    disabled={Boolean(selected)}
                    onClick={() => {
                      speakOption(opt)
                      answer(opt)
                    }}
                  >
                    <RubyText text={opt} reading={q.optionReadings?.[opt]} />
                  </button>
                )
              })}
            </div>
          </>
        )}
        {selected && <p className="next-note">{t.next}</p>}
      </section>
    </main>
  )
}
