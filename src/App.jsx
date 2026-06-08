import { useEffect, useMemo, useRef, useState } from 'react'
import { onAuthStateChanged, sendEmailVerification, signOut } from 'firebase/auth'
import { doc, getDoc, runTransaction, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase.js'
import { hiragana, katakana, kanjiN5, lessons } from './data.js'
import { speakJapanese } from './sounds.js'
import Login from './screens/Login.jsx'
import Quiz from './screens/Quiz.jsx'
import Result from './screens/Result.jsx'
import DrawingPad from './components/DrawingPad.jsx'

const TOTAL_LESSONS = 25
const sectionCount = 3
const STARTING_GEMS = 2000
const HEART_REFILL_MS = 90 * 1000
const GUEST_KEY = 'nihongo-guest-state'
const USERNAME_RE = /^[a-z][a-z0-9_]{2,23}$/

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
    usernameInvalid: 'Username لازم يبدأ بحرف إنكليزي ويحتوي حروف إنكليزية أو أرقام أو _ فقط، من 3 إلى 24 حرف.',
    usernameTaken: 'هذا الـ username مأخوذ، جرّب واحد ثاني.',
    emailUnverified: 'بريدك غير مؤكد بعد. أكد البريد حتى يبقى حسابك آمن وتقدر تسترجعه لاحقا.',
    resendEmail: 'إرسال رابط التأكيد',
    refreshEmail: 'تحديث الحالة',
    verificationSent: 'تم إرسال رابط التأكيد إلى بريدك.',
    emailVerified: 'البريد مؤكد',
    heartsFull: 'قلوبك ممتلئة.',
    editProfile: 'تعديل الملف الشخصي',
    name: 'الاسم',
    bio: 'نبذة',
    phone: 'الهاتف',
    birthday: 'تاريخ الميلاد',
    save: 'حفظ',
    cancel: 'إلغاء',
    groups: 'مجموعات الحروف',
    group: 'مجموعة',
    groupQuiz: 'ابدأ بالتدرب الآن',
    drawPractice: 'تدريب الرسم',
    chooseCharacter: 'اختر حرفا للتدرب على رسمه',
    listen: 'استماع',
    openGroup: 'فتح المجموعة',
    fiveChars: 'كل مجموعة 5 أحرف',
    account: 'الحساب',
    customization: 'التخصيص',
    subscription: 'الاشتراك',
    policy: 'سياسة التطبيق',
    support: 'دعم مباشر',
    donate: 'تبرع لنا',
    freePlan: 'مجاني',
    paidPlan: 'مدفوع',
    sound: 'الأصوات',
    fontSize: 'حجم الخط',
    cozyMode: 'وضع مريح',
    profilePhoto: 'صورة الحساب',
    uploadPhoto: 'اختيار صورة',
    subscriptionText: 'اشتراكك الحالي مجاني. الباقات المدفوعة ستفتح لاحقا مزايا مثل دروس أكثر وتمارين متقدمة.',
    policyText: 'نحفظ تقدمك وبيانات حسابك الأساسية حتى تقدر تكمل التعلم من أي جهاز. بيانات الزائر تبقى على هذا الجهاز فقط.',
    supportText: 'الدعم المباشر قيد التجهيز. حاليا تقدر تبلغنا بالمشكلة من داخل ملاحظاتك وسنضيف قناة تواصل مباشرة.',
    donateText: 'التبرع يساعدنا نطور الدروس والصوت وتجربة الرسم. سنضيف وسيلة دفع آمنة لاحقا.',
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
    usernameInvalid: 'Username must start with an English letter and use only English letters, numbers, or _, 3-24 characters.',
    usernameTaken: 'This username is already taken.',
    emailUnverified: 'Your email is not verified yet. Verify it to keep the account secure and recoverable.',
    resendEmail: 'Send verification link',
    refreshEmail: 'Refresh status',
    verificationSent: 'Verification link sent to your email.',
    emailVerified: 'Email verified',
    heartsFull: 'Your hearts are full.',
    editProfile: 'Edit profile',
    name: 'Name',
    bio: 'Bio',
    phone: 'Phone',
    birthday: 'Birthday',
    save: 'Save',
    cancel: 'Cancel',
    groups: 'Character groups',
    group: 'Group',
    groupQuiz: 'Start practice now',
    drawPractice: 'Drawing practice',
    chooseCharacter: 'Choose a character to practice drawing',
    listen: 'Listen',
    openGroup: 'Open group',
    fiveChars: 'Each group has 5 characters',
    account: 'Account',
    customization: 'Customization',
    subscription: 'Subscription',
    policy: 'App policy',
    support: 'Live support',
    donate: 'Donate',
    freePlan: 'Free',
    paidPlan: 'Paid',
    sound: 'Sounds',
    fontSize: 'Font size',
    cozyMode: 'Cozy mode',
    profilePhoto: 'Profile photo',
    uploadPhoto: 'Choose photo',
    subscriptionText: 'Your current plan is free. Paid plans will later unlock more lessons and advanced practice.',
    policyText: 'We save learning progress and basic account data so you can continue across devices. Guest data stays on this device.',
    supportText: 'Live support is being prepared. For now, send us the issue in your notes and we will add a direct channel.',
    donateText: 'Donations help improve lessons, audio, and drawing practice. A secure payment method will be added later.',
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

function chunk(items, size = 5) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, index * size + size))
}

