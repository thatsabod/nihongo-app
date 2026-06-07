import { useState, useEffect } from 'react'
import { hiragana } from './data.js'
import Quiz from './screens/Quiz.jsx'
import Result from './screens/Result.jsx'
import Letters from './screens/Letters.jsx'

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

const translations = {
  ar: {
    learn: 'تعلم', hearts: 'قلوب', profile: 'ملفي', shop: 'متجر',
    welcome: 'أهلاً! 🎌', level: 'المستوى N5 — مبتدئ',
    startQuiz: '🧠 ابدأ اختبار', learnChart: '🎌 جدول الهيراغانا',
    path: 'مسار التعلم', done: 'مكتمل', inProgress: 'جارٍ', locked: 'مقفل',
    noHearts: 'انتهت قلوبك!', wait: 'انتظر 5 ساعات أو اشتري من المتجر',
  },
  en: {
    learn: 'Learn', hearts: 'Hearts', profile: 'Profile', shop: 'Shop',
    welcome: 'Welcome! 🎌', level: 'Level N5 — Beginner',
    startQuiz: '🧠 Start Quiz', learnChart: '🎌 Hiragana Chart',
    path: 'Learning Path', done: 'Done', inProgress: 'In Progress', locked: 'Locked',
    noHearts: 'No hearts left!', wait: 'Wait 5 hours or buy from shop',
  }
}

const ACHIEVEMENTS = [
  { id: 'first',    icon: '⚡', label: 'First Quiz',   condition: (s) => s.totalQuizzes >= 1 },
  { id: 'streak7',  icon: '🔥', label: '7 Day Streak', condition: (s) => s.streak >= 7 },
  { id: 'perfect',  icon: '🏆', label: 'Perfect Score', condition: (s) => s.perfectScores >= 1 },
  { id: 'master10', icon: '🎌', label: '10 Mastered',  condition: (s) => Object.values(s.progress).filter(v => v >= 10).length >= 10 },
  { id: 'xp500',    icon: '💎', label: '500 XP',        condition: (s) => s.xp >= 500 },
  { id: 'quiz10',   icon: '🌟', label: '10 Quizzes',   condition: (s) => s.totalQuizzes >= 10 },
]

