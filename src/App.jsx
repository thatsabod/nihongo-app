import { useState, useEffect } from 'react'
import { hiragana } from './data.js'
import Home from './screens/Home.jsx'
import Quiz from './screens/Quiz.jsx'
import Result from './screens/Result.jsx'
import Vocab from './screens/Vocab.jsx'
import Letters from './screens/Letters.jsx'

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

const translations = {
  ar: {
    welcome: 'أهلاً بك! 🎌',
    level: 'المستوى N5 — مبتدئ',
    startQuiz: '🧠 ابدأ اختبار الحروف',
    learnChart: '🎌 تعلم جدول الهيراغانا',
    vocab: '📚 بطاقات المفردات',
    days: 'أيام',
    characters: 'حرف',
    lastScore: 'آخر نتيجة',
    path: 'مسار التعلم',
  },
  en: {
    welcome: 'Welcome! 🎌',
    level: 'Level N5 — Beginner',
    startQuiz: '🧠 Start Character Quiz',
    learnChart: '🎌 Learn Hiragana Chart',
    vocab: '📚 Vocabulary Cards',
    days: 'days',
    characters: 'chars',
    lastScore: 'last score',
    path: 'Learning Path',
  }
}

export default function App() {
  const [screen, setScreen] = useState('home')
  const [lang, setLang] = useState('ar')
  const [questions, setQuestions] = useState([])
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(0)
  const [xp, setXp] = useState(420)
  const [streak] = useState(7)
  const [lastScore, setLastScore] = useState(0)
  const [progress, setProgress] = useState({})

  const t = translations[lang]

  const startQuiz = () => {
    setQuestions(shuffle(hiragana).slice(0, 10))
    setQIndex(0)
    setSelected(null)
    setScore(0)
    setScreen('quiz')
  }

  const handleAnswer = (opt) => {
    if (selected) return
    setSelected(opt)
    const isCorrect = opt === questions[qIndex].answer
    if (isCorrect) {
      setScore(s => s + 1)
      setXp(x => x + 10)
      const kana = questions[qIndex].kana
      setProgress(p => ({ ...p, [kana]: Math.min((p[kana] || 0) + 1, 10) }))
    }
  }

  useEffect(() => {
    if (!selected) return
    const isCorrect = selected === questions[qIndex]?.answer
    const delay = isCorrect ? 1000 : 2000
    const timer = setTimeout(() => {
      if (qIndex + 1 < questions.length) {
        setQIndex(i => i + 1)
        setSelected(null)
      } else {
        setLastScore(score + (isCorrect ? 1 : 0))
        setScreen('result')
      }
    }, delay)
    return () => clearTimeout(timer)
  }, [selected])

  // Language toggle button — shown on every screen
  const LangBtn = () => (
    <button
      onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')}
      style={{
        position: 'fixed', bottom: '24px', right: '24px', zIndex: 999,
        background: '#16213e', border: '1px solid #e84393',
        borderRadius: '50%', width: '48px', height: '48px',
        color: 'white', fontSize: '14px', fontWeight: '600',
        cursor: 'pointer', boxShadow: '0 2px 12px rgba(232,67,147,0.3)'
      }}>
      {lang === 'ar' ? 'EN' : 'ع'}
    </button>
  )

  if (screen === 'quiz') return (
    <>
      <Quiz
        questions={questions}
        qIndex={qIndex}
        selected={selected}
        score={score}
        xp={xp}
        lang={lang}
        onAnswer={handleAnswer}
        onBack={() => setScreen('home')}
      />
      <LangBtn />
    </>
  )

  if (screen === 'result') return (
    <>
      <Result
        score={lastScore}
        total={questions.length}
        xpEarned={lastScore * 10}
        lang={lang}
        onHome={() => setScreen('home')}
        onRetry={startQuiz}
      />
      <LangBtn />
    </>
  )

  if (screen === 'vocab') return (
    <>
      <Vocab lang={lang} onBack={() => setScreen('home')} />
      <LangBtn />
    </>
  )

  if (screen === 'letters') return (
    <>
      <Letters progress={progress} lang={lang} onBack={() => setScreen('home')} />
      <LangBtn />
    </>
  )

  return (
    <>
      <div style={{ minHeight: '100vh', background: '#1a1a2e', fontFamily: 'sans-serif', color: 'white', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>

        {/* Header */}
        <div style={{ background: '#16213e', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '22px' }}>
            にほんご<span style={{ color: '#e84393' }}>GO</span>
          </h1>
          <div style={{ background: '#0f3460', padding: '6px 14px', borderRadius: '20px', fontSize: '13px' }}>
            🔥 {streak} {t.days}
          </div>
        </div>

        {/* XP Card */}
        <div style={{ margin: '20px 16px', background: '#16213e', borderRadius: '16px', padding: '22px' }}>
          <p style={{ color: '#aaa', margin: '0 0 4px', fontSize: '14px' }}>{t.welcome}</p>
          <h2 style={{ margin: '0 0 4px', fontSize: '20px' }}>{t.level}</h2>
          <p style={{ color: '#e84393', fontSize: '13px', margin: '0 0 14px' }}>⚡ {xp} XP</p>
          <div style={{ background: '#0f3460', borderRadius: '8px', height: '8px' }}>
            <div style={{ background: 'linear-gradient(90deg,#e84393,#a855f7)', width: `${Math.min((xp / 1000) * 100, 100)}%`, height: '100%', borderRadius: '8px', transition: 'width 0.5s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#aaa', marginTop: '6px' }}>
            <span>{xp} XP</span><span>1000 XP</span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', padding: '0 16px', marginBottom: '16px' }}>
          {[
            ['46', t.characters],
            ['🔥', `${streak} ${t.days}`],
            [lastScore > 0 ? lastScore : '—', t.lastScore]
          ].map(([val, label], i) => (
            <div key={i} style={{ background: '#16213e', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: '600' }}>{val}</div>
              <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ padding: '0 16px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={startQuiz}
            style={{ width: '100%', padding: '15px', background: 'linear-gradient(90deg,#e84393,#a855f7)', border: 'none', borderRadius: '12px', color: 'white', fontSize: '16px', fontWeight: '500', cursor: 'pointer' }}>
            {t.startQuiz}
          </button>
          <button onClick={() => setScreen('letters')}
            style={{ width: '100%', padding: '15px', background: '#16213e', border: '1px solid #a855f7', borderRadius: '12px', color: 'white', fontSize: '16px', cursor: 'pointer' }}>
            {t.learnChart}
          </button>
          <button onClick={() => setScreen('vocab')}
            style={{ width: '100%', padding: '15px', background: '#16213e', border: '1px solid #e84393', borderRadius: '12px', color: 'white', fontSize: '16px', cursor: 'pointer' }}>
            {t.vocab}
          </button>
        </div>

        {/* Learning Path */}
        <div style={{ padding: '0 16px 80px' }}>
          <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '12px' }}>{t.path}</p>
          {[
            { icon: '✅', bg: '#e1f5ee', title: lang === 'ar' ? 'هيراغانا — الجزء الأول' : 'Hiragana — Part 1', sub: 'あ い う え お', badge: lang === 'ar' ? 'مكتمل' : 'Done', badgeBg: '#e1f5ee', badgeColor: '#0f6e56', border: 'none', opacity: 1 },
            { icon: '▶️', bg: '#fbeaf0', title: lang === 'ar' ? 'هيراغانا — الجزء الثاني' : 'Hiragana — Part 2', sub: 'か き く け こ', badge: lang === 'ar' ? 'جارٍ' : 'In Progress', badgeBg: '#fbeaf0', badgeColor: '#993556', border: '1px solid #e84393', opacity: 1 },
            { icon: '🔒', bg: '#333', title: 'Katakana', sub: 'ア イ ウ エ オ', badge: lang === 'ar' ? 'مقفل' : 'Locked', badgeBg: '#333', badgeColor: '#aaa', border: 'none', opacity: 0.4 },
            { icon: '🔒', bg: '#333', title: lang === 'ar' ? 'كانجي — المستوى الأول' : 'Kanji — Level 1', sub: '日 月 火 水 木', badge: lang === 'ar' ? 'مقفل' : 'Locked', badgeBg: '#333', badgeColor: '#aaa', border: 'none', opacity: 0.4 },
          ].map((item, i) => (
            <div key={i} style={{ background: '#16213e', borderRadius: '12px', padding: '14px 16px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px', border: item.border, opacity: item.opacity }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                {item.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '500', fontSize: '14px' }}>{item.title}</div>
                <div style={{ color: '#aaa', fontSize: '12px', marginTop: '2px' }}>{item.sub}</div>
              </div>
              <span style={{ background: item.badgeBg, color: item.badgeColor, fontSize: '11px', padding: '2px 8px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                {item.badge}
              </span>
            </div>
          ))}
        </div>
      </div>
      <LangBtn />
    </>
  )
}