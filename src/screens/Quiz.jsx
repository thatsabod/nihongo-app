import { useEffect } from 'react'
import { playCorrect, playWrong, speakJapanese } from '../sounds.js'
import DrawingPad from '../components/DrawingPad.jsx'

const text = {
  ar: {
    question: 'السؤال',
    of: 'من',
    prompt: 'ما قراءة هذا الرمز؟',
    reversePrompt: 'اختر شكل الحرف الصحيح',
    drawPrompt: 'ارسم هذا الحرف بيدك',
    hear: 'اسمع النطق',
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
    hear: 'Hear pronunciation',
    correct: 'Correct',
    wrong: 'Correct answer',
    next: 'Moving on...',
  },
}

export default function Quiz({ questions, qIndex, selected, score, xp, hearts, lang, onAnswer, onBack }) {
  const q = questions[qIndex]
  const t = text[lang] || text.en

  useEffect(() => {
    if (q) speakJapanese(q.kana, 0.9)
  }, [q])

  if (!q) return null

  const isDraw = q.type === 'draw'
  const isReverse = q.type === 'reverse'
  const isCorrect = selected === q.answer

  const answer = (opt) => {
    if (selected) return
    if (opt === q.answer) playCorrect()
    else playWrong()
    onAnswer(opt)
  }

  return (
    <main className="quiz-screen">
      <header className="quiz-head">
        <button className="icon-btn" onClick={onBack}>×</button>
        <div className="heart-row">{Array.from({ length: 5 }, (_, i) => <span key={i} className={i < hearts ? '' : 'empty'}>♥</span>)}</div>
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
            <DrawingPad char={q.kana} lang={lang} onDone={() => answer(q.answer)} />
          </>
        ) : (
          <>
            <button className={`kana-focus ${selected ? isCorrect ? 'correct' : 'wrong' : ''}`} onClick={() => speakJapanese(q.kana, 0.8)}>
              <span>{isReverse ? q.answerLabel : q.kana}</span>
              <small>{t.hear}</small>
              {selected && <strong>{isCorrect ? t.correct : `${t.wrong}: ${q.answer}`}</strong>}
            </button>
            <h1>{isReverse ? t.reversePrompt : t.prompt}</h1>
            <div className="answer-grid">
              {q.options.map((opt) => {
                let state = ''
                if (selected && opt === q.answer) state = 'correct'
                if (selected && opt === selected && opt !== q.answer) state = 'wrong'
                return (
                  <button key={opt} className={state} disabled={Boolean(selected)} onClick={() => answer(opt)}>
                    {opt}
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