export default function App() {
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('learn')
  const [screen, setScreen] = useState('home')
  const [lang, setLang] = useState('ar')
  const [questions, setQuestions] = useState([])
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(0)
  const [lastScore, setLastScore] = useState(0)
  const [xp, setXp] = useState(420)
  const [streak] = useState(7)
  const [hearts, setHearts] = useState(5)
  const [progress, setProgress] = useState({})
  const [totalQuizzes, setTotalQuizzes] = useState(0)
  const [perfectScores, setPerfectScores] = useState(0)
  const [gems, setGems] = useState(500)

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('nihongo-save') || '{}')
    if (saved.xp)            setXp(saved.xp)
    if (saved.hearts)        setHearts(saved.hearts)
    if (saved.gems)          setGems(saved.gems)
    if (saved.progress)      setProgress(saved.progress)
    if (saved.totalQuizzes)  setTotalQuizzes(saved.totalQuizzes)
    if (saved.perfectScores) setPerfectScores(saved.perfectScores)
    if (saved.lastScore)     setLastScore(saved.lastScore)
    setTimeout(() => setLoading(false), 2000)
  }, [])

  useEffect(() => {
    localStorage.setItem('nihongo-save', JSON.stringify({
      xp, hearts, gems, progress, totalQuizzes, perfectScores, lastScore
    }))
  }, [xp, hearts, gems, progress, totalQuizzes, perfectScores, lastScore])

  const t = translations[lang]
  const stats = { xp, streak, progress, totalQuizzes, perfectScores }

  const startQuiz = () => {
    if (hearts <= 0) return
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
    } else {
      setHearts(h => Math.max(h - 1, 0))
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
        const finalScore = score + (isCorrect ? 1 : 0)
        setLastScore(finalScore)
        setTotalQuizzes(q => q + 1)
        if (finalScore === questions.length) setPerfectScores(p => p + 1)
        setScreen('result')
      }
    }, delay)
    return () => clearTimeout(timer)
  }, [selected])

  const LangBtn = () => (
    <button onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')}
      style={{ position: 'fixed', top: '16px', left: '16px', zIndex: 999, background: '#16213e', border: '1px solid #e84393', borderRadius: '20px', padding: '4px 12px', color: 'white', fontSize: '13px', cursor: 'pointer' }}>
      {lang === 'ar' ? 'EN' : 'ع'}
    </button>
  )

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#1a1a2e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ fontSize: '80px', marginBottom: '16px' }}>🎌</div>
      <h1 style={{ color: 'white', fontSize: '28px', margin: '0 0 8px' }}>
        にほんご<span style={{ color: '#e84393' }}>GO</span>
      </h1>
      <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '40px' }}>تعلم اليابانية بطريقة ممتعة</p>
      <div style={{ width: '200px', height: '4px', background: '#0f3460', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', background: 'linear-gradient(90deg,#e84393,#a855f7)', borderRadius: '4px', animation: 'load 2s ease forwards' }} />
      </div>
      <style>{`@keyframes load { from{width:0%} to{width:100%} }`}</style>
    </div>
  )

  if (screen === 'quiz') return (
    <>
      <Quiz questions={questions} qIndex={qIndex} selected={selected} score={score} xp={xp} hearts={hearts} lang={lang} onAnswer={handleAnswer} onBack={() => setScreen('home')} />
      <LangBtn />
    </>
  )

  if (screen === 'result') return (
    <>
      <Result score={lastScore} total={questions.length} xpEarned={lastScore * 10} lang={lang} onHome={() => { setScreen('home'); setTab('learn') }} onRetry={startQuiz} />
      <LangBtn />
    </>
  )

  if (screen === 'letters') return (
    <>
      <Letters progress={progress} lang={lang} onBack={() => setScreen('home')} />
      <LangBtn />
    </>
  )

  const xpPercent = Math.min((xp / 1000) * 100, 100)

  const LearnTab = () => (
    <div style={{ paddingBottom: '80px' }}>
      <div style={{ background: '#16213e', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '22px' }}>にほんご<span style={{ color: '#e84393' }}>GO</span></h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px' }}>❤️ {hearts}/5</span>
          <span style={{ fontSize: '14px' }}>💎 {gems}</span>
          <span style={{ background: '#0f3460', padding: '4px 10px', borderRadius: '20px', fontSize: '13px' }}>🔥 {streak}</span>
        </div>
      </div>

      {hearts === 0 && (
        <div style={{ margin: '16px', background: '#7a1f1f', borderRadius: '12px', padding: '14px 16px', textAlign: 'center' }}>
          <p style={{ margin: '0 0 4px', fontWeight: '500' }}>{t.noHearts}</p>
          <p style={{ margin: 0, fontSize: '13px', color: '#ffaaaa' }}>{t.wait}</p>
        </div>
      )}

      <div style={{ margin: '16px', background: '#16213e', borderRadius: '16px', padding: '20px' }}>
        <p style={{ color: '#aaa', margin: '0 0 4px', fontSize: '13px' }}>{t.welcome}</p>
        <h2 style={{ margin: '0 0 4px', fontSize: '18px' }}>{t.level}</h2>
        <p style={{ color: '#e84393', fontSize: '13px', margin: '0 0 12px' }}>⚡ {xp} XP</p>
        <div style={{ background: '#0f3460', borderRadius: '8px', height: '8px' }}>
          <div style={{ background: 'linear-gradient(90deg,#e84393,#a855f7)', width: `${xpPercent}%`, height: '100%', borderRadius: '8px', transition: 'width 0.5s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#aaa', marginTop: '4px' }}>
          <span>{xp} XP</span><span>1000 XP</span>
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        <button onClick={startQuiz} disabled={hearts === 0}
          style={{ width: '100%', padding: '15px', background: hearts === 0 ? '#333' : 'linear-gradient(90deg,#e84393,#a855f7)', border: 'none', borderRadius: '12px', color: hearts === 0 ? '#666' : 'white', fontSize: '16px', fontWeight: '500', cursor: hearts === 0 ? 'not-allowed' : 'pointer' }}>
          {t.startQuiz} {hearts === 0 ? '🚫' : ''}
        </button>
        <button onClick={() => setScreen('letters')}
          style={{ width: '100%', padding: '15px', background: '#16213e', border: '1px solid #a855f7', borderRadius: '12px', color: 'white', fontSize: '16px', cursor: 'pointer' }}>
          {t.learnChart}
        </button>
      </div>

      <div style={{ padding: '0 16px' }}>
        <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '12px' }}>{t.path}</p>
        {[
          { icon: '✅', bg: '#e1f5ee', title: 'Hiragana — Part 1', sub: 'あ い う え お', badge: t.done, badgeBg: '#e1f5ee', badgeColor: '#0f6e56', border: 'none', opacity: 1 },
          { icon: '▶️', bg: '#fbeaf0', title: 'Hiragana — Part 2', sub: 'か き く け こ', badge: t.inProgress, badgeBg: '#fbeaf0', badgeColor: '#993556', border: '1px solid #e84393', opacity: 1 },
          { icon: '🔒', bg: '#333', title: 'Katakana', sub: 'ア イ ウ エ オ', badge: t.locked, badgeBg: '#333', badgeColor: '#aaa', border: 'none', opacity: 0.4 },
          { icon: '🔒', bg: '#333', title: 'Kanji — Level 1', sub: '日 月 火 水 木', badge: t.locked, badgeBg: '#333', badgeColor: '#aaa', border: 'none', opacity: 0.4 },
        ].map((item, i) => (
          <div key={i} style={{ background: '#16213e', borderRadius: '12px', padding: '14px 16px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px', border: item.border, opacity: item.opacity }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{item.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '500', fontSize: '14px' }}>{item.title}</div>
              <div style={{ color: '#aaa', fontSize: '12px', marginTop: '2px' }}>{item.sub}</div>
            </div>
            <span style={{ background: item.badgeBg, color: item.badgeColor, fontSize: '11px', padding: '2px 8px', borderRadius: '20px', whiteSpace: 'nowrap' }}>{item.badge}</span>
          </div>
        ))}
      </div>
    </div>
  )

  const HeartsTab = () => (
    <div style={{ padding: '24px 16px 80px', textAlign: 'center' }}>
      <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>❤️ {t.hearts}</h2>
      <div style={{ fontSize: '80px', marginBottom: '16px' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} style={{ opacity: i < hearts ? 1 : 0.2 }}>❤️</span>
        ))}
      </div>
      <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '32px' }}>
        {hearts === 5 ? (lang === 'ar' ? 'قلوبك مكتملة!' : 'Full hearts!') : `${hearts}/5 ${lang === 'ar' ? 'قلوب متبقية' : 'hearts remaining'}`}
      </p>
      <button onClick={() => { if (gems >= 350 && hearts < 5) { setGems(g => g - 350); setHearts(5) } }}
        disabled={gems < 350 || hearts === 5}
        style={{ width: '100%', padding: '15px', background: gems >= 350 && hearts < 5 ? 'linear-gradient(90deg,#e84393,#a855f7)' : '#333', border: 'none', borderRadius: '12px', color: gems >= 350 && hearts < 5 ? 'white' : '#666', fontSize: '16px', cursor: gems >= 350 && hearts < 5 ? 'pointer' : 'not-allowed' }}>
        💎 350 — {lang === 'ar' ? 'أعد تعبئة القلوب' : 'Refill Hearts'}
      </button>
    </div>
  )

  const ProfileTab = () => (
    <div style={{ padding: '24px 16px 80px' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg,#e84393,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', margin: '0 auto 12px' }}>🧑</div>
        <h2 style={{ margin: '0 0 4px', fontSize: '20px' }}>Abdalla</h2>
        <p style={{ color: '#aaa', fontSize: '13px', margin: 0 }}>@thatsabod</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '24px' }}>
        {[['⚡', xp, 'XP'], ['🔥', streak, lang === 'ar' ? 'أيام' : 'Days'], ['🏆', totalQuizzes, lang === 'ar' ? 'اختبار' : 'Quizzes']].map(([icon, val, label], i) => (
          <div key={i} style={{ background: '#16213e', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px' }}>{icon}</div>
            <div style={{ fontSize: '22px', fontWeight: '600', margin: '4px 0 2px' }}>{val}</div>
            <div style={{ fontSize: '11px', color: '#aaa' }}>{label}</div>
          </div>
        ))}
      </div>
      <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#aaa' }}>{lang === 'ar' ? 'الإنجازات' : 'Achievements'}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        {ACHIEVEMENTS.map((a) => {
          const unlocked = a.condition(stats)
          return (
            <div key={a.id} style={{ background: '#16213e', borderRadius: '12px', padding: '14px', textAlign: 'center', opacity: unlocked ? 1 : 0.35, border: unlocked ? '1px solid #e84393' : '0.5px solid #333' }}>
              <div style={{ fontSize: '28px', marginBottom: '4px' }}>{a.icon}</div>
              <div style={{ fontSize: '11px', color: unlocked ? '#e84393' : '#aaa' }}>{a.label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )

  const ShopTab = () => (
    <div style={{ padding: '24px 16px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '20px' }}>{lang === 'ar' ? 'المتجر' : 'Shop'}</h2>
        <span style={{ background: '#16213e', padding: '6px 14px', borderRadius: '20px', fontSize: '14px' }}>💎 {gems}</span>
      </div>
      {[
        { icon: '❤️', name: lang === 'ar' ? 'إعادة تعبئة القلوب' : 'Heart Refill', desc: lang === 'ar' ? 'استعد قلوبك كاملة' : 'Regain full hearts', cost: 350, action: () => { if (gems >= 350) { setGems(g => g - 350); setHearts(5) } } },
        { icon: '🛡️', name: lang === 'ar' ? 'درع القلب' : 'Heart Shield', desc: lang === 'ar' ? '30 دقيقة بدون خسارة قلوب' : '30 min no heart loss', cost: 200, action: () => { if (gems >= 200) setGems(g => g - 200) } },
        { icon: '⚡', name: lang === 'ar' ? 'XP مضاعف' : 'XP Boost', desc: lang === 'ar' ? 'ضاعف XP لمدة ساعة' : 'Double XP for 1 hour', cost: 150, action: () => { if (gems >= 150) setGems(g => g - 150) } },
        { icon: '🎯', name: lang === 'ar' ? 'تجميد السلسلة' : 'Streak Freeze', desc: lang === 'ar' ? 'احتفظ بسلسلتك ليوم' : 'Keep streak for 1 day', cost: 200, action: () => { if (gems >= 200) setGems(g => g - 200) } },
      ].map((item, i) => (
        <div key={i} style={{ background: '#16213e', borderRadius: '12px', padding: '16px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '32px', flexShrink: 0 }}>{item.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '500', fontSize: '14px' }}>{item.name}</div>
            <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>{item.desc}</div>
          </div>
          <button onClick={item.action} disabled={gems < item.cost}
            style={{ padding: '8px 14px', background: gems >= item.cost ? 'linear-gradient(90deg,#e84393,#a855f7)' : '#333', border: 'none', borderRadius: '20px', color: gems >= item.cost ? 'white' : '#666', fontSize: '13px', cursor: gems >= item.cost ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}>
            💎 {item.cost}
          </button>
        </div>
      ))}
    </div>
  )

  return (
    <>
      <div style={{ minHeight: '100vh', background: '#1a1a2e', fontFamily: 'sans-serif', color: 'white', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
        {tab === 'learn'   && <LearnTab />}
        {tab === 'hearts'  && <HeartsTab />}
        {tab === 'profile' && <ProfileTab />}
        {tab === 'shop'    && <ShopTab />}
      </div>
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#16213e', borderTop: '0.5px solid #333', display: 'flex', zIndex: 100 }}>
        {[
          { id: 'learn',   icon: '📚', label: t.learn },
          { id: 'hearts',  icon: '❤️', label: t.hearts },
          { id: 'profile', icon: '👤', label: t.profile },
          { id: 'shop',    icon: '🛒', label: t.shop },
        ].map((item) => (
          <button key={item.id} onClick={() => setTab(item.id)}
            style={{ flex: 1, padding: '12px 4px', background: 'none', border: 'none', color: tab === item.id ? '#e84393' : '#555', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', borderTop: tab === item.id ? '2px solid #e84393' : '2px solid transparent', transition: 'all 0.15s' }}>
            <span style={{ fontSize: '20px' }}>{item.icon}</span>
            <span style={{ fontSize: '11px', fontWeight: tab === item.id ? '500' : '400' }}>{item.label}</span>
          </button>
        ))}
      </div>
      <LangBtn />
    </>
  )
}