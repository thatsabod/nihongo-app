import { useEffect, useState } from 'react'
import { playCorrect, playWrong, speakJapanese } from '../sounds.js'
import DrawingPad from '../components/DrawingPad.jsx'

const MAX_HEARTS = 10

function hasKanji(value = '') {
  return /[\u3400-\u9fff]/.test(value)
}

function RubyText({ text, reading, className = '' }) {
  if (!reading || !hasKanji(text)) return <span className={className}>{text}</span>
  return (
    <ruby className={className}>
      {text}
      <rt>{reading}</rt>
    </ruby>
  )
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

  const answer = (opt) => {
    if (selected) return
    if (opt === q.answer) playCorrect()
    else playWrong()
    onAnswer(opt)
  }

  const chooseMatch = (side, pair) => {
    if (selected || matchedIds.includes(pair.id)) return
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

      <section className="quiz-body">
        <p className="eyebrow">{t.question} {qIndex + 1} {t.of} {questions.length} · {score} ✓</p>
        {isDraw ? (
          <>
            <h1>{t.drawPrompt}</h1>
            <DrawingPad char={q.kana} lang={lang} autoGrade onDone={({ correct }) => answer(correct ? q.answer : '__draw_wrong__')} />
          </>
        ) : isMatching ? (
          <>
            <h1>{prompt}</h1>
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
            <button className={`kana-focus ${selected ? isCorrect ? 'correct' : 'wrong' : ''}`} onClick={() => q.soundEnabled !== false && speakJapanese(q.speakText || q.kana, { rate: 0.54, voiceIndex })}>
              {isSentence ? <span>{q.sentence}</span> : isAudioWord ? <span>聞く</span> : isReverse ? <span>{q.answerLabel}</span> : <RubyText text={q.kana} reading={q.kanaReading} className="quiz-ruby-main" />}
              <small>{t.hear}</small>
              {selected && <strong>{isCorrect ? t.correct : `${t.wrong}: ${q.answer}`}</strong>}
            </button>
            <h1>{prompt}</h1>
            <div className="answer-grid">
              {q.options.map((opt) => {
                let state = ''
                if (selected && opt === q.answer) state = 'correct'
                if (selected && opt === selected && opt !== q.answer) state = 'wrong'
                return (
                  <button key={opt} className={state} disabled={Boolean(selected)} onClick={() => answer(opt)}>
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