function makeOptionPool(items, key) {
  return [...new Set(items.map((item) => item[key]))]
}

function makeGroupQuiz(items) {
  const readingPool = makeOptionPool(items, 'answer')
  const kanaPool = makeOptionPool(items, 'kana')

  return shuffle(items.flatMap((item) => [
    {
      type: 'reading',
      kana: item.kana,
      answer: item.answer,
      options: [...new Set(shuffle([item.answer, ...readingPool.filter((value) => value !== item.answer)]))].slice(0, 4),
    },
    {
      type: 'reverse',
      kana: item.kana,
      answer: item.kana,
      answerLabel: item.answer,
      options: [...new Set(shuffle([item.kana, ...kanaPool.filter((value) => value !== item.kana)]))].slice(0, 4),
    },
    {
      type: 'draw',
      kana: item.kana,
      answer: '__draw_done__',
      options: [],
    },
  ])).slice(0, 12)
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
    userUsername: '',
    emailVerified: false,
    userBio: '',
    userPhone: '',
    userBirthday: '',
    userAvatar: '',
    soundEnabled: true,
    fontScale: 1,
    cozyMode: true,
    isPaid: false,
    startingGemsGranted: true,
  }
}

function normalizeUsername(value, fallback = 'nihongo') {
  const clean = String(value || '')
    .toLowerCase()
    .trim()
    .replace(/^@+/, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]+/g, '')
    .slice(0, 24)
  return clean || fallback
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
  const updatePhoto = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const image = new Image()
      image.onload = () => {
        const canvas = document.createElement('canvas')
        const size = 256
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        const scale = Math.max(size / image.width, size / image.height)
        const width = image.width * scale
        const height = image.height * scale
        ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height)
        setDraft((value) => ({ ...value, userAvatar: canvas.toDataURL('image/jpeg', 0.82) }))
      }
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  }

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
        <div className="photo-picker">
          <div className="avatar large">{draft.userAvatar ? <img src={draft.userAvatar} alt="" /> : (draft.userName || 'G').slice(0, 1).toUpperCase()}</div>
          <label className="file-btn">
            {t.uploadPhoto}
            <input type="file" accept="image/*" onChange={updatePhoto} />
          </label>
        </div>
        <label>{t.name}<input value={draft.userName} onChange={update('userName')} /></label>
        <label>Username<input value={draft.userUsername || ''} onChange={update('userUsername')} placeholder="@nihongo" /></label>
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

function InfoPanel({ title, text }) {
  return (
    <div className="settings-panel">
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  )
}

