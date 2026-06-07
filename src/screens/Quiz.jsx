import { useEffect } from 'react'
import { playCorrect, playWrong, speakJapanese } from '../sounds.js'

export default function Quiz({ questions, qIndex, selected, score, xp, hearts, lang, onAnswer, onBack }) {
  const q = questions[qIndex]

  useEffect(() => {
    if (q) speakJapanese(q.kana)
  }, [qIndex])

  if (!q) return null

  const handleAnswer = (opt) => {
    if (selected) return
    if (opt === q.answer) playCorrect()
    else playWrong()
    onAnswer(opt)
  }

  const isCorrect = selected === q.answer
  const isWrong = selected && !isCorrect

  return (
    <div style={{ minHeight: '100vh', background: '#0f0e17', fontFamily: 'sans-serif', color: 'white', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>

      {/* Header */}
      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#12121f', borderBottom: '0.5px solid #1e1e30' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer', padding: 0 }}>
          ✕
        </button>
        {/* Hearts */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} style={{ fontSize: '16px', opacity: i < hearts ? 1 : 0.2 }}>❤️</span>
          ))}
        </div>
        <span style={{ color: '#ff6b9d', fontSize: '13px', fontWeight: '600' }}>⚡ {xp} XP</span>
      </div>

      {/* Progress bar */}
      <div style={{ height: '4px', background: '#1e1e30' }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg,#ff6b9d,#c44dff)',
          width: `${((qIndex + 1) / questions.length) * 100}%`,
          transition: 'width 0.4s'
        }} />
      </div>

      <div style={{ padding: '24px 20px' }}>
        {/* Question number */}
        <p style={{ color: '#555', fontSize: '12px', textAlign: 'center', marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {lang === 'ar' ? `السؤال ${qIndex + 1} من ${questions.length}` : `Question ${qIndex + 1} of ${questions.length}`}
        </p>

        {/* Kana card */}
        <div
          onClick={() => speakJapanese(q.kana)}
          style={{
            background: selected
              ? isCorrect ? 'linear-gradient(135deg,#0d2d1e,#0a1f15)' : 'linear-gradient(135deg,#2d0d0d,#1f0a0a)'
              : 'linear-gradient(135deg,#1a1a2e,#12121f)',
            border: selected
              ? isCorrect ? '1px solid #4ade8066' : '1px solid #ff4d4d66'
              : '0.5px solid #1e1e30',
            borderRadius: '24px',
            padding: '40px 24px',
            textAlign: 'center',
            marginBottom: '32px',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}>
          <div style={{ fontSize: '90px', lineHeight: 1, marginBottom: '12px' }}>{q.kana}</div>
          <div style={{ fontSize: '12px', color: '#555' }}>
            🔊 {lang === 'ar' ? 'اضغط للسماع' : 'tap to hear'}
          </div>
          {selected && (
            <div style={{ marginTop: '12px', fontSize: '20px', fontWeight: '700', color: isCorrect ? '#4ade80' : '#ff4d4d' }}>
              {isCorrect ? (lang === 'ar' ? '✓ ممتاز!' : '✓ Correct!') : `✗ ${q.answer}`}
            </div>
          )}
        </div>

        {/* Question label */}
        <p style={{ color: '#666', fontSize: '14px', textAlign: 'center', marginBottom: '16px' }}>
          {lang === 'ar' ? 'ما نطق هذا الحرف؟' : 'What is the reading?'}
        </p>

        {/* Options */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {q.options.map((opt) => {
            let bg = '#12121f'
            let border = '0.5px solid #1e1e30'
            let color = 'white'

            if (selected) {
              if (opt === q.answer) {
                bg = '#0d2d1e'
                border = '1px solid #4ade80'
                color = '#4ade80'
              } else if (opt === selected) {
                bg = '#2d0d0d'
                border = '1px solid #ff4d4d'
                color = '#ff4d4d'
              } else {
                color = '#333'
              }
            }

            return (
              <button key={opt} onClick={() => handleAnswer(opt)}
                style={{
                  padding: '18px', background: bg, border, borderRadius: '14px',
                  color, fontSize: '18px', fontWeight: '600',
                  cursor: selected ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                  direction: 'ltr'
                }}>
                {opt}
              </button>
            )
          })}
        </div>

        {/* Auto advance message */}
        {selected && (
          <p style={{ textAlign: 'center', color: '#444', fontSize: '12px', marginTop: '20px' }}>
            {lang === 'ar' ? 'ينتقل تلقائياً...' : 'Moving on...'}
          </p>
        )}
      </div>
    </div>
  )
}