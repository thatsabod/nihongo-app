import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase.js'
import { characterGroups, hiragana, katakana, kanjiN5, lessons } from './data.js'
import { speakJapanese } from './sounds.js'
import Login from './screens/Login.jsx'
import Quiz from './screens/Quiz.jsx'
import Result from './screens/Result.jsx'

const TOTAL_LESSONS = 25
const sectionCount = 3
const STARTING_GEMS = 2000
const HEART_REFILL_MS = 90 * 1000
const GUEST_KEY = 'nihongo-guest-state'

const copy = {
  ar: {
    start: 'ابدأ التعلم',
    login: 'تسجيل الدخول',
    create: 'إنشاء حساب',
    home: 'الرئيسية',
    letters: 'الحروف',
    profile: 'حسابي',
    welcomeTitle: 'تعلم اليابانية بخطوات قصيرة',
    welcomeText: 'حروف، مفردات، دروس N5، واختبارات سريعة بتجربة مرتبة وواضحة.',
    continue: 'كمّل من مكانك',
    level: 'المستوى N5',
    streak: 'ستريك',
    hearts: 'قلوب',
    gems: 'جواهر',
    xp: 'نقاط',
    lessons: 'مسار الدروس',
    practice: 'تدرب الآن',
    lesson: 'درس',
    locked: 'مقفل',
    done: 'مكتمل',
    current: 'نشط',
    comingSoon: 'قريبا',
    vocabulary: 'مفردات',
    grammar: 'قاعدة',
    examples: 'أمثلة',
    tapHear: 'اضغط للسماع',
    quiz: 'اختبار',
    settings: 'الإعدادات',
    achievements: 'الإنجازات',
    signOut: 'تسجيل الخروج',
    language: 'اللغة',
    theme: 'المظهر',
    dark: 'داكن',
    light: 'فاتح',
    mastered: 'متقن',
    noHearts: 'ماكو قلوب كافية. انتظر دقيقة ونص أو عبّيها بالجواهر.',
    guestName: 'زائر',
    guestHint: 'تقدمك محفوظ على هذا الجهاز فقط.',
    loginPrompt: 'سجل دخول أو أنشئ حساب حتى تحفظ تقدمك بالسحابة.',
    refillAll: 'تعبئة 5 قلوب',
    refillCost: '250 جوهرة',
    notEnoughGems: 'الجواهر غير كافية.',
    heartsFull: 'قلوبك ممتلئة.',
    editProfile: 'تعديل الملف الشخصي',
    name: 'الاسم',
    bio: 'نبذة',
    phone: 'الهاتف',
    birthday: 'تاريخ الميلاد',
    save: 'حفظ',
    cancel: 'إلغاء',
  },
  en: {
    start: 'Start learning',
    login: 'Log in',
    create: 'Create account',
    home: 'Home',
    letters: 'Letters',
    profile: 'Profile',
    welcomeTitle: 'Learn Japanese in short focused steps',
    welcomeText: 'Characters, vocabulary, N5 lessons, and quick quizzes in a cleaner experience.',
    continue: 'Continue learning',
    level: 'Level N5',
    streak: 'Streak',
    hearts: 'Hearts',
    gems: 'Gems',
    xp: 'XP',
    lessons: 'Lesson path',
    practice: 'Practice now',
    lesson: 'Lesson',
    locked: 'Locked',
    done: 'Done',
    current: 'Current',
    comingSoon: 'Coming soon',
    vocabulary: 'Vocabulary',
    grammar: 'Grammar',
    examples: 'Examples',
    tapHear: 'Tap to hear',
    quiz: 'Quiz',
    settings: 'Settings',
    achievements: 'Achievements',
    signOut: 'Sign out',
    language: 'Language',
    theme: 'Theme',
    dark: 'Dark',
    light: 'Light',
    mastered: 'Mastered',
    noHearts: 'No hearts left. Wait 90 seconds or refill with gems.',
    guestName: 'Guest',
    guestHint: 'Your progress is saved on this device only.',
    loginPrompt: 'Log in or create an account to save progress in the cloud.',
    refillAll: 'Refill 5 hearts',
    refillCost: '250 gems',
    notEnoughGems: 'Not enough gems.',
    heartsFull: 'Your hearts are full.',
    editProfile: 'Edit profile',
    name: 'Name',
    bio: 'Bio',
    phone: 'Phone',
    birthday: 'Birthday',
    save: 'Save',
    cancel: 'Cancel',
  },
}

