import { useEffect } from 'react'
import { playCorrect, playWrong, speakJapanese } from '../sounds.js'

export default function Quiz({ questions, qIndex, selected, score, xp, onAnswer, onBack }) {
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

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a2e', fontFamily: 'sans-serif', color: 'white', padding: '24px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '14px', cursor: 'pointer', padding: 0 }}>← Back</button>
        <span style={{ color: '#aaa', fontSize: '13px' }}>{qIndex + 1} / {questions.length}</span>
        <span style={{ color: '#e84393', fontSize: '13px' }}>✓ {score} | ⚡{xp}</span>
      </div>

      {/* Progress bar */}
      <div style={{ background: '#0f3460', borderRadius: '8px', height: '6px', marginBottom: '24px' }}>
        <div style={{ background: 'linear-gradient(90deg,#e84393,#a855f7)', width: `${((qIndex + 1) / questions.length) * 100}%`, height: '100%', borderRadius: '8px', transition: 'width 0.4s' }} />
      </div>

      <p style={{ color: '#aaa', fontSize: '13px', textAlign: 'center', marginBottom: '8px' }}>What is the reading of this character?</p>

      {/* Kana display */}
      <div style={{ background: '#16213e', borderRadius: '16px', padding: '40px', textAlign: 'center', marginBottom: '24px', cursor: 'pointer' }}
        onClick={() => speakJapanese(q.kana)}>
        <div style={{ fontSize: '90px', lineHeight: 1 }}>{q.kana}</div>
        <div style={{ fontSize: '12px', color: '#555', marginTop: '8px' }}>🔊 tap to hear</div>
      </div>

      {/* Options */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        {q.options.map((opt) => {
          let bg = '#16213e'
          let border = '0.5px solid #333'
          if (selected === opt) { bg = opt === q.answer ? '#0f6e56' : '#7a1f1f'; border = 'none' }
          if (selected && opt === q.answer) { bg = '#0f6e56'; border = 'none' }
          return (
            <button key={opt} onClick={() => handleAnswer(opt)}
              style={{ padding: '16px', background: bg, border, borderRadius: '12px', color: 'white', fontSize: '18px', cursor: selected ? 'default' : 'pointer', transition: 'background 0.2s' }}>
              {opt}
            </button>
          )
        })}
      </div>

      {/* Feedback */}
      {selected && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '18px', fontWeight: '500', color: selected === q.answer ? '#1d9e75' : '#e24b4a', marginBottom: '4px' }}>
            {selected === q.answer ? '✓ Correct! 🌟' : `✗ Answer: ${q.answer}`}
          </p>
          {selected === q.answer && <p style={{ color: '#e84393', fontSize: '13px' }}>+10 XP ⚡</p>}
          <p style={{ color: '#555', fontSize: '12px', marginTop: '4px' }}>Moving on automatically...</p>
        </div>
      )}
    </div>
  )
}