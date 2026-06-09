import { useEffect, useMemo, useRef, useState } from 'react'
import { onAuthStateChanged, sendEmailVerification, signOut } from 'firebase/auth'
import { addDoc, collection, doc, getDoc, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, where } from 'firebase/firestore'
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
const MAX_HEARTS = 10
const HEART_REFILL_MS = 90 * 1000
const GUEST_KEY = 'nihongo-guest-state'
const USERNAME_RE = /^[a-z][a-z0-9_]{2,23}$/
const VERIFICATION_COOLDOWN_MS = 15 * 60 * 1000
const LESSON_PATH_X = [18, 32, 50, 70, 88, 80, 62, 40, 22, 10, 24, 44, 66, 86, 92, 76, 54, 30, 12, 8, 26, 50, 74, 90, 72]
const LESSON_PATH_X_MOBILE = [6, 18, 36, 58, 82, 76, 58, 36, 16, 4, 18, 40, 64, 86, 94, 76, 52, 28, 10, 3, 20, 46, 72, 92, 68]

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
    grammar: 'قواعد',
    examples: 'أمثلة',
    exercises: 'تمارين',
    videos: 'فيديوهات',
    review: 'مراجعة',
    noVideos: 'سنضيف فيديوهات هذا الدرس لاحقا. حاليا تدرب على المفردات والقواعد.',
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
    refillAll: 'تعبئة البطارية',
    refillCost: '250 جوهرة',
    notEnoughGems: 'الجواهر غير كافية.',
    usernameInvalid: 'Username لازم يبدأ بحرف إنكليزي ويحتوي حروف إنكليزية أو أرقام أو _ فقط، من 3 إلى 24 حرف.',
    usernameTaken: 'هذا الـ username مأخوذ، جرّب واحد ثاني.',
    emailUnverified: 'بريدك غير مؤكد بعد. أكد البريد حتى يبقى حسابك آمن وتقدر تسترجعه لاحقا.',
    resendEmail: 'إرسال رابط التأكيد',
    resendWait: 'انتظر',
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
    exercises: 'Exercises',
    videos: 'Videos',
    review: 'Review',
    noVideos: 'Videos for this lesson will be added later. Practice vocabulary and grammar for now.',
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
    refillAll: 'Refill battery',
    refillCost: '250 gems',
    notEnoughGems: 'Not enough gems.',
    usernameInvalid: 'Username must start with an English letter and use only English letters, numbers, or _, 3-24 characters.',
    usernameTaken: 'This username is already taken.',
    emailUnverified: 'Your email is not verified yet. Verify it to keep the account secure and recoverable.',
    resendEmail: 'Send verification link',
    resendWait: 'Wait',
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

