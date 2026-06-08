import { useState, useEffect } from 'react'
import { hiragana } from './data.js'
import Quiz from './screens/Quiz.jsx'
import Result from './screens/Result.jsx'
import Letters from './screens/Letters.jsx'
import Login from './screens/Login.jsx'
import { auth, db } from './firebase.js'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'

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
    darkMode: 'الوضع الداكن', lightMode: 'الوضع الفاتح',
    vocab: 'المفردات', grammar: 'القواعد',
  },
  en: {
    learn: 'Home', letters: 'Letters', profile: 'Profile',
    startQuiz: 'Test your knowledge', learnChart: 'Learn Characters',
    welcome: 'Welcome! 🎌', level: 'Level N5 — Beginner',
    path: 'Learning Path', done: 'Done', inProgress: 'In Progress', locked: 'Locked',
    noHearts: 'No hearts left!', wait: 'Buy hearts from shop',
    darkMode: 'Dark Mode', lightMode: 'Light Mode',
    vocab: 'Vocabulary', grammar: 'Grammar',
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

const getColors = (theme) => theme === 'dark' ? {
  bg: '#0f0e17', card: '#12121f', card2: '#1a1a2e', border: '#1e1e30',
  text: '#ffffff', textSub: '#888888', textMuted: '#444444',
  primary: '#7C3AED', primaryLight: '#A78BFA',
  primaryGrad: 'linear-gradient(135deg,#7C3AED,#A78BFA)',
  pill: '#1e1e30', pillText: '#aaaaaa', inputBg: '#1a1a2e', navBg: '#12121f',
  danger: '#ff4d4d', dangerBg: '#1a0a0a', green: '#4ade80', greenBg: '#0d2d1e',
} : {
  bg: '#F8F7F4', card: '#FFFFFF', card2: '#F0EEF8', border: '#E5E2F0',
  text: '#1C1B2E', textSub: '#6B6880', textMuted: '#A09DB5',
  primary: '#7C3AED', primaryLight: '#A78BFA',
  primaryGrad: 'linear-gradient(135deg,#7C3AED,#A78BFA)',
  pill: '#F0EEF8', pillText: '#6B6880', inputBg: '#F0EEF8', navBg: '#FFFFFF',
  danger: '#dc2626', dangerBg: '#fef2f2', green: '#16a34a', greenBg: '#f0fdf4',
}

function WelcomeScreen({ onStart, onTest, onLogin, onRegister, lang, setLang, theme }) {
  const c = getColors(theme)
  return (
    <div style={{ minHeight: '100vh', background: c.bg, fontFamily: 'sans-serif', color: c.text, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '22px', color: c.text }}>にほんご<span style={{ color: c.primary }}>GO</span></h1>
        <button onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')}
          style={{ background: 'none', border: `1px solid ${c.border}`, borderRadius: '20px', padding: '6px 14px', color: c.textSub, fontSize: '13px', cursor: 'pointer' }}>
          {lang === 'ar' ? 'EN' : 'ع'}
        </button>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '80px', marginBottom: '8px' }}>🎌</div>
        <h2 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '12px', lineHeight: 1.2, color: c.text }}>
          {lang === 'ar' ? 'تعلّم اليابانية' : 'Learn Japanese'}
        </h2>
        <p style={{ color: c.textSub, fontSize: '15px', marginBottom: '48px', maxWidth: '280px', lineHeight: 1.6 }}>
          {lang === 'ar' ? 'تعلم الحروف والمفردات بطريقة ممتعة' : 'Learn characters and vocabulary in a fun way'}
        </p>
        <div style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button onClick={onStart} style={{ width: '100%', padding: '18px', background: c.primaryGrad, border: 'none', borderRadius: '16px', color: 'white', fontSize: '17px', fontWeight: '600', cursor: 'pointer' }}>
            {lang === 'ar' ? '🚀 ابدأ التعلم من الصفر' : '🚀 Start from scratch'}
          </button>
          <button onClick={onTest} style={{ width: '100%', padding: '18px', background: c.card2, border: `1.5px solid ${c.primary}`, borderRadius: '16px', color: c.text, fontSize: '17px', fontWeight: '500', cursor: 'pointer' }}>
            {lang === 'ar' ? '🧠 اختبر معلوماتك' : '🧠 Test your knowledge'}
          </button>
          <button onClick={onRegister} style={{ width: '100%', padding: '18px', background: c.card, border: `1.5px solid ${c.border}`, borderRadius: '16px', color: c.text, fontSize: '17px', fontWeight: '500', cursor: 'pointer' }}>
            {lang === 'ar' ? '✨ أنشئ حساب' : '✨ Create account'}
          </button>
          <button onClick={onLogin} style={{ width: '100%', padding: '10px', background: 'none', border: 'none', color: c.textMuted, fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }}>
            {lang === 'ar' ? 'لدي حساب بالفعل' : 'I already have an account'}
          </button>
        </div>
      </div>
      <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
        {[1,2,3].map(i => (
          <div key={i} style={{ width: i === 1 ? '24px' : '8px', height: '8px', borderRadius: '4px', background: i === 1 ? c.primary : c.border }} />
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState('loading')
  const [tab, setTab] = useState('home')
  const [lettersTab, setLettersTab] = useState('hiragana')
  const [contentTab, setContentTab] = useState('vocab')
  const [currentLevel, setCurrentLevel] = useState('N5')
  const [showLevelPicker, setShowLevelPicker] = useState(false)
  const [lessonProgress, setLessonProgress] = useState({})
  const [profileScreen, setProfileScreen] = useState('main')
  const [lang, setLang] = useState('ar')
  const [theme, setTheme] = useState('dark')
  const [userName, setUserName] = useState('')
  const [userBio, setUserBio] = useState('')
  const [userPhone, setUserPhone] = useState('')
  const [userBirthday, setUserBirthday] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState(null)
  const [loginMode, setLoginMode] = useState('login')
  const [dataReady, setDataReady] = useState(false)
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
  const [daysUsed] = useState(12)

  const c = getColors(theme)
  const t = translations[lang]

  const LEVELS = [
    { id: 'N5', desc: lang === 'ar' ? 'مبتدئ' : 'Beginner', unlocked: true },
    { id: 'N4', desc: lang === 'ar' ? 'أساسي' : 'Elementary', unlocked: false },
    { id: 'N3', desc: lang === 'ar' ? 'متوسط' : 'Intermediate', unlocked: false },
    { id: 'N2', desc: lang === 'ar' ? 'متقدم' : 'Advanced', unlocked: false },
    { id: 'N1', desc: lang === 'ar' ? 'احترافي' : 'Professional', unlocked: false },
  ]

  const TOTAL_LESSONS = 25
  const SECTIONS_PER_LESSON = 5

  const getLessonStatus = (lessonNum) => {
    const done = lessonProgress[`${currentLevel}-${lessonNum}`] || 0
    if (lessonNum === 1) return done >= SECTIONS_PER_LESSON ? 'done' : 'current'
    const prev = lessonProgress[`${currentLevel}-${lessonNum - 1}`] || 0
    if (prev >= SECTIONS_PER_LESSON) return done >= SECTIONS_PER_LESSON ? 'done' : 'current'
    return 'locked'
  }

  const levelProgress = Math.round(
    (Object.keys(lessonProgress).filter(k => k.startsWith(currentLevel) && lessonProgress[k] >= SECTIONS_PER_LESSON).length / TOTAL_LESSONS) * 100
  )

  useEffect(() => {
    const saved = localStorage.getItem('nihongo-theme')
    if (saved) setTheme(saved)
    const savedLang = localStorage.getItem('nihongo-lang')
    if (savedLang) setLang(savedLang)
  }, [])

  useEffect(() => { localStorage.setItem('nihongo-theme', theme) }, [theme])
  useEffect(() => { localStorage.setItem('nihongo-lang', lang) }, [lang])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid)
        setUserName(user.displayName || '')
        setUserEmail(user.email || '')
        const docRef = doc(db, 'users', user.uid)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          const d = docSnap.data()
          setXp(d.xp ?? 0)
          setHearts(d.hearts ?? 5)
          setGems(d.gems ?? 500)
          setProgress(d.progress ?? {})
          setTotalQuizzes(d.totalQuizzes ?? 0)
          setPerfectScores(d.perfectScores ?? 0)
          setLastScore(d.lastScore ?? 0)
          setUserBio(d.userBio ?? '')
          setUserPhone(d.userPhone ?? '')
          setUserBirthday(d.userBirthday ?? '')
          setLessonProgress(d.lessonProgress ?? {})
          if (d.userName) setUserName(d.userName)
        }
        setDataReady(true)
        setScreen('main')
      } else {
        setScreen('welcome')
      }
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!userId || !dataReady) return
    setDoc(doc(db, 'users', userId), {
      xp, hearts, gems, progress, totalQuizzes, perfectScores,
      lastScore, userName, userBio, userPhone, userBirthday, lessonProgress
    })
  }, [xp, hearts, gems, progress, totalQuizzes, perfectScores, lastScore, userName, userBio, userPhone, userBirthday, lessonProgress])

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

  const handleSignOut = async () => {
    await signOut(auth)
    setUserId(null); setUserName(''); setUserEmail(''); setUserBio('')
    setUserPhone(''); setUserBirthday(''); setXp(0); setHearts(5)
    setGems(500); setProgress({}); setTotalQuizzes(0)
    setPerfectScores(0); setLastScore(0); setDataReady(false)
    setScreen('welcome')
  }

  // LOADING
  if (screen === 'loading') return (
    <div style={{ minHeight: '100vh', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '60px', marginBottom: '16px' }}>🎌</div>
        <h1 style={{ color: c.text, fontSize: '24px', margin: '0 0 8px' }}>にほんご<span style={{ color: c.primary }}>GO</span></h1>
        <div style={{ width: '160px', height: '3px', background: c.border, borderRadius: '4px', overflow: 'hidden', margin: '16px auto 0' }}>
          <div style={{ height: '100%', background: c.primaryGrad, borderRadius: '4px', animation: 'load 1.5s ease infinite' }} />
        </div>
        <style>{`@keyframes load { 0%{width:0%} 100%{width:100%} }`}</style>
      </div>
    </div>
  )

  if (screen === 'welcome') return (
    <WelcomeScreen lang={lang} setLang={setLang} theme={theme}
      onStart={() => setScreen('main')}
      onTest={() => { setScreen('main'); setTab('home'); setTimeout(startQuiz, 200) }}
      onLogin={() => { setLoginMode('login'); setScreen('login') }}
      onRegister={() => { setLoginMode('register'); setScreen('login') }}
    />
  )

  if (screen === 'login') return (
    <Login lang={lang} initialMode={loginMode}
      onBack={() => setScreen('welcome')}
      onLogin={(name) => { setUserName(name); setScreen('main') }}
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
  const masteredCount = Object.values(progress).filter(v => v >= 10).length
  const n5Progress = Math.round((masteredCount / 46) * 100)

  // LEVEL PICKER POPUP
  const LevelPicker = () => (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
      onClick={() => setShowLevelPicker(false)}>
      <div style={{ width: '100%', background: c.card, borderRadius: '24px 24px 0 0', padding: '24px 20px', border: `0.5px solid ${c.border}` }}
        onClick={e => e.stopPropagation()}>
        <div style={{ width: '40px', height: '4px', background: c.border, borderRadius: '2px', margin: '0 auto 20px' }} />
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: c.text }}>{lang === 'ar' ? 'اختر المستوى' : 'Choose Level'}</h3>
        {LEVELS.map((lv) => (
          <button key={lv.id}
            onClick={() => { if (lv.unlocked) { setCurrentLevel(lv.id); setShowLevelPicker(false) } }}
            style={{ width: '100%', padding: '14px 16px', background: currentLevel === lv.id ? c.primaryGrad : c.card2, border: currentLevel === lv.id ? 'none' : `0.5px solid ${c.border}`, borderRadius: '12px', color: lv.unlocked ? (currentLevel === lv.id ? 'white' : c.text) : c.textMuted, fontSize: '15px', cursor: lv.unlocked ? 'pointer' : 'not-allowed', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', opacity: lv.unlocked ? 1 : 0.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '18px', fontWeight: '700' }}>{lv.id}</span>
              <span style={{ fontSize: '13px' }}>{lv.desc}</span>
            </div>
            <span>{lv.unlocked ? (currentLevel === lv.id ? '✓' : '→') : '🔒'}</span>
          </button>
        ))}
      </div>
    </div>
  )

  const EditProfileScreen = () => {
    const [editName, setEditName] = useState(userName)
    const [editBio, setEditBio] = useState(userBio)
    const [editPhone, setEditPhone] = useState(userPhone)
    const [editBirthday, setEditBirthday] = useState(userBirthday)
    const save = () => { setUserName(editName); setUserBio(editBio); setUserPhone(editPhone); setUserBirthday(editBirthday); setProfileScreen('settings') }
    const inputStyle = { width: '100%', padding: '12px 14px', background: c.inputBg, border: `0.5px solid ${c.border}`, borderRadius: '10px', color: c.text, fontSize: '14px', outline: 'none', direction: 'ltr', fontFamily: 'sans-serif', marginTop: '6px' }
    const labelStyle = { fontSize: '12px', color: c.textSub, display: 'block' }
    return (
      <div style={{ minHeight: '100vh', background: c.bg, fontFamily: 'sans-serif', color: c.text, direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
        <div style={{ background: c.card, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: `0.5px solid ${c.border}` }}>
          <button onClick={() => setProfileScreen('settings')} style={{ background: 'none', border: 'none', color: c.textSub, fontSize: '20px', cursor: 'pointer' }}>←</button>
          <h2 style={{ margin: 0, fontSize: '17px' }}>{lang === 'ar' ? 'تعديل الملف الشخصي' : 'Edit Profile'}</h2>
        </div>
        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: c.primaryGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', margin: '0 auto 8px' }}>🧑</div>
            <button style={{ background: 'none', border: 'none', color: c.primary, fontSize: '13px', cursor: 'pointer' }}>{lang === 'ar' ? 'تغيير الصورة' : 'Change photo'}</button>
          </div>
          <div><label style={labelStyle}>{lang === 'ar' ? 'الاسم' : 'Name'}</label><input value={editName} onChange={e => setEditName(e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>{lang === 'ar' ? 'نبذة عني' : 'Bio'}</label><input value={editBio} onChange={e => setEditBio(e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>{lang === 'ar' ? 'رقم الهاتف' : 'Phone'}</label><input value={editPhone} onChange={e => setEditPhone(e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>{lang === 'ar' ? 'تاريخ الميلاد' : 'Birthday'}</label><input type="date" value={editBirthday} onChange={e => setEditBirthday(e.target.value)} style={inputStyle} /></div>
          <div>
            <label style={labelStyle}>{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
            <input value={userEmail} disabled style={{ ...inputStyle, color: c.textMuted, cursor: 'not-allowed' }} />
          </div>
          <button onClick={save} style={{ width: '100%', padding: '14px', background: c.primaryGrad, border: 'none', borderRadius: '12px', color: 'white', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
            {lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}
          </button>
          <button onClick={() => setProfileScreen('settings')} style={{ width: '100%', padding: '14px', background: 'none', border: `0.5px solid ${c.border}`, borderRadius: '12px', color: c.textSub, fontSize: '14px', cursor: 'pointer' }}>
            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
        </div>
      </div>
    )
  }

  const SettingsScreen = () => {
    const settingsItems = [
      { icon: '👤', label: userId ? (lang === 'ar' ? 'تعديل الملف الشخصي' : 'Edit Profile') : (lang === 'ar' ? 'إنشاء ملف شخصي' : 'Create Profile'), action: () => userId ? setProfileScreen('edit') : setScreen('login') },
      { icon: '💎', label: lang === 'ar' ? 'نوع الاشتراك' : 'Subscription', action: () => {} },
      { icon: '🔔', label: lang === 'ar' ? 'الإشعارات' : 'Notifications', action: () => {} },
      { icon: '🎯', label: lang === 'ar' ? 'مستوى اللغة' : 'Language Level', action: () => {} },
      { icon: '⚙️', label: lang === 'ar' ? 'التفضيلات' : 'Preferences', action: () => {} },
      { icon: '🛡️', label: lang === 'ar' ? 'سياسة التطبيق' : 'Privacy Policy', action: () => {} },
      { icon: '💬', label: lang === 'ar' ? 'الدعم المباشر' : 'Support', action: () => {} },
    ]
    return (
      <div style={{ minHeight: '100vh', background: c.bg, fontFamily: 'sans-serif', color: c.text, direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
        <div style={{ background: c.card, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: `0.5px solid ${c.border}` }}>
          <button onClick={() => setProfileScreen('main')} style={{ background: 'none', border: 'none', color: c.textSub, fontSize: '20px', cursor: 'pointer' }}>←</button>
          <h2 style={{ margin: 0, fontSize: '17px' }}>{lang === 'ar' ? 'الإعدادات' : 'Settings'}</h2>
        </div>
        <div style={{ padding: '16px' }}>
          <div style={{ width: '100%', padding: '16px', background: c.card, border: `0.5px solid ${c.border}`, borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
            <span style={{ fontSize: '22px' }}>{theme === 'dark' ? '🌙' : '☀️'}</span>
            <span style={{ flex: 1, fontSize: '15px', color: c.text }}>{theme === 'dark' ? t.darkMode : t.lightMode}</span>
            <div onClick={() => setTheme(th => th === 'dark' ? 'light' : 'dark')}
              style={{ width: '48px', height: '26px', borderRadius: '13px', background: theme === 'dark' ? c.primary : c.border, cursor: 'pointer', position: 'relative', transition: 'background 0.3s' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px', left: theme === 'dark' ? '25px' : '3px', transition: 'left 0.3s' }} />
            </div>
          </div>
          {settingsItems.map((item, i) => (
            <button key={i} onClick={item.action}
              style={{ width: '100%', padding: '16px', background: c.card, border: `0.5px solid ${c.border}`, borderRadius: '14px', color: c.text, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px', textAlign: lang === 'ar' ? 'right' : 'left' }}>
              <span style={{ fontSize: '22px' }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              <span style={{ color: c.textMuted, fontSize: '18px' }}>›</span>
            </button>
          ))}
          {userId ? (
            <button onClick={handleSignOut} style={{ width: '100%', padding: '16px', background: c.dangerBg, border: `0.5px solid ${c.danger}33`, borderRadius: '14px', color: c.danger, fontSize: '15px', cursor: 'pointer', marginTop: '8px' }}>
              {lang === 'ar' ? '← تسجيل الخروج' : '← Sign Out'}
            </button>
          ) : (
            <button onClick={() => { setProfileScreen('main'); setScreen('login') }} style={{ width: '100%', padding: '16px', background: c.primaryGrad, border: 'none', borderRadius: '14px', color: 'white', fontSize: '15px', cursor: 'pointer', marginTop: '8px' }}>
              ✨ {lang === 'ar' ? 'أنشئ حساب' : 'Create Account'}
            </button>
          )}
        </div>
      </div>
    )
  }

  const ProfileTab = () => {
    if (profileScreen === 'settings') return <SettingsScreen />
    if (profileScreen === 'edit') return <EditProfileScreen />
    const isComplete = userName && userBio && userPhone && userBirthday
    return (
      <div style={{ paddingBottom: '90px', background: c.bg, minHeight: '100vh' }}>
        <div style={{ background: c.card, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `0.5px solid ${c.border}` }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: c.text }}>{lang === 'ar' ? 'حسابي' : 'My Profile'}</h2>
          <button onClick={() => setProfileScreen('settings')} style={{ background: 'none', border: 'none', color: c.textSub, fontSize: '22px', cursor: 'pointer' }}>⚙️</button>
        </div>
        <div style={{ padding: '24px 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: c.primaryGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', margin: '0 auto 12px', border: `3px solid ${c.primary}33` }}>🧑</div>
            <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: '700', color: c.text }}>{userName || (lang === 'ar' ? 'متعلم' : 'Learner')}</h2>
            {userBio && <p style={{ color: c.textSub, fontSize: '13px', margin: '0 0 8px' }}>{userBio}</p>}
            <p style={{ color: c.textMuted, fontSize: '13px', margin: 0 }}>🎌 {lang === 'ar' ? 'متعلم ياباني' : 'Japanese Learner'}</p>
          </div>
          {!userId ? (
            <button onClick={() => setScreen('login')} style={{ width: '100%', padding: '14px', background: c.primaryGrad, border: 'none', borderRadius: '14px', color: 'white', fontSize: '14px', cursor: 'pointer', marginBottom: '20px' }}>
              ✨ {lang === 'ar' ? 'أنشئ حساب لحفظ تقدمك' : 'Create account to save progress'}
            </button>
          ) : !isComplete ? (
            <button onClick={() => setProfileScreen('edit')} style={{ width: '100%', padding: '14px', background: c.card2, border: `1px solid ${c.primary}44`, borderRadius: '14px', color: c.text, fontSize: '14px', cursor: 'pointer', marginBottom: '20px', textAlign: 'center' }}>
              <span style={{ color: c.primary }}>✦</span> {lang === 'ar' ? 'أكمل ملفك الشخصي ←' : 'Complete your profile ←'}
            </button>
          ) : null}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            {[['0', lang === 'ar' ? 'متابَعون' : 'Following'], ['0', lang === 'ar' ? 'متابِعون' : 'Followers'], [totalQuizzes, lang === 'ar' ? 'اختبار' : 'Quizzes']].map(([val, label], i) => (
              <div key={i} style={{ flex: 1, background: c.card, border: `0.5px solid ${c.border}`, borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: '700', color: c.text }}>{val}</div>
                <div style={{ fontSize: '12px', color: c.textMuted, marginTop: '2px' }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ background: c.card, border: `0.5px solid ${c.border}`, borderRadius: '16px', padding: '18px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '600', color: c.text }}>{lang === 'ar' ? 'تقدمك في N5' : 'N5 Progress'}</p>
                <p style={{ margin: 0, fontSize: '12px', color: c.textSub }}>{masteredCount}/46 {lang === 'ar' ? 'حرف محفوظ' : 'chars mastered'}</p>
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: c.primary }}>{n5Progress}%</div>
            </div>
            <div style={{ background: c.border, borderRadius: '8px', height: '8px' }}>
              <div style={{ background: c.primaryGrad, width: `${n5Progress}%`, height: '100%', borderRadius: '8px', transition: 'width 0.5s' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            {[['⚡', xp, 'XP'], ['🔥', streak, lang === 'ar' ? 'ستريك' : 'Streak'], ['📅', daysUsed, lang === 'ar' ? 'أيام' : 'Days']].map(([icon, val, label], i) => (
              <div key={i} style={{ background: c.card, border: `0.5px solid ${c.border}`, borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px' }}>{icon}</div>
                <div style={{ fontSize: '22px', fontWeight: '700', margin: '4px 0 2px', color: c.text }}>{val}</div>
                <div style={{ fontSize: '11px', color: c.textMuted }}>{label}</div>
              </div>
            ))}
          </div>
          <p style={{ color: c.textMuted, fontSize: '12px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>{lang === 'ar' ? 'الإنجازات' : 'Achievements'}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {ACHIEVEMENTS.map((a) => {
              const unlocked = a.condition(stats)
              return (
                <div key={a.id} style={{ background: c.card, border: unlocked ? `1px solid ${c.primary}33` : `0.5px solid ${c.border}`, borderRadius: '14px', padding: '16px', textAlign: 'center', opacity: unlocked ? 1 : 0.3 }}>
                  <div style={{ fontSize: '28px', marginBottom: '6px' }}>{a.icon}</div>
                  <div style={{ fontSize: '11px', color: unlocked ? c.primary : c.textMuted }}>{a.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const HomeTab = () => (
    <div style={{ paddingBottom: '90px', background: c.bg, minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: c.card, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `0.5px solid ${c.border}` }}>
        <h1 style={{ margin: 0, fontSize: '20px', color: c.text }}>にほんご<span style={{ color: c.primary }}>GO</span></h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', background: c.pill, padding: '4px 10px', borderRadius: '20px', color: c.pillText }}>❤️ {hearts}/5</span>
          <span style={{ fontSize: '12px', background: c.pill, padding: '4px 10px', borderRadius: '20px', color: c.pillText }}>💎 {gems}</span>
          <span style={{ fontSize: '12px', background: c.pill, padding: '4px 10px', borderRadius: '20px', color: c.pillText }}>🔥 {streak}</span>
        </div>
      </div>

      {/* Level progress bar — tappable */}
      <button onClick={() => setShowLevelPicker(true)}
        style={{ width: '100%', background: c.card2, border: 'none', borderBottom: `0.5px solid ${c.border}`, padding: '10px 20px', cursor: 'pointer', textAlign: lang === 'ar' ? 'right' : 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: c.text }}>{currentLevel} — {LEVELS.find(l => l.id === currentLevel)?.desc}</span>
          <span style={{ fontSize: '12px', color: c.primary, fontWeight: '600' }}>{levelProgress}% ↕</span>
        </div>
        <div style={{ background: c.border, borderRadius: '6px', height: '5px' }}>
          <div style={{ background: c.primaryGrad, width: `${levelProgress}%`, height: '100%', borderRadius: '6px', transition: 'width 0.5s' }} />
        </div>
      </button>

      {/* Content tab — Vocab / Grammar */}
      <div style={{ display: 'flex', background: c.card, borderBottom: `0.5px solid ${c.border}` }}>
        {['vocab', 'grammar'].map(tb => (
          <button key={tb} onClick={() => setContentTab(tb)}
            style={{ flex: 1, padding: '12px', background: 'none', border: 'none', fontSize: '14px', fontWeight: '500', cursor: 'pointer', color: contentTab === tb ? c.primary : c.textMuted, borderBottom: contentTab === tb ? `2px solid ${c.primary}` : '2px solid transparent', transition: 'all 0.15s' }}>
            {tb === 'vocab' ? t.vocab : t.grammar}
          </button>
        ))}
      </div>

      {/* Lesson map */}
      <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
        {Array.from({ length: TOTAL_LESSONS }, (_, i) => i + 1).map((lessonNum) => {
          const status = getLessonStatus(lessonNum)
          const isDone = status === 'done'
          const isCurrent = status === 'current'
          const isLocked = status === 'locked'
          const sections = lessonProgress[`${currentLevel}-${lessonNum}`] || 0

          return (
            <div key={lessonNum} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Connector line */}
              {lessonNum > 1 && (
                <div style={{ width: '2px', height: '20px', background: isDone ? c.primary : c.border, transition: 'background 0.3s' }} />
              )}

              {/* Lesson circle */}
              <button
                disabled={isLocked}
                onClick={() => {
                  if (!isLocked) {
                    const key = `${currentLevel}-${lessonNum}`
                    setLessonProgress(p => ({ ...p, [key]: Math.min((p[key] || 0) + 1, SECTIONS_PER_LESSON) }))
                    startQuiz()
                  }
                }}
                style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: isDone ? c.primaryGrad : isCurrent ? c.card : c.card2,
                  border: isDone ? 'none' : isCurrent ? `2px solid ${c.primary}` : `1.5px solid ${c.border}`,
                  color: isDone ? 'white' : isCurrent ? c.primary : c.textMuted,
                  fontSize: '18px', fontWeight: '700', cursor: isLocked ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: isLocked ? 0.4 : 1, transition: 'all 0.2s',
                  boxShadow: isCurrent ? `0 0 0 4px ${c.primary}22` : 'none'
                }}>
                {isDone ? '✓' : isLocked ? '🔒' : lessonNum}
              </button>

              {/* Section dots */}
              {!isLocked && (
                <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                  {Array.from({ length: SECTIONS_PER_LESSON }, (_, si) => (
                    <div key={si} style={{ width: '6px', height: '6px', borderRadius: '50%', background: si < sections ? c.primary : c.border, transition: 'background 0.3s' }} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
        <div style={{ height: '20px' }} />
      </div>
    </div>
  )

  const LettersTab = () => {
    const hiraganaGroups = [
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
      { label: lang === 'ar' ? 'المشتقات (dakuten)' : 'Dakuten', chars: [
        { k: 'が', r: 'ga' }, { k: 'ぎ', r: 'gi' }, { k: 'ぐ', r: 'gu' }, { k: 'げ', r: 'ge' }, { k: 'ご', r: 'go' },
        { k: 'ざ', r: 'za' }, { k: 'じ', r: 'ji' }, { k: 'ず', r: 'zu' }, { k: 'ぜ', r: 'ze' }, { k: 'ぞ', r: 'zo' },
        { k: 'だ', r: 'da' }, { k: 'ぢ', r: 'di' }, { k: 'づ', r: 'du' }, { k: 'で', r: 'de' }, { k: 'ど', r: 'do' },
        { k: 'ば', r: 'ba' }, { k: 'び', r: 'bi' }, { k: 'ぶ', r: 'bu' }, { k: 'べ', r: 'be' }, { k: 'ぼ', r: 'bo' },
        { k: 'ぱ', r: 'pa' }, { k: 'ぴ', r: 'pi' }, { k: 'ぷ', r: 'pu' }, { k: 'ぺ', r: 'pe' }, { k: 'ぽ', r: 'po' },
      ]},
      { label: lang === 'ar' ? 'التركيبات' : 'Combinations', chars: [
        { k: 'きゃ', r: 'kya' }, { k: 'きゅ', r: 'kyu' }, { k: 'きょ', r: 'kyo' },
        { k: 'しゃ', r: 'sha' }, { k: 'しゅ', r: 'shu' }, { k: 'しょ', r: 'sho' },
        { k: 'ちゃ', r: 'cha' }, { k: 'ちゅ', r: 'chu' }, { k: 'ちょ', r: 'cho' },
        { k: 'にゃ', r: 'nya' }, { k: 'にゅ', r: 'nyu' }, { k: 'にょ', r: 'nyo' },
        { k: 'ひゃ', r: 'hya' }, { k: 'ひゅ', r: 'hyu' }, { k: 'ひょ', r: 'hyo' },
        { k: 'みゃ', r: 'mya' }, { k: 'みゅ', r: 'myu' }, { k: 'みょ', r: 'myo' },
        { k: 'りゃ', r: 'rya' }, { k: 'りゅ', r: 'ryu' }, { k: 'りょ', r: 'ryo' },
        { k: 'ぎゃ', r: 'gya' }, { k: 'ぎゅ', r: 'gyu' }, { k: 'ぎょ', r: 'gyo' },
        { k: 'じゃ', r: 'ja' },  { k: 'じゅ', r: 'ju' },  { k: 'じょ', r: 'jo' },
        { k: 'びゃ', r: 'bya' }, { k: 'びゅ', r: 'byu' }, { k: 'びょ', r: 'byo' },
        { k: 'ぴゃ', r: 'pya' }, { k: 'ぴゅ', r: 'pyu' }, { k: 'ぴょ', r: 'pyo' },
      ]},
    ]

    const katakanaGroups = [
      { label: 'ア行', chars: [{ k: 'ア', r: 'a' }, { k: 'イ', r: 'i' }, { k: 'ウ', r: 'u' }, { k: 'エ', r: 'e' }, { k: 'オ', r: 'o' }] },
      { label: 'カ行', chars: [{ k: 'カ', r: 'ka' }, { k: 'キ', r: 'ki' }, { k: 'ク', r: 'ku' }, { k: 'ケ', r: 'ke' }, { k: 'コ', r: 'ko' }] },
      { label: 'サ行', chars: [{ k: 'サ', r: 'sa' }, { k: 'シ', r: 'shi' }, { k: 'ス', r: 'su' }, { k: 'セ', r: 'se' }, { k: 'ソ', r: 'so' }] },
      { label: 'タ行', chars: [{ k: 'タ', r: 'ta' }, { k: 'チ', r: 'chi' }, { k: 'ツ', r: 'tsu' }, { k: 'テ', r: 'te' }, { k: 'ト', r: 'to' }] },
      { label: 'ナ行', chars: [{ k: 'ナ', r: 'na' }, { k: 'ニ', r: 'ni' }, { k: 'ヌ', r: 'nu' }, { k: 'ネ', r: 'ne' }, { k: 'ノ', r: 'no' }] },
      { label: 'ハ行', chars: [{ k: 'ハ', r: 'ha' }, { k: 'ヒ', r: 'hi' }, { k: 'フ', r: 'fu' }, { k: 'ヘ', r: 'he' }, { k: 'ホ', r: 'ho' }] },
      { label: 'マ行', chars: [{ k: 'マ', r: 'ma' }, { k: 'ミ', r: 'mi' }, { k: 'ム', r: 'mu' }, { k: 'メ', r: 'me' }, { k: 'モ', r: 'mo' }] },
      { label: 'ヤ行', chars: [{ k: 'ヤ', r: 'ya' }, { k: 'ユ', r: 'yu' }, { k: 'ヨ', r: 'yo' }] },
      { label: 'ラ行', chars: [{ k: 'ラ', r: 'ra' }, { k: 'リ', r: 'ri' }, { k: 'ル', r: 'ru' }, { k: 'レ', r: 're' }, { k: 'ロ', r: 'ro' }] },
      { label: 'ワ行', chars: [{ k: 'ワ', r: 'wa' }, { k: 'ヲ', r: 'wo' }, { k: 'ン', r: 'n' }] },
      { label: lang === 'ar' ? 'المشتقات' : 'Dakuten', chars: [
        { k: 'ガ', r: 'ga' }, { k: 'ギ', r: 'gi' }, { k: 'グ', r: 'gu' }, { k: 'ゲ', r: 'ge' }, { k: 'ゴ', r: 'go' },
        { k: 'ザ', r: 'za' }, { k: 'ジ', r: 'ji' }, { k: 'ズ', r: 'zu' }, { k: 'ゼ', r: 'ze' }, { k: 'ゾ', r: 'zo' },
        { k: 'ダ', r: 'da' }, { k: 'ヂ', r: 'di' }, { k: 'ヅ', r: 'du' }, { k: 'デ', r: 'de' }, { k: 'ド', r: 'do' },
        { k: 'バ', r: 'ba' }, { k: 'ビ', r: 'bi' }, { k: 'ブ', r: 'bu' }, { k: 'ベ', r: 'be' }, { k: 'ボ', r: 'bo' },
        { k: 'パ', r: 'pa' }, { k: 'ピ', r: 'pi' }, { k: 'プ', r: 'pu' }, { k: 'ペ', r: 'pe' }, { k: 'ポ', r: 'po' },
      ]},
      { label: lang === 'ar' ? 'التركيبات' : 'Combinations', chars: [
        { k: 'キャ', r: 'kya' }, { k: 'キュ', r: 'kyu' }, { k: 'キョ', r: 'kyo' },
        { k: 'シャ', r: 'sha' }, { k: 'シュ', r: 'shu' }, { k: 'ショ', r: 'sho' },
        { k: 'チャ', r: 'cha' }, { k: 'チュ', r: 'chu' }, { k: 'チョ', r: 'cho' },
        { k: 'ニャ', r: 'nya' }, { k: 'ニュ', r: 'nyu' }, { k: 'ニョ', r: 'nyo' },
        { k: 'ヒャ', r: 'hya' }, { k: 'ヒュ', r: 'hyu' }, { k: 'ヒョ', r: 'hyo' },
        { k: 'ミャ', r: 'mya' }, { k: 'ミュ', r: 'myu' }, { k: 'ミョ', r: 'myo' },
        { k: 'リャ', r: 'rya' }, { k: 'リュ', r: 'ryu' }, { k: 'リョ', r: 'ryo' },
        { k: 'ギャ', r: 'gya' }, { k: 'ギュ', r: 'gyu' }, { k: 'ギョ', r: 'gyo' },
        { k: 'ジャ', r: 'ja' },  { k: 'ジュ', r: 'ju' },  { k: 'ジョ', r: 'jo' },
        { k: 'ビャ', r: 'bya' }, { k: 'ビュ', r: 'byu' }, { k: 'ビョ', r: 'byo' },
        { k: 'ピャ', r: 'pya' }, { k: 'ピュ', r: 'pyu' }, { k: 'ピョ', r: 'pyo' },
      ]},
    ]

    const kanjiGroups = [
      { label: lang === 'ar' ? 'أرقام' : 'Numbers', chars: [
        { k: '一', r: 'ichi' }, { k: '二', r: 'ni' }, { k: '三', r: 'san' },
        { k: '四', r: 'shi' }, { k: '五', r: 'go' }, { k: '六', r: 'roku' },
        { k: '七', r: 'nana' }, { k: '八', r: 'hachi' }, { k: '九', r: 'ku' },
        { k: '十', r: 'juu' }, { k: '百', r: 'hyaku' }, { k: '千', r: 'sen' }, { k: '万', r: 'man' },
      ]},
      { label: lang === 'ar' ? 'طبيعة' : 'Nature', chars: [
        { k: '日', r: 'nichi' }, { k: '月', r: 'tsuki' }, { k: '火', r: 'hi' },
        { k: '水', r: 'mizu' }, { k: '木', r: 'ki' }, { k: '金', r: 'kin' }, { k: '土', r: 'tsuchi' },
        { k: '山', r: 'yama' }, { k: '川', r: 'kawa' },
      ]},
      { label: lang === 'ar' ? 'إنسان' : 'People', chars: [
        { k: '人', r: 'hito' }, { k: '口', r: 'kuchi' }, { k: '手', r: 'te' },
        { k: '目', r: 'me' }, { k: '耳', r: 'mimi' }, { k: '子', r: 'ko' },
        { k: '女', r: 'onna' }, { k: '男', r: 'otoko' },
      ]},
      { label: lang === 'ar' ? 'وصف' : 'Description', chars: [
        { k: '大', r: 'oo' }, { k: '小', r: 'chii' }, { k: '中', r: 'naka' },
        { k: '上', r: 'ue' }, { k: '下', r: 'shita' },
      ]},
      { label: lang === 'ar' ? 'متنوع' : 'Misc', chars: [
        { k: '本', r: 'hon' }, { k: '年', r: 'nen' }, { k: '時', r: 'toki' },
        { k: '国', r: 'kuni' }, { k: '語', r: 'go' },
      ]},
    ]

    const sectionData = {
      hiragana: { groups: hiraganaGroups, quizSet: 'hiragana' },
      katakana: { groups: katakanaGroups, quizSet: 'katakana' },
      kanji:    { groups: kanjiGroups,    quizSet: 'kanji' },
    }

    const { groups: currentGroups } = sectionData[lettersTab] || sectionData.hiragana

    const startSectionQuiz = (quizSet) => {
      import('./data.js').then(({ hiragana: h, katakana: k, kanjiN5: kj }) => {
        const sets = { hiragana: h, katakana: k, kanji: kj }
        const q = shuffle(sets[quizSet] || h).slice(0, 10)
        setQuestions(q)
        setQIndex(0)
        setSelected(null)
        setScore(0)
        setScreen('quiz')
      })
    }

    const tabs = [
      { id: 'hiragana', label: 'Hiragana' },
      { id: 'katakana', label: 'Katakana' },
      { id: 'kanji',    label: 'Kanji N5' },
    ]

    return (
      <div style={{ paddingBottom: '90px', background: c.bg, minHeight: '100vh' }}>
        {/* Header with tabs */}
        <div style={{ background: c.card, padding: '18px 20px', borderBottom: `0.5px solid ${c.border}` }}>
          <h2 style={{ margin: '0 0 14px', fontSize: '18px', color: c.text }}>{lang === 'ar' ? 'الأحرف' : 'Characters'}</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {tabs.map(tb => (
              <button key={tb.id} onClick={() => setLettersTab(tb.id)}
                style={{ padding: '8px 14px', borderRadius: '20px', border: 'none', fontSize: '12px', fontWeight: '500', cursor: 'pointer', background: lettersTab === tb.id ? c.primaryGrad : c.pill, color: lettersTab === tb.id ? 'white' : c.pillText }}>
                {tb.label}
              </button>
            ))}
          </div>
        </div>

        {/* Practice Now button */}
        <div style={{ padding: '12px 16px', background: c.card2, borderBottom: `0.5px solid ${c.border}` }}>
          <button
            onClick={() => startSectionQuiz(lettersTab)}
            style={{ width: '100%', padding: '13px', background: c.primaryGrad, border: 'none', borderRadius: '12px', color: 'white', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
            ⚡ {lang === 'ar' ? 'تدرب الآن' : 'Practice Now'}
          </button>
        </div>

        {/* Character groups */}
        <div style={{ padding: '16px' }}>
          {currentGroups.map((group, gi) => (
            <div key={gi} style={{ marginBottom: '24px' }}>
              <p style={{ color: c.primary, fontSize: '12px', marginBottom: '10px', fontWeight: '600', letterSpacing: '1px' }}>{group.label}</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {group.chars.map((ch, ci) => {
                  const practiced = progress[ch.k] || 0
                  const percent = Math.min((practiced / 10) * 100, 100)
                  const done = practiced >= 10
                  return (
                    <div key={ci}
                      onClick={() => { const u = new SpeechSynthesisUtterance(ch.k); u.lang = 'ja-JP'; window.speechSynthesis.speak(u) }}
                      style={{ background: done ? c.greenBg : c.card, border: done ? `1px solid ${c.green}66` : `0.5px solid ${c.border}`, borderRadius: '12px', padding: '10px 8px', textAlign: 'center', cursor: 'pointer', minWidth: '56px' }}>
                      <div style={{ fontSize: '22px', marginBottom: '2px' }}>{ch.k}</div>
                      <div style={{ fontSize: '10px', color: c.primary, marginBottom: '5px' }}>{ch.r}</div>
                      <div style={{ background: c.border, borderRadius: '3px', height: '3px', overflow: 'hidden' }}>
                        <div style={{ background: done ? c.green : c.primaryGrad, width: `${percent}%`, height: '100%', borderRadius: '3px' }} />
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

  return (
    <>
      {showLevelPicker && <LevelPicker />}
      <div style={{ minHeight: '100vh', background: c.bg, fontFamily: 'sans-serif', color: c.text, direction: lang === 'ar' ? 'rtl' : 'ltr', transition: 'background 0.3s' }}>
        {tab === 'home'    && <HomeTab />}
        {tab === 'letters' && <LettersTab />}
        {tab === 'profile' && <ProfileTab />}
      </div>
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: c.navBg, borderTop: `0.5px solid ${c.border}`, display: 'flex', zIndex: 100 }}>
        {[
          { id: 'home',    icon: '🏠', label: lang === 'ar' ? 'الرئيسية' : 'Home' },
          { id: 'letters', icon: '文', label: lang === 'ar' ? 'الأحرف' : 'Letters' },
          { id: 'profile', icon: '👤', label: lang === 'ar' ? 'حسابي' : 'Profile' },
        ].map((item) => (
          <button key={item.id} onClick={() => { setTab(item.id); if (item.id === 'profile') setProfileScreen('main') }}
            style={{ flex: 1, padding: '12px 4px', background: 'none', border: 'none', color: tab === item.id ? c.primary : c.textMuted, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', borderTop: tab === item.id ? `2px solid ${c.primary}` : '2px solid transparent', transition: 'all 0.15s' }}>
            <span style={{ fontSize: '22px' }}>{item.icon}</span>
            <span style={{ fontSize: '11px', fontWeight: tab === item.id ? '600' : '400' }}>{item.label}</span>
          </button>
        ))}
      </div>
    </>
  )
}