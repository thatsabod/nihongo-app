import { useState, useEffect } from 'react'
import { hiragana } from './data.js'
import Quiz from './screens/Quiz.jsx'
import Result from './screens/Result.jsx'
import Letters from './screens/Letters.jsx'
import Login from './screens/Login.jsx'

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

const translations = {
  ar: {
    learn: 'تعلم', letters: 'أحرف', profile: 'حسابي',
    startQuiz: 'اختبر معلوماتك', learnChart: 'تعلم الأحرف',
    welcome: 'أهلاً! 🎌', level: 'المستوى N5 — مبتدئ',
    path: 'مسار التعلم', done: 'مكتمل', inProgress: 'جارٍ', locked: 'مقفل',
    noHearts: 'انتهت قلوبك!', wait: 'اشتري قلوب من المتجر',
  },
  en: {
    learn: 'Home', letters: 'Letters', profile: 'Profile',
    startQuiz: 'Test your knowledge', learnChart: 'Learn Characters',
    welcome: 'Welcome! 🎌', level: 'Level N5 — Beginner',
    path: 'Learning Path', done: 'Done', inProgress: 'In Progress', locked: 'Locked',
    noHearts: 'No hearts left!', wait: 'Buy hearts from shop',
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

function WelcomeScreen({ onStart, onTest, onRegister, onLogin, lang, setLang }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0f0e17', fontFamily: 'sans-serif', color: 'white', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '22px' }}>
          にほんご<span style={{ color: '#ff6b9d' }}>GO</span>
        </h1>
        <button onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')}
          style={{ background: 'none', border: '1px solid #333', borderRadius: '20px', padding: '6px 14px', color: '#aaa', fontSize: '13px', cursor: 'pointer' }}>
          {lang === 'ar' ? 'EN' : 'ع'}
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '80px', marginBottom: '8px' }}>🎌</div>
        <h2 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '12px', lineHeight: 1.2 }}>
          {lang === 'ar' ? 'تعلّم اليابانية' : 'Learn Japanese'}
        </h2>
        <p style={{ color: '#888', fontSize: '15px', marginBottom: '48px', maxWidth: '280px', lineHeight: 1.6 }}>
          {lang === 'ar' ? 'تعلم الحروف والمفردات بطريقة ممتعة' : 'Learn characters and vocabulary in a fun way'}
        </p>

        <div style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button onClick={onStart}
            style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg,#ff6b9d,#c44dff)', border: 'none', borderRadius: '16px', color: 'white', fontSize: '17px', fontWeight: '600', cursor: 'pointer' }}>
            {lang === 'ar' ? '🚀 ابدأ التعلم من الصفر' : '🚀 Start from scratch'}
          </button>
          <button onClick={onTest}
            style={{ width: '100%', padding: '18px', background: '#1a1a2e', border: '1.5px solid #ff6b9d', borderRadius: '16px', color: 'white', fontSize: '17px', fontWeight: '500', cursor: 'pointer' }}>
            {lang === 'ar' ? '🧠 اختبر معلوماتك' : '🧠 Test your knowledge'}
          </button>
          <button onClick={onRegister}
            style={{ width: '100%', padding: '18px', background: '#1a1a2e', border: '1.5px solid #333', borderRadius: '16px', color: 'white', fontSize: '17px', fontWeight: '500', cursor: 'pointer' }}>
            {lang === 'ar' ? '✨ أنشئ حساب' : '✨ Create account'}
          </button>
          <button onClick={onLogin}
            style={{ width: '100%', padding: '10px', background: 'none', border: 'none', color: '#666', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }}>
            {lang === 'ar' ? 'لدي حساب بالفعل' : 'I already have an account'}
          </button>
        </div>
      </div>

      <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
        {[1,2,3].map(i => (
          <div key={i} style={{ width: i === 1 ? '24px' : '8px', height: '8px', borderRadius: '4px', background: i === 1 ? '#ff6b9d' : '#333' }} />
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState('welcome')
  const [loginMode, setLoginMode] = useState('login')
  const [tab, setTab] = useState('home')
  const [lettersTab, setLettersTab] = useState('hiragana')
  const [lang, setLang] = useState('ar')
  const [userName, setUserName] = useState('')
  const [questions, setQuestions] = useState([])
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(0)
  const [lastScore, setLastScore] = useState(0)
  const [xp, setXp] = useState(0)
  const [streak] = useState(7)
  const [hearts, setHearts] = useState(5)
  const [progress, setProgress] = useState({})
  const [totalQuizzes, setTotalQuizzes] = useState(0)
  const [perfectScores, setPerfectScores] = useState(0)
  const [gems, setGems] = useState(500)

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('nihongo-save') || '{}')
    if (saved.xp !== undefined)  setXp(saved.xp)
    if (saved.hearts)            setHearts(saved.hearts)
    if (saved.gems)              setGems(saved.gems)
    if (saved.progress)          setProgress(saved.progress)
    if (saved.totalQuizzes)      setTotalQuizzes(saved.totalQuizzes)
    if (saved.perfectScores)     setPerfectScores(saved.perfectScores)
    if (saved.lastScore)         setLastScore(saved.lastScore)
    if (saved.userName)          setUserName(saved.userName)
    if (saved.screen && saved.screen !== 'welcome') setScreen('main')
  }, [])

  useEffect(() => {
    localStorage.setItem('nihongo-save', JSON.stringify({
      xp, hearts, gems, progress, totalQuizzes, perfectScores, lastScore, userName, screen
    }))
  }, [xp, hearts, gems, progress, totalQuizzes, perfectScores, lastScore, userName, screen])

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

  if (screen === 'welcome') return (
    <WelcomeScreen
      lang={lang}
      setLang={setLang}
      onStart={() => setScreen('main')}
      onTest={() => { setScreen('main'); setTimeout(startQuiz, 100) }}
      onRegister={() => { setLoginMode('register'); setScreen('login') }}
      onLogin={() => { setLoginMode('login'); setScreen('login') }}
    />
  )

  if (screen === 'login') return (
    <Login
      lang={lang}
      initialMode={loginMode}
      onBack={() => setScreen('welcome')}
      onLogin={(name) => {
        setUserName(name)
        setScreen('main')
      }}
    />
  )

  if (screen === 'quiz') return (
    <Quiz questions={questions} qIndex={qIndex} selected={selected} score={score} xp={xp} hearts={hearts} lang={lang} onAnswer={handleAnswer} onBack={() => setScreen('main')} />
  )

  if (screen === 'result') return (
    <Result score={lastScore} total={questions.length} xpEarned={lastScore * 10} lang={lang} onHome={() => { setScreen('main'); setTab('home') }} onRetry={startQuiz} />
  )

  if (screen === 'letters-detail') return (
    <Letters progress={progress} lang={lang} onBack={() => setScreen('main')} />
  )

  const xpPercent = Math.min((xp / 1000) * 100, 100)

  const HomeTab = () => (
    <div style={{ paddingBottom: '90px' }}>
      <div style={{ background: '#12121f', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid #1e1e30' }}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>にほんご<span style={{ color: '#ff6b9d' }}>GO</span></h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', background: '#1e1e30', padding: '5px 10px', borderRadius: '20px' }}>❤️ {hearts}/5</span>
          <span style={{ fontSize: '13px', background: '#1e1e30', padding: '5px 10px', borderRadius: '20px' }}>💎 {gems}</span>
          <span style={{ fontSize: '13px', background: '#1e1e30', padding: '5px 10px', borderRadius: '20px' }}>🔥 {streak}</span>
        </div>
      </div>

      <div style={{ margin: '16px', background: 'linear-gradient(135deg,#1a1a2e,#12121f)', borderRadius: '20px', padding: '20px', border: '0.5px solid #1e1e30' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <p style={{ color: '#666', margin: '0 0 4px', fontSize: '12px' }}>
              {lang === 'ar' ? `أهلاً، ${userName || 'متعلم'}! 🎌` : `Welcome, ${userName || 'Learner'}! 🎌`}
            </p>
            <h2 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '600' }}>{t.level}</h2>
            <p style={{ color: '#ff6b9d', fontSize: '13px', margin: 0 }}>⚡ {xp} XP</p>
          </div>
          <div style={{ fontSize: '40px' }}>🎌</div>
        </div>
        <div style={{ background: '#1e1e30', borderRadius: '8px', height: '6px' }}>
          <div style={{ background: 'linear-gradient(90deg,#ff6b9d,#c44dff)', width: `${xpPercent}%`, height: '100%', borderRadius: '8px', transition: 'width 0.5s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#555', marginTop: '4px' }}>
          <span>{xp} XP</span><span>1000 XP</span>
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        <button onClick={startQuiz} disabled={hearts === 0}
          style={{ width: '100%', padding: '16px', background: hearts === 0 ? '#1e1e30' : 'linear-gradient(135deg,#ff6b9d,#c44dff)', border: 'none', borderRadius: '14px', color: hearts === 0 ? '#444' : 'white', fontSize: '16px', fontWeight: '600', cursor: hearts === 0 ? 'not-allowed' : 'pointer' }}>
          🧠 {t.startQuiz}
        </button>
        <button onClick={() => setTab('letters')}
          style={{ width: '100%', padding: '16px', background: '#12121f', border: '1px solid #1e1e30', borderRadius: '14px', color: 'white', fontSize: '15px', cursor: 'pointer' }}>
          📖 {t.learnChart}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', padding: '0 16px', marginBottom: '20px' }}>
        {[
          ['46', lang === 'ar' ? 'حرف' : 'chars'],
          [streak + '🔥', lang === 'ar' ? 'أيام' : 'days'],
          [lastScore > 0 ? lastScore : '—', lang === 'ar' ? 'آخر نتيجة' : 'last score']
        ].map(([val, label], i) => (
          <div key={i} style={{ background: '#12121f', border: '0.5px solid #1e1e30', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '700' }}>{val}</div>
            <div style={{ fontSize: '11px', color: '#555', marginTop: '3px' }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '0 16px' }}>
        <p style={{ color: '#555', fontSize: '12px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>{t.path}</p>
        {[
          { icon: '✅', title: 'Hiragana — Part 1', sub: 'あ い う え お', badge: t.done, badgeBg: '#0d2d1e', badgeColor: '#4ade80', border: '0.5px solid #1e1e30', opacity: 1 },
          { icon: '▶️', title: 'Hiragana — Part 2', sub: 'か き く け こ', badge: t.inProgress, badgeBg: '#2d0d1e', badgeColor: '#ff6b9d', border: '1px solid #ff6b9d33', opacity: 1 },
          { icon: '🔒', title: 'Katakana', sub: 'ア イ ウ エ オ', badge: t.locked, badgeBg: '#1e1e30', badgeColor: '#444', border: '0.5px solid #1e1e30', opacity: 0.4 },
          { icon: '🔒', title: 'Kanji — Level 1', sub: '日 月 火 水 木', badge: t.locked, badgeBg: '#1e1e30', badgeColor: '#444', border: '0.5px solid #1e1e30', opacity: 0.4 },
        ].map((item, i) => (
          <div key={i} style={{ background: '#12121f', borderRadius: '14px', padding: '14px 16px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px', border: item.border, opacity: item.opacity }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#1e1e30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{item.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '500', fontSize: '14px' }}>{item.title}</div>
              <div style={{ color: '#555', fontSize: '12px', marginTop: '2px' }}>{item.sub}</div>
            </div>
            <span style={{ background: item.badgeBg, color: item.badgeColor, fontSize: '11px', padding: '3px 10px', borderRadius: '20px', whiteSpace: 'nowrap' }}>{item.badge}</span>
          </div>
        ))}
      </div>
    </div>
  )

  const LettersTab = () => {
    const groups = {
      hiragana: [
        { label: 'あ行', chars: [{ k: 'あ', r: 'a' }, { k: 'い', r: 'i' }, { k: 'う', r: 'u' }, { k: 'え', r: 'e' }, { k: 'お', r: 'o' }] },
        { label: 'か行', chars: [{ k: 'か', r: 'ka' }, { k: 'き', r: 'ki' }, { k: 'く', r: 'ku' }, { k: 'け', r: 'ke' }, { k: 'こ', r: 'ko' }] },
        { label: 'さ行', chars: [{ k: 'さ', r: 'sa' }, { k: 'し', r: 'shi' }, { k: 'す', r: 'su' }, { k: 'せ', r: 'se' }, { k: 'そ', r: 'so' }] },
        { label: 'た行', chars: [{ k: 'た', r: 'ta' }, { k: 'ち', r: 'chi' }, { k: 'つ', r: 'tsu' }, { k: 'て', r: 'te' }, { k: 'と', r: 'to' }] },
        { label: 'な行', chars: [{ k: 'な', r: 'na' }, { k: 'に', r: 'ni' }, { k: 'ぬ', r: 'nu' }, { k: 'ね', r: 'ne' }, { k: 'の', r: 'no' }] },
        { label: 'は行', chars: [{ k: 'は', r: 'ha' }, { k: 'ひ', r: 'hi' }, { k: 'ふ', r: 'fu' }, { k: 'へ', r: 'he' }, { k: 'ほ', r: 'ho' }] },
        { label: 'ま行', chars: [{ k: 'ま', r: 'ma' }, { k: 'み', r: 'mi' }, { k: 'む', r: 'mu' }, { k: 'め', r: 'me' }, { k: 'も', r: 'mo' }] },
        { label: 'や行', chars: [{ k: 'や', r: 'ya' }, { k: 'ゆ', r: 'yu' }, { k: 'よ', r: 'yo' }] },
        { label: 'ら行', chars: [{ k: 'ら', r: 'ra' }, { k: 'り', r: 'ri' }, { k: 'る', r: 'ru' }, { k: 'れ', r: 're' }, { k: 'ろ', r: 'ro' }] },
        { label: 'わ行', chars: [{ k: 'わ', r: 'wa' }, { k: 'を', r: 'wo' }, { k: 'ん', r: 'n' }] },
      ],
      katakana: [
        { label: 'ア行', chars: [{ k: 'ア', r: 'a' }, { k: 'イ', r: 'i' }, { k: 'ウ', r: 'u' }, { k: 'エ', r: 'e' }, { k: 'オ', r: 'o' }] },
        { label: 'カ行', chars: [{ k: 'カ', r: 'ka' }, { k: 'キ', r: 'ki' }, { k: 'ク', r: 'ku' }, { k: 'ケ', r: 'ke' }, { k: 'コ', r: 'ko' }] },
        { label: 'サ行', chars: [{ k: 'サ', r: 'sa' }, { k: 'シ', r: 'shi' }, { k: 'ス', r: 'su' }, { k: 'セ', r: 'se' }, { k: 'ソ', r: 'so' }] },
      ],
      kanji: [
        { label: 'أرقام', chars: [{ k: '一', r: 'ichi' }, { k: '二', r: 'ni' }, { k: '三', r: 'san' }, { k: '四', r: 'shi' }, { k: '五', r: 'go' }] },
        { label: 'طبيعة', chars: [{ k: '日', r: 'nichi' }, { k: '月', r: 'tsuki' }, { k: '火', r: 'hi' }, { k: '水', r: 'mizu' }, { k: '木', r: 'ki' }] },
      ]
    }

    const tabs = [
      { id: 'hiragana', label: 'Hiragana' },
      { id: 'katakana', label: 'Katakana' },
      { id: 'kanji', label: 'Kanji', locked: true },
    ]

    return (
      <div style={{ paddingBottom: '90px' }}>
        <div style={{ background: '#12121f', padding: '18px 20px', borderBottom: '0.5px solid #1e1e30' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: '18px' }}>{lang === 'ar' ? 'الأحرف' : 'Characters'}</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {tabs.map(tb => (
              <button key={tb.id}
                onClick={() => !tb.locked && setLettersTab(tb.id)}
                style={{
                  padding: '8px 16px', borderRadius: '20px', border: 'none', fontSize: '13px', fontWeight: '500',
                  cursor: tb.locked ? 'not-allowed' : 'pointer',
                  background: lettersTab === tb.id ? 'linear-gradient(135deg,#ff6b9d,#c44dff)' : '#1e1e30',
                  color: tb.locked ? '#444' : lettersTab === tb.id ? 'white' : '#aaa',
                  opacity: tb.locked ? 0.5 : 1
                }}>
                {tb.label} {tb.locked ? '🔒' : ''}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '16px' }}>
          {(groups[lettersTab] || []).map((group, gi) => (
            <div key={gi} style={{ marginBottom: '20px' }}>
              <p style={{ color: '#ff6b9d', fontSize: '12px', marginBottom: '10px', fontWeight: '600', letterSpacing: '1px' }}>{group.label}</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {group.chars.map((ch, ci) => {
                  const practiced = progress[ch.k] || 0
                  const percent = Math.min((practiced / 10) * 100, 100)
                  const done = practiced >= 10
                  return (
                    <div key={ci}
                      onClick={() => { const u = new SpeechSynthesisUtterance(ch.k); u.lang = 'ja-JP'; window.speechSynthesis.speak(u) }}
                      style={{ background: done ? '#0d2d1e' : '#12121f', border: done ? '1px solid #4ade8066' : '0.5px solid #1e1e30', borderRadius: '14px', padding: '12px', textAlign: 'center', cursor: 'pointer', minWidth: '64px' }}>
                      <div style={{ fontSize: '26px', marginBottom: '2px' }}>{ch.k}</div>
                      <div style={{ fontSize: '11px', color: '#ff6b9d', marginBottom: '6px' }}>{ch.r}</div>
                      <div style={{ background: '#1e1e30', borderRadius: '4px', height: '3px', overflow: 'hidden' }}>
                        <div style={{ background: done ? '#4ade80' : 'linear-gradient(90deg,#ff6b9d,#c44dff)', width: `${percent}%`, height: '100%', borderRadius: '4px' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const ProfileTab = () => (
    <div style={{ paddingBottom: '90px' }}>
      <div style={{ background: '#12121f', padding: '18px 20px', borderBottom: '0.5px solid #1e1e30', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '18px' }}>{lang === 'ar' ? 'حسابي' : 'My Profile'}</h2>
        <button onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')}
          style={{ background: 'none', border: '1px solid #1e1e30', borderRadius: '20px', padding: '5px 12px', color: '#aaa', fontSize: '12px', cursor: 'pointer' }}>
          {lang === 'ar' ? 'EN' : 'ع'}
        </button>
      </div>

      <div style={{ padding: '24px 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg,#ff6b9d,#c44dff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', margin: '0 auto 12px' }}>🧑</div>
          <h2 style={{ margin: '0 0 4px', fontSize: '20px' }}>{userName || (lang === 'ar' ? 'متعلم' : 'Learner')}</h2>
          <p style={{ color: '#555', fontSize: '13px', margin: 0 }}>🎌 {lang === 'ar' ? 'متعلم ياباني' : 'Japanese Learner'}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '28px' }}>
          {[['⚡', xp, 'XP'], ['🔥', streak, lang === 'ar' ? 'أيام' : 'Days'], ['🏆', totalQuizzes, lang === 'ar' ? 'اختبار' : 'Quizzes']].map(([icon, val, label], i) => (
            <div key={i} style={{ background: '#12121f', border: '0.5px solid #1e1e30', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px' }}>{icon}</div>
              <div style={{ fontSize: '22px', fontWeight: '700', margin: '4px 0 2px' }}>{val}</div>
              <div style={{ fontSize: '11px', color: '#555' }}>{label}</div>
            </div>
          ))}
        </div>

        <p style={{ color: '#555', fontSize: '12px', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>{lang === 'ar' ? 'الإنجازات' : 'Achievements'}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
          {ACHIEVEMENTS.map((a) => {
            const unlocked = a.condition(stats)
            return (
              <div key={a.id} style={{ background: '#12121f', border: unlocked ? '1px solid #ff6b9d33' : '0.5px solid #1e1e30', borderRadius: '14px', padding: '16px', textAlign: 'center', opacity: unlocked ? 1 : 0.3 }}>
                <div style={{ fontSize: '28px', marginBottom: '6px' }}>{a.icon}</div>
                <div style={{ fontSize: '11px', color: unlocked ? '#ff6b9d' : '#555' }}>{a.label}</div>
              </div>
            )
          })}
        </div>

        <button onClick={() => { setScreen('welcome'); setUserName(''); localStorage.removeItem('nihongo-save') }}
          style={{ width: '100%', padding: '14px', background: '#12121f', border: '1px solid #ff6b9d33', borderRadius: '14px', color: '#ff6b9d', fontSize: '14px', cursor: 'pointer' }}>
          {lang === 'ar' ? '← تسجيل الخروج' : '← Sign Out'}
        </button>
      </div>
    </div>
  )

  return (
    <>
      <div style={{ minHeight: '100vh', background: '#0f0e17', fontFamily: 'sans-serif', color: 'white', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
        {tab === 'home'    && <HomeTab />}
        {tab === 'letters' && <LettersTab />}
        {tab === 'profile' && <ProfileTab />}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#12121f', borderTop: '0.5px solid #1e1e30', display: 'flex', zIndex: 100 }}>
        {[
          { id: 'home',    icon: '🏠', label: lang === 'ar' ? 'الرئيسية' : 'Home' },
          { id: 'letters', icon: '文', label: lang === 'ar' ? 'الأحرف' : 'Letters' },
          { id: 'profile', icon: '👤', label: lang === 'ar' ? 'حسابي' : 'Profile' },
        ].map((item) => (
          <button key={item.id} onClick={() => setTab(item.id)}
            style={{ flex: 1, padding: '12px 4px', background: 'none', border: 'none', color: tab === item.id ? '#ff6b9d' : '#444', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', borderTop: tab === item.id ? '2px solid #ff6b9d' : '2px solid transparent', transition: 'all 0.15s' }}>
            <span style={{ fontSize: '22px' }}>{item.icon}</span>
            <span style={{ fontSize: '11px', fontWeight: tab === item.id ? '600' : '400' }}>{item.label}</span>
          </button>
        ))}
      </div>
    </>
  )
}