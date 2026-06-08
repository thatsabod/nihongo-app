import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase.js'
import { characterGroups, hiragana, katakana, kanjiN5, lessons } from './data.js'
import { speakJapanese } from './sounds.js'
import Login from './screens/Login.jsx'
import Quiz from './screens/Quiz.jsx'
import Result from './screens/Result.jsx'

const copy = {
  ar: {
    start: 'ابدأ التعلم',
    test: 'اختبر معلوماتك',
    login: 'تسجيل الدخول',
    create: 'إنشاء حساب',
    guest: 'الدخول كزائر',
    home: 'الرئيسية',
    letters: 'الحروف',
    profile: 'حسابي',
    welcomeTitle: 'تعلم اليابانية بخطوات قصيرة',
    welcomeText: 'حروف، مفردات، دروس N5، واختبارات سريعة بنفس جوهر التطبيق الحالي لكن بواجهة أرتب.',
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
    noHearts: 'ماكو قلوب كافية. راجع حسابك أو جرّب لاحقا.',
  },
  en: {
    start: 'Start learning',
    test: 'Test yourself',
    login: 'Log in',
    create: 'Create account',
    guest: 'Continue as guest',
    home: 'Home',
    letters: 'Letters',
    profile: 'Profile',
    welcomeTitle: 'Learn Japanese in short focused steps',
    welcomeText: 'Characters, vocabulary, N5 lessons, and quick quizzes with the current app core kept intact.',
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
    noHearts: 'No hearts left. Check your profile or try again later.',
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
const sectionCount = 3

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

function Button({ children, variant = 'primary', ...props }) {
  return (
    <button className={`btn btn-${variant}`} {...props}>
      {children}
    </button>
  )
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function Welcome({ lang, setLang, theme, setTheme, onStart, onTest, onLogin }) {
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
          <Button variant="secondary" onClick={onTest}>{t.test}</Button>
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

export default function App() {
  const [screen, setScreen] = useState('loading')
  const [tab, setTab] = useState('home')
  const [lang, setLang] = useState(localStorage.getItem('nihongo-lang') || 'ar')
  const [theme, setTheme] = useState(localStorage.getItem('nihongo-theme') || 'dark')
  const [lettersTab, setLettersTab] = useState('hiragana')
  const [currentLevel, setCurrentLevel] = useState('N5')
  const [activeLesson, setActiveLesson] = useState(null)
  const [lessonProgress, setLessonProgress] = useState({})
  const [dataReady, setDataReady] = useState(false)
  const [userId, setUserId] = useState(null)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [xp, setXp] = useState(0)
  const [hearts, setHearts] = useState(5)
  const [gems, setGems] = useState(500)
  const [streak, setStreak] = useState(0)
  const [lastActiveDate, setLastActiveDate] = useState(null)
  const [progress, setProgress] = useState({})
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
  const lessonPercent = Math.round((completedLessons / lessons.length) * 100)

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

      setUserId(user.uid)
      setUserName(user.displayName || '')
      setUserEmail(user.email || '')

      const snap = await getDoc(doc(db, 'users', user.uid))
      if (snap.exists()) {
        const d = snap.data()
        const activity = nextStreakValue(d.lastActiveDate ?? null, d.streak ?? 0)
        setXp(d.xp ?? 0)
        setHearts(d.hearts ?? 5)
        setGems(d.gems ?? 500)
        setStreak(activity.streak)
        setLastActiveDate(activity.lastActiveDate)
        setProgress(d.progress ?? {})
        setLessonProgress(d.lessonProgress ?? {})
        setTotalQuizzes(d.totalQuizzes ?? 0)
        setPerfectScores(d.perfectScores ?? 0)
        setLastScore(d.lastScore ?? 0)
        setUserName(d.userName || user.displayName || '')
      } else {
        const activity = nextStreakValue(null, 0)
        setStreak(activity.streak)
        setLastActiveDate(activity.lastActiveDate)
      }
      setDataReady(true)
      setScreen('main')
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!userId || !dataReady) return
    setDoc(doc(db, 'users', userId), {
      xp, hearts, gems, streak, lastActiveDate, progress, lessonProgress,
      totalQuizzes, perfectScores, lastScore, userName,
    }, { merge: true })
  }, [userId, dataReady, xp, hearts, gems, streak, lastActiveDate, progress, lessonProgress, totalQuizzes, perfectScores, lastScore, userName])

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
        onStart={() => setScreen('main')}
        onTest={() => startQuiz('hiragana')}
        onLogin={() => setScreen('login')}
      />
    )
  }

  if (screen === 'login') {
    return <Login lang={lang} onBack={() => setScreen('welcome')} onLogin={(name) => { setUserName(name); setScreen('main') }} />
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

  return (
    <>
      <main className="app-shell">
        <header className="topbar">
          <div className="brand"><span className="brand-mark">日</span><span>にほんごGO</span></div>
          <div className="toolbar">
            <span className="chip">♥ {hearts}</span>
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
              <Button onClick={() => startQuiz('hiragana')}>{t.test}</Button>
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
              {lessons.map((lesson, index) => {
                const prevDone = index === 0 || (lessonProgress[`${currentLevel}-${lessons[index - 1].id}`] || 0) >= sectionCount
                const amount = lessonProgress[`${currentLevel}-${lesson.id}`] || 0
                const locked = !prevDone
                return (
                  <button key={lesson.id} disabled={locked} className={`lesson-node ${locked ? 'locked' : ''}`} onClick={() => { setActiveLesson(lesson); setScreen('lesson') }}>
                    <span>{locked ? '🔒' : amount >= sectionCount ? '✓' : lesson.id}</span>
                    <div>
                      <strong>{lesson.title[lang]}</strong>
                      <small>{lesson.focus} · {locked ? t.locked : amount >= sectionCount ? t.done : t.current}</small>
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
              <div className="avatar">{(userName || 'G').slice(0, 1).toUpperCase()}</div>
              <h1>{userName || (lang === 'ar' ? 'زائر' : 'Guest')}</h1>
              <p>{userEmail || 'にほんごGO learner'}</p>
            </div>

            <div className="settings-grid">
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

            <Button variant="danger" onClick={logout}>{t.signOut}</Button>
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