function SettingsScreen({ lang, theme, setTheme, values, onBack, onEditProfile, onAccountAction, onUpdatePrefs }) {
  const t = copy[lang]
  const [panel, setPanel] = useState('menu')
  const isDark = theme === 'dark'
  const items = [
    { id: 'account', icon: '👤', title: t.account },
    { id: 'customization', icon: '✨', title: t.customization },
    { id: 'subscription', icon: '◆', title: t.subscription },
    { id: 'policy', icon: '📜', title: t.policy },
    { id: 'support', icon: '☎', title: t.support },
    { id: 'donate', icon: '♡', title: t.donate },
  ]

  return (
    <main className="screen">
      <header className="page-head">
        <button className="icon-btn" onClick={panel === 'menu' ? onBack : () => setPanel('menu')}>←</button>
        <div>
          <p>にほんごGO</p>
          <h1>{panel === 'menu' ? t.settings : items.find((item) => item.id === panel)?.title}</h1>
        </div>
      </header>

      <section className="content settings-page">
        {panel === 'menu' && (
          <div className="settings-list">
            {items.map((item) => (
              <button key={item.id} onClick={() => setPanel(item.id)}>
                <span className="settings-icon">{item.icon}</span>
                <strong>{item.title}</strong>
                <small>›</small>
              </button>
            ))}
          </div>
        )}

        {panel === 'account' && (
          <div className="settings-panel">
            {values.isGuest ? (
              <button className="settings-row" onClick={onAccountAction}>
                <span>{t.create}</span>
                <strong>›</strong>
              </button>
            ) : (
              <button className="settings-row" onClick={onEditProfile}>
                <span>{t.editProfile}</span>
                <strong>›</strong>
              </button>
            )}
          </div>
        )}

        {panel === 'customization' && (
          <div className="settings-panel">
            <div className="theme-switch-row">
              <span>☀</span>
              <button className={`theme-switch ${isDark ? 'dark' : 'light'}`} onClick={() => setTheme(isDark ? 'light' : 'dark')} aria-label={t.theme}>
                <span />
              </button>
              <span>☾</span>
            </div>
            <label className="toggle-row">
              <span>{t.sound}</span>
              <input type="checkbox" checked={values.soundEnabled} onChange={(e) => onUpdatePrefs({ soundEnabled: e.target.checked })} />
            </label>
            <label>
              {t.fontSize}
              <input type="range" min="0.9" max="1.18" step="0.02" value={values.fontScale} onChange={(e) => onUpdatePrefs({ fontScale: Number(e.target.value) })} />
            </label>
            <label className="toggle-row">
              <span>{t.cozyMode}</span>
              <input type="checkbox" checked={values.cozyMode} onChange={(e) => onUpdatePrefs({ cozyMode: e.target.checked })} />
            </label>
          </div>
        )}

        {panel === 'subscription' && <InfoPanel title={values.isPaid ? t.paidPlan : t.freePlan} text={t.subscriptionText} />}
        {panel === 'policy' && <InfoPanel title={t.policy} text={t.policyText} />}
        {panel === 'support' && <InfoPanel title={t.support} text={t.supportText} />}
        {panel === 'donate' && <InfoPanel title={t.donate} text={t.donateText} />}
      </section>
    </main>
  )
}

