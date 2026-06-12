import { useEffect, useMemo, useRef, useState } from 'react'
import { onAuthStateChanged, sendEmailVerification, signOut } from 'firebase/auth'
import { addDoc, collection, deleteDoc, doc, getDoc, increment, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { auth, db } from './firebase.js'
import { hiragana, katakana, kanjiN5, lessons } from './data.js'
import LessonNode from './components/LessonNode.jsx'
import LessonPreviewModal from './components/LessonPreviewModal.jsx'
import { speakJapanese, unlockAudio } from './sounds.js'
import GrammarExercises, { HighlightSentence } from './components/GrammarExercises.jsx'
import { ExercisesSection, ReviewSection } from './components/LessonSections.jsx'
import VocabExercises, { VocabPracticeAll } from './components/VocabExercises.jsx'
import CharacterExercises from './components/CharacterExercises.jsx'
import AppIcon from './components/AppIcon.jsx'
import IconCircle from './components/IconCircle.jsx'
import Login from './screens/Login.jsx'
import Quiz from './screens/Quiz.jsx'
import Result from './screens/Result.jsx'
import Exam from './screens/Exam.jsx'
import ExamIntro from './screens/ExamIntro.jsx'
import ExamResult from './screens/ExamResult.jsx'
import DrawingPad from './components/DrawingPad.jsx'
import { EXAM_CONFIG, LEVEL_ORDER } from './content/examConfig.js'
import { HeartsContext } from './hearts-context.jsx'

const TOTAL_LESSONS = 25
const sectionCount = 5
const STARTING_GEMS = 2000
const MAX_HEARTS = 10
const HEART_REFILL_MS = 60 * 1000
const VOCAB_MASTERY_TARGET = 5
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
    level: 'المستوى',
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
    kanjiReading: 'صوت الكانجي داخل التطبيق',
    kanjiReadingHiragana: 'هيراغانا',
    kanjiReadingRomaji: 'روماجي',
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
    level: 'Level',
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
    kanjiReading: 'Kanji reading',
    kanjiReadingHiragana: 'Hiragana',
    kanjiReadingRomaji: 'Romaji',
    profilePhoto: 'Profile photo',
    uploadPhoto: 'Choose photo',
    subscriptionText: 'Your current plan is free. Paid plans will later unlock more lessons and advanced practice.',
    policyText: 'We save learning progress and basic account data so you can continue across devices. Guest data stays on this device.',
    supportText: 'Live support is being prepared. For now, send us the issue in your notes and we will add a direct channel.',
    donateText: 'Donations help improve lessons, audio, and drawing practice. A secure payment method will be added later.',
  },
}

const levels = [
  { id: 'N5', ar: 'مبتدئ', en: 'Beginner' },
  { id: 'N4', ar: 'أساسي', en: 'Elementary' },
  { id: 'N3', ar: 'متوسط', en: 'Intermediate' },
  { id: 'N2', ar: 'متقدم', en: 'Advanced' },
  { id: 'N1', ar: 'احترافي', en: 'Professional' },
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
    requestSent: 'تم إرسال طلب الصداقة.',
    requestPending: 'بانتظار الموافقة',
    removeFriend: 'حذف الصداقة',
    friendRemoved: 'تم حذف الصداقة.',
    accept: 'قبول',
    requests: 'طلبات',
    inbox: 'الرسائل',
    notifications: 'الإشعارات',
    noMessages: 'ماكو رسائل بعد.',
    noRequests: 'ماكو طلبات صداقة حالياً.',
    noNotifications: 'ماكو إشعارات جديدة.',
    messagePlaceholder: 'اكتب رسالتك...',
    messageSent: 'تم إرسال الرسالة.',
    following: 'تتابعه',
    ownProfile: 'هذا حسابك',
    message: 'رسالة',
    friendsOnly: 'الرسائل تفتح بعد ما تصيرون أصدقاء: لازم تتابعوه ويتابعك.',
    messageSoon: 'المحادثات الخاصة جاهزة للربط كخطوة قادمة.',
    viewProfile: 'عرض البروفايل',
    publicStats: 'إحصائيات عامة',
    learningLevel: 'N5 learner',
    noBio: 'ماكو نبذة بعد.',
    like: 'لايك',
    reply: 'رد',
    repost: 'إعادة نشر',
    shareComment: 'مشاركة',
    replyPlaceholder: 'اكتب ردك على السؤال...',
    replySent: 'تم إرسال الرد.',
    liked: 'تم تسجيل اللايك.',
    reposted: 'تمت إعادة النشر.',
    copied: 'تم نسخ السؤال.',
    edit: 'تعديل',
    delete: 'حذف',
    report: 'تبليغ',
    save: 'حفظ',
    cancel: 'إلغاء',
    updated: 'تم التعديل.',
    deleted: 'تم الحذف.',
    reported: 'تم إرسال البلاغ.',
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
    requestSent: 'Friend request sent.',
    requestPending: 'Pending',
    removeFriend: 'Remove friend',
    friendRemoved: 'Friend removed.',
    accept: 'Accept',
    requests: 'Requests',
    inbox: 'Messages',
    notifications: 'Notifications',
    noMessages: 'No messages yet.',
    noRequests: 'No friend requests right now.',
    noNotifications: 'No new notifications.',
    messagePlaceholder: 'Write your message...',
    messageSent: 'Message sent.',
    following: 'Following',
    ownProfile: 'This is you',
    message: 'Message',
    friendsOnly: 'Messages unlock after you become friends: you follow them and they follow you back.',
    messageSoon: 'Private messages are ready to wire in the next step.',
    viewProfile: 'View profile',
    publicStats: 'Public stats',
    learningLevel: 'N5 learner',
    noBio: 'No bio yet.',
    like: 'Like',
    reply: 'Reply',
    repost: 'Repost',
    shareComment: 'Share',
    replyPlaceholder: 'Write your reply...',
    replySent: 'Reply sent.',
    liked: 'Liked.',
    reposted: 'Reposted.',
    copied: 'Question copied.',
    edit: 'Edit',
    delete: 'Delete',
    report: 'Report',
    save: 'Save',
    cancel: 'Cancel',
    updated: 'Updated.',
    deleted: 'Deleted.',
    reported: 'Report sent.',
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
  const kanaReadings = items.reduce((acc, item) => ({ ...acc, [item.kana]: item.answer }), {})

  return shuffle(items.flatMap((item) => [
    {
      type: 'reading',
      kana: item.kana,
      kanaReading: item.answer,
      answer: item.answer,
      options: [...new Set(shuffle([item.answer, ...readingPool.filter((value) => value !== item.answer)]))].slice(0, 4),
    },
    {
      type: 'reverse',
      kana: item.kana,
      kanaReading: item.answer,
      answer: item.kana,
      answerLabel: item.answer,
      options: [...new Set(shuffle([item.kana, ...kanaPool.filter((value) => value !== item.kana)]))].slice(0, 4),
      optionReadings: kanaReadings,
    },
    {
      type: 'draw',
      kana: item.kana,
      answer: '__draw_done__',
      options: [],
    },
  ])).slice(0, 12)
}

function vocabKey(lessonId, item) {
  return `lesson:${lessonId}:vocab:${item.reading || item.jp}`
}

function vocabLabel(item) {
  return item.kanji || item.jp || item.hiragana
}

function vocabReading(item, mode = 'hiragana') {
  return mode === 'romaji' ? item.reading : item.hiragana || item.reading
}

function speakableVocab(item) {
  return item.hiragana || item.jp || item.kanji
}

function optionReadingsFor(options, items, mode = 'hiragana') {
  const byOption = new Map()
  options.forEach((option) => {
    const item = items.find((candidate) => vocabLabel(candidate) === option)
    if (item) byOption.set(option, vocabReading(item, mode))
  })
  return items.reduce((acc, item) => ({
    ...acc,
    [vocabLabel(item)]: byOption.get(vocabLabel(item)) || vocabReading(item, mode),
  }), {})
}

function optionSpeakTextsFor(options, items) {
  return options.reduce((acc, option) => {
    const item = items.find((candidate) => vocabLabel(candidate) === option)
    if (!item) return acc
    return { ...acc, [option]: speakableVocab(item) }
  }, {})
}

function comparableVocabItems(items, item) {
  const sameType = items.filter((candidate) => candidate.type && candidate.type === item.type)
  if (sameType.length >= 2) return sameType

  const broadGroups = [
    ['pronoun', 'person', 'question-word'],
    ['occupation'],
    ['place', 'organization'],
    ['suffix'],
    ['age'],
    ['response'],
  ]
  const selectedTypes = broadGroups.find((group) => group.includes(item.type))
  if (!selectedTypes) return items

  const grouped = items.filter((candidate) => selectedTypes.includes(candidate.type))
  return grouped.length >= 2 ? grouped : items
}

function makeVocabOptions(items, item, key) {
  const answer = key === 'label' ? vocabLabel(item) : item[key]
  const pool = comparableVocabItems(items, item)
  const distractors = pool
    .filter((candidate) => candidate !== item)
    .map((candidate) => key === 'label' ? vocabLabel(candidate) : candidate[key])
    .filter(Boolean)
  const options = shuffle([answer, ...shuffle(distractors).slice(0, 5)])
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .slice(0, 4)
  if (!options.includes(answer)) return [answer, ...options].slice(0, 4)
  return options
}

function sentenceForVocab(item) {
  const occupationReadings = new Set(['sensei', 'kyoushi', 'gakusei', 'kaishain', 'shain', 'ginkouin', 'isha', 'kenkyuusha', 'enjinia'])
  const personReadings = new Set(['watashi', 'watashitachi', 'anata', 'ano hito', 'ano kata', 'minasan'])
  const placeReadings = new Set(['daigaku', 'byouin'])
  const questionReadings = new Set(['dare', 'donata'])
  if (occupationReadings.has(item.reading)) return 'わたし は ____ です。'
  if (personReadings.has(item.reading)) return '____ は がくせい です。'
  if (item.reading === '~san') return 'ミラー____ は せんせい です。'
  if (item.reading === '~chan') return 'さくら____ は こども です。'
  if (item.reading === '~kun') return 'たろう____ は がくせい です。'
  if (item.reading === '~jin') return 'イラク____ です。'
  if (placeReadings.has(item.reading)) return 'ここ は ____ です。'
  if (item.reading === 'denki') return 'これは ____ です。'
  if (questionReadings.has(item.reading)) return 'あの ひと は ____ ですか。'
  if (item.reading === 'nan-sai desu ka') return '____。'
  if (item.reading === 'sai') return '18 ____ です。'
  if (item.reading === 'hai') return '____、がくせい です。'
  if (item.reading === 'iie') return '____、がくせい じゃありません。'
  return `____ = ${item.meaning}`
}

