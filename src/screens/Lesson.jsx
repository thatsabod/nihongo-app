import { useState } from 'react'

export default function Lesson({ lesson, lang, theme, onBack, onStartQuiz }) {
  const [section, setSection] = useState('vocab') // vocab | grammar | examples
  const [flipped, setFlipped] = useState({})

  const getColors = (theme) => theme === 'dark' ? {
    bg: '#0f0e17', card: '#12121f', card2: '#1a1a2e', border: '#1e1e30',
    text: '#ffffff', textSub: '#888888', textMuted: '#444444',
    primary: '#7C3AED', primaryGrad: 'linear-gradient(135deg,#7C3AED,#A78BFA)',
    pill: '#1e1e30', pillText: '#aaaaaa', green: '#4ade80', greenBg: '#0d2d1e',
  } : {
    bg: '#F8F7F4', card: '#FFFFFF', card2: '#F0EEF8', border: '#E5E2F0',
    text: '#1C1B2E', textSub: '#6B6880', textMuted: '#A09DB5',
    primary: '#7C3AED', primaryGrad: 'linear-gradient(135deg,#7C3AED,#A78BFA)',
    pill: '#F0EEF8', pillText: '#6B6880', green: '#16a34a', greenBg: '#f0fdf4',
  }

  const c = getColors(theme)

  const speak = (text) => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ja-JP'
    u.rate = 0.8
    window.speechSynthesis.speak(u)
  }

  const tabs = [
    { id: 'vocab',    label: lang === 'ar' ? 'المفردات' : 'Vocabulary', icon: '📚' },
    { id: 'grammar',  label: lang === 'ar' ? 'القواعد' : 'Grammar',    icon: '📖' },
    { id: 'examples', label: lang === 'ar' ? 'أمثلة' : 'Examples',     icon: '💬' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: c.bg, fontFamily: 'sans-serif', color: c.text, direction: lang === 'ar' ? 'rtl' : 'ltr' }}>

      {/* Header */}
      <div style={{ background: c.card, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: `0.5px solid ${c.border}` }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: c.textSub, fontSize: '20px', cursor: 'pointer', padding: 0 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '12px', color: c.textMuted }}>{lang === 'ar' ? `الدرس ${lesson.id}` : `Lesson ${lesson.id}`}</div>
          <h2 style={{ margin: 0, fontSize: '17px', color: c.text }}>{lesson.title[lang]}</h2>
        </div>
        <button onClick={onStartQuiz}
          style={{ padding: '8px 16px', background: c.primaryGrad, border: 'none', borderRadius: '20px', color: 'white', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
          ⚡ {lang === 'ar' ? 'اختبار' : 'Quiz'}
        </button>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', background: c.card, borderBottom: `0.5px solid ${c.border}` }}>
        {tabs.map(tb => (
          <button key={tb.id} onClick={() => setSection(tb.id)}
            style={{ flex: 1, padding: '12px 4px', background: 'none', border: 'none', fontSize: '12px', fontWeight: '500', cursor: 'pointer', color: section === tb.id ? c.primary : c.textMuted, borderBottom: section === tb.id ? `2px solid ${c.primary}` : '2px solid transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span style={{ fontSize: '16px' }}>{tb.icon}</span>
            {tb.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px', paddingBottom: '80px' }}>

        {/* VOCAB section */}
        {section === 'vocab' && (
          <div>
            <p style={{ color: c.textMuted, fontSize: '12px', marginBottom: '14px' }}>
              {lang === 'ar' ? 'اضغط للسماع 🔊 — اضغط على البطاقة لرؤية المعنى' : 'Tap to hear 🔊 — Tap card to see meaning'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {lesson.vocab.map((v, i) => (
                <div key={i}
                  onClick={() => setFlipped(f => ({ ...f, [i]: !f[i] }))}
                  style={{ background: flipped[i] ? c.card2 : c.card, border: flipped[i] ? `1px solid ${c.primary}44` : `0.5px solid ${c.border}`, borderRadius: '14px', padding: '16px', cursor: 'pointer', minHeight: '90px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', transition: 'all 0.2s' }}>
                  {flipped[i] ? (
                    <>
                      <div style={{ fontSize: '13px', color: c.primary, marginBottom: '4px' }}>{v.reading}</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: c.text }}>{v.meaning}</div>
                      <button onClick={(e) => { e.stopPropagation(); speak(v.jp) }}
                        style={{ marginTop: '8px', background: 'none', border: `0.5px solid ${c.border}`, borderRadius: '8px', color: c.textSub, fontSize: '11px', padding: '3px 8px', cursor: 'pointer' }}>
                        🔊 {v.reading}
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: '28px', marginBottom: '4px' }}>{v.jp}</div>
                      <div style={{ fontSize: '11px', color: c.textMuted }}>{lang === 'ar' ? 'اضغط للمعنى' : 'tap to reveal'}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GRAMMAR section */}
        {section === 'grammar' && (
          <div>
            <div style={{ background: c.card, border: `0.5px solid ${c.border}`, borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: c.primary, marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {lang === 'ar' ? 'القاعدة الأساسية' : 'Main Grammar Point'}
              </div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: c.text, marginBottom: '8px', direction: 'ltr' }}>
                {lesson.grammar[lang].split('—')[0]}
              </div>
              <div style={{ fontSize: '14px', color: c.textSub }}>
                {lesson.grammar[lang].split('—')[1]}
              </div>
            </div>

            <div style={{ background: c.card2, border: `0.5px solid ${c.border}`, borderRadius: '14px', padding: '16px' }}>
              <p style={{ color: c.textMuted, fontSize: '12px', marginBottom: '12px' }}>
                {lang === 'ar' ? 'مفردات الدرس' : 'Lesson vocabulary'} ({lesson.vocab.length})
              </p>
              {lesson.vocab.map((v, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: i < lesson.vocab.length - 1 ? `0.5px solid ${c.border}` : 'none' }}>
                  <button onClick={() => speak(v.jp)}
                    style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: c.primary, flexShrink: 0 }}>🔊</button>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '16px', color: c.text }}>{v.jp}</span>
                    <span style={{ fontSize: '12px', color: c.textSub, margin: '0 8px', direction: 'ltr' }}>{v.reading}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: c.textMuted }}>{v.meaning}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EXAMPLES section */}
        {section === 'examples' && (
          <div>
            <p style={{ color: c.textMuted, fontSize: '12px', marginBottom: '14px' }}>
              {lang === 'ar' ? 'اضغط على الجملة للسماع' : 'Tap sentence to hear it'}
            </p>
            {lesson.examples.map((ex, i) => (
              <div key={i}
                onClick={() => speak(ex.jp)}
                style={{ background: c.card, border: `0.5px solid ${c.border}`, borderRadius: '14px', padding: '16px', marginBottom: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>
                <div style={{ fontSize: '18px', color: c.text, marginBottom: '8px', direction: 'ltr', lineHeight: 1.6 }}>{ex.jp}</div>
                <div style={{ fontSize: '13px', color: c.primary, marginBottom: '4px', direction: 'ltr' }}>{ex.en}</div>
                <div style={{ fontSize: '13px', color: c.textSub }}>{ex.ar}</div>
                <div style={{ marginTop: '8px', fontSize: '11px', color: c.textMuted }}>🔊 {lang === 'ar' ? 'اضغط للسماع' : 'tap to hear'}</div>
              </div>
            ))}

            {/* Practice button */}
            <button onClick={onStartQuiz}
              style={{ width: '100%', padding: '15px', background: c.primaryGrad, border: 'none', borderRadius: '14px', color: 'white', fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginTop: '8px' }}>
              ⚡ {lang === 'ar' ? 'تدرب على هذا الدرس' : 'Practice This Lesson'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