const levels = [
  { id: 'N5', ar: 'مبتدئ', en: 'Beginner', unlocked: true },
  { id: 'N4', ar: 'أساسي', en: 'Elementary', unlocked: false },
  { id: 'N3', ar: 'متوسط', en: 'Intermediate', unlocked: false },
  { id: 'N2', ar: 'متقدم', en: 'Advanced', unlocked: false },
  { id: 'N1', ar: 'احترافي', en: 'Professional', unlocked: false },
]

const quizSets = { hiragana, katakana, kanji: kanjiN5 }

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5)
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function nextStreakValue(previousDate, currentStreak) {
  const today = todayKey()
  if (previousDate === today) return { streak: currentStreak, lastActiveDate: previousDate }
  if (!previousDate) return { streak: 1, lastActiveDate: today }

  const diff = Math.round((new Date(today) - new Date(previousDate)) / 86400000)
  return {
    streak: diff === 1 ? currentStreak + 1 : diff > 1 ? 1 : currentStreak,
    lastActiveDate: today,
  }
}

function defaultState() {
  return {
    xp: 0,
    hearts: 5,
    gems: STARTING_GEMS,
    streak: 1,
    lastActiveDate: todayKey(),
    lastHeartRefillAt: Date.now(),
    progress: {},
    lessonProgress: {},
    totalQuizzes: 0,
    perfectScores: 0,
    lastScore: 0,
    userName: '',
    userBio: '',
    userPhone: '',
    userBirthday: '',
  }
}

function readGuestState() {
  try {
    const saved = JSON.parse(localStorage.getItem(GUEST_KEY) || 'null')
    return { ...defaultState(), ...saved, lastActiveDate: saved?.lastActiveDate || todayKey() }
  } catch {
    return defaultState()
  }
}

function Button({ children, variant = 'primary', ...props }) {
  return <button className={`btn btn-${variant}`} {...props}>{children}</button>
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function Welcome({ lang, setLang, theme, setTheme, onStart, onLogin }) {
  const t = copy[lang]
  return (
    <main className="welcome">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">日</span>
          <span>にほんごGO</span>
        </div>
        <div className="toolbar">
          <button className="chip" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>{lang === 'ar' ? 'EN' : 'عربي'}</button>
          <button className="chip" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? t.light : t.dark}</button>
        </div>
      </header>

      <section className="hero-panel">
        <div className="hero-art" aria-hidden="true">
          <span>あ</span><span>ア</span><span>日</span>
        </div>
        <p className="eyebrow">N5 Starter</p>
        <h1>{t.welcomeTitle}</h1>
        <p>{t.welcomeText}</p>
        <div className="hero-actions">
          <Button onClick={onStart}>{t.start}</Button>
          <Button variant="quiet" onClick={onLogin}>{t.login}</Button>
        </div>
      </section>
    </main>
  )
}