function sentenceOptionItems(allItems, item) {
  const groups = [
    ['sensei', 'kyoushi', 'gakusei', 'kaishain', 'shain', 'ginkouin', 'isha', 'kenkyuusha', 'enjinia'],
    ['watashi', 'watashitachi', 'anata', 'ano hito', 'ano kata', 'minasan'],
    ['~san', '~chan', '~kun', '~jin'],
    ['daigaku', 'byouin', 'denki'],
    ['dare', 'donata'],
    ['nan-sai desu ka', 'sai'],
    ['hai', 'iie'],
  ]
  const selected = groups.find((group) => group.includes(item.reading))
  if (!selected) return allItems
  const scoped = allItems.filter((candidate) => selected.includes(candidate.reading))
  return scoped.length >= 2 ? scoped : allItems
}

function sentenceSpeakText(item, sentence) {
  return sentence.replace('____', speakableVocab(item))
}

function hasSentenceTemplate(item) {
  return !sentenceForVocab(item).includes('=')
}

function collectBuildExercises(sourceLessons) {
  return sourceLessons.flatMap((lesson) => (
    Array.isArray(lesson.grammar)
      ? lesson.grammar.flatMap((pattern) => (pattern.exercises || []).filter((ex) => ex.type === 'build' && ex.words?.length && ex.answer))
      : []
  ))
}

function isMatchableVocabItem(item) {
  const label = vocabLabel(item)
  const reading = item.reading || ''
  if (!item?.meaning || !label) return false
  if (/[。！？?]/.test(label) || /です|ます/.test(label)) return false
  if (/\bdesu\b|\bmasu\b|\bka\b/.test(reading)) return false
  return true
}

function makeMatchingQuestion(lesson, items, kanjiReadingMode = 'hiragana') {
  const vocabOnlyItems = items.filter(isMatchableVocabItem)
  const pairs = vocabOnlyItems.slice(0, 6).map((item, index) => ({
    id: `${lesson.id}-${item.reading}-${index}`,
    left: vocabLabel(item),
    leftReading: vocabReading(item, kanjiReadingMode),
    leftSpeak: speakableVocab(item),
    right: item.meaning,
    progressKey: vocabKey(lesson.id, item),
  }))
  let rightOptions = shuffle(pairs)
  const samePositions = rightOptions.every((pair, index) => pair.id === pairs[index]?.id)
  if (samePositions && rightOptions.length > 1) {
    rightOptions = [...rightOptions.slice(1), rightOptions[0]]
  }
  return {
    type: 'matching',
    kana: pairs.map((pair) => pair.left).join(' / '),
    answer: '__matching_done__',
    pairs,
    rightOptions,
    kanjiReadingMode,
    progressKeys: pairs.map((pair) => pair.progressKey),
    progressMax: VOCAB_MASTERY_TARGET,
    soundEnabled: false,
  }
}

function makeSentenceQuestion(lesson, item, items, kanjiReadingMode = 'hiragana') {
  const label = vocabLabel(item)
  const sentence = sentenceForVocab(item)
  const optionItems = sentenceOptionItems(lesson.vocab, item)
  const options = makeVocabOptions(optionItems, item, 'label')
  return {
    type: 'sentence',
    kana: label,
    kanaReading: vocabReading(item, kanjiReadingMode),
    speakText: sentenceSpeakText(item, sentence),
    sentence,
    answer: label,
    options,
    optionReadings: optionReadingsFor(options, optionItems, kanjiReadingMode),
    optionSpeakTexts: optionSpeakTextsFor(options, optionItems),
    kanjiReadingMode,
    progressKeys: [vocabKey(lesson.id, item)],
    progressMax: VOCAB_MASTERY_TARGET,
  }
}

function makeLessonVocabQuiz(lesson, groupItems = lesson.vocab, kanjiReadingMode = 'hiragana') {
  const items = groupItems.length ? groupItems : lesson.vocab
  const base = shuffle(items)
  const meaningQuestions = base.map((item) => ({
    type: 'vocab_meaning',
    kana: vocabLabel(item),
    kanaReading: vocabReading(item, kanjiReadingMode),
    speakText: speakableVocab(item),
    answer: item.meaning,
    options: makeVocabOptions(items, item, 'meaning'),
    optionSpeakTexts: {},
    kanjiReadingMode,
    progressKeys: [vocabKey(lesson.id, item)],
    progressMax: VOCAB_MASTERY_TARGET,
  }))
  const audioQuestions = shuffle(items).map((item) => {
    const options = makeVocabOptions(items, item, 'label')
    return {
      type: 'audio_word',
      kana: '聞く',
      speakText: speakableVocab(item),
      answer: vocabLabel(item),
      options,
      optionReadings: optionReadingsFor(options, items, kanjiReadingMode),
      optionSpeakTexts: optionSpeakTextsFor(options, items),
      kanjiReadingMode,
      progressKeys: [vocabKey(lesson.id, item)],
      progressMax: VOCAB_MASTERY_TARGET,
    }
  })
  const sentenceQuestions = shuffle(items).map((item) => makeSentenceQuestion(lesson, item, items, kanjiReadingMode))
  const matchableItems = items.filter(isMatchableVocabItem)
  const matching = matchableItems.length >= 4 ? [makeMatchingQuestion(lesson, shuffle(matchableItems), kanjiReadingMode)] : []
  return shuffle([
    ...meaningQuestions.slice(0, 4),
    ...audioQuestions.slice(0, 4),
    ...sentenceQuestions.slice(0, 3),
    ...matching,
  ]).slice(0, 12)
}

function splitCount(total, parts) {
  const base = Math.floor(total / parts)
  const rem = total % parts
  return Array.from({ length: parts }, (_, i) => base + (i < rem ? 1 : 0))
}

function levelSourceLessons(levelId) {
  return levelId === 'N5' ? lessons : []
}

function buildExamQuestions(levelId, examType, kanjiReadingMode = 'hiragana') {
  const config = EXAM_CONFIG[levelId]?.[examType]
  if (!config || config.contentReady === false) return null
  const sourceLevel = config.sourceLevel || levelId
  const sourceLessons = levelSourceLessons(sourceLevel)
  if (!sourceLessons.length) return null

  const allVocab = sourceLessons.flatMap((lesson) => lesson.vocab || [])
  const examLesson = { id: `exam-${levelId}-${examType}`, vocab: allVocab }
  const matchable = allVocab.filter(isMatchableVocabItem)
  const wordItems = matchable.filter((item) => item.type !== 'expression')
  const sentenceItems = allVocab.filter(hasSentenceTemplate)
  const buildExercises = collectBuildExercises(sourceLessons)

  const sections = config.sections.map((section) => {
    const built = []
    const hasMatching = section.types.includes('matching') && matchable.length >= 4
    const otherTypes = section.types.filter((type) => {
      if (type === 'matching') return false
      if (type === 'sentence_build') return buildExercises.length > 0
      return true
    })
    const remaining = section.count - (hasMatching ? 1 : 0)
    const counts = splitCount(Math.max(remaining, 0), otherTypes.length || 1)
    const pool = shuffle(allVocab)
    const wordPool = shuffle(wordItems.length ? wordItems : matchable.length ? matchable : allVocab)
    const sentencePool = shuffle(sentenceItems.length ? sentenceItems : allVocab)
    const buildPool = shuffle(buildExercises)
    let cursor = 0
    let wordCursor = 0
    let sentenceCursor = 0
    let buildCursor = 0

    otherTypes.forEach((type, typeIndex) => {
      for (let n = 0; n < counts[typeIndex]; n++) {
        if (type === 'vocab_meaning') {
          const item = pool[cursor % pool.length]
          cursor++
          built.push({
            type: 'vocab_meaning',
            kana: vocabLabel(item),
            kanaReading: vocabReading(item, kanjiReadingMode),
            speakText: speakableVocab(item),
            answer: item.meaning,
            options: makeVocabOptions(allVocab, item, 'meaning'),
            optionSpeakTexts: {},
            kanjiReadingMode,
          })
        } else if (type === 'audio_word') {
          const item = pool[cursor % pool.length]
          cursor++
          const options = makeVocabOptions(allVocab, item, 'label')
          built.push({
            type: 'audio_word',
            kana: '聞く',
            speakText: speakableVocab(item),
            answer: vocabLabel(item),
            options,
            optionReadings: optionReadingsFor(options, allVocab, kanjiReadingMode),
            optionSpeakTexts: optionSpeakTextsFor(options, allVocab),
            kanjiReadingMode,
          })
        } else if (type === 'sentence') {
          const item = sentencePool[sentenceCursor % sentencePool.length]
          sentenceCursor++
          built.push(makeSentenceQuestion(examLesson, item, sentenceItems.length ? sentenceItems : allVocab, kanjiReadingMode))
        } else if (type === 'word_production') {
          const item = wordPool[wordCursor % wordPool.length]
          wordCursor++
          const options = makeVocabOptions(wordPool, item, 'label')
          built.push({
            type: 'word_production',
            kana: item.meaning,
            answer: vocabLabel(item),
            options,
            optionReadings: optionReadingsFor(options, wordPool, kanjiReadingMode),
            optionSpeakTexts: optionSpeakTextsFor(options, wordPool),
            kanjiReadingMode,
          })
        } else if (type === 'audio_sentence') {
          const item = sentencePool[sentenceCursor % sentencePool.length]
          sentenceCursor++
          const sentence = sentenceForVocab(item)
          built.push({
            type: 'audio_sentence',
            kana: '聞く',
            speakText: sentenceSpeakText(item, sentence),
            sentence,
            answer: item.meaning,
            options: makeVocabOptions(sentenceItems.length ? sentenceItems : allVocab, item, 'meaning'),
            optionSpeakTexts: {},
            kanjiReadingMode,
          })
        } else if (type === 'sentence_build') {
          const ex = buildPool[buildCursor % buildPool.length]
          buildCursor++
          built.push({
            type: 'sentence_build',
            prompt: ex.ar,
            words: ex.words,
            particles: ex.particles || [],
            answer: ex.answer,
            soundEnabled: false,
          })
        }
      }
    })

    if (hasMatching) {
      built.push(makeMatchingQuestion(examLesson, shuffle(matchable), kanjiReadingMode))
    }

    return { key: section.key, label: section.label, minutes: section.minutes, questions: shuffle(built) }
  })

  return { levelId, examType, sections, totalScore: config.totalScore, passScore: config.passScore }
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
    kanjiReadingMode: 'hiragana',
    isPaid: false,
    startingGemsGranted: true,
  }
}

