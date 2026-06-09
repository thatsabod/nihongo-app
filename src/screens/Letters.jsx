import { useState } from 'react'
import { hiragana } from '../data.js'
import { speakJapanese } from '../sounds.js'

export default function Letters({ progress, onBack, lang }) {
  const [slowMode, setSlowMode] = useState({})

  const t = {
    title:    lang === 'ar' ? 'جدول الهيراغانا' : 'Hiragana Chart',
    subtitle: lang === 'ar' ? 'اضغط على الحرف لتسمعه 🔊' : 'Tap a character to hear it 🔊',
    mastered: lang === 'ar' ? '✓ محفوظ' : '✓ mastered',
    back:     lang === 'ar' ? '→ رجوع' : '← Back',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a2e', fontFamily: 'sans-serif', color: 'white', padding: '24px 16px' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '14px', cursor: 'pointer', padding: 0, marginBottom: '20px' }}>
        {t.back}
      </button>
      <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>{t.title}</h2>
      <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '20px' }}>{t.subtitle}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
        {hiragana.map((item, i) => {
          const practiced = progress[item.kana] || 0
          const percent = Math.min((practiced / 10) * 100, 100)
          const done = practiced >= 10
          const isSlow = slowMode[item.kana]

          return (
            <div key={i} style={{
              background: done ? '#0f3460' : '#16213e',
              border: done ? '1px solid #e84393' : '0.5px solid #333',
              borderRadius: '12px',
              padding: '12px 8px',
              textAlign: 'center',
              transition: 'all 0.2s'
            }}>
              {/* Kana — tap to speak normal speed */}
              <div
                onClick={() => speakJapanese(item.kana, { rate: 0.58 })}
                style={{ fontSize: '28px', lineHeight: 1, marginBottom: '4px', cursor: 'pointer' }}>
                {item.kana}
              </div>

              {/* Reading */}
              <div style={{ fontSize: '11px', color: '#e84393', marginBottom: '8px' }}>
                {item.answer}
              </div>

              {/* Icons row */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                {/* Normal speed */}
                <span
                  onClick={() => { speakJapanese(item.kana, { rate: 0.58 }); setSlowMode(s => ({ ...s, [item.kana]: false })) }}
                  title="Normal speed"
                  style={{
                    fontSize: '16px', cursor: 'pointer', opacity: isSlow ? 0.35 : 1,
                    transition: 'opacity 0.2s', userSelect: 'none'
                  }}>
                  🔊
                </span>

                {/* Slow speed turtle */}
                <span
                  onClick={() => { speakJapanese(item.kana, { rate: 0.48 }); setSlowMode(s => ({ ...s, [item.kana]: true })) }}
                  title="Slow speed"
                  style={{
                    fontSize: '16px', cursor: 'pointer', opacity: isSlow ? 1 : 0.35,
                    transition: 'opacity 0.2s', userSelect: 'none'
                  }}>
                  🐢
                </span>
              </div>

              {/* Progress bar */}
              <div style={{ background: '#0a0a1a', borderRadius: '4px', height: '4px', overflow: 'hidden' }}>
                <div style={{
                  background: done ? '#e84393' : 'linear-gradient(90deg,#e84393,#a855f7)',
                  width: `${percent}%`,
                  height: '100%',
                  borderRadius: '4px',
                  transition: 'width 0.4s'
                }} />
              </div>

              {/* Count */}
              <div style={{ fontSize: '10px', color: '#555', marginTop: '4px' }}>
                {done ? t.mastered : `${practiced}/10`}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