export default function App() {
  const cloudSaveTimerRef = useRef(null)
  const lastSavedCloudJsonRef = useRef('')
  const [screen, setScreen] = useState('loading')
  const [tab, setTab] = useState('home')
  const [lang, setLang] = useState(localStorage.getItem('nihongo-lang') || 'ar')
  const [theme, setTheme] = useState(localStorage.getItem('nihongo-theme') || 'light')
  const [lettersTab, setLettersTab] = useState('hiragana')
  const [currentLevel, setCurrentLevel] = useState('N5')
  const [activeLesson, setActiveLesson] = useState(null)
  const [activeCharGroup, setActiveCharGroup] = useState(null)
  const [drawChar, setDrawChar] = useState(null)
  const [dataReady, setDataReady] = useState(false)
  const [isGuest, setIsGuest] = useState(false)
  const [userId, setUserId] = useState(null)
  const [userName, setUserName] = useState('')
  const [userUsername, setUserUsername] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [emailVerified, setEmailVerified] = useState(false)
  const [userBio, setUserBio] = useState('')
  const [userPhone, setUserPhone] = useState('')
  const [userBirthday, setUserBirthday] = useState('')
  const [userAvatar, setUserAvatar] = useState('')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [fontScale, setFontScale] = useState(1)
  const [cozyMode, setCozyMode] = useState(true)
  const [isPaid, setIsPaid] = useState(false)
  const [startingGemsGranted, setStartingGemsGranted] = useState(true)
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
  const masteredCount = Object.values(progress).filter((v) => v >= 8).length
  const completedLessons = Object.values(lessonProgress).filter((v) => v >= sectionCount).length
  const lessonPercent = Math.round((completedLessons / TOTAL_LESSONS) * 100)
  const lessonSlots = Array.from({ length: TOTAL_LESSONS }, (_, index) => lessons[index] || null)
  const characterSets = { hiragana, katakana, kanji: kanjiN5 }
  const letterGroups = chunk(characterSets[lettersTab] || hiragana, 5)
  const basicCharacterTotal = lettersTab === 'kanji' ? kanjiN5.length : 46
  const basicCharacterDone = (characterSets[lettersTab] || hiragana)
    .slice(0, basicCharacterTotal)
    .filter((item) => (progress[item.kana] || 0) >= 8).length
  const userHandle = isGuest
    ? '@guest'
    : `@${normalizeUsername(userUsername || userName || userEmail?.split('@')[0] || 'nihongo')}`

  const applyState = (state) => {
    setXp(state.xp ?? 0)
    setHearts(state.hearts ?? 5)
    setGems(state.startingGemsGranted === true ? state.gems ?? STARTING_GEMS : Math.max(state.gems ?? 0, STARTING_GEMS))
    setStreak(state.streak ?? 1)
    setLastActiveDate(state.lastActiveDate ?? todayKey())
    setLastHeartRefillAt(state.lastHeartRefillAt ?? Date.now())
    setProgress(state.progress ?? {})
    setLessonProgress(state.lessonProgress ?? {})
    setTotalQuizzes(state.totalQuizzes ?? 0)
    setPerfectScores(state.perfectScores ?? 0)
    setLastScore(state.lastScore ?? 0)
    setUserName(state.userName || state.name || '')
    setUserUsername(state.userUsername || state.username || '')
    setEmailVerified(state.emailVerified ?? false)
    setUserBio(state.userBio ?? '')
    setUserPhone(state.userPhone || state.phone || '')
    setUserBirthday(state.userBirthday || state.birthDate || '')
    setUserAvatar(state.userAvatar || '')
    setSoundEnabled(state.soundEnabled ?? true)
    setFontScale(state.fontScale ?? 1)
    setCozyMode(state.cozyMode ?? true)
    setIsPaid(state.isPaid ?? false)
    setStartingGemsGranted(true)
    if (state.theme) setTheme(state.theme)
    if (state.lang) setLang(state.lang)
  }

  const userPayload = useMemo(() => ({
    xp,
    hearts,
    gems,
    streak,
    lastActiveDate,
    lastHeartRefillAt,
    progress,
    lessonProgress,
    totalQuizzes,
    perfectScores,
    lastScore,
    userName,
    userUsername,
    emailVerified,
    userBio,
    userPhone,
    userBirthday,
    userAvatar,
    soundEnabled,
    fontScale,
    cozyMode,
    isPaid,
    theme,
    lang,
    startingGemsGranted,
  }), [xp, hearts, gems, streak, lastActiveDate, lastHeartRefillAt, progress, lessonProgress, totalQuizzes, perfectScores, lastScore, userName, userUsername, emailVerified, userBio, userPhone, userBirthday, userAvatar, soundEnabled, fontScale, cozyMode, isPaid, theme, lang, startingGemsGranted])

  const saveUserDataNow = async (id = userId, extra = {}) => {
    if (!id || isGuest || !dataReady) return
    const payload = {
      ...userPayload,
      ...extra,
      email: userEmail,
      updatedAt: new Date().toISOString(),
    }
    lastSavedCloudJsonRef.current = JSON.stringify(userPayload)
    await setDoc(doc(db, 'users', id), payload, { merge: true })
  }

  const reserveUsername = async (nextUsername) => {
    if (!userId || isGuest) return
    const previousUsername = normalizeUsername(userUsername || '')
    if (previousUsername === nextUsername) return

    await runTransaction(db, async (transaction) => {
      const nextRef = doc(db, 'usernames', nextUsername)
      const nextSnap = await transaction.get(nextRef)
      if (nextSnap.exists() && nextSnap.data()?.uid !== userId) {
        throw new Error('username-taken')
      }

      const previousRef = previousUsername && previousUsername !== nextUsername
        ? doc(db, 'usernames', previousUsername)
        : null
      const previousSnap = previousRef ? await transaction.get(previousRef) : null

      transaction.set(nextRef, {
        uid: userId,
        username: nextUsername,
        updatedAt: new Date().toISOString(),
      })

      if (previousRef && previousSnap?.exists() && previousSnap.data()?.uid === userId) {
        transaction.delete(previousRef)
      }
    })
  }

  const startGuest = () => {
    const saved = readGuestState()
    const activity = nextStreakValue(saved.lastActiveDate, saved.streak)
    applyState({ ...saved, ...activity })
    setUserId(null)
    setUserEmail('')
    setIsGuest(true)
    setEmailVerified(false)
    setDataReady(true)
    setScreen('main')
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.dir = dir
    document.documentElement.style.setProperty('--font-scale', String(fontScale))
    document.documentElement.dataset.cozy = cozyMode ? 'true' : 'false'
    localStorage.setItem('nihongo-lang', lang)
    localStorage.setItem('nihongo-theme', theme)
  }, [lang, theme, dir, fontScale, cozyMode])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setDataReady(false)
      if (!user) {
        setUserId(null)
        setIsGuest(false)
        setEmailVerified(false)
        lastSavedCloudJsonRef.current = ''
        setDataReady(true)
        setScreen('welcome')
        return
      }

      setIsGuest(false)
      setUserEmail(user.email || '')
      setEmailVerified(Boolean(user.emailVerified))

      const snap = await getDoc(doc(db, 'users', user.uid))
      if (auth.currentUser?.uid !== user.uid) return
      if (snap.exists()) {
        const d = snap.data()
        const activity = nextStreakValue(d.lastActiveDate ?? null, d.streak ?? 0)
        applyState({
          ...d,
          ...activity,
          userName: d.userName || d.name || user.displayName || '',
          userUsername: d.userUsername || d.username || normalizeUsername(d.userName || d.name || user.displayName || user.email?.split('@')[0] || 'nihongo'),
          emailVerified: Boolean(user.emailVerified),
          gems: d.gems ?? STARTING_GEMS,
          hearts: d.hearts ?? 5,
        })
      } else {
        const base = defaultState()
        const userUsername = normalizeUsername(user.displayName || user.email?.split('@')[0] || 'nihongo')
        applyState({ ...base, userName: user.displayName || '', userUsername })
        await setDoc(doc(db, 'users', user.uid), {
          ...base,
          userName: user.displayName || '',
          userUsername,
          email: user.email || '',
          emailVerified: Boolean(user.emailVerified),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { merge: true })
      }
      lastSavedCloudJsonRef.current = ''
      setUserId(user.uid)
      setDataReady(true)
      setScreen('main')
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!dataReady || !isGuest) return
    localStorage.setItem(GUEST_KEY, JSON.stringify({
      xp, hearts, gems, streak, lastActiveDate, lastHeartRefillAt, progress, lessonProgress,
      totalQuizzes, perfectScores, lastScore, userName, userUsername, userBio, userPhone, userBirthday,
      userAvatar, soundEnabled, fontScale, cozyMode, isPaid, theme, lang,
      startingGemsGranted,
    }))
  }, [isGuest, dataReady, xp, hearts, gems, streak, lastActiveDate, lastHeartRefillAt, progress, lessonProgress, totalQuizzes, perfectScores, lastScore, userName, userUsername, userBio, userPhone, userBirthday, userAvatar, soundEnabled, fontScale, cozyMode, isPaid, theme, lang, startingGemsGranted])

  useEffect(() => {
    if (!userId || !dataReady || isGuest) return
    const payload = userPayload
    const cloudJson = JSON.stringify(payload)
    if (cloudJson === lastSavedCloudJsonRef.current) return

    if (cloudSaveTimerRef.current) window.clearTimeout(cloudSaveTimerRef.current)
    cloudSaveTimerRef.current = window.setTimeout(() => {
      setDoc(doc(db, 'users', userId), {
        ...payload,
        email: userEmail,
        updatedAt: new Date().toISOString(),
      }, { merge: true }).then(() => {
        lastSavedCloudJsonRef.current = cloudJson
      }).catch((error) => {
        console.error('Failed to sync user data', error)
      })
    }, 500)

    return () => {
      if (cloudSaveTimerRef.current) window.clearTimeout(cloudSaveTimerRef.current)
    }
  }, [userId, userEmail, isGuest, dataReady, userPayload])

  useEffect(() => {
    if (!dataReady) return
    const timer = setInterval(() => {
      setHearts((current) => {
        if (current >= 5) return current

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
    setQuestions(shuffle(quizSets[setName] || hiragana).slice(0, 10).map((q) => ({ ...q, soundEnabled })))
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

  const startCharacterGroupQuiz = (group) => {
    if (hearts <= 0) {
      setNotice(t.noHearts)
      return
    }
    setQuestions(makeGroupQuiz(group.items).map((q) => ({ ...q, soundEnabled })))
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
      setProgress((p) => ({ ...p, [current.kana]: Math.min((p[current.kana] || 0) + 1, 8) }))
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

  const resendVerificationEmail = async () => {
    if (!auth.currentUser || auth.currentUser.emailVerified) return
    try {
      await sendEmailVerification(auth.currentUser, {
        url: window.location.origin,
        handleCodeInApp: false,
      })
      setNotice(t.verificationSent)
    } catch (error) {
      setNotice(`تعذر إرسال رابط التأكيد حاليا: ${error.code || error.message}`)
    }
  }

  const refreshEmailVerification = async () => {
    if (!auth.currentUser) return
    try {
      await auth.currentUser.reload()
      const verified = Boolean(auth.currentUser.emailVerified)
      setEmailVerified(verified)
      await saveUserDataNow(userId, { emailVerified: verified })
      if (verified) setNotice(t.emailVerified)
    } catch (error) {
      setNotice(`تعذر تحديث حالة البريد حاليا: ${error.code || error.message}`)
    }
  }

  useEffect(() => {
    if (!userId || isGuest || !dataReady || emailVerified) return

    let cancelled = false
    const checkEmailVerification = async (showNotice = false) => {
      if (!auth.currentUser) return
      try {
        await auth.currentUser.reload()
        const verified = Boolean(auth.currentUser.emailVerified)
        if (!verified || cancelled) return
        setEmailVerified(true)
        await setDoc(doc(db, 'users', userId), {
          emailVerified: true,
          updatedAt: new Date().toISOString(),
        }, { merge: true })
        if (showNotice) setNotice(copy[lang].emailVerified)
      } catch (error) {
        console.warn('Failed to refresh email verification', error)
      }
    }

    const onFocus = () => checkEmailVerification(true)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkEmailVerification(true)
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibilityChange)
    const timer = window.setInterval(() => checkEmailVerification(false), 30000)
    checkEmailVerification(false)

    return () => {
      cancelled = true
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.clearInterval(timer)
    }
  }, [userId, isGuest, dataReady, emailVerified, lang])

  const achievements = useMemo(() => [
    { label: 'First Quiz', active: totalQuizzes >= 1 },
    { label: '7 Day Streak', active: streak >= 7 },
    { label: 'Perfect', active: perfectScores >= 1 },
    { label: '500 XP', active: xp >= 500 },
    { label: '10 Mastered', active: masteredCount >= 10 },
    { label: '5 Quizzes', active: totalQuizzes >= 5 },
  ], [totalQuizzes, streak, perfectScores, xp, masteredCount])

  const logout = async () => {
    if (cloudSaveTimerRef.current) window.clearTimeout(cloudSaveTimerRef.current)
    await saveUserDataNow()
    if (userId) await signOut(auth)
    setUserId(null)
    setUserName('')
    setUserUsername('')
    setUserEmail('')
    setEmailVerified(false)
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
          setScreen(dataReady && userId ? 'main' : 'loading')
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

  if (screen === 'character-group' && activeCharGroup) {
    const title = `${activeCharGroup.label} ${activeCharGroup.index + 1}`
    const currentDrawChar = drawChar || activeCharGroup.items[0]?.kana

    return (
      <main className="screen">
        <header className="page-head">
          <button className="icon-btn" onClick={() => setScreen('main')}>←</button>
          <div>
            <p>{t.groups}</p>
            <h1>{title}</h1>
          </div>
          <Button variant="small" onClick={() => startCharacterGroupQuiz(activeCharGroup)}>{t.groupQuiz}</Button>
        </header>

        <section className="content">
          <div className="group-character-grid">
            {activeCharGroup.items.map((item) => {
              const active = currentDrawChar === item.kana
              return (
                <button key={item.kana} className={active ? 'active' : ''} onClick={() => { setDrawChar(item.kana); speakJapanese(item.kana) }}>
                  <span>{item.kana}</span>
                  <strong>{item.answer}</strong>
                  <small>{t.listen}</small>
                  <meter min="0" max="8" value={progress[item.kana] || 0} />
                </button>
              )
            })}
          </div>

          <section className="drawing-section">
            <div>
              <p className="eyebrow">{t.drawPractice}</p>
              <h2>{t.chooseCharacter}</h2>
            </div>
            <DrawingPad char={currentDrawChar} lang={lang} />
          </section>

          <Button onClick={() => startCharacterGroupQuiz(activeCharGroup)}>{t.groupQuiz}</Button>
        </section>
      </main>
    )
  }

  if (screen === 'edit-profile') {
    return (
      <ProfileEditor
        lang={lang}
        values={{ userName, userUsername, userBio, userPhone, userBirthday, userAvatar }}
        onCancel={() => setScreen('main')}
        onSave={async (draft) => {
          const nextUsername = normalizeUsername(draft.userUsername || draft.userName || userEmail?.split('@')[0] || 'nihongo')
          if (!USERNAME_RE.test(nextUsername)) {
            setNotice(t.usernameInvalid)
            setScreen('main')
            setTab('profile')
            return
          }
          try {
            await reserveUsername(nextUsername)
          } catch (error) {
            setNotice(error.message === 'username-taken' ? t.usernameTaken : 'تعذر حفظ الـ username حاليا.')
            setScreen('main')
            setTab('profile')
            return
          }
          setUserName(draft.userName)
          setUserUsername(nextUsername)
          setUserBio(draft.userBio)
          setUserPhone(draft.userPhone)
          setUserBirthday(draft.userBirthday)
          setUserAvatar(draft.userAvatar)
          await saveUserDataNow(userId, {
            userName: draft.userName,
            userUsername: nextUsername,
            userBio: draft.userBio,
            userPhone: draft.userPhone,
            userBirthday: draft.userBirthday,
            userAvatar: draft.userAvatar,
          })
          setScreen('main')
          setTab('profile')
        }}
      />
    )
  }

  if (screen === 'settings') {
    return (
      <SettingsScreen
        lang={lang}
        theme={theme}
        setTheme={setTheme}
        values={{ userAvatar, soundEnabled, fontScale, cozyMode, isPaid, isGuest }}
        onBack={() => setScreen('main')}
        onEditProfile={() => setScreen('edit-profile')}
        onAccountAction={() => setScreen('login')}
        onUpdatePrefs={(prefs) => {
          if ('soundEnabled' in prefs) setSoundEnabled(prefs.soundEnabled)
          if ('fontScale' in prefs) setFontScale(prefs.fontScale)
          if ('cozyMode' in prefs) setCozyMode(prefs.cozyMode)
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
            <span className="stat-chip hearts"><i>♥</i>{hearts}/5</span>
            <span className="stat-chip gems"><i>◆</i>{gems}</span>
            <span className="stat-chip xp"><i>XP</i>{xp}</span>
            <span className="stat-chip streak"><i>✦</i>{streak}</span>
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

            <div className="unit-card">
              <div>
                <p>SECTION 1, N5</p>
                <h2>{t.lessons}</h2>
              </div>
              <span>▤</span>
            </div>

            <div className="path-caption">
              <span />
              <strong>{t.continue}</strong>
              <span />
            </div>

            <div className="lesson-path map-path">
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
                    className={`lesson-node map-node ${locked ? 'locked' : amount >= sectionCount ? 'done' : 'current'} ${index % 2 ? 'right' : 'left'}`}
                    onClick={() => { setActiveLesson(lesson); setScreen('lesson') }}
                  >
                    <span className="lesson-number">{amount >= sectionCount ? '★' : lessonNumber}</span>
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
            <div className="letters-progress-card">
              <div>
                <span>{basicCharacterDone}</span>
                <strong>/ {basicCharacterTotal}</strong>
              </div>
              <p>{lettersTab === 'kanji' ? 'Kanji N5' : lang === 'ar' ? 'الأحرف الأساسية المكتملة' : 'Basic characters completed'}</p>
              <meter min="0" max={basicCharacterTotal} value={basicCharacterDone} />
            </div>
            <p className="section-subtitle">{t.fiveChars}</p>
            <div className="letter-group-list">
              {letterGroups.map((group, index) => {
                const mastered = group.filter((item) => (progress[item.kana] || 0) >= 8).length
                return (
                  <button
                    key={`${lettersTab}-${index}`}
                    className="letter-group-card"
                    onClick={() => {
                      setActiveCharGroup({ type: lettersTab, index, label: t.group, items: group })
                      setDrawChar(group[0]?.kana)
                      setScreen('character-group')
                    }}
                  >
                    <div>
                      <span className="group-number">{index + 1}</span>
                      <strong>{t.group} {index + 1}</strong>
                      <small>{mastered}/{group.length} {t.mastered}</small>
                    </div>
                    <div className="group-preview">
                      {group.map((item) => (
                        <span key={item.kana}>
                          <b>{item.kana}</b>
                          <meter min="0" max="8" value={progress[item.kana] || 0} />
                        </span>
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {tab === 'profile' && (
          <section className="content profile">
            <div className="profile-toolbar">
              <button className={`theme-switch ${theme === 'dark' ? 'dark' : 'light'}`} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={t.theme}>
                <span />
              </button>
            </div>

            <div className="profile-card">
              <div className="avatar">{userAvatar ? <img src={userAvatar} alt="" /> : (userName || t.guestName).slice(0, 1).toUpperCase()}</div>
              <h1>{userName || t.guestName}</h1>
              <p className="user-handle">{userHandle}</p>
              <p>{isGuest ? t.guestHint : 'にほんごGO learner'}</p>
              {userBio && <p>{userBio}</p>}
            </div>

            {!isGuest && userEmail && !emailVerified && (
              <div className="verify-panel">
                <div>
                  <strong>{t.emailUnverified}</strong>
                  <span>{userEmail}</span>
                </div>
                <div className="split-actions">
                  <Button variant="small" onClick={resendVerificationEmail}>{t.resendEmail}</Button>
                  <Button variant="secondary" onClick={refreshEmailVerification}>{t.refreshEmail}</Button>
                </div>
              </div>
            )}

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
            <button className="settings-entry" onClick={() => setScreen('settings')}>
              <span>⚙</span>
              <strong>{t.settings}</strong>
              <small>›</small>
            </button>

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
          ['home', '🏠', t.home],
          ['letters', 'あ', t.letters],
          ['profile', '👤', t.profile],
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