function fullyUnlockedLessonProgress(level = 'N5') {
  return Object.fromEntries(
    Array.from({ length: TOTAL_LESSONS }, (_, index) => [`${level}-${index + 1}`, sectionCount]),
  )
}

function applyAccountUnlocks(state, username) {
  if (normalizeUsername(username) !== 'abdol') return state
  return {
    ...state,
    lessonProgress: {
      ...(state.lessonProgress || {}),
      ...fullyUnlockedLessonProgress('N5'),
    },
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

function Stat({ label, value, icon }) {
  return (
    <div className="stat">
      <strong>{icon && <AppIcon name={icon} size={18} />}{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function JapaneseTerm({ item, className = 'jp', readingMode = 'hiragana' }) {
  const kana = item.hiragana || item.jp
  const kanji = item.kanji && item.kanji !== '—' ? item.kanji : kana
  const reading = readingMode === 'romaji' ? item.reading || kana : kana
  if (kanji === kana) return <span className={className}>{kana}</span>
  return (
    <span className={className}>
      <KanjiOnlyRuby text={kanji} reading={reading} />
    </span>
  )
}

function getRubyReadings(text, reading) {
  const parts = String(text || '').split(/([\u3400-\u9fff]+)/g).filter(Boolean)
  const kanjiParts = parts.filter((part) => /[\u3400-\u9fff]/.test(part))
  const rawReading = String(reading || '').trim()

  if (/[\u3040-\u30ff]/.test(rawReading)) {
    let remaining = rawReading
    parts.forEach((part) => {
      if (/[\u3400-\u9fff]/.test(part) || !part) return
      if (remaining.startsWith(part)) remaining = remaining.slice(part.length)
      else if (remaining.endsWith(part)) remaining = remaining.slice(0, -part.length)
    })
    if (kanjiParts.length === 1 && remaining) return [remaining]
  }

  const readingChunks = rawReading.split(/\s+/).filter(Boolean)
  if (readingChunks.length === kanjiParts.length) return readingChunks

  return kanjiParts.map(() => rawReading)
}

function KanjiOnlyRuby({ text, reading }) {
  const parts = String(text || '').split(/([\u3400-\u9fff]+)/g).filter(Boolean)
  const readings = getRubyReadings(text, reading)
  let readingIndex = 0
  return parts.map((part, index) => {
    if (!/[\u3400-\u9fff]/.test(part)) return <span key={`${part}-${index}`}>{part}</span>
    const rt = readings[readingIndex] || reading
    readingIndex += 1
    return (
      <ruby key={`${part}-${index}`}>
        {part}
        <rt>{rt}</rt>
      </ruby>
    )
  })
}

function CharacterSymbol({ item, readingMode = 'hiragana' }) {
  if (!/[\u3400-\u9fff]/.test(item.kana)) return <>{item.kana}</>
  return <KanjiOnlyRuby text={item.kana} reading={readingMode === 'romaji' ? item.answer : item.hiragana || item.answer} />
}

function CommunityHub({ lang, userId, isGuest, userName, userHandle, xp, streak, totalQuizzes, masteredCount, currentLevel, onStartDaily, onNotice }) {
  const [sentence, setSentence] = useState('')
  const [questionText, setQuestionText] = useState('')
  const [activeReplyId, setActiveReplyId] = useState(null)
  const [replyDrafts, setReplyDrafts] = useState({})
  const [liveReplies, setLiveReplies] = useState([])
  const [openPostMenu, setOpenPostMenu] = useState(null)
  const [editingQuestionId, setEditingQuestionId] = useState(null)
  const [questionEditDrafts, setQuestionEditDrafts] = useState({})
  const [editingReplyId, setEditingReplyId] = useState(null)
  const [replyEditDrafts, setReplyEditDrafts] = useState({})
  const [partnerMessage, setPartnerMessage] = useState('')
  const [correction, setCorrection] = useState('')
  const [partnerReply, setPartnerReply] = useState('')
  const [liveQuestions, setLiveQuestions] = useState([])
  const [publicProfiles, setPublicProfiles] = useState([])
  const [followingIds, setFollowingIds] = useState(new Set())
  const [followerIds, setFollowerIds] = useState(new Set())
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [activeInbox, setActiveInbox] = useState(null)
  const [friendRequests, setFriendRequests] = useState([])
  const [sentFriendRequests, setSentFriendRequests] = useState(new Set())
  const [messages, setMessages] = useState([])
  const [sentMessages, setSentMessages] = useState([])
  const [notifications, setNotifications] = useState([])
  const [messageDraft, setMessageDraft] = useState('')
  const [dmProfile, setDmProfile] = useState(null)
  const [friendMenuOpen, setFriendMenuOpen] = useState(false)
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
  const repliesForQuestion = (questionId) => liveReplies
    .filter((reply) => reply.questionId === questionId && !reply.deleted)
    .sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0
      const bTime = b.createdAt?.seconds || 0
      return aTime - bTime
    })
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
  const unreadMessages = messages.filter((item) => !item.read).length
  const unreadNotifications = notifications.filter((item) => !item.read).length
  const profileTargetId = (profile) => profile?.id || profile?.userId
  const dmTargetId = profileTargetId(dmProfile)
  const dmMessages = dmTargetId
    ? [...messages, ...sentMessages]
      .filter((item) => (
        (item.fromId === userId && item.toId === dmTargetId)
        || (item.fromId === dmTargetId && item.toId === userId)
      ))
      .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
    : []
  const friendshipState = (profile) => {
    const targetId = profileTargetId(profile)
    if (!targetId || targetId === userId) return 'self'
    if (visibleFollowingIds.has(targetId) && visibleFollowerIds.has(targetId)) return 'friends'
    if (sentFriendRequests.has(targetId)) return 'pending'
    return 'none'
  }
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
    const replyQuery = query(collection(db, 'communityQuestionReplies'), orderBy('createdAt', 'desc'), limit(100))
    const profileQuery = query(collection(db, 'publicProfiles'), orderBy('xp', 'desc'), limit(30))

    const stopQuestions = onSnapshot(questionQuery, (snapshot) => {
      setLiveQuestions(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
    }, (error) => {
      console.warn('Community questions unavailable', error)
    })

    const stopReplies = onSnapshot(replyQuery, (snapshot) => {
      setLiveReplies(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
    }, (error) => {
      console.warn('Community replies unavailable', error)
    })

    const stopProfiles = onSnapshot(profileQuery, (snapshot) => {
      setPublicProfiles(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
    }, (error) => {
      console.warn('Public profiles unavailable', error)
    })

    return () => {
      stopQuestions()
      stopReplies()
      stopProfiles()
    }
  }, [])

  useEffect(() => {
    if (!userId || isGuest) {
      return undefined
    }

    const followingQuery = query(collection(db, 'follows'), where('followerId', '==', userId), limit(500))
    const followersQuery = query(collection(db, 'follows'), where('followingId', '==', userId), limit(500))
    const requestQuery = query(collection(db, 'friendRequests'), where('toId', '==', userId), where('status', '==', 'pending'), limit(100))
    const sentRequestQuery = query(collection(db, 'friendRequests'), where('fromId', '==', userId), where('status', '==', 'pending'), limit(100))
    const messageQuery = query(collection(db, 'messages'), where('toId', '==', userId), limit(100))
    const sentMessageQuery = query(collection(db, 'messages'), where('fromId', '==', userId), limit(100))
    const notificationQuery = query(collection(db, 'notifications'), where('toId', '==', userId), limit(100))

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

    const stopRequests = onSnapshot(requestQuery, (snapshot) => {
      setFriendRequests(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
    }, (error) => {
      console.warn('Friend requests unavailable', error)
    })

    const stopSentRequests = onSnapshot(sentRequestQuery, (snapshot) => {
      setSentFriendRequests(new Set(snapshot.docs.map((item) => item.data().toId)))
    }, (error) => {
      console.warn('Sent friend requests unavailable', error)
    })

    const stopMessages = onSnapshot(messageQuery, (snapshot) => {
      setMessages(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
    }, (error) => {
      console.warn('Messages unavailable', error)
    })

    const stopSentMessages = onSnapshot(sentMessageQuery, (snapshot) => {
      setSentMessages(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
    }, (error) => {
      console.warn('Sent messages unavailable', error)
    })

    const stopNotifications = onSnapshot(notificationQuery, (snapshot) => {
      setNotifications(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
    }, (error) => {
      console.warn('Notifications unavailable', error)
    })

    return () => {
      stopFollowing()
      stopFollowers()
      stopRequests()
      stopSentRequests()
      stopMessages()
      stopSentMessages()
      stopNotifications()
    }
  }, [userId, isGuest])

  const requireCommunityAccount = () => {
    if (canPost) return true
    onNotice(text.loginRequired)
    return false
  }

  const markItemsRead = async (collectionName, items) => {
    if (!canPost) return
    const unread = items.filter((item) => item.id && !item.read)
    if (!unread.length) return
    try {
      await Promise.all(unread.map((item) => updateDoc(doc(db, collectionName, item.id), { read: true })))
    } catch (error) {
      console.warn(`Could not mark ${collectionName} as read`, error)
    }
  }

  const openInbox = (nextInbox) => {
    const opening = activeInbox !== nextInbox
    setActiveInbox(opening ? nextInbox : null)
    if (!opening) return
    if (nextInbox === 'messages') markItemsRead('messages', messages)
    if (nextInbox === 'notifications') markItemsRead('notifications', notifications)
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

  const notifyQuestionAuthor = async (question, type, message) => {
    if (!question.userId || question.userId === userId) return
    await addDoc(collection(db, 'notifications'), {
      toId: question.userId,
      fromId: userId,
      fromHandle: userHandle,
      type,
      text: message,
      read: false,
      createdAt: serverTimestamp(),
    })
  }

  const likeQuestion = async (question) => {
    if (!requireCommunityAccount()) return
    try {
      await setDoc(doc(db, 'communityQuestionLikes', `${question.id}_${userId}`), {
        questionId: question.id,
        userId,
        userHandle,
        createdAt: serverTimestamp(),
      }, { merge: true })
      onNotice(text.liked)
    } catch (error) {
      onNotice(`${text.locked} ${error.code || error.message}`)
    }
  }

  const repostQuestion = async (question) => {
    if (!requireCommunityAccount()) return
    try {
      await addDoc(collection(db, 'communityQuestionReposts'), {
        questionId: question.id,
        questionText: question.text,
        userId,
        userHandle,
        createdAt: serverTimestamp(),
      })
      await notifyQuestionAuthor(question, 'question_repost', `${userHandle} ${text.reposted}`)
      onNotice(text.reposted)
    } catch (error) {
      onNotice(`${text.locked} ${error.code || error.message}`)
    }
  }

  const sendQuestionReply = async (question) => {
    const body = (replyDrafts[question.id] || '').trim()
    if (!body) return onNotice(text.replyPlaceholder)
    if (!requireCommunityAccount()) return
    try {
      await addDoc(collection(db, 'communityQuestionReplies'), {
        questionId: question.id,
        questionText: question.text,
        body,
        userId,
        authorName: displayName,
        authorHandle: userHandle,
        createdAt: serverTimestamp(),
      })
      await Promise.allSettled([
        liveQuestions.some((item) => item.id === question.id)
          ? updateDoc(doc(db, 'communityQuestions', question.id), { answers: increment(1) })
          : Promise.resolve(),
        notifyQuestionAuthor(question, 'question_reply', `${userHandle}: ${body.slice(0, 80)}`),
      ])
      setReplyDrafts((drafts) => ({ ...drafts, [question.id]: '' }))
      setActiveReplyId(question.id)
      onNotice(text.replySent)
    } catch (error) {
      onNotice(`${text.locked} ${error.code || error.message}`)
    }
  }

  const shareQuestion = async (question) => {
    try {
      await navigator.clipboard.writeText(question.text)
      onNotice(text.copied)
    } catch {
      onNotice(question.text)
    }
  }

  const startQuestionEdit = (question) => {
    setQuestionEditDrafts((drafts) => ({ ...drafts, [question.id]: question.text }))
    setEditingQuestionId(question.id)
    setOpenPostMenu(null)
  }

  const saveQuestionEdit = async (question) => {
    const next = (questionEditDrafts[question.id] || '').trim()
    if (!next) return onNotice(text.questionPlaceholder)
    if (!requireCommunityAccount()) return
    try {
      await updateDoc(doc(db, 'communityQuestions', question.id), {
        text: next,
        editedAt: serverTimestamp(),
      })
      setEditingQuestionId(null)
      onNotice(text.updated)
    } catch (error) {
      onNotice(`${text.locked} ${error.code || error.message}`)
    }
  }

  const deleteQuestionPost = async (question) => {
    if (!requireCommunityAccount()) return
    try {
      await updateDoc(doc(db, 'communityQuestions', question.id), {
        text: isAr ? 'تم حذف هذا السؤال.' : 'This question was deleted.',
        deleted: true,
        deletedAt: serverTimestamp(),
      })
      setOpenPostMenu(null)
      onNotice(text.deleted)
    } catch (error) {
      onNotice(`${text.locked} ${error.code || error.message}`)
    }
  }

  const reportCommunityItem = async (item, itemType) => {
    if (!requireCommunityAccount()) return
    try {
      await addDoc(collection(db, 'communityReports'), {
        itemId: item.id,
        itemType,
        ownerId: item.userId || '',
        text: item.text || item.body || '',
        reporterId: userId,
        reporterHandle: userHandle,
        status: 'open',
        createdAt: serverTimestamp(),
      })
      setOpenPostMenu(null)
      onNotice(text.reported)
    } catch (error) {
      onNotice(`${text.locked} ${error.code || error.message}`)
    }
  }

  const startReplyEdit = (reply) => {
    setReplyEditDrafts((drafts) => ({ ...drafts, [reply.id]: reply.body }))
    setEditingReplyId(reply.id)
    setOpenPostMenu(null)
  }

  const saveReplyEdit = async (reply) => {
    const next = (replyEditDrafts[reply.id] || '').trim()
    if (!next) return onNotice(text.replyPlaceholder)
    if (!requireCommunityAccount()) return
    try {
      await updateDoc(doc(db, 'communityQuestionReplies', reply.id), {
        body: next,
        editedAt: serverTimestamp(),
      })
      setEditingReplyId(null)
      onNotice(text.updated)
    } catch (error) {
      onNotice(`${text.locked} ${error.code || error.message}`)
    }
  }

  const deleteReplyPost = async (reply) => {
    if (!requireCommunityAccount()) return
    try {
      await updateDoc(doc(db, 'communityQuestionReplies', reply.id), {
        body: isAr ? 'تم حذف هذا الرد.' : 'This reply was deleted.',
        deleted: true,
        deletedAt: serverTimestamp(),
      })
      setOpenPostMenu(null)
      onNotice(text.deleted)
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
    if (friendshipState(profile) === 'friends') {
      await removeFriend(profile)
      return
    }
    if (friendshipState(profile) === 'pending') {
      onNotice(text.requestPending)
      return
    }
    try {
      await setDoc(doc(db, 'friendRequests', `${userId}_${targetId}`), {
        fromId: userId,
        toId: targetId,
        fromName: displayName,
        followerHandle: userHandle,
        fromHandle: userHandle,
        toHandle: profile.userHandle || `@${profile.userUsername || 'nihongo'}`,
        status: 'pending',
        createdAt: serverTimestamp(),
      }, { merge: true })
      await addDoc(collection(db, 'notifications'), {
        toId: targetId,
        fromId: userId,
        fromHandle: userHandle,
        type: 'friend_request',
        text: `${userHandle} ${text.requestSent}`,
        read: false,
        createdAt: serverTimestamp(),
      })
      onNotice(text.requestSent)
    } catch (error) {
      onNotice(`${text.locked} ${error.code || error.message}`)
    }
  }

  const removeFriend = async (profile) => {
    if (!requireCommunityAccount()) return
    const targetId = profile.id || profile.userId
    if (!targetId || targetId === userId) return
    try {
      await Promise.all([
        deleteDoc(doc(db, 'follows', `${userId}_${targetId}`)),
        deleteDoc(doc(db, 'follows', `${targetId}_${userId}`)),
        setDoc(doc(db, 'publicProfiles', userId), {
          followersCount: increment(-1),
          followingCount: increment(-1),
          updatedAt: new Date().toISOString(),
        }, { merge: true }),
        setDoc(doc(db, 'publicProfiles', targetId), {
          followersCount: increment(-1),
          followingCount: increment(-1),
          updatedAt: new Date().toISOString(),
        }, { merge: true }),
      ])
      onNotice(text.friendRemoved)
    } catch (error) {
      onNotice(`${text.locked} ${error.code || error.message}`)
    }
  }

  const acceptFriendRequest = async (request) => {
    if (!requireCommunityAccount()) return
    try {
      await setDoc(doc(db, 'follows', `${request.fromId}_${userId}`), {
        followerId: request.fromId,
        followingId: userId,
        followerHandle: request.fromHandle || request.followerHandle,
        followingHandle: userHandle,
        createdAt: serverTimestamp(),
      }, { merge: true })
      await setDoc(doc(db, 'follows', `${userId}_${request.fromId}`), {
        followerId: userId,
        followingId: request.fromId,
        followerHandle: userHandle,
        followingHandle: request.fromHandle || request.followerHandle,
        createdAt: serverTimestamp(),
      }, { merge: true })
      await updateDoc(doc(db, 'friendRequests', request.id), {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
      })
      await Promise.all([
        setDoc(doc(db, 'publicProfiles', userId), {
          followersCount: increment(1),
          followingCount: increment(1),
          updatedAt: new Date().toISOString(),
        }, { merge: true }),
        setDoc(doc(db, 'publicProfiles', request.fromId), {
          followersCount: increment(1),
          followingCount: increment(1),
          updatedAt: new Date().toISOString(),
        }, { merge: true }),
        addDoc(collection(db, 'notifications'), {
          toId: request.fromId,
          fromId: userId,
          fromHandle: userHandle,
          type: 'friend_accept',
          text: `${userHandle} ${isAr ? 'قبل طلب الصداقة.' : 'accepted your friend request.'}`,
          read: false,
          createdAt: serverTimestamp(),
        }),
      ])
      onNotice(text.following)
    } catch (error) {
      onNotice(`${text.locked} ${error.code || error.message}`)
    }
  }

  const messageProfile = (profile) => {
    const targetId = profile.id || profile.userId
    if (!targetId || targetId === userId) return
    const friends = visibleFollowingIds.has(targetId) && visibleFollowerIds.has(targetId)
    if (!friends) {
      onNotice(text.friendsOnly)
      return
    }
    setDmProfile(profile)
    setSelectedProfile(null)
    setActiveInbox(null)
  }

  const openMessageThread = async (message) => {
    await markItemsRead('messages', [message])
    setDmProfile(profileForCommunityItem({ userId: message.fromId, authorHandle: message.fromHandle, authorName: message.fromName }))
    setActiveInbox(null)
  }

  const openNotification = async (item) => {
    await markItemsRead('notifications', [item])
    if (item.fromId) {
      setSelectedProfile(profileForCommunityItem({ userId: item.fromId, authorHandle: item.fromHandle }))
    }
  }

  const sendMessageToProfile = async () => {
    if (!dmProfile || !requireCommunityAccount()) return
    const targetId = dmProfile.id || dmProfile.userId
    const body = messageDraft.trim()
    if (!body) return onNotice(text.messagePlaceholder)
    try {
      await addDoc(collection(db, 'messages'), {
        fromId: userId,
        toId: targetId,
        fromName: displayName,
        fromHandle: userHandle,
        toHandle: dmProfile.userHandle || `@${dmProfile.userUsername || 'nihongo'}`,
        body,
        read: false,
        createdAt: serverTimestamp(),
      })
      await addDoc(collection(db, 'notifications'), {
        toId: targetId,
        fromId: userId,
        fromHandle: userHandle,
        type: 'message',
        text: `${userHandle}: ${body.slice(0, 80)}`,
        read: false,
        createdAt: serverTimestamp(),
      })
      setMessageDraft('')
      onNotice(text.messageSent)
    } catch (error) {
      onNotice(`${text.locked} ${error.code || error.message}`)
    }
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
        <div className="community-hero-side">
          <div className="community-inbox-actions">
            <button onClick={() => openInbox('messages')} aria-label={text.inbox}>
              <span><AppIcon name="messages" size={30} /></span>
              {unreadMessages > 0 && <b>{unreadMessages}</b>}
            </button>
            <button onClick={() => setActiveInbox(activeInbox === 'requests' ? null : 'requests')} aria-label={text.requests}>
              <span className="friend-request-icon"><AppIcon name="profile" size={28} /><em>+</em></span>
              {friendRequests.length > 0 && <b>{friendRequests.length}</b>}
            </button>
            <button onClick={() => openInbox('notifications')} aria-label={text.notifications}>
              <span><AppIcon name="notifications" size={30} /></span>
              {unreadNotifications > 0 && <b>{unreadNotifications}</b>}
            </button>
          </div>
          <div className="community-score">
            <strong>{streak}</strong>
            <span>Streak</span>
            <small>{totalQuizzes} Quiz</small>
          </div>
        </div>
      </div>

      {activeInbox && activeInbox !== 'compose' && (
        <article className="community-card inbox-panel">
          <div className="card-heading">
            <span className={activeInbox === 'requests' ? 'friend-request-icon' : ''}>
              <AppIcon name={activeInbox === 'messages' ? 'messages' : activeInbox === 'requests' ? 'profile' : 'notifications'} size={activeInbox === 'requests' ? 30 : 32} />
              {activeInbox === 'requests' && <em>+</em>}
            </span>
            <h2>{activeInbox === 'messages' ? text.inbox : activeInbox === 'requests' ? text.requests : text.notifications}</h2>
          </div>
          {activeInbox === 'messages' && (
            <div className="inbox-list">
              {messages.length ? messages.map((message) => (
                <button key={message.id} className={!message.read ? 'unread' : ''} onClick={() => openMessageThread(message)}>
                  <strong>{message.fromHandle}</strong>
                  <span>{message.body}</span>
                </button>
              )) : <p>{text.noMessages}</p>}
            </div>
          )}
          {activeInbox === 'requests' && (
            <div className="inbox-list">
              {friendRequests.length ? friendRequests.map((request) => (
                <div key={request.id} className="request-row">
                  <button onClick={() => setSelectedProfile(profileForCommunityItem({ userId: request.fromId, authorHandle: request.fromHandle || request.followerHandle, authorName: request.fromName }))}>
                    <strong>{request.fromHandle || request.followerHandle}</strong>
                    <span>{text.followRequest}</span>
                  </button>
                  <Button variant="small" onClick={() => acceptFriendRequest(request)}>{text.accept}</Button>
                </div>
              )) : <p>{text.noRequests}</p>}
            </div>
          )}
          {activeInbox === 'notifications' && (
            <div className="inbox-list">
              {notifications.length ? notifications.map((item) => (
                <button key={item.id} className={!item.read ? 'unread' : ''} onClick={() => openNotification(item)}>
                  <strong>{item.fromHandle || 'Nihongo'}</strong>
                  <span>{item.text}</span>
                </button>
              )) : <p>{text.noNotifications}</p>}
            </div>
          )}
        </article>
      )}

      <div className="community-grid">
        <article className="community-card daily-card">
          <div className="card-heading">
            <IconCircle name="calendar" size={38} />
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
            <IconCircle name="ranking" size={38} />
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
            <IconCircle name="culture" size={38} />
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
            <IconCircle name="speaking" size={38} />
            <h2>{text.questions}</h2>
          </div>
          <div className="question-list">
            {visibleQuestions.map((question) => (
              <div key={question.id} className="community-post">
                <div className="post-main">
                  {editingQuestionId === question.id ? (
                    <div className="edit-box">
                      <input
                        value={questionEditDrafts[question.id] || ''}
                        onChange={(event) => setQuestionEditDrafts((drafts) => ({ ...drafts, [question.id]: event.target.value }))}
                      />
                      <div>
                        <Button variant="small" onClick={() => saveQuestionEdit(question)}>{text.save}</Button>
                        <Button variant="secondary" onClick={() => setEditingQuestionId(null)}>{text.cancel}</Button>
                      </div>
                    </div>
                  ) : (
                    <button className="post-title" onClick={() => setActiveReplyId(activeReplyId === question.id ? null : question.id)}>
                      <strong>{question.text}</strong>
                      <small>{question.answers || 0} {isAr ? 'إجابات' : 'answers'}</small>
                    </button>
                  )}
                  <div className="question-actions">
                    <button onClick={() => likeQuestion(question)}>♡ {text.like}</button>
                    <button onClick={() => setActiveReplyId(activeReplyId === question.id ? null : question.id)}>↩ {text.reply}</button>
                    <button onClick={() => repostQuestion(question)}>↻ {text.repost}</button>
                    <button onClick={() => shareQuestion(question)}><AppIcon name="share" size={18} /> {text.shareComment}</button>
                  </div>
                  {(repliesForQuestion(question.id).length > 0 || activeReplyId === question.id) && (
                    <div className="reply-panel">
                      {repliesForQuestion(question.id).length > 0 && (
                        <div className="reply-list">
                          {repliesForQuestion(question.id).map((reply) => (
                            <div key={reply.id} className="reply-item">
                              <div>
                                <button className="author-chip" onClick={() => setSelectedProfile(profileForCommunityItem(reply))}>
                                  {reply.authorHandle || text.viewProfile}
                                </button>
                                {editingReplyId === reply.id ? (
                                  <div className="edit-box compact">
                                    <input
                                      value={replyEditDrafts[reply.id] || ''}
                                      onChange={(event) => setReplyEditDrafts((drafts) => ({ ...drafts, [reply.id]: event.target.value }))}
                                    />
                                    <div>
                                      <Button variant="small" onClick={() => saveReplyEdit(reply)}>{text.save}</Button>
                                      <Button variant="secondary" onClick={() => setEditingReplyId(null)}>{text.cancel}</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <p>{reply.body}</p>
                                )}
                              </div>
                              <span className="post-menu-wrap">
                                <button className="post-menu-btn" onClick={() => setOpenPostMenu(openPostMenu === `reply:${reply.id}` ? null : `reply:${reply.id}`)}>⋯</button>
                                {openPostMenu === `reply:${reply.id}` && (
                                  <span className="post-menu">
                                    {reply.userId === userId && <button onClick={() => startReplyEdit(reply)}>{text.edit}</button>}
                                    {reply.userId === userId && <button onClick={() => deleteReplyPost(reply)}>{text.delete}</button>}
                                    <button onClick={() => reportCommunityItem(reply, 'reply')}>{text.report}</button>
                                  </span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {activeReplyId === question.id && (
                      <div className="reply-box">
                        <input
                          value={replyDrafts[question.id] || ''}
                          onChange={(event) => setReplyDrafts((drafts) => ({ ...drafts, [question.id]: event.target.value }))}
                          placeholder={text.replyPlaceholder}
                        />
                        <Button variant="small" onClick={() => sendQuestionReply(question)}>{text.send}</Button>
                      </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="post-side">
                  {(question.authorHandle || question.userId) && (
                    <button className="author-chip" onClick={() => setSelectedProfile(profileForCommunityItem(question))}>
                      {question.authorHandle || text.viewProfile}
                    </button>
                  )}
                  <span className="post-menu-wrap">
                    <button className="post-menu-btn" onClick={() => setOpenPostMenu(openPostMenu === `question:${question.id}` ? null : `question:${question.id}`)}>⋯</button>
                    {openPostMenu === `question:${question.id}` && (
                      <span className="post-menu">
                        {question.userId === userId && <button onClick={() => startQuestionEdit(question)}>{text.edit}</button>}
                        {question.userId === userId && <button onClick={() => deleteQuestionPost(question)}>{text.delete}</button>}
                        <button onClick={() => reportCommunityItem(question, 'question')}>{text.report}</button>
                      </span>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="community-input">
            <input value={questionText} onChange={(event) => setQuestionText(event.target.value)} placeholder={text.questionPlaceholder} />
            <Button variant="secondary" onClick={askQuestion}>{text.ask}</Button>
          </div>
        </article>

        <article className="community-card ai-card">
          <div className="card-heading">
            <IconCircle name="correct" size={38} />
            <h2>{text.corrector}</h2>
          </div>
          <textarea value={sentence} onChange={(event) => setSentence(event.target.value)} placeholder={text.sentencePlaceholder} />
          <Button variant="small" onClick={checkSentence}>{text.correct}</Button>
          {correction && <p className="ai-reply">{correction}</p>}
        </article>

        <article className="community-card ai-card wide">
          <div className="card-heading">
            <IconCircle name="sound" size={38} />
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
                <div className="profile-handle-row">
                  <p className="user-handle">{selectedProfile.userHandle || `@${selectedProfile.userUsername || 'nihongo'}`}</p>
                  {!selectedProfile.current && (
                    <div className="profile-inline-actions">
                      <button onClick={() => messageProfile(selectedProfile)} aria-label={text.message}><AppIcon name="messages" size={28} /></button>
                      <span className="friend-action-wrap">
                        <button
                          onClick={() => {
                            if (friendshipState(selectedProfile) === 'friends') {
                              setFriendMenuOpen((value) => !value)
                              return
                            }
                            followProfile(selectedProfile)
                          }}
                          aria-label={text.followRequest}
                        >
                          <AppIcon name={friendshipState(selectedProfile) === 'friends' ? 'correct' : friendshipState(selectedProfile) === 'pending' ? 'timer' : 'profile'} size={28} />
                          {friendshipState(selectedProfile) === 'none' && <em>+</em>}
                        </button>
                        {friendMenuOpen && friendshipState(selectedProfile) === 'friends' && (
                          <button className="friend-menu" onClick={() => { setFriendMenuOpen(false); removeFriend(selectedProfile) }}>
                            {text.removeFriend}
                          </button>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <p className="public-bio">{selectedProfile.userBio || text.noBio}</p>
            <div className="public-stat-grid">
              <Stat label="XP" value={selectedProfile.xp || 0} />
              <Stat label="Streak" value={selectedProfile.streak || 0} />
              <Stat label={isAr ? 'متابعين' : 'Followers'} value={selectedProfile.current ? visibleFollowerIds.size : selectedProfile.followersCount || 0} />
              <Stat label={isAr ? 'يتابع' : 'Following'} value={selectedProfile.current ? visibleFollowingIds.size : selectedProfile.followingCount || 0} />
            </div>
            <div className="profile-detail-list">
              <div><span>{isAr ? 'الاختبارات' : 'Quizzes'}</span><strong>{selectedProfile.totalQuizzes || 0}</strong></div>
              <div><span>{isAr ? 'الحروف المتقنة' : 'Mastered chars'}</span><strong>{selectedProfile.masteredCount || 0}</strong></div>
              <div><span>{isAr ? 'الدروس' : 'Lessons'}</span><strong>{selectedProfile.completedLessons || 0}</strong></div>
              <div><span>{isAr ? 'المستوى' : 'Level'}</span><strong>{selectedProfile.current ? currentLevel : (selectedProfile.level || 'N5')}</strong></div>
            </div>
          </article>
        </div>
      )}

      {dmProfile && (
        <div className="dm-modal" role="dialog" aria-modal="true">
          <button className="modal-backdrop" onClick={() => setDmProfile(null)} aria-label="Close" />
          <article className="dm-panel">
            <header className="dm-head">
              <button className="icon-btn" onClick={() => setDmProfile(null)}>×</button>
              <div className="avatar dm-avatar">
                {dmProfile.userAvatar ? <img src={dmProfile.userAvatar} alt="" /> : (dmProfile.userName || 'N').slice(0, 1).toUpperCase()}
              </div>
              <div>
                <strong>{dmProfile.userName || 'Nihongo learner'}</strong>
                <span>{dmProfile.userHandle || `@${dmProfile.userUsername || 'nihongo'}`}</span>
              </div>
            </header>
            <div className="dm-thread">
              {dmMessages.length ? dmMessages.map((message) => (
                <div key={message.id} className={`dm-bubble ${message.fromId === userId ? 'mine' : 'theirs'}`}>
                  <p>{message.body}</p>
                  <small>{message.fromId === userId ? userHandle : message.fromHandle}</small>
                </div>
              )) : (
                <div className="dm-empty">
                  <strong>{text.message}</strong>
                  <span>{text.messagePlaceholder}</span>
                </div>
              )}
            </div>
            <footer className="dm-compose">
              <input value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} placeholder={text.messagePlaceholder} />
              <Button variant="small" onClick={sendMessageToProfile}>{text.send}</Button>
            </footer>
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

function LessonView({ lesson, lang, progress, setProgress, kanjiReadingMode, onBack, onQuiz }) {
  const [section, setSection] = useState('vocabulary')
  const [flipped, setFlipped] = useState({})
  const [activeGrammarEx, setActiveGrammarEx] = useState(null)
  const [vocabExOpen, setVocabExOpen] = useState(false)
  const [vocabPracticeAllOpen, setVocabPracticeAllOpen] = useState(false)
  const t = copy[lang]
  const vocabGroups = chunk(lesson.vocab, 8)
  const grammarReadingMap = useMemo(() => {
    const map = {}
    ;(lesson.vocab || []).forEach((item) => {
      const surface = item.kanji || item.jp
      if (!surface || !/[㐀-鿿]/.test(surface)) return
      map[surface] = kanjiReadingMode === 'romaji' ? (item.reading || '') : (item.hiragana || item.jp || '')
    })
    return map
  }, [lesson.vocab, kanjiReadingMode])

  return (
    <main className="screen">
      <header className="page-head">
        <button className="icon-btn" onClick={onBack}><AppIcon name="back" size={22} /></button>
        <div>
          <p>{t.lesson} {lesson.id}</p>
          <h1>{lesson.title[lang]}</h1>
        </div>
      </header>

      <div className="lesson-toolbar">
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
          {vocabExOpen ? (
            <VocabExercises vocab={lesson.vocab} lang={lang} onClose={() => setVocabExOpen(false)} />
          ) : vocabPracticeAllOpen ? (
            <VocabPracticeAll
              vocab={lesson.vocab}
              lesson={lesson}
              lessonId={lesson.id}
              progress={progress}
              setProgress={setProgress}
              masteryTarget={VOCAB_MASTERY_TARGET}
              lang={lang}
              onClose={() => setVocabPracticeAllOpen(false)}
            />
          ) : (
            <>
              <p className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <AppIcon name="vocabulary" size={18} />{t.vocabulary}
              </p>
              <button className="btn btn-primary vocab-ex-open" onClick={() => setVocabPracticeAllOpen(true)}>
                <AppIcon name="quiz" size={28} />
                {lang === 'ar' ? 'تدريب شامل على كل المفردات' : 'Practice all vocabulary'}
              </button>
              <button className="btn btn-secondary vocab-ex-open" onClick={() => setVocabExOpen(true)}>
                <AppIcon name="quiz" size={28} />
                {lang === 'ar' ? 'تمارين المفردات' : 'Vocabulary exercises'}
              </button>
              <div className="vocab-group-list">
                {vocabGroups.map((group, groupIndex) => (
                  <section className="vocab-group" key={`vocab-group-${groupIndex + 1}`}>
                    <div className="vocab-group-head">
                      <div>
                        <strong>{lang === 'ar' ? `مجموعة ${groupIndex + 1}` : `Group ${groupIndex + 1}`}</strong>
                        <small>{lang === 'ar' ? 'كل مجموعة 8 مفردات' : '8 words per group'}</small>
                      </div>
                    </div>
                    <div className="card-grid">
                      {group.map((item, index) => {
                        const itemIndex = groupIndex * 8 + index
                        const shown = flipped[itemIndex]
                        const amount = Math.min(progress[vocabKey(lesson.id, item)] || 0, VOCAB_MASTERY_TARGET)
                        return (
                          <button className="study-card" key={`${item.jp}-${item.reading}`} onClick={() => { speakJapanese(speakableVocab(item)); setFlipped((f) => ({ ...f, [itemIndex]: !shown })) }}>
                            {shown ? <span className="jp">{item.reading}</span> : <JapaneseTerm item={item} readingMode={kanjiReadingMode} />}
                            <strong>{shown ? item.meaning : t.tapHear}</strong>
                            <small>{shown ? (item.hiragana || item.jp) : item.reading}</small>
                            <span className="vocab-progress" aria-label={`${amount}/${VOCAB_MASTERY_TARGET}`}>
                              <i style={{ width: `${(amount / VOCAB_MASTERY_TARGET) * 100}%` }} />
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {section === 'grammar' && (
        <section className="lesson-card">
          <p className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <AppIcon name="grammar" size={18} />{t.grammar}
          </p>
          {activeGrammarEx && (
            <GrammarExercises
              exercises={activeGrammarEx.exercises}
              lang={lang}
              onClose={() => setActiveGrammarEx(null)}
            />
          )}
          {!activeGrammarEx && Array.isArray(lesson.grammar) ? (
            <div className="grammar-list">
              {lesson.grammar.map((rule) => (
                <article key={rule.title} className="grammar-card">
                  {rule.particle && (
                    <div className="grammar-particle-banner">
                      <span className="grammar-particle-badge" dir="ltr">{rule.particle}</span>
                      {rule.howItWorks && <p className="grammar-how">{rule.howItWorks}</p>}
                    </div>
                  )}
                  <h2>{rule.title}</h2>
                  <code className="grammar-pattern" dir="ltr">{rule.pattern}</code>
                  <p>{rule.explanation}</p>
                  <button className="grammar-example-btn" onClick={() => speakJapanese(rule.example.jp)}>
                    <span className="jp-line" dir="ltr">
                      <HighlightSentence text={rule.example.jp} particle={rule.particle} readingMap={grammarReadingMap} />
                    </span>
                    <small dir="ltr">{rule.example.romaji}</small>
                    <span className="grammar-example-ar">{rule.example.ar}</span>
                  </button>
                  {rule.exercises?.length > 0 && (
                    <button className="btn btn-small grammar-ex-open" onClick={() => setActiveGrammarEx(rule)}>
                      {lang === 'ar' ? '🎯 تمارين هذه القاعدة' : '🎯 Practice this rule'}
                    </button>
                  )}
                </article>
              ))}
            </div>
          ) : !activeGrammarEx ? (
            <>
              <h2>{lesson.grammar[lang].split('—')[0]}</h2>
              <p>{lesson.grammar[lang].split('—')[1]}</p>
            </>
          ) : null}
          <div className="mini-list">
            {lesson.vocab.map((item) => (
              <button key={item.jp} onClick={() => speakJapanese(item.hiragana || item.jp)}>
                <JapaneseTerm item={item} className="jp-line" readingMode={kanjiReadingMode} />
                <small>{item.reading} · {item.meaning}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {section === 'exercises' && (
        <ExercisesSection lesson={lesson} lang={lang} kanjiReadingMode={kanjiReadingMode} onQuiz={onQuiz} />
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
        </section>
      )}

      {section === 'review' && (
        <ReviewSection lesson={lesson} lang={lang} kanjiReadingMode={kanjiReadingMode} onQuiz={onQuiz} />
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
        <button className="icon-btn" onClick={onCancel}><AppIcon name="back" size={22} /></button>
        <div>
          <p>{t.settings}</p>
          <h1>{t.editProfile}</h1>
        </div>
      </header>
      <section className="auth-panel">
        <div className="photo-picker">
          <div className="avatar large">{draft.userAvatar ? <img src={draft.userAvatar} alt="" /> : (draft.userName || 'G').slice(0, 1).toUpperCase()}</div>
          <label className="file-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <AppIcon name="gallery" size={22} />
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
    { id: 'account', icon: 'achievement', title: t.account },
    { id: 'customization', icon: 'filter', title: t.customization },
    { id: 'subscription', icon: 'coins', title: t.subscription },
    { id: 'policy', icon: 'info', title: t.policy },
    { id: 'support', icon: 'help', title: t.support },
    { id: 'donate', icon: 'gift', title: t.donate },
  ]

  return (
    <main className="screen">
      <header className="page-head">
        <button className="icon-btn" onClick={panel === 'menu' ? onBack : () => setPanel('menu')}><AppIcon name="back" size={22} /></button>
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
                <IconCircle name={item.icon} size={44} className="settings-icon" />
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
                <span><AppIcon name="unlocked" size={30} />{t.create}</span>
                <strong>›</strong>
              </button>
            ) : (
              <button className="settings-row" onClick={onEditProfile}>
                <span><AppIcon name="camera" size={30} />{t.editProfile}</span>
                <strong>›</strong>
              </button>
            )}
          </div>
        )}

        {panel === 'customization' && (
          <div className="settings-panel">
            <div className="theme-switch-row">
              <span><AppIcon name="calendar" size={30} /></span>
              <button className={`theme-switch ${isDark ? 'dark' : 'light'}`} onClick={() => setTheme(isDark ? 'light' : 'dark')} aria-label={t.theme}>
                <span />
              </button>
              <span><AppIcon name="night-mode" size={30} /></span>
            </div>
            <label className="toggle-row">
              <span><AppIcon name={values.soundEnabled ? 'sound' : 'mute'} size={30} />{t.sound}</span>
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
            <label>
              <span className="settings-label-inline"><AppIcon name="language" size={30} />{t.kanjiReading}</span>
              <select value={values.kanjiReadingMode} onChange={(e) => onUpdatePrefs({ kanjiReadingMode: e.target.value })}>
                <option value="hiragana">{t.kanjiReadingHiragana}</option>
                <option value="romaji">{t.kanjiReadingRomaji}</option>
              </select>
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
  const [previewLesson, setPreviewLesson] = useState(null)
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
  const [kanjiReadingMode, setKanjiReadingMode] = useState('hiragana')
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
  const [unlockedLevels, setUnlockedLevels] = useState(['N5'])
  const [levelExams, setLevelExams] = useState({})
  const [examState, setExamState] = useState(null)
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
  const completedLessons = Object.entries(lessonProgress)
    .filter(([key, value]) => key.startsWith(`${currentLevel}-`) && value >= sectionCount).length
  const lessonPercent = Math.round((completedLessons / TOTAL_LESSONS) * 100)
  const currentLevelLessons = levelSourceLessons(currentLevel)
  const lessonSlots = Array.from({ length: TOTAL_LESSONS }, (_, index) => currentLevelLessons[index] || null)
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
    setUnlockedLevels(state.unlockedLevels?.length ? state.unlockedLevels : ['N5'])
    setLevelExams(state.levelExams ?? {})
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
    setKanjiReadingMode(state.kanjiReadingMode ?? 'hiragana')
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
    unlockedLevels,
    levelExams,
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
    kanjiReadingMode,
    isPaid,
    theme,
    lang,
    startingGemsGranted,
  }), [xp, hearts, gems, streak, lastActiveDate, lastHeartRefillAt, progress, lessonProgress, unlockedLevels, levelExams, totalQuizzes, perfectScores, lastScore, userName, userUsername, emailVerified, userBio, userPhone, userBirthday, userAvatar, soundEnabled, fontScale, cozyMode, kanjiReadingMode, isPaid, theme, lang, startingGemsGranted])

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
    const unlock = () => {
      unlockAudio()
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.dir = dir
    document.documentElement.style.setProperty('--font-scale', String(fontScale))
    document.documentElement.dataset.cozy = cozyMode ? 'true' : 'false'
    document.documentElement.dataset.kanjiReading = kanjiReadingMode
    localStorage.setItem('nihongo-lang', lang)
    localStorage.setItem('nihongo-theme', theme)
  }, [lang, theme, dir, fontScale, cozyMode, kanjiReadingMode])

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
        const loadedUsername = d.userUsername || d.username || normalizeUsername(d.userName || d.name || user.displayName || user.email?.split('@')[0] || 'nihongo')
        applyState(applyAccountUnlocks({
          ...d,
          ...activity,
          userName: d.userName || d.name || user.displayName || '',
          userUsername: loadedUsername,
          emailVerified: Boolean(user.emailVerified),
          gems: d.gems ?? STARTING_GEMS,
          hearts: d.hearts ?? MAX_HEARTS,
        }, loadedUsername))
      } else {
        const base = defaultState()
        const userUsername = normalizeUsername(user.displayName || user.email?.split('@')[0] || 'nihongo')
        const initialState = applyAccountUnlocks({ ...base, userName: user.displayName || '', userUsername }, userUsername)
        applyState(initialState)
        await setDoc(doc(db, 'users', user.uid), {
          ...initialState,
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
      userAvatar, soundEnabled, fontScale, cozyMode, kanjiReadingMode, isPaid, theme, lang,
      startingGemsGranted,
    }))
  }, [isGuest, dataReady, xp, hearts, gems, streak, lastActiveDate, lastHeartRefillAt, progress, lessonProgress, totalQuizzes, perfectScores, lastScore, userName, userUsername, userBio, userPhone, userBirthday, userAvatar, soundEnabled, fontScale, cozyMode, kanjiReadingMode, isPaid, theme, lang, startingGemsGranted])

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

  const startLessonQuiz = (lesson, groupItems = null) => {
    if (hearts <= 0) {
      setNotice(t.noHearts)
      return
    }
    setQuestions(makeLessonVocabQuiz(lesson, groupItems || lesson.vocab, kanjiReadingMode).map((q) => ({ ...q, soundEnabled })))
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
      setProgress((p) => {
        const keys = current.progressKeys?.length ? current.progressKeys : [current.kana]
        const max = current.progressMax || 8
        return keys.reduce((next, key) => ({
          ...next,
          [key]: Math.min((next[key] || 0) + 1, max),
        }), { ...p })
      })
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

  const isLevelLessonsComplete = (levelId) => {
    if (levelSourceLessons(levelId).length < TOTAL_LESSONS) return false
    return Array.from({ length: TOTAL_LESSONS }, (_, index) => index + 1)
      .every((lessonNumber) => (lessonProgress[`${levelId}-${lessonNumber}`] || 0) >= sectionCount)
  }

  const startExitExam = (levelId) => {
    const exam = buildExamQuestions(levelId, 'exit', kanjiReadingMode)
    setExamState({ levelId, examType: 'exit', exam, sectionIndex: 0, qIndex: 0, selected: null, sectionCorrect: 0, sectionScores: [], phase: 'section-intro' })
    setScreen('exam-intro')
  }

  const startEntranceExam = (levelId) => {
    const exam = buildExamQuestions(levelId, 'entrance', kanjiReadingMode)
    setExamState({ levelId, examType: 'entrance', exam, sectionIndex: 0, qIndex: 0, selected: null, sectionCorrect: 0, sectionScores: [], phase: 'section-intro' })
    setScreen('exam-intro')
  }

  const finalizeExam = (sectionScores) => {
    const total = sectionScores.reduce((a, b) => a + b, 0)
    const passed = total >= examState.exam.passScore
    const { levelId, examType } = examState
    setLevelExams((prev) => ({
      ...prev,
      [levelId]: {
        ...prev[levelId],
        ...(examType === 'exit' ? { exitScore: total, exitPassed: passed } : { entranceScore: total, entrancePassed: passed }),
      },
    }))
    if (passed) {
      if (examType === 'exit') {
        const next = LEVEL_ORDER[LEVEL_ORDER.indexOf(levelId) + 1]
        if (next) setUnlockedLevels((prev) => prev.includes(next) ? prev : [...prev, next])
      } else {
        setUnlockedLevels((prev) => prev.includes(levelId) ? prev : [...prev, levelId])
      }
    }
    setExamState((prev) => ({ ...prev, sectionScores, totalScore: total, passed, phase: 'finished' }))
    setScreen('exam-result')
  }

  const handleExamAnswer = (opt) => {
    setExamState((prev) => (prev && prev.selected === null ? { ...prev, selected: opt } : prev))
  }

  const handleSectionStart = () => {
    setExamState((prev) => (prev ? { ...prev, phase: 'active' } : prev))
  }

  const forceFinishSection = () => {
    if (!examState) return
    const section = examState.exam.sections[examState.sectionIndex]
    const sectionScore = Math.round((examState.sectionCorrect / section.questions.length) * (examState.exam.totalScore / examState.exam.sections.length))
    const newSectionScores = [...examState.sectionScores, sectionScore]
    if (examState.sectionIndex + 1 < examState.exam.sections.length) {
      setExamState((prev) => ({ ...prev, sectionIndex: prev.sectionIndex + 1, qIndex: 0, selected: null, sectionCorrect: 0, sectionScores: newSectionScores, phase: 'section-intro' }))
    } else {
      finalizeExam(newSectionScores)
    }
  }

  useEffect(() => {
    if (screen !== 'exam' || !examState || examState.phase !== 'active' || examState.selected === null) return
    const section = examState.exam.sections[examState.sectionIndex]
    const q = section.questions[examState.qIndex]
    const isCorrect = examState.selected === q.answer
    const timer = setTimeout(() => {
      const nextCorrect = examState.sectionCorrect + (isCorrect ? 1 : 0)
      if (examState.qIndex + 1 < section.questions.length) {
        setExamState((prev) => ({ ...prev, qIndex: prev.qIndex + 1, selected: null, sectionCorrect: nextCorrect }))
        return
      }
      const sectionScore = Math.round((nextCorrect / section.questions.length) * (examState.exam.totalScore / examState.exam.sections.length))
      const newSectionScores = [...examState.sectionScores, sectionScore]
      if (examState.sectionIndex + 1 < examState.exam.sections.length) {
        setExamState((prev) => ({ ...prev, sectionIndex: prev.sectionIndex + 1, qIndex: 0, selected: null, sectionCorrect: 0, sectionScores: newSectionScores, phase: 'section-intro' }))
        return
      }
      finalizeExam(newSectionScores)
    }, isCorrect ? 700 : 1300)
    return () => clearTimeout(timer)
  }, [screen, examState])

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

  const consumeHeart = () => {
    setHearts((value) => Math.max(value - 1, 0))
    setLastHeartRefillAt((value) => value || Date.now())
  }

  const heartsApi = {
    hearts,
    maxHearts: MAX_HEARTS,
    gems,
    consumeHeart,
    refillWithGems: refillHearts,
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

  if (screen === 'exam-intro' && examState) {
    return <ExamIntro examState={examState} lang={lang} onStart={() => setScreen('exam')} onBack={() => { setExamState(null); setScreen('main') }} />
  }

  if (screen === 'exam' && examState?.exam) {
    return <Exam examState={examState} lang={lang} onAnswer={handleExamAnswer} onSectionStart={handleSectionStart} onTimeUp={forceFinishSection} onBack={() => { setExamState(null); setScreen('main') }} />
  }

  if (screen === 'exam-result' && examState) {
    return <ExamResult examState={examState} lang={lang} nextLevelId={LEVEL_ORDER[LEVEL_ORDER.indexOf(examState.levelId) + 1] || null} onHome={() => { setExamState(null); setScreen('main') }} />
  }

  if (screen === 'lesson' && activeLesson) {
    return (
      <HeartsContext.Provider value={heartsApi}>
        <LessonView lesson={activeLesson} lang={lang} progress={progress} setProgress={setProgress} kanjiReadingMode={kanjiReadingMode} onBack={() => setScreen('main')} onQuiz={(groupItems) => startLessonQuiz(activeLesson, groupItems)} />
      </HeartsContext.Provider>
    )
  }

  if (screen === 'character-group' && activeCharGroup) {
    const title = `${activeCharGroup.label} ${activeCharGroup.index + 1}`
    const currentDrawItem = activeCharGroup.items.find((item) => item.kana === drawChar) || activeCharGroup.items[0]
    const currentDrawChar = currentDrawItem?.kana
    const renderChar = (item) => <CharacterSymbol item={item} readingMode={kanjiReadingMode} />
    const markDrawPractice = ({ correct }) => {
      if (!correct || !currentDrawChar) return
      setProgress((state) => ({
        ...state,
        [currentDrawChar]: Math.min((state[currentDrawChar] || 0) + 1, 8),
      }))
    }

    return (
      <HeartsContext.Provider value={heartsApi}>
        <main className="screen">
          <header className="page-head">
            <button className="icon-btn" onClick={() => setScreen('main')}><AppIcon name="back" size={22} /></button>
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
                    <span><CharacterSymbol item={item} readingMode={kanjiReadingMode} /></span>
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
                <h2>{currentDrawItem ? <CharacterSymbol item={currentDrawItem} readingMode={kanjiReadingMode} /> : t.chooseCharacter}</h2>
              </div>
              <DrawingPad char={currentDrawChar} lang={lang} autoGrade onDone={markDrawPractice} />
            </section>

            <CharacterExercises
              key={activeCharGroup.label + activeCharGroup.index}
              items={activeCharGroup.items}
              lang={lang}
              renderChar={renderChar}
              onClose={() => setScreen('main')}
            />
            <Button onClick={() => startCharacterGroupQuiz(activeCharGroup)}>{t.groupQuiz}</Button>
          </section>
        </main>
      </HeartsContext.Provider>
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
        values={{ userAvatar, soundEnabled, fontScale, cozyMode, kanjiReadingMode, isPaid, isGuest }}
        onBack={() => setScreen('main')}
        onEditProfile={() => setScreen('edit-profile')}
        onAccountAction={() => setScreen('login')}
        onUpdatePrefs={(prefs) => {
          if ('soundEnabled' in prefs) setSoundEnabled(prefs.soundEnabled)
          if ('fontScale' in prefs) setFontScale(prefs.fontScale)
          if ('cozyMode' in prefs) setCozyMode(prefs.cozyMode)
          if ('kanjiReadingMode' in prefs) setKanjiReadingMode(prefs.kanjiReadingMode)
        }}
      />
    )
  }

  return (
    <>
      <main className="app-shell">
        <header className="topbar app-topbar">
          <div className="toolbar top-stats">
            <span className="stat-chip life"><i className="icon-shell life-shell"><AppIcon name="life" size={42} /><b>{hearts}</b></i></span>
            <span className="stat-chip streak"><i className="icon-shell"><AppIcon name="streak" size={34} /></i>{streak}</span>
            <span className="stat-chip gems"><i className="icon-shell"><AppIcon name="gems" size={34} /></i>{gems}</span>
          </div>
        </header>

        {notice && <button className="notice" onClick={() => setNotice('')}>{notice}</button>}

        {tab === 'home' && (
          <section className="content">
            <div className="dashboard">
              <div className="dashboard-progress-ring ring" style={{ '--value': `${lessonPercent}%` }}>
                <span>{lessonPercent}%</span>
              </div>
              <div className="dashboard-copy">
                <p className="eyebrow">{t.continue}</p>
                <h1>{t.level} {currentLevel}</h1>
                <p>{levels.find((level) => level.id === currentLevel)?.[lang]} · {lessonPercent}%</p>
              </div>
              <div className="dashboard-stats">
                <Stat label={t.xp} value={xp} />
                <Stat label={t.mastered} value={masteredCount} />
                <Stat label={t.quiz} value={totalQuizzes} />
              </div>
            </div>

            <div className="level-strip">
              {levels.map((level) => {
                const unlocked = unlockedLevels.includes(level.id)
                const highestUnlockedIdx = Math.max(...unlockedLevels.map((id) => LEVEL_ORDER.indexOf(id)))
                const isNextLocked = !unlocked && LEVEL_ORDER.indexOf(level.id) === highestUnlockedIdx + 1
                const passed = levelExams[level.id]?.exitPassed
                return (
                  <button
                    key={level.id}
                    className={`${currentLevel === level.id ? 'active' : ''} ${!unlocked ? 'locked' : ''}`}
                    disabled={!unlocked && !isNextLocked}
                    onClick={() => {
                      if (unlocked) setCurrentLevel(level.id)
                      else if (isNextLocked) startEntranceExam(level.id)
                    }}
                  >
                    {!unlocked && <AppIcon name="locked" size={16} />}
                    {passed && <span className="level-passed-badge"><AppIcon name="correct" size={14} /></span>}
                    <strong>{level.id}</strong>
                    <span>{level[lang]}</span>
                  </button>
                )
              })}
            </div>

            <div className="unit-card">
              <div>
                <p>{`SECTION 1, ${currentLevel}`}</p>
                <h2>{t.lessons}</h2>
              </div>
              <span><AppIcon name="lessons" size={38} /></span>
            </div>

            {currentLevelLessons.length === 0 ? (
              <div className="unit-card level-coming-soon">
                <div>
                  <p>{currentLevel}</p>
                  <h2>{lang === 'ar' ? 'المحتوى قريباً' : 'Content coming soon'}</h2>
                  <p>{lang === 'ar' ? 'دروس هذا المستوى قيد التحضير.' : 'Lessons for this level are being prepared.'}</p>
                </div>
              </div>
            ) : (
            <>
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
                const completedSegments = locked ? 0 : Math.min(amount, sectionCount)
                return (
                  <LessonNode
                    key={lessonNumber}
                    lessonNumber={lessonNumber}
                    index={index}
                    state={locked ? 'locked' : amount >= sectionCount ? 'done' : 'current'}
                    completed={completedSegments}
                    total={sectionCount}
                    style={{
                      '--path-row': lessonNumber,
                      '--path-x': `${LESSON_PATH_X[index % LESSON_PATH_X.length]}%`,
                      '--path-x-mobile': `${LESSON_PATH_X_MOBILE[index % LESSON_PATH_X_MOBILE.length]}%`,
                    }}
                    label={`${t.lesson} ${lessonNumber}`}
                    onClick={() => !locked && setPreviewLesson({ lesson, amount })}
                  />
                )
                })}
            </div>
            </>
            )}

            {isLevelLessonsComplete(currentLevel) && (
              <button
                className={`exam-banner ${levelExams[currentLevel]?.exitPassed ? 'passed' : ''}`}
                onClick={() => startExitExam(currentLevel)}
              >
                <AppIcon name={levelExams[currentLevel]?.exitPassed ? 'correct' : 'quiz'} size={28} />
                <span>
                  {levelExams[currentLevel]?.exitPassed
                    ? (lang === 'ar' ? `إعادة اختبار نهاية المستوى ${currentLevel}` : `Retake ${currentLevel} Final Exam`)
                    : (lang === 'ar' ? `اختبار نهاية المستوى ${currentLevel}` : `${currentLevel} Final Exam`)}
                </span>
              </button>
            )}

            {previewLesson && (
              <LessonPreviewModal
                lesson={previewLesson.lesson}
                lang={lang}
                completed={previewLesson.amount}
                total={sectionCount}
                onStart={() => {
                  const lesson = previewLesson.lesson
                  setPreviewLesson(null)
                  openLesson(lesson)
                }}
                onClose={() => setPreviewLesson(null)}
              />
            )}
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
                          <b><CharacterSymbol item={item} readingMode={kanjiReadingMode} /></b>
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
            currentLevel={currentLevel}
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
              <IconCircle name="settings" size={44} />
              <strong>{t.settings}</strong>
              <small>›</small>
            </button>

            <h2 className="section-title">{t.achievements}</h2>
            <div className="achievement-grid">
              {achievements.map((item) => (
                <div key={item.label} className={item.active ? 'active' : ''}>
                  <span><AppIcon name={item.active ? 'star' : 'locked'} size={30} /></span>
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
          ['home', 'home', t.home],
          ['letters', 'writing', t.letters],
          ['community', 'speaking', lang === 'ar' ? 'المجتمع' : 'Community'],
          ['profile', 'profile', t.profile],
        ].map(([id, icon, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            <span className={icon === 'profile' ? 'nav-avatar' : ''}>
              {icon === 'profile'
                ? (userAvatar ? <img src={userAvatar} alt="" /> : (userName || (lang === 'ar' ? 'أ' : 'N')).slice(0, 1).toUpperCase())
                : <AppIcon name={icon} size={26} />}
            </span>
            <small>{label}</small>
          </button>
        ))}
      </nav>
    </>
  )
}