function LessonView({ lesson, lang, onBack, onQuiz }) {
  const [section, setSection] = useState('vocabulary')
  const [flipped, setFlipped] = useState({})
  const t = copy[lang]

  return (
    <main className="screen">
      <header className="page-head">
        <button className="icon-btn" onClick={onBack}>←</button>
        <div>
          <p>{t.lesson} {lesson.id}</p>
          <h1>{lesson.title[lang]}</h1>
        </div>
        <Button variant="small" onClick={onQuiz}>{t.quiz}</Button>
      </header>

      <div className="tabs">
        {['vocabulary', 'grammar', 'examples'].map((id) => (
          <button key={id} className={section === id ? 'active' : ''} onClick={() => setSection(id)}>
            {t[id]}
          </button>
        ))}
      </div>

      {section === 'vocabulary' && (
        <div className="card-grid">
          {lesson.vocab.map((item, index) => {
            const shown = flipped[index]
            return (
              <button className="study-card" key={item.jp} onClick={() => setFlipped((f) => ({ ...f, [index]: !shown }))}>
                <span className="jp">{shown ? item.reading : item.jp}</span>
                <strong>{shown ? item.meaning : t.tapHear}</strong>
                <small>{shown ? item.jp : item.reading}</small>
              </button>
            )
          })}
        </div>
      )}

      {section === 'grammar' && (
        <section className="lesson-card">
          <p className="eyebrow">{t.grammar}</p>
          <h2>{lesson.grammar[lang].split('—')[0]}</h2>
          <p>{lesson.grammar[lang].split('—')[1]}</p>
          <div className="mini-list">
            {lesson.vocab.map((item) => (
              <button key={item.jp} onClick={() => speakJapanese(item.jp)}>
                <span>{item.jp}</span>
                <small>{item.reading} · {item.meaning}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {section === 'examples' && (
        <div className="example-list">
          {lesson.examples.map((example) => (
            <button key={example.jp} onClick={() => speakJapanese(example.jp)}>
              <span className="jp-line">{example.jp}</span>
              <strong>{example.en}</strong>
              <small>{example.ar}</small>
            </button>
          ))}
          <Button onClick={onQuiz}>{t.practice}</Button>
        </div>
      )}
    </main>
  )
}

function ProfileEditor({ lang, values, onCancel, onSave }) {
  const t = copy[lang]
  const [draft, setDraft] = useState(values)
  const update = (key) => (event) => setDraft((value) => ({ ...value, [key]: event.target.value }))

  return (
    <main className="screen">
      <header className="page-head">
        <button className="icon-btn" onClick={onCancel}>←</button>
        <div>
          <p>{t.settings}</p>
          <h1>{t.editProfile}</h1>
        </div>
      </header>
      <section className="auth-panel">
        <label>{t.name}<input value={draft.userName} onChange={update('userName')} /></label>
        <label>{t.bio}<input value={draft.userBio} onChange={update('userBio')} /></label>
        <label>{t.phone}<input value={draft.userPhone} onChange={update('userPhone')} /></label>
        <label>{t.birthday}<input type="date" value={draft.userBirthday} onChange={update('userBirthday')} /></label>
        <div className="split-actions">
          <Button variant="secondary" onClick={onCancel}>{t.cancel}</Button>
          <Button onClick={() => onSave(draft)}>{t.save}</Button>
        </div>
      </section>
    </main>
  )
}

export default function App() {
  const [screen, setScreen] = useState('loading')
  const [tab, setTab] = useState('home')
  const [lang, setLang] = useState(localStorage.getItem('nihongo-lang') || 'ar')
  const [theme, setTheme] = useState(localStorage.getItem('nihongo-theme') || 'dark')
  const [lettersTab, setLettersTab] = useState('hiragana')
  const [currentLevel, setCurrentLevel] = useState('N5')
  const [activeLesson, setActiveLesson] = useState(null)
  const [dataReady, setDataReady] = useState(false)
  const [isGuest, setIsGuest] = useState(false)
  const [userId, setUserId] = useState(null)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userBio, setUserBio] = useState('')
  const [userPhone, setUserPhone] = useState('')
  const [userBirthday, setUserBirthday] = useState('')
  const [xp, setXp] = useState(0)
  const [hearts, setHearts] = useState(5)
  const [gems, setGems] = useState(STARTING_GEMS)
  const [streak, setStreak] = useState(0)
  const [lastActiveDate, setLastActiveDate] = useState(null)
  const [lastHeartRefillAt, setLastHeartRefillAt] = useState(() => Date.now())
  const [progress, setProgress] = useState({})
  const [lessonProgress, setLessonProgress] = useState({})
  const [totalQuizzes, setTotalQuizzes] = useState(0)
  const [perfectScores, setPerfectScores] = useState(0)
  const [questions, setQuestions] = useState([])
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(0)
  const [lastScore, setLastScore] = useState(0)
  const [notice, setNotice] = useState('')

  const t = copy[lang]
  const dir = lang === 'ar' ? 'rtl' : 'ltr'
  const masteredCount = Object.values(progress).filter((v) => v >= 10).length
  const completedLessons = Object.values(lessonProgress).filter((v) => v >= sectionCount).length
  const lessonPercent = Math.round((completedLessons / TOTAL_LESSONS) * 100)
  const lessonSlots = Array.from({ length: TOTAL_LESSONS }, (_, index) => lessons[index] || null)

  const applyState = (state) => {
    setXp(state.xp ?? 0)
    setHearts(state.hearts ?? 5)
    setGems(state.gems ?? STARTING_GEMS)
    setStreak(state.streak ?? 1)
    setLastActiveDate(state.lastActiveDate ?? todayKey())
    setLastHeartRefillAt(state.lastHeartRefillAt ?? Date.now())
    setProgress(state.progress ?? {})
    setLessonProgress(state.lessonProgress ?? {})
    setTotalQuizzes(state.totalQuizzes ?? 0)
    setPerfectScores(state.perfectScores ?? 0)
    setLastScore(state.lastScore ?? 0)
    setUserName(state.userName || state.name || '')
    setUserBio(state.userBio ?? '')
    setUserPhone(state.userPhone || state.phone || '')
    setUserBirthday(state.userBirthday || state.birthDate || '')
  }

  const startGuest = () => {
    const saved = readGuestState()
    const activity = nextStreakValue(saved.lastActiveDate, saved.streak)
    applyState({ ...saved, ...activity })
    setUserId(null)
    setUserEmail('')
    setIsGuest(true)
    setDataReady(true)
    setScreen('main')
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.dir = dir
    localStorage.setItem('nihongo-lang', lang)
    localStorage.setItem('nihongo-theme', theme)
  }, [lang, theme, dir])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setDataReady(true)
        setScreen('welcome')
        return
      }

      setIsGuest(false)
      setUserId(user.uid)
      setUserEmail(user.email || '')

      const snap = await getDoc(doc(db, 'users', user.uid))
      if (snap.exists()) {
        const d = snap.data()
        const activity = nextStreakValue(d.lastActiveDate ?? null, d.streak ?? 0)
        applyState({
          ...d,
          ...activity,
          userName: d.userName || d.name || user.displayName || '',
          gems: d.gems ?? STARTING_GEMS,
          hearts: d.hearts ?? 5,
        })
      } else {
        const base = defaultState()
        applyState({ ...base, userName: user.displayName || '' })
      }
      setDataReady(true)
      setScreen('main')
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!dataReady || !isGuest) return
    localStorage.setItem(GUEST_KEY, JSON.stringify({
      xp, hearts, gems, streak, lastActiveDate, lastHeartRefillAt, progress, lessonProgress,
      totalQuizzes, perfectScores, lastScore, userName, userBio, userPhone, userBirthday,
    }))
  }, [isGuest, dataReady, xp, hearts, gems, streak, lastActiveDate, lastHeartRefillAt, progress, lessonProgress, totalQuizzes, perfectScores, lastScore, userName, userBio, userPhone, userBirthday])

  useEffect(() => {
    if (!userId || !dataReady || isGuest) return
    setDoc(doc(db, 'users', userId), {
      xp, hearts, gems, streak, lastActiveDate, lastHeartRefillAt, progress, lessonProgress,
      totalQuizzes, perfectScores, lastScore, userName, userBio, userPhone, userBirthday,
    }, { merge: true })
  }, [userId, isGuest, dataReady, xp, hearts, gems, streak, lastActiveDate, lastHeartRefillAt, progress, lessonProgress, totalQuizzes, perfectScores, lastScore, userName, userBio, userPhone, userBirthday])

  useEffect(() => {
    if (!dataReady) return
    const timer = setInterval(() => {
      setHearts((current) => {
        if (current >= 5) {
          setLastHeartRefillAt(Date.now())
          return current
        }

        const elapsed = Date.now() - lastHeartRefillAt
        if (elapsed < HEART_REFILL_MS) return current

        const gained = Math.floor(elapsed / HEART_REFILL_MS)
        const next = Math.min(5, current + gained)
        setLastHeartRefillAt(lastHeartRefillAt + gained * HEART_REFILL_MS)
        return next
      })
    }, 5000)
    return () => clearInterval(timer)
  }, [dataReady, lastHeartRefillAt])

  const startQuiz = (setName = 'hiragana') => {
    if (hearts <= 0) {
      setNotice(t.noHearts)
      return
    }
    setQuestions(shuffle(quizSets[setName] || hiragana).slice(0, 10))
    setQIndex(0)
    setSelected(null)
    setScore(0)
    setScreen('quiz')
  }

  const startLessonQuiz = (lesson) => {
    const lessonQuestions = lesson.vocab.map((item) => ({
      kana: item.jp,
      answer: item.reading,
      options: shuffle([item.reading, ...lesson.vocab.filter((v) => v.reading !== item.reading).map((v) => v.reading)]).slice(0, 4),
    }))
    setQuestions(shuffle(lessonQuestions).slice(0, 8))
    setQIndex(0)
    setSelected(null)
    setScore(0)
    setScreen('quiz')
  }

  const handleAnswer = (opt) => {
    if (selected) return
    setSelected(opt)
    const current = questions[qIndex]
    if (opt === current.answer) {
      setScore((s) => s + 1)
      setXp((value) => value + 10)
      setProgress((p) => ({ ...p, [current.kana]: Math.min((p[current.kana] || 0) + 1, 10) }))
    } else {
      setHearts((value) => Math.max(value - 1, 0))
      setLastHeartRefillAt((value) => value || Date.now())
    }
  }

  useEffect(() => {
    if (!selected) return
    const isCorrect = selected === questions[qIndex]?.answer
    const timer = setTimeout(() => {
      if (qIndex + 1 < questions.length) {
        setQIndex((i) => i + 1)
        setSelected(null)
        return
      }
      const finalScore = score + (isCorrect ? 1 : 0)
      setLastScore(finalScore)
      setTotalQuizzes((value) => value + 1)
      setGems((value) => value + Math.max(5, finalScore * 2))
      if (activeLesson) {
        const key = `${currentLevel}-${activeLesson.id}`
        setLessonProgress((p) => ({ ...p, [key]: Math.min((p[key] || 0) + 1, sectionCount) }))
      }
      if (finalScore === questions.length) setPerfectScores((value) => value + 1)
      setScreen('result')
    }, isCorrect ? 850 : 1500)
    return () => clearTimeout(timer)
  }, [selected, questions, qIndex, score, activeLesson, currentLevel])

  const refillHearts = () => {
    if (hearts >= 5) return setNotice(t.heartsFull)
    if (gems < 250) return setNotice(t.notEnoughGems)
    setGems((value) => value - 250)
    setHearts(5)
    setLastHeartRefillAt(Date.now())
  }

  const achievements = useMemo(() => [
    { label: 'First Quiz', active: totalQuizzes >= 1 },
    { label: '7 Day Streak', active: streak >= 7 },
    { label: 'Perfect', active: perfectScores >= 1 },
    { label: '500 XP', active: xp >= 500 },
    { label: '10 Mastered', active: masteredCount >= 10 },
    { label: '5 Quizzes', active: totalQuizzes >= 5 },
  ], [totalQuizzes, streak, perfectScores, xp, masteredCount])

  const logout = async () => {
    if (userId) await signOut(auth)
    setUserId(null)
    setUserName('')
    setUserEmail('')
    setIsGuest(false)
    setScreen('welcome')
  }

  if (screen === 'loading') {
    return <main className="loading"><div className="brand big"><span className="brand-mark">日</span><span>にほんごGO</span></div></main>
  }

  if (screen === 'welcome') {
    return (
      <Welcome
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        onStart={startGuest}
        onLogin={() => setScreen('login')}
      />
    )
  }

  if (screen === 'login') {
    return (
      <Login
        lang={lang}
        onBack={() => setScreen('welcome')}
        onLogin={(name) => {
          if (name === 'زائر' || name === 'Guest') {
            startGuest()
            return
          }
          setIsGuest(false)
          setUserName(name)
          setScreen('main')
        }}
      />
    )
  }

  if (screen === 'quiz') {
    return <Quiz questions={questions} qIndex={qIndex} selected={selected} score={score} xp={xp} hearts={hearts} lang={lang} onAnswer={handleAnswer} onBack={() => setScreen('main')} />
  }

  if (screen === 'result') {
    return <Result score={lastScore} total={questions.length} xpEarned={lastScore * 10} lang={lang} onHome={() => { setActiveLesson(null); setScreen('main') }} onRetry={() => startQuiz(lettersTab)} />
  }

  if (screen === 'lesson' && activeLesson) {
    return <LessonView lesson={activeLesson} lang={lang} onBack={() => setScreen('main')} onQuiz={() => startLessonQuiz(activeLesson)} />
  }

  if (screen === 'edit-profile') {
    return (
      <ProfileEditor
        lang={lang}
        values={{ userName, userBio, userPhone, userBirthday }}
        onCancel={() => setScreen('main')}
        onSave={(draft) => {
          setUserName(draft.userName)
          setUserBio(draft.userBio)
          setUserPhone(draft.userPhone)
          setUserBirthday(draft.userBirthday)
          setScreen('main')
          setTab('profile')
        }}
      />
    )
  }

  return (
    <>
      <main className="app-shell">
        <header className="topbar">
          <div className="brand"><span className="brand-mark">日</span><span>にほんごGO</span></div>
          <div className="toolbar">
            <span className="chip">♥ {hearts}/5</span>
            <span className="chip">◆ {gems}</span>
            <span className="chip">🔥 {streak}</span>
          </div>
        </header>

        {notice && <button className="notice" onClick={() => setNotice('')}>{notice}</button>}

        {tab === 'home' && (
          <section className="content">
            <div className="dashboard">
              <div>
                <p className="eyebrow">{t.continue}</p>
                <h1>{t.level}</h1>
                <p>{levels.find((level) => level.id === currentLevel)?.[lang]} · {lessonPercent}%</p>
              </div>
              <div className="ring" style={{ '--value': `${lessonPercent}%` }}>{lessonPercent}%</div>
            </div>

            <div className="stats-grid">
              <Stat label={t.xp} value={xp} />
              <Stat label={t.mastered} value={masteredCount} />
              <Stat label={t.quiz} value={totalQuizzes} />
            </div>

            <div className="quick-actions">
              <Button onClick={() => startQuiz('hiragana')}>{t.quiz}</Button>
              <Button variant="secondary" onClick={() => { setTab('letters'); setLettersTab('hiragana') }}>{t.letters}</Button>
            </div>

            <div className="level-strip">
              {levels.map((level) => (
                <button key={level.id} className={currentLevel === level.id ? 'active' : ''} disabled={!level.unlocked} onClick={() => setCurrentLevel(level.id)}>
                  <strong>{level.id}</strong>
                  <span>{level[lang]}</span>
                </button>
              ))}
            </div>

            <h2 className="section-title">{t.lessons}</h2>
            <div className="lesson-path">
              {lessonSlots.map((lesson, index) => {
                const lessonNumber = index + 1
                const prevKey = `${currentLevel}-${lessonNumber - 1}`
                const key = `${currentLevel}-${lessonNumber}`
                const prevDone = lessonNumber === 1 || (lessonProgress[prevKey] || 0) >= sectionCount
                const amount = lessonProgress[key] || 0
                const locked = !prevDone || !lesson
                const status = !lesson ? t.comingSoon : locked ? t.locked : amount >= sectionCount ? t.done : t.current

                return (
                  <button
                    key={lessonNumber}
                    disabled={locked}
                    className={`lesson-node ${locked ? 'locked' : ''}`}
                    onClick={() => { setActiveLesson(lesson); setScreen('lesson') }}
                  >
                    <span className="lesson-number">{lessonNumber}</span>
                    <div>
                      <strong>{lesson ? lesson.title[lang] : `${t.lesson} ${lessonNumber}`}</strong>
                      <small>{lesson?.focus || 'N5'} · {status}</small>
                    </div>
                    <meter min="0" max={sectionCount} value={amount} />
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {tab === 'letters' && (
          <section className="content">
            <div className="tabs pill-tabs">
              {['hiragana', 'katakana', 'kanji'].map((id) => (
                <button key={id} className={lettersTab === id ? 'active' : ''} onClick={() => setLettersTab(id)}>
                  {id === 'kanji' ? 'Kanji N5' : id[0].toUpperCase() + id.slice(1)}
                </button>
              ))}
            </div>
            <Button onClick={() => startQuiz(lettersTab)}>{t.practice}</Button>
            <div className="char-sections">
              {characterGroups[lettersTab].map((group) => (
                <section key={group.label}>
                  <h2>{group.label}</h2>
                  <div className="char-grid">
                    {group.chars.map(([kana, reading]) => {
                      const count = progress[kana] || 0
                      return (
                        <button key={kana} onClick={() => speakJapanese(kana)}>
                          <span>{kana}</span>
                          <strong>{reading}</strong>
                          <meter min="0" max="10" value={count} />
                        </button>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          </section>
        )}

        {tab === 'profile' && (
          <section className="content profile">
            <div className="profile-card">
              <div className="avatar">{(userName || t.guestName).slice(0, 1).toUpperCase()}</div>
              <h1>{userName || t.guestName}</h1>
              <p>{isGuest ? t.guestHint : userEmail || 'にほんごGO learner'}</p>
              {userBio && <p>{userBio}</p>}
            </div>

            {isGuest && (
              <div className="guest-panel">
                <p>{t.loginPrompt}</p>
                <div className="split-actions">
                  <Button onClick={() => setScreen('login')}>{t.login}</Button>
                  <Button variant="secondary" onClick={() => setScreen('login')}>{t.create}</Button>
                </div>
              </div>
            )}

            <div className="shop-panel">
              <div>
                <strong>{t.refillAll}</strong>
                <span>{t.refillCost}</span>
              </div>
              <Button variant="small" onClick={refillHearts}>♥ +5</Button>
            </div>

            <h2 className="section-title">{t.settings}</h2>
            <div className="settings-grid">
              <button onClick={() => setScreen('edit-profile')}><span>{t.editProfile}</span><strong>›</strong></button>
              <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}><span>{t.language}</span><strong>{lang === 'ar' ? 'عربي' : 'English'}</strong></button>
              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><span>{t.theme}</span><strong>{theme === 'dark' ? t.dark : t.light}</strong></button>
            </div>

            <h2 className="section-title">{t.achievements}</h2>
            <div className="achievement-grid">
              {achievements.map((item) => (
                <div key={item.label} className={item.active ? 'active' : ''}>
                  <span>{item.active ? '★' : '☆'}</span>
                  <small>{item.label}</small>
                </div>
              ))}
            </div>

            {!isGuest && <Button variant="danger" onClick={logout}>{t.signOut}</Button>}
          </section>
        )}
      </main>

      <nav className="bottom-nav">
        {[
          ['home', '⌂', t.home],
          ['letters', '文', t.letters],
          ['profile', '◉', t.profile],
        ].map(([id, icon, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            <span>{icon}</span>
            <small>{label}</small>
          </button>
        ))}
      </nav>
    </>
  )
}