const communityText = {
  ar: {
    title: 'مجتمع الدراسة',
    subtitle: 'تفاعل يخدم التعلم: تحديات، أسئلة، مجموعات، وجمل يابانية.',
    daily: 'تحدي اليوم',
    groups: 'مجموعات الدراسة',
    questions: 'أسئلة المجتمع',
    sentences: 'مشاركة الجمل',
    leaderboard: 'المتصدرون',
    aiPartner: 'شريك اللغة AI',
    corrector: 'تصحيح الجمل',
    start: 'ابدأ',
    join: 'انضم',
    ask: 'اسأل المجتمع',
    share: 'شارك الجملة',
    correct: 'صحح',
    send: 'إرسال',
    questionPlaceholder: 'اكتب سؤالك عن الياباني...',
    sentencePlaceholder: 'اكتب جملة يابانية مثل: わたしはがくせいです',
    meaningPlaceholder: 'المعنى بالعربي اختياري',
    partnerPlaceholder: 'اكتب رسالة قصيرة بالياباني أو العربي...',
    locked: 'قريباً ربط مباشر مع Firestore و AI حقيقي.',
    saved: 'تم الحفظ بالمجتمع.',
    loginRequired: 'سجل دخول حتى تشارك بالمجتمع وتحفظ باسمك.',
    follow: 'متابعة',
    followRequest: 'إرسال طلب متابعة',
    following: 'تتابعه',
    ownProfile: 'هذا حسابك',
    message: 'رسالة',
    friendsOnly: 'الرسائل تفتح بعد ما تصيرون أصدقاء: لازم تتابعوه ويتابعك.',
    messageSoon: 'المحادثات الخاصة جاهزة للربط كخطوة قادمة.',
    viewProfile: 'عرض البروفايل',
    publicStats: 'إحصائيات عامة',
    learningLevel: 'N5 learner',
    noBio: 'ماكو نبذة بعد.',
    emptyCorrection: 'اكتب جملة حتى أراجعها.',
    goodJapanese: 'حلو، الجملة تحتوي ياباني. انتبه للمسافات حول は و の حتى تكون القراءة أوضح.',
    needsJapanese: 'حاول تضيف نص ياباني حتى يكون التصحيح مفيد.',
    partnerReply: 'いいですね! خل نكمل: عرّف عن نفسك بجملة واحدة باليابانية.',
  },
  en: {
    title: 'Study Hub',
    subtitle: 'Interaction built for learning: challenges, questions, groups, and Japanese sentences.',
    daily: 'Daily challenge',
    groups: 'Study groups',
    questions: 'Community questions',
    sentences: 'Sentence sharing',
    leaderboard: 'Leaderboard',
    aiPartner: 'AI language partner',
    corrector: 'Sentence correction',
    start: 'Start',
    join: 'Join',
    ask: 'Ask community',
    share: 'Share sentence',
    correct: 'Correct',
    send: 'Send',
    questionPlaceholder: 'Write your Japanese question...',
    sentencePlaceholder: 'Write a Japanese sentence, e.g. わたしはがくせいです',
    meaningPlaceholder: 'Arabic meaning, optional',
    partnerPlaceholder: 'Write a short message in Japanese or Arabic...',
    locked: 'Firestore and real AI wiring can be added next.',
    saved: 'Saved to the community.',
    loginRequired: 'Log in to post to the community under your name.',
    follow: 'Follow',
    followRequest: 'Send follow request',
    following: 'Following',
    ownProfile: 'This is you',
    message: 'Message',
    friendsOnly: 'Messages unlock after you become friends: you follow them and they follow you back.',
    messageSoon: 'Private messages are ready to wire in the next step.',
    viewProfile: 'View profile',
    publicStats: 'Public stats',
    learningLevel: 'N5 learner',
    noBio: 'No bio yet.',
    emptyCorrection: 'Write a sentence first.',
    goodJapanese: 'Nice, this includes Japanese. Watch spacing around は and の for clearer reading.',
    needsJapanese: 'Add Japanese text so correction is useful.',
    partnerReply: 'いいですね! Next, introduce yourself in one Japanese sentence.',
  },
}

const studyGroups = [
  { icon: 'あ', ar: 'نادي حروف N5', en: 'N5 Character Club', metaAr: 'تدريب رسم وصوت', metaEn: 'Drawing and sound practice' },
  { icon: '文', ar: 'مختبر الجمل', en: 'Sentence Lab', metaAr: 'شارك جملة وخذ تصحيح', metaEn: 'Share sentences and get feedback' },
  { icon: '会', ar: 'غرفة محادثة المبتدئين', en: 'Beginner Chat Room', metaAr: 'تعرف وسولف بجمل بسيطة', metaEn: 'Simple beginner conversations' },
]

const communityQuestions = [
  { ar: 'متى أستخدم は ومتى أستخدم が؟', en: 'When should I use は vs が?', answers: 8 },
  { ar: 'شلون أحفظ الكاتاكانا بسرعة؟', en: 'How can I memorize katakana faster?', answers: 5 },
  { ar: 'هل じゃありません رسمي كفاية؟', en: 'Is じゃありません formal enough?', answers: 3 },
]

const sharedSentences = [
  { jp: 'わたしは がくせい です。', ar: 'أنا طالب.', user: '@sakura' },
  { jp: 'ミラーさんも かいしゃいん です。', ar: 'السيد ميرا أيضاً موظف شركة.', user: '@nihongo' },
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
    hearts: MAX_HEARTS,
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

function hasJapanese(value) {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(value)
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

function JapaneseTerm({ item, className = 'jp' }) {
  const kana = item.hiragana || item.jp
  const kanji = item.kanji && item.kanji !== '—' ? item.kanji : kana
  if (kanji === kana) return <span className={className}>{kana}</span>
  return (
    <ruby className={className}>
      {kanji}
      <rt>{kana}</rt>
    </ruby>
  )
}

function CommunityHub({ lang, userId, isGuest, userName, userHandle, xp, streak, totalQuizzes, masteredCount, onStartDaily, onNotice }) {
  const [sentence, setSentence] = useState('')
  const [shareSentence, setShareSentence] = useState('')
  const [shareMeaning, setShareMeaning] = useState('')
  const [questionText, setQuestionText] = useState('')
  const [partnerMessage, setPartnerMessage] = useState('')
  const [correction, setCorrection] = useState('')
  const [partnerReply, setPartnerReply] = useState('')
  const [liveQuestions, setLiveQuestions] = useState([])
  const [liveSentences, setLiveSentences] = useState([])
  const [publicProfiles, setPublicProfiles] = useState([])
  const [followingIds, setFollowingIds] = useState(new Set())
  const [followerIds, setFollowerIds] = useState(new Set())
  const [selectedProfile, setSelectedProfile] = useState(null)
  const text = communityText[lang] || communityText.en
  const isAr = lang === 'ar'
  const displayName = userName || (isAr ? 'أنت' : 'You')
  const canPost = Boolean(userId && !isGuest)
  const visibleFollowingIds = canPost ? followingIds : new Set()
  const visibleFollowerIds = canPost ? followerIds : new Set()
  const visibleQuestions = liveQuestions.length ? liveQuestions : communityQuestions.map((item) => ({
    id: item.en,
    text: item[isAr ? 'ar' : 'en'],
    answers: item.answers,
  }))
  const visibleSentences = liveSentences.length ? liveSentences : sharedSentences.map((item) => ({
    id: item.jp,
    jp: item.jp,
    meaning: item.ar,
    authorHandle: item.user,
  }))
  const fallbackProfile = {
    id: userId || 'guest',
    userId: userId || 'guest',
    userName: displayName,
    userUsername: userHandle.replace('@', ''),
    userHandle,
    xp,
    streak,
    totalQuizzes,
    masteredCount,
    completedLessons: 0,
    current: true,
  }
  const leaderboard = (publicProfiles.length ? publicProfiles : [fallbackProfile])
    .map((profile) => ({
      ...profile,
      userHandle: profile.userHandle || `@${profile.userUsername || 'nihongo'}`,
      current: profile.id === userId || profile.userId === userId,
    }))
    .sort((a, b) => (b.xp || 0) - (a.xp || 0))
  const ownPublicProfile = leaderboard.find((profile) => profile.current) || fallbackProfile
  const profileForCommunityItem = (item) => {
    const handle = item.authorHandle || item.userHandle
    const profile = publicProfiles.find((entry) => (
      (item.userId && (entry.id === item.userId || entry.userId === item.userId))
      || (handle && (entry.userHandle === handle || `@${entry.userUsername}` === handle))
    ))
    if (profile) return {
      ...profile,
      userHandle: profile.userHandle || `@${profile.userUsername || 'nihongo'}`,
      current: profile.id === userId || profile.userId === userId,
    }
    return {
      id: item.userId || handle || item.id,
      userId: item.userId,
      userName: item.authorName || handle || 'Nihongo learner',
      userHandle: handle || '@nihongo',
      xp: 0,
      streak: 0,
      masteredCount: 0,
      completedLessons: 0,
      totalQuizzes: 0,
      current: item.userId === userId,
    }
  }

  useEffect(() => {
    const questionQuery = query(collection(db, 'communityQuestions'), orderBy('createdAt', 'desc'), limit(20))
    const sentenceQuery = query(collection(db, 'communitySentences'), orderBy('createdAt', 'desc'), limit(20))
    const profileQuery = query(collection(db, 'publicProfiles'), orderBy('xp', 'desc'), limit(30))

    const stopQuestions = onSnapshot(questionQuery, (snapshot) => {
      setLiveQuestions(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
    }, (error) => {
      console.warn('Community questions unavailable', error)
    })

    const stopSentences = onSnapshot(sentenceQuery, (snapshot) => {
      setLiveSentences(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
    }, (error) => {
      console.warn('Community sentences unavailable', error)
    })

    const stopProfiles = onSnapshot(profileQuery, (snapshot) => {
      setPublicProfiles(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
    }, (error) => {
      console.warn('Public profiles unavailable', error)
    })

    return () => {
      stopQuestions()
      stopSentences()
      stopProfiles()
    }
  }, [])

  useEffect(() => {
    if (!userId || isGuest) {
      return undefined
    }

    const followingQuery = query(collection(db, 'follows'), where('followerId', '==', userId), limit(500))
    const followersQuery = query(collection(db, 'follows'), where('followingId', '==', userId), limit(500))

    const stopFollowing = onSnapshot(followingQuery, (snapshot) => {
      setFollowingIds(new Set(snapshot.docs.map((item) => item.data().followingId)))
    }, (error) => {
      console.warn('Following list unavailable', error)
    })

    const stopFollowers = onSnapshot(followersQuery, (snapshot) => {
      setFollowerIds(new Set(snapshot.docs.map((item) => item.data().followerId)))
    }, (error) => {
      console.warn('Follower list unavailable', error)
    })

    return () => {
      stopFollowing()
      stopFollowers()
    }
  }, [userId, isGuest])

  const requireCommunityAccount = () => {
    if (canPost) return true
    onNotice(text.loginRequired)
    return false
  }

  const askQuestion = async () => {
    const next = questionText.trim()
    if (!next) return onNotice(text.questionPlaceholder)
    if (!requireCommunityAccount()) return
    try {
      await addDoc(collection(db, 'communityQuestions'), {
        text: next,
        lang,
        authorName: displayName,
        authorHandle: userHandle,
        answers: 0,
        userId,
        createdAt: serverTimestamp(),
      })
      setQuestionText('')
      onNotice(text.saved)
    } catch (error) {
      onNotice(`${text.locked} ${error.code || error.message}`)
    }
  }

  const shareCommunitySentence = async () => {
    const next = shareSentence.trim()
    if (!next) return onNotice(text.sentencePlaceholder)
    if (!hasJapanese(next)) return onNotice(text.needsJapanese)
    if (!requireCommunityAccount()) return
    try {
      await addDoc(collection(db, 'communitySentences'), {
        jp: next,
        meaning: shareMeaning.trim(),
        lang,
        authorName: displayName,
        authorHandle: userHandle,
        userId,
        createdAt: serverTimestamp(),
      })
      setShareSentence('')
      setShareMeaning('')
      onNotice(text.saved)
    } catch (error) {
      onNotice(`${text.locked} ${error.code || error.message}`)
    }
  }

  const joinGroup = async (group) => {
    if (!requireCommunityAccount()) return
    try {
      await addDoc(collection(db, 'studyGroupJoins'), {
        groupId: group.en,
        groupName: group[isAr ? 'ar' : 'en'],
        authorName: displayName,
        authorHandle: userHandle,
        userId,
        createdAt: serverTimestamp(),
      })
      onNotice(`${text.join}: ${group[isAr ? 'ar' : 'en']}`)
    } catch (error) {
      onNotice(`${text.locked} ${error.code || error.message}`)
    }
  }

  const followProfile = async (profile) => {
    if (!requireCommunityAccount()) return
    const targetId = profile.id || profile.userId
    if (!targetId || targetId === userId) return
    try {
      await setDoc(doc(db, 'follows', `${userId}_${targetId}`), {
        followerId: userId,
        followingId: targetId,
        followerHandle: userHandle,
        followingHandle: profile.userHandle || `@${profile.userUsername || 'nihongo'}`,
        createdAt: serverTimestamp(),
      }, { merge: true })
      onNotice(text.following)
    } catch (error) {
      onNotice(`${text.locked} ${error.code || error.message}`)
    }
  }

  const messageProfile = (profile) => {
    const targetId = profile.id || profile.userId
    if (!targetId || targetId === userId) return
    const friends = visibleFollowingIds.has(targetId) && visibleFollowerIds.has(targetId)
    onNotice(friends ? text.messageSoon : text.friendsOnly)
  }

  const checkSentence = () => {
    const next = sentence.trim()
    if (!next) return setCorrection(text.emptyCorrection)
    setCorrection(hasJapanese(next) ? text.goodJapanese : text.needsJapanese)
  }

  const talkToPartner = () => {
    const next = partnerMessage.trim()
    if (!next) return setPartnerReply(text.emptyCorrection)
    setPartnerReply(hasJapanese(next) ? text.partnerReply : text.needsJapanese)
  }

  return (
    <section className="content community">
      <div className="community-hero">
        <div>
          <p className="eyebrow">Study Hub</p>
          <h1>{text.title}</h1>
          <p>{text.subtitle}</p>
        </div>
        <div className="community-score">
          <strong>{streak}</strong>
          <span>Streak</span>
          <small>{totalQuizzes} Quiz</small>
        </div>
      </div>

      <div className="community-grid">
        <article className="community-card daily-card">
          <div className="card-heading">
            <span>⚡</span>
            <div>
              <h2>{text.daily}</h2>
              <p>{isAr ? 'خمس دقائق: حرف، مفردة، وجملة قصيرة.' : 'Five minutes: character, word, and short sentence.'}</p>
            </div>
          </div>
          <div className="challenge-meter">
            <span style={{ width: `${Math.min(100, masteredCount * 4)}%` }} />
          </div>
          <Button variant="small" onClick={onStartDaily}>{text.start}</Button>
        </article>

        <article className="community-card">
          <div className="card-heading">
            <span>🏆</span>
            <h2>{text.leaderboard}</h2>
          </div>
          <div className="leaderboard-list">
            {leaderboard.map((item, index) => (
              <button key={item.id || item.userHandle} className={item.current ? 'current' : ''} onClick={() => setSelectedProfile(item)}>
                <strong>{index + 1}</strong>
                <span>{item.userName || item.name}<small>{item.userHandle}</small></span>
                <b>{item.xp || 0} XP</b>
              </button>
            ))}
          </div>
        </article>

        <article className="community-card wide">
          <div className="card-heading">
            <span>👥</span>
            <h2>{text.groups}</h2>
          </div>
          <div className="study-group-list">
            {studyGroups.map((group) => (
              <button key={group.en} onClick={() => joinGroup(group)}>
                <i>{group.icon}</i>
                <span>
                  <strong>{group[isAr ? 'ar' : 'en']}</strong>
                  <small>{group[isAr ? 'metaAr' : 'metaEn']}</small>
                </span>
                <b>{text.join}</b>
              </button>
            ))}
          </div>
        </article>

        <article className="community-card">
          <div className="card-heading">
            <span>💬</span>
            <h2>{text.questions}</h2>
          </div>
          <div className="question-list">
            {visibleQuestions.map((question) => (
              <div key={question.id} className="community-post">
                <button className="post-main" onClick={() => onNotice(text.locked)}>
                  <strong>{question.text}</strong>
                  <small>{question.answers || 0} {isAr ? 'إجابات' : 'answers'}</small>
                </button>
                {(question.authorHandle || question.userId) && (
                  <button className="author-chip" onClick={() => setSelectedProfile(profileForCommunityItem(question))}>
                    {question.authorHandle || text.viewProfile}
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="community-input">
            <input value={questionText} onChange={(event) => setQuestionText(event.target.value)} placeholder={text.questionPlaceholder} />
            <Button variant="secondary" onClick={askQuestion}>{text.ask}</Button>
          </div>
        </article>

        <article className="community-card">
          <div className="card-heading">
            <span>✍</span>
            <h2>{text.sentences}</h2>
          </div>
          <div className="sentence-feed">
            {visibleSentences.map((item) => (
              <div key={item.id} className="community-post">
                <button className="post-main" onClick={() => speakJapanese(item.jp)}>
                  <span>{item.jp}</span>
                  <small>{item.meaning || '—'}</small>
                </button>
                {(item.authorHandle || item.userId) && (
                  <button className="author-chip" onClick={() => setSelectedProfile(profileForCommunityItem(item))}>
                    {item.authorHandle || text.viewProfile}
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="community-input">
            <input value={shareSentence} onChange={(event) => setShareSentence(event.target.value)} placeholder={text.sentencePlaceholder} />
            <Button variant="small" onClick={shareCommunitySentence}>{text.share}</Button>
          </div>
          <input className="community-meaning" value={shareMeaning} onChange={(event) => setShareMeaning(event.target.value)} placeholder={text.meaningPlaceholder} />
        </article>

        <article className="community-card ai-card">
          <div className="card-heading">
            <span>✨</span>
            <h2>{text.corrector}</h2>
          </div>
          <textarea value={sentence} onChange={(event) => setSentence(event.target.value)} placeholder={text.sentencePlaceholder} />
          <Button variant="small" onClick={checkSentence}>{text.correct}</Button>
          {correction && <p className="ai-reply">{correction}</p>}
        </article>

        <article className="community-card ai-card wide">
          <div className="card-heading">
            <span>友</span>
            <h2>{text.aiPartner}</h2>
          </div>
          <textarea value={partnerMessage} onChange={(event) => setPartnerMessage(event.target.value)} placeholder={text.partnerPlaceholder} />
          <Button variant="small" onClick={talkToPartner}>{text.send}</Button>
          {partnerReply && <p className="ai-reply">{partnerReply}</p>}
        </article>
      </div>

      {selectedProfile && (
        <div className="profile-modal" role="dialog" aria-modal="true">
          <button className="modal-backdrop" onClick={() => setSelectedProfile(null)} aria-label="Close" />
          <article className="public-profile-card">
            <button className="icon-btn modal-close" onClick={() => setSelectedProfile(null)}>×</button>
            <div className="profile-cover">
              <span>{selectedProfile.current ? text.ownProfile : text.learningLevel}</span>
            </div>
            <div className="public-profile-top">
              <div className="avatar large public-avatar">
                {selectedProfile.userAvatar ? <img src={selectedProfile.userAvatar} alt="" /> : (selectedProfile.userName || 'N').slice(0, 1).toUpperCase()}
              </div>
              <div>
                <h2>{selectedProfile.userName || 'Nihongo learner'}</h2>
                <p className="user-handle">{selectedProfile.userHandle || `@${selectedProfile.userUsername || 'nihongo'}`}</p>
              </div>
            </div>
            <p className="public-bio">{selectedProfile.userBio || text.noBio}</p>
            <div className="public-stat-grid">
              <Stat label="XP" value={selectedProfile.xp || 0} />
              <Stat label="Streak" value={selectedProfile.streak || 0} />
              <Stat label={isAr ? 'حروف' : 'Chars'} value={selectedProfile.masteredCount || 0} />
              <Stat label={isAr ? 'دروس' : 'Lessons'} value={selectedProfile.completedLessons || 0} />
            </div>
            <div className="profile-detail-list">
              <div><span>{isAr ? 'الاختبارات' : 'Quizzes'}</span><strong>{selectedProfile.totalQuizzes || 0}</strong></div>
              <div><span>{isAr ? 'المستوى' : 'Level'}</span><strong>N5</strong></div>
              <div><span>{isAr ? 'الحالة' : 'Status'}</span><strong>{selectedProfile.current ? text.ownProfile : visibleFollowingIds.has(selectedProfile.id || selectedProfile.userId) ? text.following : text.follow}</strong></div>
            </div>
            <div className="profile-actions">
              {selectedProfile.current ? (
                <Button variant="secondary" onClick={() => setSelectedProfile(ownPublicProfile)}>{text.ownProfile}</Button>
              ) : (
                <>
                  <Button variant="small" onClick={() => followProfile(selectedProfile)}>
                    {visibleFollowingIds.has(selectedProfile.id || selectedProfile.userId) ? text.following : text.followRequest}
                  </Button>
                  <Button variant="secondary" onClick={() => messageProfile(selectedProfile)}>{text.message}</Button>
                </>
              )}
            </div>
          </article>
        </div>
      )}

      <p className="community-footnote">{text.locked}</p>
    </section>
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

      <div className="lesson-toolbar">
        <Button variant="small" onClick={onQuiz}>{t.practice}</Button>
        <div className="tabs lesson-tabs">
          {['vocabulary', 'grammar', 'exercises', 'videos', 'review'].map((id) => (
            <button key={id} className={section === id ? 'active' : ''} onClick={() => setSection(id)}>
              {t[id]}
            </button>
          ))}
        </div>
      </div>

      {section === 'vocabulary' && (
        <>
          <div className="card-grid">
            {lesson.vocab.map((item, index) => {
              const shown = flipped[index]
              return (
                <button className="study-card" key={item.jp} onClick={() => setFlipped((f) => ({ ...f, [index]: !shown }))}>
                  {shown ? <span className="jp">{item.reading}</span> : <JapaneseTerm item={item} />}
                  <strong>{shown ? item.meaning : t.tapHear}</strong>
                  <small>{shown ? (item.hiragana || item.jp) : item.reading}</small>
                </button>
              )
            })}
          </div>
        </>
      )}

      {section === 'grammar' && (
        <section className="lesson-card">
          <p className="eyebrow">{t.grammar}</p>
          {Array.isArray(lesson.grammar) ? (
            <div className="grammar-list">
              {lesson.grammar.map((rule) => (
                <article key={rule.title} className="grammar-card">
                  <h2>{rule.title}</h2>
                  <strong>{rule.pattern}</strong>
                  <p>{rule.explanation}</p>
                  <button onClick={() => speakJapanese(rule.example.jp)}>
                    <span className="jp-line">{rule.example.jp}</span>
                    <small>{rule.example.romaji} · {rule.example.ar}</small>
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <>
              <h2>{lesson.grammar[lang].split('—')[0]}</h2>
              <p>{lesson.grammar[lang].split('—')[1]}</p>
            </>
          )}
          <div className="mini-list">
            {lesson.vocab.map((item) => (
              <button key={item.jp} onClick={() => speakJapanese(item.hiragana || item.jp)}>
                <JapaneseTerm item={item} className="jp-line" />
                <small>{item.reading} · {item.meaning}</small>
              </button>
            ))}
          </div>
          <Button onClick={onQuiz}>{t.practice}</Button>
        </section>
      )}

      {section === 'exercises' && (
        <div className="example-list exercise-list">
          {(lesson.exercises || lesson.examples).map((exercise, index) => (
            <button key={`${exercise.type || 'example'}-${index}`} onClick={() => exercise.jp && speakJapanese(exercise.jp)}>
              <span className="jp-line">{exercise.prompt || exercise.jp}</span>
              <strong>{exercise.answer || exercise.en}</strong>
              <small>{exercise.hint || exercise.ar}</small>
            </button>
          ))}
          <Button onClick={onQuiz}>{t.practice}</Button>
        </div>
      )}

      {section === 'videos' && (
        <section className="lesson-card">
          <p className="eyebrow">{t.videos}</p>
          {lesson.videos?.length ? (
            <div className="mini-list">
              {lesson.videos.map((video) => (
                <a key={video.url} className="video-link" href={video.url} target="_blank" rel="noreferrer">
                  <span>{video.title?.[lang] || video.title || t.videos}</span>
                  <small>{video.duration || 'Video'}</small>
                </a>
              ))}
            </div>
          ) : (
            <p>{t.noVideos}</p>
          )}
          <Button onClick={onQuiz}>{t.practice}</Button>
        </section>
      )}

      {section === 'review' && (
        <section className="lesson-card review-card">
          <p className="eyebrow">{t.review}</p>
          <h2>{lesson.focus}</h2>
          <p>{Array.isArray(lesson.grammar) ? lesson.grammar.map((rule) => rule.title).join(' · ') : lesson.grammar[lang]}</p>
          <div className="mini-list">
            {lesson.vocab.slice(0, 4).map((item) => (
              <button key={item.jp} onClick={() => speakJapanese(item.hiragana || item.jp)}>
                <JapaneseTerm item={item} className="jp-line" />
                <small>{item.reading} · {item.meaning}</small>
              </button>
            ))}
          </div>
          <Button onClick={onQuiz}>{t.practice}</Button>
        </section>
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
  const [hearts, setHearts] = useState(MAX_HEARTS)
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
  const [verificationRetryAt, setVerificationRetryAt] = useState(() => Number(localStorage.getItem('nihongo-verification-retry-at') || 0))
  const [nowTick, setNowTick] = useState(() => Date.now())

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
  const verificationWaitMs = Math.max(0, verificationRetryAt - nowTick)
  const verificationWaitSeconds = Math.ceil(verificationWaitMs / 1000)
  const verificationWaitLabel = `${Math.floor(verificationWaitSeconds / 60)}:${String(verificationWaitSeconds % 60).padStart(2, '0')}`

  const applyState = (state) => {
    setXp(state.xp ?? 0)
    setHearts(state.hearts ?? MAX_HEARTS)
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

  const publicProfilePayload = useMemo(() => ({
    userId,
    userName: userName || 'Nihongo learner',
    userUsername: normalizeUsername(userUsername || userName || userEmail?.split('@')[0] || 'nihongo'),
    userHandle,
    userAvatar,
    userBio,
    xp,
    streak,
    masteredCount,
    completedLessons,
    totalQuizzes,
    lang,
    updatedAt: new Date().toISOString(),
  }), [userId, userName, userUsername, userEmail, userHandle, userAvatar, userBio, xp, streak, masteredCount, completedLessons, totalQuizzes, lang])

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
    await setDoc(doc(db, 'publicProfiles', id), {
      ...publicProfilePayload,
      ...('userName' in extra ? { userName: extra.userName || 'Nihongo learner' } : {}),
      ...('userUsername' in extra ? {
        userUsername: normalizeUsername(extra.userUsername),
        userHandle: `@${normalizeUsername(extra.userUsername)}`,
      } : {}),
      ...('userAvatar' in extra ? { userAvatar: extra.userAvatar } : {}),
      ...('userBio' in extra ? { userBio: extra.userBio } : {}),
      updatedAt: new Date().toISOString(),
    }, { merge: true })
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
    if (!verificationRetryAt) return
    localStorage.setItem('nihongo-verification-retry-at', String(verificationRetryAt))
    const timer = window.setInterval(() => {
      const now = Date.now()
      setNowTick(now)
      if (now >= verificationRetryAt) {
        localStorage.removeItem('nihongo-verification-retry-at')
        setVerificationRetryAt(0)
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [verificationRetryAt])

  useEffect(() => {
    const onVerificationSent = (event) => {
      const retryAt = Number(event.detail?.retryAt || localStorage.getItem('nihongo-verification-retry-at') || 0)
      if (retryAt) {
        setVerificationRetryAt(retryAt)
        setNowTick(Date.now())
      }
    }
    window.addEventListener('nihongo-verification-sent', onVerificationSent)
    return () => window.removeEventListener('nihongo-verification-sent', onVerificationSent)
  }, [])

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
          hearts: d.hearts ?? MAX_HEARTS,
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
      const updatedAt = new Date().toISOString()
      Promise.all([
        setDoc(doc(db, 'users', userId), {
          ...payload,
          email: userEmail,
          updatedAt,
        }, { merge: true }),
        setDoc(doc(db, 'publicProfiles', userId), {
          ...publicProfilePayload,
          updatedAt,
        }, { merge: true }),
      ]).then(() => {
        lastSavedCloudJsonRef.current = cloudJson
      }).catch((error) => {
        console.error('Failed to sync user data', error)
      })
    }, 500)

    return () => {
      if (cloudSaveTimerRef.current) window.clearTimeout(cloudSaveTimerRef.current)
    }
  }, [userId, userEmail, isGuest, dataReady, userPayload, publicProfilePayload])

  useEffect(() => {
    if (!dataReady) return
    const timer = setInterval(() => {
      setHearts((current) => {
        if (current >= MAX_HEARTS) return current

        const elapsed = Date.now() - lastHeartRefillAt
        if (elapsed < HEART_REFILL_MS) return current

        const gained = Math.floor(elapsed / HEART_REFILL_MS)
        const next = Math.min(MAX_HEARTS, current + gained)
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
    if (screen !== 'quiz' || !selected || !questions.length || !questions[qIndex]) return
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
  }, [screen, selected, questions, qIndex, score, activeLesson, currentLevel])

  const openLesson = (lesson) => {
    setQuestions([])
    setQIndex(0)
    setSelected(null)
    setScore(0)
    setActiveLesson(lesson)
    setScreen('lesson')
  }

  const refillHearts = () => {
    if (hearts >= MAX_HEARTS) return setNotice(t.heartsFull)
    if (gems < 250) return setNotice(t.notEnoughGems)
    setGems((value) => value - 250)
    setHearts(MAX_HEARTS)
    setLastHeartRefillAt(Date.now())
  }

  const resendVerificationEmail = async () => {
    if (!auth.currentUser || auth.currentUser.emailVerified) return
    if (Date.now() < verificationRetryAt) {
      setNotice(`${t.resendWait} ${verificationWaitLabel}`)
      return
    }
    try {
      try {
        await sendEmailVerification(auth.currentUser, {
          url: window.location.origin,
          handleCodeInApp: false,
        })
      } catch (error) {
        if (error.code !== 'auth/unauthorized-continue-uri') throw error
        await sendEmailVerification(auth.currentUser)
      }
      setVerificationRetryAt(Date.now() + VERIFICATION_COOLDOWN_MS)
      setNotice(t.verificationSent)
    } catch (error) {
      const retryAt = Date.now() + VERIFICATION_COOLDOWN_MS
      setVerificationRetryAt(retryAt)
      const code = error.code || error.message
      const message = code === 'auth/too-many-requests'
        ? `${t.resendWait} 15:00 ثم جرّب مرة ثانية. Firebase وقف الإرسال مؤقتا بسبب كثرة الطلبات.`
        : `تعذر إرسال رابط التأكيد حاليا: ${code}`
      setNotice(message)
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
        <header className="topbar app-topbar">
          <div className="toolbar top-stats">
            <span className="stat-chip gems"><i>◆</i>{gems}</span>
            <span className="stat-chip streak"><i>✦</i>{streak}</span>
            <span className="stat-chip battery">
              <i>
                <span style={{ width: `${Math.max(0, (hearts / MAX_HEARTS) * 100)}%` }} />
                <b>{hearts}</b>
              </i>
            </span>
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
                const amount = Math.min(lessonProgress[key] || 0, sectionCount)
                const locked = !prevDone || !lesson
                const progressPercent = amount > 0 ? Math.round((amount / sectionCount) * 100) : 0
                return (
                  <button
                    key={lessonNumber}
                    disabled={locked}
                    className={`lesson-node map-node ${locked ? 'locked' : amount >= sectionCount ? 'done' : 'current'} step-${index % 12}`}
                    style={{
                      '--path-row': lessonNumber,
                      '--path-x': `${LESSON_PATH_X[index % LESSON_PATH_X.length]}%`,
                      '--path-x-mobile': `${LESSON_PATH_X_MOBILE[index % LESSON_PATH_X_MOBILE.length]}%`,
                      '--lesson-progress': `${locked ? 0 : progressPercent}%`,
                    }}
                    aria-label={`${t.lesson} ${lessonNumber}`}
                    onClick={() => openLesson(lesson)}
                  >
                    <span className="lesson-number">{amount >= sectionCount ? '★' : lessonNumber}</span>
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

        {tab === 'community' && (
          <CommunityHub
            lang={lang}
            userId={userId}
            isGuest={isGuest}
            userName={userName}
            userHandle={userHandle}
            xp={xp}
            streak={streak}
            totalQuizzes={totalQuizzes}
            masteredCount={masteredCount}
            onStartDaily={() => startQuiz('hiragana')}
            onNotice={setNotice}
          />
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
                  <Button variant="small" disabled={verificationWaitMs > 0} onClick={resendVerificationEmail}>
                    {verificationWaitMs > 0 ? `${t.resendWait} ${verificationWaitLabel}` : t.resendEmail}
                  </Button>
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
              <Button variant="small" onClick={refillHearts}>+10</Button>
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
          ['community', '会', lang === 'ar' ? 'المجتمع' : 'Community'],
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
