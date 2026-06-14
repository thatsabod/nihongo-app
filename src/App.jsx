import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react'
import { onAuthStateChanged, sendEmailVerification, signOut } from 'firebase/auth'
import { addDoc, collection, deleteDoc, doc, getDoc, increment, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { auth, db } from './firebase.js'
import { hiragana, katakana, kanjiN5, lessons, n4Lessons, n3Lessons } from './data.js'
import LessonNode from './components/LessonNode.jsx'
import LessonPreviewModal from './components/LessonPreviewModal.jsx'
import LevelSelector from './components/LevelSelector.jsx'
import CommunityHeader from './components/community/CommunityHeader.jsx'
import CommunityTabs from './components/community/CommunityTabs.jsx'
import CommunityFeed from './components/community/CommunityFeed.jsx'
import DMInboxScreen from './components/community/DMInboxScreen.jsx'
import DMChatScreen from './components/community/DMChatScreen.jsx'
import NotificationsScreen from './components/community/NotificationsScreen.jsx'
import NotificationSettingsScreen from './components/community/NotificationSettingsScreen.jsx'
import { COMMUNITY_TABS, MOCK_COMMUNITY_POSTS, postMatchesTab } from './data/communityMockData.js'
import TodayWidget from './components/dashboard/TodayWidget.jsx'
import RetentionPanel from './components/dashboard/RetentionPanel.jsx'
import { copy } from './i18n/copy.js'
// Rare / heavy screens are code-split so an N5 beginner doesn't download the
// exam engine, admin dashboard, AI Sensei, drawing pad or review screen on
// first paint. Each is loaded on demand behind a Suspense fallback.
const SmartReview = lazy(() => import('./components/SmartReview.jsx'))
const AiSenseiPanel = lazy(() => import('./components/ai/AiSenseiPanel.jsx'))
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard.jsx'))
import { readProgressState, writeProgressState, mergeProgressState, markSectionVisited, getVisitedSections, getReviewStreak, getSeenAchievements, markAchievementsSeen, PROGRESS_CHANGED_EVENT } from './progress/progressStorage.js'
import { getLessonMastery } from './progress/masteryModel.js'
import { getExerciseSettings, setExerciseSettings, applyPronunciationVisibility, pronModeToReadingMode, readingModeToPronMode, EXERCISE_SETTINGS_EVENT } from './utils/exerciseSettings.js'
import { evaluateAchievements, countUnlocked } from './progress/achievements.js'
import { deriveLessonSections, totalLessonMinutes } from './content/lessonSections.js'
import LessonSectionPath from './components/lesson/LessonSectionPath.jsx'
import { speakJapanese, unlockAudio } from './sounds.js'
import { AUDIO_EVENT } from './utils/audioPlayer.js'
import GrammarExercises, { HighlightSentence } from './components/GrammarExercises.jsx'
import { ExercisesSection, WarmupSection, ExamplesSection, MistakeReviewSection, MasteryCheckSection, DialogueSection, ReadingSection } from './components/LessonSections.jsx'
import VocabExercises, { VocabPracticeAll } from './components/VocabExercises.jsx'
import CharacterExercises from './components/CharacterExercises.jsx'
import AppIcon from './components/AppIcon.jsx'
import IconCircle from './components/IconCircle.jsx'
import Login from './screens/Login.jsx'
import Quiz from './screens/Quiz.jsx'
import Result from './screens/Result.jsx'
import DrawingPad from './components/DrawingPad.jsx'
const Exam = lazy(() => import('./screens/Exam.jsx'))
const ExamIntro = lazy(() => import('./screens/ExamIntro.jsx'))
const ExamResult = lazy(() => import('./screens/ExamResult.jsx'))

// Lightweight fallback shown while a code-split screen loads.
function ScreenFallback() {
  return <main className="loading"><div className="brand big"><span className="brand-mark">日</span><span>にほんごGO</span></div></main>
}
import { EXAM_CONFIG, LEVEL_ORDER } from './content/examConfig.js'
import { useExam } from './hooks/useExam.js'
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

const lessonDisplayOffsetByLevel = {
  N5: 0,
  N4: 25,
  N3: 50,
}

const levels = [
  { id: 'N5', ar: 'أساسي', en: 'Elementary' },
  { id: 'N4', ar: 'متوسط', en: 'Intermediate' },
  { id: 'N3', ar: 'وسط-متقدم', en: 'Upper-Intermediate' },
  { id: 'N2', ar: 'احترافي', en: 'Advanced', comingSoon: true },
  { id: 'N1', ar: 'محترف', en: 'Expert', comingSoon: true },
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
    likedYourPost: 'أعجب بمنشورك',
    linkCopied: 'تم نسخ الرابط',
    savedPosts: 'المنشورات المحفوظة',
    noSavedPosts: 'لا توجد منشورات محفوظة بعد.',
    translate: 'ترجمة',
    hideTranslation: 'إخفاء الترجمة',
    noTranslation: 'لا تتوفر ترجمة تلقائية لهذا المنشور.',
    shareTitle: 'مشاركة المنشور',
    copyLink: 'نسخ الرابط',
    nativeShare: 'مشاركة عبر التطبيقات',
    comments: 'التعليقات',
    noComments: 'لا توجد تعليقات بعد',
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
    likedYourPost: 'liked your post',
    linkCopied: 'Link copied',
    savedPosts: 'Saved posts',
    noSavedPosts: 'No saved posts yet.',
    translate: 'Translate',
    hideTranslation: 'Hide translation',
    noTranslation: 'No automatic translation for this post.',
    shareTitle: 'Share post',
    copyLink: 'Copy link',
    nativeShare: 'Share via apps',
    comments: 'Comments',
    noComments: 'No comments yet',
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

// Both authored readings for an item, so the exercise can switch romaji↔kana
// LIVE at render time (the chosen mode is read from the exercise settings),
// instead of baking one reading in at quiz-build time.
function vocabReadings(item) {
  return { kana: item.hiragana || item.reading || '', romaji: item.reading || item.hiragana || '' }
}

function optionReadingPairsFor(options, items) {
  return items.reduce((acc, item) => ({ ...acc, [vocabLabel(item)]: vocabReadings(item) }), {})
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
    leftReadingPair: vocabReadings(item),
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
    kanaReadingPair: vocabReadings(item),
    speakText: sentenceSpeakText(item, sentence),
    sentence,
    answer: label,
    options,
    optionReadings: optionReadingsFor(options, optionItems, kanjiReadingMode),
    optionReadingPairs: optionReadingPairsFor(options, optionItems),
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
    kanaReadingPair: vocabReadings(item),
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
      optionReadingPairs: optionReadingPairsFor(options, items),
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

const getLessonDisplayNumber = (levelId, lessonIndex, lessonId) => {
  const internalNumber = Number.isFinite(lessonId) ? lessonId : lessonIndex + 1
  const offset = lessonDisplayOffsetByLevel[levelId] ?? 0
  return offset + internalNumber
}

function levelSourceLessons(levelId) {
  if (levelId === 'N5') return lessons
  if (levelId === 'N4') return n4Lessons
  if (levelId === 'N3') return n3Lessons
  return []
}

function applyLessonOverrides(levelId, sourceLessons, overrides = {}) {
  return sourceLessons.map((lesson, index) => {
    const lessonId = lesson?.id ?? index + 1
    const override = overrides[`${levelId}-${lessonId}`]
    if (override?.published !== true || !override.lesson) return lesson
    return {
      ...lesson,
      ...override.lesson,
      id: lessonId,
    }
  })
}

// Flat list of every lesson across levels — used by Smart Review to resolve
// stored mistake/SRS item IDs back into full vocab/grammar content.
const ALL_LESSONS = [...lessons, ...n4Lessons, ...n3Lessons]

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
            kanaReadingPair: vocabReadings(item),
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
            optionReadingPairs: optionReadingPairsFor(options, allVocab),
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

// Applied ONLY when a real study action happens today (not on app-open).
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

// Applied on app-open: never advances the streak (that would be dishonest —
// opening the app is not studying). Only lapses it if a day was missed.
function reconcileStreak(previousDate, currentStreak) {
  const today = todayKey()
  if (!previousDate) return { streak: currentStreak, lastActiveDate: previousDate }
  const diff = Math.round((new Date(today) - new Date(previousDate)) / 86400000)
  if (diff >= 2) return { streak: 0, lastActiveDate: previousDate } // missed ≥1 day
  return { streak: currentStreak, lastActiveDate: previousDate }
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
    unlockedLevels: ['N5'],
    levelExams: {},
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

function CommunityHub({ lang, userId, isGuest, userName, userHandle, xp, streak, totalQuizzes, masteredCount, currentLevel, onStartDaily, onNotice, communityView = 'feed', setCommunityView = () => {} }) {
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
  // Feed redesign UI state (presentation only — no new backend).
  const [activeTab, setActiveTab] = useState('recent')
  const [communitySearch, setCommunitySearch] = useState('')
  const [savedPostIds, setSavedPostIds] = useState(new Set()) // bookmarked question ids (Firestore-synced + mock-local)
  const [likedPostIds, setLikedPostIds] = useState(new Set()) // liked question ids (Firestore-synced + mock-local)
  const [sharePost, setSharePost] = useState(null) // post being shared (share modal)
  const [activePostId, setActivePostId] = useState(null) // post open in the comments screen
  const [notifSettings, setNotifSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nihongo-notif-settings') || '{}') } catch { return {} }
  })
  const toggleNotifSetting = (key) => setNotifSettings((prev) => {
    const next = { ...prev, [key]: prev[key] === false }
    try { localStorage.setItem('nihongo-notif-settings', JSON.stringify(next)) } catch { /* ignore */ }
    return next
  })
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

    // My likes / bookmarks — drive liked/saved state across refresh + devices.
    // Merge: keep any optimistic mock-* ids, replace the real question ids.
    const likesQuery = query(collection(db, 'communityQuestionLikes'), where('userId', '==', userId), limit(500))
    const stopLikes = onSnapshot(likesQuery, (snapshot) => {
      const ids = snapshot.docs.map((item) => item.data().questionId).filter(Boolean)
      setLikedPostIds((prev) => new Set([...[...prev].filter((id) => String(id).startsWith('mock-')), ...ids]))
    }, (error) => console.warn('Likes unavailable', error))

    const bookmarksQuery = query(collection(db, 'bookmarks'), where('userId', '==', userId), limit(500))
    const stopBookmarks = onSnapshot(bookmarksQuery, (snapshot) => {
      const ids = snapshot.docs.map((item) => item.data().questionId).filter(Boolean)
      setSavedPostIds((prev) => new Set([...[...prev].filter((id) => String(id).startsWith('mock-')), ...ids]))
    }, (error) => console.warn('Bookmarks unavailable', error))

    return () => {
      stopFollowing()
      stopFollowers()
      stopRequests()
      stopSentRequests()
      stopMessages()
      stopSentMessages()
      stopNotifications()
      stopLikes()
      stopBookmarks()
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

  // Toggle a like: deterministic doc id prevents duplicates; likeCount on the
  // question is incremented/decremented; author is notified on a fresh like.
  const toggleQuestionLike = async (question) => {
    if (!requireCommunityAccount()) return
    const liked = likedPostIds.has(question.id)
    // Optimistic UI — the likes subscription reconciles the truth.
    setLikedPostIds((prev) => { const n = new Set(prev); if (liked) n.delete(question.id); else n.add(question.id); return n })
    const likeRef = doc(db, 'communityQuestionLikes', `${question.id}_${userId}`)
    const qRef = doc(db, 'communityQuestions', question.id)
    try {
      if (liked) {
        await deleteDoc(likeRef)
        await updateDoc(qRef, { likeCount: increment(-1) }).catch(() => {})
      } else {
        await setDoc(likeRef, { questionId: question.id, userId, userHandle, createdAt: serverTimestamp() })
        await updateDoc(qRef, { likeCount: increment(1) }).catch(() => {})
        notifyQuestionAuthor(question, 'like', `${userHandle} ${text.likedYourPost}`)
      }
    } catch (error) {
      // Roll back optimistic state on failure.
      setLikedPostIds((prev) => { const n = new Set(prev); if (liked) n.add(question.id); else n.delete(question.id); return n })
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
    if (!request?.fromId || request.fromId === userId) return
    const requesterHandle = request.fromHandle || request.followerHandle || '@nihongo'
    try {
      await Promise.all([
        setDoc(doc(db, 'follows', `${request.fromId}_${userId}`), {
          followerId: request.fromId,
          followingId: userId,
          followerHandle: requesterHandle,
          followingHandle: userHandle,
          createdAt: serverTimestamp(),
        }, { merge: true }),
        setDoc(doc(db, 'follows', `${userId}_${request.fromId}`), {
          followerId: userId,
          followingId: request.fromId,
          followerHandle: userHandle,
          followingHandle: requesterHandle,
          createdAt: serverTimestamp(),
        }, { merge: true }),
      ])

      setFollowerIds((ids) => new Set([...ids, request.fromId]))
      setFollowingIds((ids) => new Set([...ids, request.fromId]))
      setFriendRequests((items) => items.filter((item) => item.id !== request.id))
      setSentFriendRequests((items) => {
        const next = new Set(items)
        next.delete(request.fromId)
        return next
      })

      await Promise.allSettled([
        setDoc(doc(db, 'friendRequests', request.id), {
          status: 'accepted',
          acceptedAt: serverTimestamp(),
        }, { merge: true }),
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
    setCommunityView('dm-chat')
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

  // Send an explicit body to the current DM counterpart (used by the composer
  // and by attachment shortcuts). Returns true on success.
  const sendMessageBody = async (rawBody) => {
    if (!dmProfile || !requireCommunityAccount()) return false
    const targetId = dmProfile.id || dmProfile.userId
    const body = (rawBody || '').trim()
    if (!body) { onNotice(text.messagePlaceholder); return false }
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
      onNotice(text.messageSent)
      return true
    } catch (error) {
      onNotice(`${text.locked} ${error.code || error.message}`)
      return false
    }
  }

  const sendMessageToProfile = async () => {
    const ok = await sendMessageBody(messageDraft)
    if (ok) setMessageDraft('')
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

  // ── Feed redesign: real Firestore questions → post cards, merged with mock ──
  const deriveQuestionTags = (q) => {
    const tags = ['#سؤال']
    const body = `${q.text || ''}`
    if (/[はがをにでへとも]|قاعدة|الفرق|grammar|قواعد/i.test(body)) tags.push('#قواعد')
    if (/مفرد|كلمة|معنى|vocab|単語/.test(body)) tags.push('#مفردات')
    if (q.lang === 'ja' || /[ぁ-んァ-ン一-龯]/.test(body)) tags.push('#JLPT')
    return tags
  }

  const mapQuestionToPost = (q) => {
    const replies = repliesForQuestion(q.id)
    const profile = profileForCommunityItem(q)
    return {
      id: q.id,
      type: 'help',
      source: 'question',
      raw: q,
      user: {
        id: q.userId,
        name: q.authorName || (q.authorHandle || '').replace('@', '') || 'Nihongo',
        handle: q.authorHandle || '@nihongo',
        level: profile?.level || q.level,
        nativeLang: 'AR',
        learningLang: 'JP',
      },
      contentAr: q.text,
      tags: deriveQuestionTags(q),
      likesCount: Math.max(0, q.likeCount || 0),
      commentsCount: replies.length || q.answers || 0,
      liked: false,
      saved: false,
      commentsPreview: replies.slice(0, 2).map((r) => ({ id: r.id, authorHandle: r.authorHandle, body: r.body, userId: r.userId })),
    }
  }

  const questionPosts = visibleQuestions.filter((q) => !q.deleted).map(mapQuestionToPost)
  const allPosts = [...questionPosts, ...MOCK_COMMUNITY_POSTS]
  const search = communitySearch.trim().toLowerCase()
  const feedPosts = allPosts
    .filter((post) => postMatchesTab(post, activeTab))
    .filter((post) => !search || `${post.contentAr || ''} ${post.contentJa || ''} ${post.user?.handle || ''} ${(post.tags || []).join(' ')}`.toLowerCase().includes(search))

  // Feed interaction wrappers. Comment opens a dedicated post screen; like and
  // save are real Firestore toggles for questions (optimistic local for mock).
  const onToggleComments = (id) => { setActivePostId(id); setCommunityView('post') }

  const toggleSavedPost = async (post) => {
    const saved = savedPostIds.has(post.id)
    setSavedPostIds((prev) => { const n = new Set(prev); if (saved) n.delete(post.id); else n.add(post.id); return n })
    if (post.source !== 'question') return // mock posts: local-only bookmark
    if (!requireCommunityAccount()) {
      setSavedPostIds((prev) => { const n = new Set(prev); if (saved) n.add(post.id); else n.delete(post.id); return n })
      return
    }
    const ref = doc(db, 'bookmarks', `${userId}_${post.id}`)
    try {
      if (saved) await deleteDoc(ref)
      else await setDoc(ref, { userId, questionId: post.id, createdAt: serverTimestamp() })
    } catch (error) {
      setSavedPostIds((prev) => { const n = new Set(prev); if (saved) n.add(post.id); else n.delete(post.id); return n })
      onNotice(`${text.locked} ${error.code || error.message}`)
    }
  }

  const handleFeedLike = (post) => {
    if (post.source === 'question' && post.raw?.id) { toggleQuestionLike(post.raw); return }
    setLikedPostIds((prev) => { const n = new Set(prev); if (n.has(post.id)) n.delete(post.id); else n.add(post.id); return n }) // mock: local toggle
  }

  const handleFeedShare = (post) => setSharePost(post) // open share modal
  const handleFeedTranslate = () => {} // handled inside the card (collapsible gloss); no-op fallback
  const postUrl = (post) => `${typeof window !== 'undefined' ? window.location.origin : ''}/community/post/${post.id}`
  const copyShareLink = (post) => {
    const url = postUrl(post)
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => { onNotice(text.linkCopied); setSharePost(null) }).catch(() => onNotice(url))
    else { onNotice(url); setSharePost(null) }
  }
  const nativeShare = (post) => {
    if (!navigator.share) return copyShareLink(post)
    navigator.share({ title: 'にほんごGO', text: post.contentAr || post.contentJa || '', url: postUrl(post) }).then(() => setSharePost(null)).catch(() => {})
  }
  const openPostProfile = (post) => setSelectedProfile(post.raw
    ? profileForCommunityItem(post.raw)
    : profileForCommunityItem({ userId: post.user?.id, authorHandle: post.user?.handle, authorName: post.user?.name }))
  const joinVoiceRoom = (room) => onNotice(isAr ? `غرف الصوت قريباً — «${room.title}»` : `Voice rooms coming soon — "${room.title}"`)

  // The full reply thread for a real question (reuses the existing reply/edit/
  // delete/report handlers verbatim — no backend logic duplicated).
  const renderThread = (post) => {
    const question = post.raw
    if (!question) return null
    return (
      <div className="reply-panel cm-thread">
        {editingQuestionId === question.id && (
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
        )}
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
                  <p dir="auto">{reply.body}</p>
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
        <div className="reply-box">
          <input
            value={replyDrafts[question.id] || ''}
            onChange={(event) => setReplyDrafts((drafts) => ({ ...drafts, [question.id]: event.target.value }))}
            placeholder={text.replyPlaceholder}
            dir="auto"
          />
          <Button variant="small" onClick={() => sendQuestionReply(question)}>{text.send}</Button>
        </div>
      </div>
    )
  }

  // ── DMs + notifications: derive live data for the dedicated screens ──────────
  const timeAgo = (createdAt) => {
    const secs = createdAt?.seconds
    if (!secs) return ''
    const diff = Math.max(0, Date.now() / 1000 - secs)
    if (diff < 60) return isAr ? 'الآن' : 'now'
    if (diff < 3600) return isAr ? `منذ ${Math.floor(diff / 60)} د` : `${Math.floor(diff / 60)}m`
    if (diff < 86400) return isAr ? `منذ ${Math.floor(diff / 3600)} س` : `${Math.floor(diff / 3600)}h`
    if (diff < 172800) return isAr ? 'أمس' : 'yesterday'
    return isAr ? `منذ ${Math.floor(diff / 86400)} يوم` : `${Math.floor(diff / 86400)}d`
  }

  const conversations = (() => {
    const map = new Map()
    for (const m of [...messages, ...sentMessages]) {
      const counterpartId = m.fromId === userId ? m.toId : m.fromId
      if (!counterpartId) continue
      const t = m.createdAt?.seconds || 0
      let entry = map.get(counterpartId)
      if (!entry) { entry = { counterpartId, unread: 0, _t: -1 }; map.set(counterpartId, entry) }
      if (m.fromId !== userId && !m.read) entry.unread += 1
      if (t >= entry._t) {
        entry._t = t
        entry.counterpartHandle = m.fromId === userId ? m.toHandle : m.fromHandle
        entry.counterpartName = (m.fromId === userId ? m.toName : m.fromName) || (m.fromId === userId ? m.toHandle : m.fromHandle)
        entry.lastBody = m.body
        entry.lastIsMine = m.fromId === userId
        entry.lastRead = m.read
        entry.createdAt = m.createdAt
      }
    }
    return [...map.values()].map((c) => ({ ...c, time: timeAgo(c.createdAt) })).sort((a, b) => b._t - a._t)
  })()

  // Notifications screen = community activity only (DMs excluded by design).
  const activityNotifications = notifications
    .filter((n) => n.type !== 'message')
    .slice()
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    .map((n) => ({ ...n, time: timeAgo(n.createdAt) }))

  const openConversation = (conv) => {
    markItemsRead('messages', messages.filter((m) => m.fromId === conv.counterpartId && !m.read))
    setDmProfile(profileForCommunityItem({ userId: conv.counterpartId, authorHandle: conv.counterpartHandle, authorName: conv.counterpartName }))
    setCommunityView('dm-chat')
  }

  // Shared per-post feed props (used by the feed + the post-detail + saved screens).
  const feedHandlers = {
    lang,
    currentUserId: userId,
    likedIds: likedPostIds,
    savedIds: savedPostIds,
    onLike: handleFeedLike,
    onSave: toggleSavedPost,
    onShare: handleFeedShare,
    onTranslate: handleFeedTranslate,
    onOpenProfile: openPostProfile,
    onJoinRoom: joinVoiceRoom,
    menuOpenId: openPostMenu,
    onToggleMenu: (id) => setOpenPostMenu(openPostMenu === id ? null : id),
    onEditPost: (post) => startQuestionEdit(post.raw),
    onDeletePost: (post) => deleteQuestionPost(post.raw),
    onReportPost: (post) => reportCommunityItem(post.raw, 'question'),
    renderThread,
  }

  // ── Dedicated full screens (chrome hidden by App when communityView!=='feed') ──
  if (communityView === 'post') {
    const activePost = allPosts.find((p) => p.id === activePostId)
    return (
      <section className="cm-screen">
        <header className="cm-screen-head">
          <button className="cm-icon-btn" onClick={() => setCommunityView('feed')} aria-label={isAr ? 'رجوع' : 'Back'}><AppIcon name="back" size={22} /></button>
          <h1>{text.comments}</h1>
          <span className="cm-screen-head-spacer" />
        </header>
        <div className="cm-post-detail">
          {activePost
            ? <CommunityFeed posts={[activePost]} expandedId={activePostId} onToggleComments={() => {}} emptyLabel={text.noComments} {...feedHandlers} />
            : <p className="cm-empty">{text.noComments}</p>}
        </div>
      </section>
    )
  }
  if (communityView === 'saved') {
    const savedPosts = allPosts.filter((p) => savedPostIds.has(p.id))
    return (
      <section className="cm-screen">
        <header className="cm-screen-head">
          <button className="cm-icon-btn" onClick={() => setCommunityView('feed')} aria-label={isAr ? 'رجوع' : 'Back'}><AppIcon name="back" size={22} /></button>
          <h1>{text.savedPosts}</h1>
          <span className="cm-screen-head-spacer" />
        </header>
        <div className="cm-saved-list">
          <CommunityFeed posts={savedPosts} expandedId={null} onToggleComments={onToggleComments} emptyLabel={text.noSavedPosts} {...feedHandlers} />
        </div>
      </section>
    )
  }
  if (communityView === 'dm-inbox') {
    return <DMInboxScreen lang={lang} conversations={conversations} onOpenConversation={openConversation} onBack={() => setCommunityView('feed')} />
  }
  if (communityView === 'dm-chat') {
    return (
      <DMChatScreen
        lang={lang}
        profile={dmProfile}
        messages={dmMessages}
        currentUserId={userId}
        draft={messageDraft}
        onDraftChange={setMessageDraft}
        onSend={sendMessageToProfile}
        onSendText={sendMessageBody}
        onOpenProfile={() => { setSelectedProfile(dmProfile); setCommunityView('feed') }}
        onBack={() => setCommunityView('dm-inbox')}
        timeFor={(m) => timeAgo(m.createdAt)}
      />
    )
  }
  if (communityView === 'notifications') {
    return (
      <NotificationsScreen
        lang={lang}
        notifications={activityNotifications}
        onOpenNotification={(n) => {
          markItemsRead('notifications', [n])
          if (n.fromId) { setSelectedProfile(profileForCommunityItem({ userId: n.fromId, authorHandle: n.fromHandle })); setCommunityView('feed') }
        }}
        onBack={() => setCommunityView('feed')}
        onOpenSettings={() => setCommunityView('notif-settings')}
      />
    )
  }
  if (communityView === 'notif-settings') {
    return <NotificationSettingsScreen lang={lang} settings={notifSettings} onToggle={toggleNotifSetting} onBack={() => setCommunityView('notifications')} />
  }

  return (
    <section className="content community cm-page">
      <CommunityHeader
        lang={lang}
        searchValue={communitySearch}
        onSearchChange={setCommunitySearch}
        onOpenMessages={() => setCommunityView('dm-inbox')}
        unreadMessages={unreadMessages}
        onOpenRequests={() => setActiveInbox(activeInbox === 'requests' ? null : 'requests')}
        requestsCount={friendRequests.length}
        onOpenNotifications={() => { markItemsRead('notifications', notifications); setCommunityView('notifications') }}
        unreadNotifications={unreadNotifications}
        onOpenProfile={() => setSelectedProfile(leaderboard.find((p) => p.current) || fallbackProfile)}
      />

      <CommunityTabs tabs={COMMUNITY_TABS} activeTab={activeTab} onSelect={setActiveTab} lang={lang} />

      <div className="cm-compose">
        <input value={questionText} onChange={(event) => setQuestionText(event.target.value)} placeholder={text.questionPlaceholder} dir="auto" />
        <Button variant="small" onClick={askQuestion}>{text.ask}</Button>
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

      <CommunityFeed
        posts={feedPosts}
        expandedId={null}
        onToggleComments={onToggleComments}
        emptyLabel={isAr ? 'لا توجد منشورات في هذا التصنيف بعد.' : 'No posts in this category yet.'}
        {...feedHandlers}
      />

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

      {sharePost && (
        <div className="cm-share-modal" role="dialog" aria-modal="true">
          <button className="modal-backdrop" onClick={() => setSharePost(null)} aria-label="Close" />
          <div className="cm-share-card">
            <h3>{text.shareTitle}</h3>
            <p className="cm-share-url" dir="ltr">{postUrl(sharePost)}</p>
            <button className="btn btn-primary" onClick={() => copyShareLink(sharePost)}>{text.copyLink}</button>
            {typeof navigator !== 'undefined' && navigator.share && (
              <button className="btn btn-secondary" onClick={() => nativeShare(sharePost)}>{text.nativeShare}</button>
            )}
            <button className="btn btn-quiet cm-share-close" onClick={() => setSharePost(null)}>{isAr ? 'إغلاق' : 'Close'}</button>
          </div>
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

function LessonView({ lesson, lang, progress, setProgress, kanjiReadingMode, onBack, lessonDone = false, sectionsDone = 0, onStudyActivity }) {
  const [section, setSection] = useState('overview')
  const [flipped, setFlipped] = useState({})
  const [activeGrammarEx, setActiveGrammarEx] = useState(null)
  const [vocabExOpen, setVocabExOpen] = useState(false)
  const [vocabPracticeAllOpen, setVocabPracticeAllOpen] = useState(false)
  // Bump to force a re-read of visited-section state after marking one.
  const [sectionTick, setSectionTick] = useState(0)
  const t = copy[lang]
  const isAr = lang === 'ar'
  const vocabGroups = chunk(lesson.vocab, 8)

  // Guided lesson path (microlearning chunks) derived from this lesson's content.
  const lessonSections = useMemo(() => {
    const visited = getVisitedSections(readProgressState(), lesson.id)
    return deriveLessonSections(lesson, visited, lessonDone)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson, lessonDone, sectionTick])

  // Map a content tab to the primary section type it fulfils, then mark it
  // engaged so the lesson path reflects real progress.
  const tabToSection = {
    warmup: 'warmup',
    vocabulary: 'vocabulary',
    grammar: 'grammar',
    examples: 'examples',
    dialogue: 'dialogue',
    reading: 'reading',
    practice: 'practice',
    mistakeReview: 'review',
    masteryCheck: 'masteryCheck',
  }

  const goToSection = (tabId) => {
    const type = tabToSection[tabId]
    if (type) {
      markSectionVisited(readProgressState(), lesson.id, type)
      setSectionTick((n) => n + 1)
    }
    setSection(tabId)
  }

  // Entering the lesson and seeing its path counts as the warm-up chunk.
  useEffect(() => {
    markSectionVisited(readProgressState(), lesson.id, 'warmup')
    setSectionTick((n) => n + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id])
  const grammarReadingMap = useMemo(() => {
    const map = {}
    ;(lesson.vocab || []).forEach((item) => {
      const surface = item.kanji || item.jp
      if (!surface || !/[㐀-鿿]/.test(surface)) return
      map[surface] = kanjiReadingMode === 'romaji' ? (item.reading || '') : (item.hiragana || item.jp || '')
    })
    return map
  }, [lesson.vocab, kanjiReadingMode])

  // Which numbered chunk the active section is (for the focus-mode header).
  const activeType = tabToSection[section]
  const activeIndex = lessonSections.findIndex((s) => s.type === activeType)

  // Sections that should advance the guided path: from a study/practice section,
  // a "continue" button moves to the next section in the path.
  const nextSection = () => {
    if (activeIndex >= 0 && activeIndex + 1 < lessonSections.length) {
      goToSection(lessonSections[activeIndex + 1].tab)
    } else {
      setSection('overview')
    }
  }

  // ── Guided-path hub (the only lesson navigator) ──────────────────────────
  if (section === 'overview') {
    return (
      <main className="screen">
        <header className="page-head">
          <button className="icon-btn" onClick={onBack}><AppIcon name="back" size={22} /></button>
          <div>
            <p>{t.lesson} {lesson.displayNumber || lesson.id}</p>
            <h1>{lesson.title[lang]}</h1>
          </div>
        </header>
        <LessonSectionPath
          sections={lessonSections}
          totalMinutes={totalLessonMinutes(lessonSections)}
          lang={lang}
          onSelect={(s) => {
            markSectionVisited(readProgressState(), lesson.id, s.type)
            setSectionTick((n) => n + 1)
            goToSection(s.tab)
          }}
        />
      </main>
    )
  }

  // ── Immersive Focus Mode: only content + a minimal header (title + progress
  // + back). No app chrome, no tab bar, no global stats — full immersion. ──
  return (
    <div className="lesson-focus">
      <header className="lesson-focus-head">
        <button className="icon-btn" onClick={() => setSection('overview')} aria-label={isAr ? 'رجوع للمسار' : 'Back to path'}>
          <AppIcon name="back" size={22} />
        </button>
        <div className="lesson-focus-title">
          <strong>{t[section]}</strong>
          {activeIndex >= 0 && <small>{activeIndex + 1} / {lessonSections.length}</small>}
        </div>
      </header>

      <div className="lesson-focus-body">
      {section === 'warmup' && (
        <WarmupSection lesson={lesson} lang={lang} kanjiReadingMode={kanjiReadingMode} onGo={goToSection} />
      )}

      {section === 'examples' && (
        <ExamplesSection lesson={lesson} lang={lang} kanjiReadingMode={kanjiReadingMode} onNext={nextSection} />
      )}

      {section === 'dialogue' && (
        <DialogueSection lesson={lesson} lang={lang} kanjiReadingMode={kanjiReadingMode} onNext={nextSection} />
      )}

      {section === 'reading' && (
        <ReadingSection lesson={lesson} lang={lang} kanjiReadingMode={kanjiReadingMode} onNext={nextSection} />
      )}

      {section === 'vocabulary' && (
        <>
          {vocabExOpen ? (
            <VocabExercises vocab={lesson.vocab} lang={lang} lessonId={lesson.id} onClose={() => setVocabExOpen(false)} />
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
                {lang === 'ar' ? 'ابدأ التدريب' : 'Start practicing'}
              </button>
              <button type="button" className="muted-link vocab-alt-link" onClick={() => setVocabExOpen(true)}>
                {lang === 'ar' ? 'تمارين سريعة بدلاً من ذلك ›' : 'Quick exercises instead ›'}
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
              lessonId={lesson.id}
              ruleTitle={activeGrammarEx.title}
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

      {section === 'practice' && (
        <ExercisesSection lesson={lesson} lang={lang} kanjiReadingMode={kanjiReadingMode} onStudyComplete={onStudyActivity} />
      )}

      {section === 'mistakeReview' && (
        <MistakeReviewSection lesson={lesson} lang={lang} onGo={goToSection} />
      )}

      {section === 'masteryCheck' && (
        <MasteryCheckSection
          lesson={lesson}
          lang={lang}
          kanjiReadingMode={kanjiReadingMode}
          sectionsDone={sectionsDone}
          sectionsTotal={sectionCount}
        />
      )}
      </div>
    </div>
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
  const lastSavedProgressJsonRef = useRef('')
  const [screen, setScreen] = useState('loading')
  const [tab, setTab] = useState('home')
  const [communityView, setCommunityView] = useState('feed') // 'feed'|'dm-inbox'|'dm-chat'|'notifications'|'notif-settings'
  useEffect(() => { if (tab !== 'community') setCommunityView('feed') }, [tab])
  const [reviewFilter, setReviewFilter] = useState(null) // null | 'grammar' | 'vocab' | 'kanji' — weak-area review shortcut
  const [authIntent, setAuthIntent] = useState('login') // 'login' | 'register' — which mode the Login screen opens in
  const goToAuth = (intent) => { setAuthIntent(intent); setScreen('login') }
  const [lang, setLang] = useState(localStorage.getItem('nihongo-lang') || 'ar')
  const [theme, setTheme] = useState(localStorage.getItem('nihongo-theme') || 'light')
  const [lettersTab, setLettersTab] = useState('hiragana')
  const [currentLevel, setCurrentLevel] = useState('N5')
  const [activeLesson, setActiveLesson] = useState(null)
  const [previewLesson, setPreviewLesson] = useState(null)
  const [activeCharGroup, setActiveCharGroup] = useState(null)
  const [charExerciseGroup, setCharExerciseGroup] = useState(null)
  const [drawChar, setDrawChar] = useState(null)
  const [dataReady, setDataReady] = useState(false)
  const [isGuest, setIsGuest] = useState(false)
  const [userId, setUserId] = useState(null)
  const [userName, setUserName] = useState('')
  const [userUsername, setUserUsername] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userRole, setUserRole] = useState('')
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
  const { examState, setExamState, startExitExam, startEntranceExam, handleExamAnswer, handleSectionStart, forceFinishSection } = useExam({ screen, setScreen, kanjiReadingMode, setLevelExams, setUnlockedLevels, buildExamQuestions })
  const [totalQuizzes, setTotalQuizzes] = useState(0)
  const [perfectScores, setPerfectScores] = useState(0)
  const [questions, setQuestions] = useState([])
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(0)
  const [lastScore, setLastScore] = useState(0)
  const [notice, setNotice] = useState('')
  const [lessonOverrides, setLessonOverrides] = useState({})
  const [verificationRetryAt, setVerificationRetryAt] = useState(() => Number(localStorage.getItem('nihongo-verification-retry-at') || 0))
  const [nowTick, setNowTick] = useState(() => Date.now())

  const t = copy[lang]
  const dir = lang === 'ar' ? 'rtl' : 'ltr'
  const lessonsByLevel = useMemo(() => ({ N5: lessons, N4: n4Lessons, N3: n3Lessons }), [])
  const masteredCount = Object.values(progress).filter((v) => v >= 8).length
  const completedLessons = Object.entries(lessonProgress)
    .filter(([key, value]) => key.startsWith(`${currentLevel}-`) && value >= sectionCount).length
  const lessonPercent = Math.round((completedLessons / TOTAL_LESSONS) * 100)
  const currentLevelLessons = applyLessonOverrides(currentLevel, levelSourceLessons(currentLevel), lessonOverrides)
  const lessonSlots = Array.from({ length: TOTAL_LESSONS }, (_, index) => currentLevelLessons[index] || null)
  // Per-lesson accuracy stats for path-node mastery indicators. Re-read each
  // render so mastery reflects the latest practice when returning to the map.
  const learningLessons = readProgressState().lessons
  const recommendedLesson = (() => {
    for (let index = 0; index < lessonSlots.length; index += 1) {
      const lesson = lessonSlots[index]
      if (!lesson) continue
      const lessonNumber = index + 1
      const amount = lessonProgress[`${currentLevel}-${lessonNumber}`] || 0
      if (amount < sectionCount) {
        return {
          lesson,
          amount,
          displayLessonNumber: getLessonDisplayNumber(currentLevel, index, lesson?.id ?? lessonNumber),
        }
      }
    }
    return null
  })()
  const characterSets = { hiragana, katakana, kanji: kanjiN5 }
  const letterGroups = chunk(characterSets[lettersTab] || hiragana, 5)
  const basicCharacterTotal = lettersTab === 'kanji' ? kanjiN5.length : 46
  const basicCharacterDone = (characterSets[lettersTab] || hiragana)
    .slice(0, basicCharacterTotal)
    .filter((item) => (progress[item.kana] || 0) >= 8).length
  const userHandle = isGuest
    ? '@guest'
    : `@${normalizeUsername(userUsername || userName || userEmail?.split('@')[0] || 'nihongo')}`
  const isAdmin = !isGuest && Boolean(userId) && (
    userRole === 'admin'
    || normalizeUsername(userUsername || '') === 'abdol'
    || normalizeUsername(userEmail?.split('@')[0] || '') === 'abdol'
  )
  const verificationWaitMs = Math.max(0, verificationRetryAt - nowTick)
  const verificationWaitSeconds = Math.ceil(verificationWaitMs / 1000)
  const verificationWaitLabel = `${Math.floor(verificationWaitSeconds / 60)}:${String(verificationWaitSeconds % 60).padStart(2, '0')}`

  useEffect(() => {
    const onAudioState = (event) => {
      if (event.detail?.status === 'error') {
        setNotice(lang === 'ar'
          ? 'تعذر تشغيل الصوت حاليا. جرّب الضغط مرة ثانية.'
          : 'Audio could not play right now. Tap again.')
      }
    }
    window.addEventListener(AUDIO_EVENT, onAudioState)
    return () => window.removeEventListener(AUDIO_EVENT, onAudioState)
  }, [lang])

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
    setUserRole(state.role || '')
    setEmailVerified(state.emailVerified ?? false)
    setUserBio(state.userBio ?? '')
    setUserPhone(state.userPhone || state.phone || '')
    setUserBirthday(state.userBirthday || state.birthDate || '')
    setUserAvatar(state.userAvatar || '')
    setSoundEnabled(state.soundEnabled ?? true)
    setFontScale(state.fontScale ?? 1)
    setCozyMode(state.cozyMode ?? true)
    setKanjiReadingMode(state.kanjiReadingMode ?? 'hiragana')
    // Keep the exercise-settings sheet's mode in sync with the loaded reading
    // mode (seed silently — don't echo back into kanjiReadingMode).
    setExerciseSettings({ pronunciationMode: readingModeToPronMode(state.kanjiReadingMode ?? 'hiragana') }, { silent: true })
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
    const activity = reconcileStreak(saved.lastActiveDate, saved.streak)
    applyState({ ...saved, ...activity })
    setUserId(null)
    setUserEmail('')
    setUserRole('')
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
        setUserRole('')
        setEmailVerified(false)
        lastSavedCloudJsonRef.current = ''
        lastSavedProgressJsonRef.current = ''
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
        // Hydrate the learning-progress store (SRS / mistakes / mastery) from
        // the account, merged with anything practised locally on this device.
        try {
          const cloudProgress = d.learningProgress ? JSON.parse(d.learningProgress) : null
          if (cloudProgress) {
            writeProgressState(mergeProgressState(readProgressState(), cloudProgress), { silent: true })
          }
        } catch (error) {
          console.error('Failed to hydrate learning progress', error)
        }
        const activity = reconcileStreak(d.lastActiveDate ?? null, d.streak ?? 0)
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

  // Exercise settings sheet → app. The sheet's pronunciation mode mirrors the
  // global kanjiReadingMode; "show pronunciation" toggles furigana visibility
  // (a root CSS class) app-wide. Apply once on mount, then on every change.
  useEffect(() => {
    applyPronunciationVisibility()
    const sync = () => {
      const s = getExerciseSettings()
      setKanjiReadingMode(pronModeToReadingMode(s.pronunciationMode))
      applyPronunciationVisibility(s)
    }
    window.addEventListener(EXERCISE_SETTINGS_EVENT, sync)
    return () => window.removeEventListener(EXERCISE_SETTINGS_EVENT, sync)
  }, [])

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'lessonOverrides'), (snapshot) => {
      const next = {}
      snapshot.docs.forEach((lessonDoc) => {
        const data = lessonDoc.data()
        if (data?.lesson) {
          next[lessonDoc.id] = data
        }
      })
      setLessonOverrides(next)
    }, (error) => {
      console.warn('Lesson overrides unavailable', error)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!dataReady || !isGuest) return
    localStorage.setItem(GUEST_KEY, JSON.stringify({
      xp, hearts, gems, streak, lastActiveDate, lastHeartRefillAt, progress, lessonProgress,
      unlockedLevels, levelExams,
      totalQuizzes, perfectScores, lastScore, userName, userUsername, userBio, userPhone, userBirthday,
      userAvatar, soundEnabled, fontScale, cozyMode, kanjiReadingMode, isPaid, theme, lang,
      startingGemsGranted,
    }))
  }, [isGuest, dataReady, xp, hearts, gems, streak, lastActiveDate, lastHeartRefillAt, progress, lessonProgress, unlockedLevels, levelExams, totalQuizzes, perfectScores, lastScore, userName, userUsername, userBio, userPhone, userBirthday, userAvatar, soundEnabled, fontScale, cozyMode, kanjiReadingMode, isPaid, theme, lang, startingGemsGranted])

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

  // Sync the learning-progress store (SRS / mistakes / mastery) to the account.
  // The store is written directly to localStorage by child components, which
  // dispatch PROGRESS_CHANGED_EVENT; we debounce-save the whole blob as a JSON
  // string (sidesteps Firestore map-key limits and deep-merge surprises).
  useEffect(() => {
    if (!userId || !dataReady || isGuest) return
    let timer = null
    const flush = () => {
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        const json = JSON.stringify(readProgressState())
        if (json === lastSavedProgressJsonRef.current) return
        setDoc(doc(db, 'users', userId), { learningProgress: json, updatedAt: new Date().toISOString() }, { merge: true })
          .then(() => { lastSavedProgressJsonRef.current = json })
          .catch((error) => console.error('Failed to sync learning progress', error))
      }, 800)
    }
    window.addEventListener(PROGRESS_CHANGED_EVENT, flush)
    flush() // initial push (e.g. carry a guest's local progress up after sign-in)
    return () => {
      window.removeEventListener(PROGRESS_CHANGED_EVENT, flush)
      if (timer) window.clearTimeout(timer)
    }
  }, [userId, dataReady, isGuest])

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

  // The single honest "the learner actually studied today" hook. Advances the
  // streak (only once/day, only on real study — never on app-open) and grants
  // XP for completed learning actions beyond the kana quiz.
  // True once the learner studies this session; gates achievement toasts so old
  // unlocks loaded at startup never fire a spurious moment.
  const studiedSessionRef = useRef(false)
  const registerStudyActivity = (xpGain = 0) => {
    // Mark that the learner has actually studied this session — the signal the
    // achievement-moment detector uses to switch from "absorb baseline" to
    // "toast genuine unlocks" (see the achievements effect).
    studiedSessionRef.current = true
    if (lastActiveDate !== todayKey()) {
      const activity = nextStreakValue(lastActiveDate, streak)
      setStreak(activity.streak)
      setLastActiveDate(activity.lastActiveDate)
    }
    if (xpGain > 0) setXp((value) => value + xpGain)
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
      registerStudyActivity() // completing a quiz counts as studying today
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

  const openLesson = (lesson, lessonNumberOverride = null) => {
    setQuestions([])
    setQIndex(0)
    setSelected(null)
    setScore(0)
    const internalLessonNumber = lessonNumberOverride ?? lesson.id
    setActiveLesson({ ...lesson, displayNumber: internalLessonNumber })
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

  // Derived gamification stats (Phase 8): review streak, mastered-lesson count
  // and overall accuracy — read from the additive learning-progress store.
  const { reviewStreak, masteredLessons, accuracyPct } = useMemo(() => {
    const state = readProgressState()
    const reviewStreak = getReviewStreak(state)
    const lessonsStats = Object.values(state.lessons || {})
    const totalAttempts = lessonsStats.reduce((sum, l) => sum + (l.attempts || 0), 0)
    const totalCorrect = lessonsStats.reduce((sum, l) => sum + (l.correct || 0), 0)
    const accuracyPct = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0
    let masteredLessons = 0
    for (let i = 0; i < currentLevelLessons.length; i += 1) {
      const lesson = currentLevelLessons[i]
      if (!lesson) continue
      const amount = lessonProgress[`${currentLevel}-${lesson.id}`] || 0
      if (amount >= sectionCount) {
        const m = getLessonMastery(state.lessons, lesson.id, amount, sectionCount)
        if (m.status === 'mastered') masteredLessons += 1
      }
    }
    return { reviewStreak, masteredLessons, accuracyPct }
  }, [currentLevelLessons, lessonProgress, currentLevel, nowTick])

  const achievements = useMemo(
    () => evaluateAchievements({
      xp, streak, reviewStreak, totalQuizzes, perfectScores,
      completedLessons, masteredLessons, masteredVocab: masteredCount, accuracyPct,
    }),
    [xp, streak, reviewStreak, totalQuizzes, perfectScores, completedLessons, masteredLessons, masteredCount, accuracyPct],
  )
  const unlockedAchievements = countUnlocked(achievements)

  // ── Achievement-unlock moment (Phase 5) ───────────────────────────────────
  // Surface a calm toast when an achievement is unlocked through study THIS
  // session. The challenge: stats hydrate across several renders (and a cross-
  // device login merges old progress), so a naive "unlocked && not seen" diff
  // would toast achievements the learner earned long ago. So until the first
  // real study action (studiedSessionRef, set in registerStudyActivity), every
  // currently-unlocked achievement is absorbed into the persisted "seen" set
  // silently — that baseline is immune to load-order races. Only after the
  // learner studies do genuine locked→unlocked transitions fire a moment.
  const [achievementToast, setAchievementToast] = useState(null)
  const [achievementQueue, setAchievementQueue] = useState([])
  useEffect(() => {
    if (!dataReady) return
    const state = readProgressState()
    const prevSeen = getSeenAchievements(state) || []
    const unlockedIds = achievements.filter((a) => a.unlocked).map((a) => a.id)
    if (!studiedSessionRef.current) {
      const merged = Array.from(new Set([...prevSeen, ...unlockedIds]))
      if (merged.length !== prevSeen.length) markAchievementsSeen(state, merged)
      return
    }
    const seen = new Set(prevSeen)
    const fresh = achievements.filter((a) => a.unlocked && !seen.has(a.id))
    if (fresh.length === 0) return
    // Queue every fresh unlock (deduped against what's already waiting) so
    // simultaneous unlocks each get their own moment instead of being dropped.
    setAchievementQueue((prev) => {
      const queued = new Set(prev.map((a) => a.id))
      const toAdd = fresh.filter((a) => !queued.has(a.id))
      return toAdd.length ? [...prev, ...toAdd] : prev
    })
  }, [achievements, dataReady])
  // Show the next queued unlock and mark only IT seen as it appears, so a reload
  // mid-queue never loses the unshown tail.
  useEffect(() => {
    if (achievementToast || achievementQueue.length === 0) return
    const [next, ...rest] = achievementQueue
    setAchievementToast(next)
    setAchievementQueue(rest)
    const state = readProgressState()
    const prevSeen = getSeenAchievements(state) || []
    markAchievementsSeen(state, [...prevSeen, next.id])
  }, [achievementToast, achievementQueue])
  // Auto-dismiss the calm moment after a few seconds (clearing it lets the queue advance).
  useEffect(() => {
    if (!achievementToast) return
    const timer = window.setTimeout(() => setAchievementToast(null), 4500)
    return () => window.clearTimeout(timer)
  }, [achievementToast])

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
        onLogin={() => goToAuth('login')}
      />
    )
  }

  if (screen === 'login') {
    return (
      <Login
        lang={lang}
        initialMode={authIntent}
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
    return <Suspense fallback={<ScreenFallback />}><ExamIntro examState={examState} lang={lang} onStart={() => setScreen('exam')} onBack={() => { setExamState(null); setScreen('main') }} /></Suspense>
  }

  if (screen === 'exam' && examState?.exam) {
    return <Suspense fallback={<ScreenFallback />}><Exam examState={examState} lang={lang} onAnswer={handleExamAnswer} onSectionStart={handleSectionStart} onTimeUp={forceFinishSection} onBack={() => { setExamState(null); setScreen('main') }} /></Suspense>
  }

  if (screen === 'exam-result' && examState) {
    return <Suspense fallback={<ScreenFallback />}><ExamResult examState={examState} lang={lang} nextLevelId={LEVEL_ORDER[LEVEL_ORDER.indexOf(examState.levelId) + 1] || null} onHome={() => { setExamState(null); setScreen('main') }} /></Suspense>
  }

  if (screen === 'review') {
    return (
      <HeartsContext.Provider value={heartsApi}>
        <Suspense fallback={<ScreenFallback />}>
          <SmartReview allLessons={ALL_LESSONS} allKanji={kanjiN5} lang={lang} kanjiReadingMode={kanjiReadingMode} reviewFilter={reviewFilter} onStudyComplete={() => registerStudyActivity(15)} onClose={() => { setReviewFilter(null); setScreen('main') }} />
        </Suspense>
      </HeartsContext.Provider>
    )
  }

  if (screen === 'sensei') {
    const completedLessonIds = Object.entries(lessonProgress)
      .filter(([key, value]) => key.startsWith(`${currentLevel}-`) && value >= sectionCount)
      .map(([key]) => key.split('-')[1])
    return (
      <Suspense fallback={<ScreenFallback />}>
        <AiSenseiPanel
          lang={lang}
          level={currentLevel}
          currentLessonId={activeLesson ? String(activeLesson.id) : undefined}
          currentLessonTitleAr={activeLesson?.title?.ar}
          completedLessonIds={completedLessonIds}
          onClose={() => setScreen('main')}
        />
      </Suspense>
    )
  }

  if (screen === 'lesson' && activeLesson) {
    return (
      <HeartsContext.Provider value={heartsApi}>
        <LessonView lesson={activeLesson} lang={lang} progress={progress} setProgress={setProgress} kanjiReadingMode={kanjiReadingMode} lessonDone={(lessonProgress[`${currentLevel}-${activeLesson.id}`] || 0) >= sectionCount} sectionsDone={Math.min(lessonProgress[`${currentLevel}-${activeLesson.id}`] || 0, sectionCount)} onStudyActivity={() => registerStudyActivity(15)} onBack={() => setScreen('main')} />
      </HeartsContext.Provider>
    )
  }

  if (screen === 'character-group' && activeCharGroup) {
    const title = `${activeCharGroup.label} ${activeCharGroup.index + 1}`
    const currentDrawItem = activeCharGroup.items.find((item) => item.kana === drawChar) || activeCharGroup.items[0]
    const currentDrawChar = currentDrawItem?.kana
    const renderChar = (item) => <CharacterSymbol item={item} readingMode={kanjiReadingMode} />
    const openCharacterTraining = () => {
      if (hearts <= 0) {
        setNotice(t.noHearts)
        return
      }
      setCharExerciseGroup(activeCharGroup)
      setScreen('character-exercises')
    }
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
            <Button variant="small" onClick={openCharacterTraining}>{t.groupQuiz}</Button>
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

            <Button onClick={openCharacterTraining}>{t.groupQuiz}</Button>
          </section>
        </main>
      </HeartsContext.Provider>
    )
  }

  if (screen === 'character-exercises' && charExerciseGroup) {
    const renderChar = (item) => <CharacterSymbol item={item} readingMode={kanjiReadingMode} />
    return (
      <HeartsContext.Provider value={heartsApi}>
        <CharacterExercises
          key={charExerciseGroup.label + charExerciseGroup.index}
          items={charExerciseGroup.items}
          lang={lang}
          renderChar={renderChar}
          onClose={() => setScreen('character-group')}
        />
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
        onAccountAction={() => goToAuth('login')}
        onUpdatePrefs={(prefs) => {
          if ('soundEnabled' in prefs) setSoundEnabled(prefs.soundEnabled)
          if ('fontScale' in prefs) setFontScale(prefs.fontScale)
          if ('cozyMode' in prefs) setCozyMode(prefs.cozyMode)
          if ('kanjiReadingMode' in prefs) { setKanjiReadingMode(prefs.kanjiReadingMode); setExerciseSettings({ pronunciationMode: readingModeToPronMode(prefs.kanjiReadingMode) }, { silent: true }) }
        }}
      />
    )
  }

  if (screen === 'admin') {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <AdminDashboard
          lang={lang}
          levels={levels}
          lessonsByLevel={lessonsByLevel}
          overrides={lessonOverrides}
          initialLevel={currentLevel}
          adminHandle={userHandle}
          onBack={() => setScreen('main')}
          onNotice={setNotice}
        />
      </Suspense>
    )
  }

  // Dedicated community screens (DMs / notifications) hide the app chrome.
  const inCommunityScreen = tab === 'community' && communityView !== 'feed'

  return (
    <>
      <main className="app-shell">
        {!inCommunityScreen && (
        <header className="topbar app-topbar">
          <LevelSelector
            levels={levels}
            currentLevel={currentLevel}
            unlockedLevels={unlockedLevels}
            levelOrder={LEVEL_ORDER}
            levelExams={levelExams}
            lang={lang}
            onSelectLevel={setCurrentLevel}
            onStartEntranceExam={startEntranceExam}
          />
          <div className="toolbar top-stats">
            <span className="stat-chip life">
              <i className="life-shell" style={{ '--life-fill': `${(hearts / MAX_HEARTS) * 100}%` }}>
                <b>{hearts}</b>
              </i>
            </span>
            <span className="stat-chip streak"><i className="icon-shell"><AppIcon name="streak" size={34} /></i>{streak}</span>
            {/* Gems moved off the topbar — shown only where they're spent (Profile). */}
          </div>
        </header>
        )}

        {notice && !inCommunityScreen && <button className="notice" onClick={() => setNotice('')}>{notice}</button>}

        {tab === 'home' && (
          <section className="content">
            {/* Large level card + level strip removed — level lives in the top-bar
                LevelSelector; level progress moved to Profile › View progress. */}
            <TodayWidget
              lang={lang}
              t={t}
              recommendedLesson={recommendedLesson}
              onContinue={() => recommendedLesson && setPreviewLesson(recommendedLesson)}
              onReview={() => { setReviewFilter(null); setScreen('review') }}
              onReviewWeak={(type) => { setReviewFilter(type); setScreen('review') }}
            />

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
            <div className="lesson-path map-path">
                {lessonSlots.map((lesson, index) => {
                const lessonNumber = index + 1
                const displayLessonNumber = getLessonDisplayNumber(currentLevel, index, lesson?.id ?? lessonNumber)
                const prevKey = `${currentLevel}-${lessonNumber - 1}`
                const key = `${currentLevel}-${lessonNumber}`
                const prevDone = lessonNumber === 1 || (lessonProgress[prevKey] || 0) >= sectionCount
                const amount = Math.min(lessonProgress[key] || 0, sectionCount)
                const locked = !prevDone || !lesson
                const completedSegments = locked ? 0 : Math.min(amount, sectionCount)
                const state = locked ? 'locked' : amount >= sectionCount ? 'done' : 'current'
                // Mastery only meaningful once a lesson is fully completed.
                const mastery = state === 'done' && lesson
                  ? getLessonMastery(learningLessons, lesson.id, amount, sectionCount)
                  : null
                return (
                  <LessonNode
                    key={lessonNumber}
                    lessonNumber={lessonNumber}
                    index={index}
                    state={state}
                    completed={completedSegments}
                    total={sectionCount}
                    masteryLevel={mastery?.masteryLevel ?? null}
                    masteryStatus={mastery?.status ?? null}
                    style={{
                    '--path-row': lessonNumber,
                    '--path-x': `${LESSON_PATH_X[index % LESSON_PATH_X.length]}%`,
                    '--path-x-mobile': `${LESSON_PATH_X_MOBILE[index % LESSON_PATH_X_MOBILE.length]}%`,
                  }}
                    lessonNumber={displayLessonNumber}
                    label={`${t.lesson} ${displayLessonNumber}`}
                    onClick={() => !locked && setPreviewLesson({ lesson, amount, displayLessonNumber })}
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
                  const displayLessonNumber = previewLesson.displayLessonNumber ?? getLessonDisplayNumber(currentLevel, 0, lesson?.id)
                  setPreviewLesson(null)
                  openLesson(lesson, displayLessonNumber)
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
            communityView={communityView}
            setCommunityView={setCommunityView}
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
              <button type="button" className="avatar avatar-edit" onClick={() => setScreen('edit-profile')} aria-label={t.editProfile || (isAr ? 'تعديل الملف' : 'Edit profile')}>{userAvatar ? <img src={userAvatar} alt="" /> : (userName || t.guestName).slice(0, 1).toUpperCase()}</button>
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
                  <Button onClick={() => goToAuth('login')}>{t.login}</Button>
                  <Button variant="secondary" onClick={() => goToAuth('register')}>{t.create}</Button>
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

            {/* P3 stats — moved off the home dashboard, on-demand here. */}
            <h2 className="section-title">{t.viewProgress}</h2>
            {/* Level + completion ring — moved here from the home dashboard. */}
            <div className="profile-level-card">
              <div className="dashboard-progress-ring ring" style={{ '--value': `${lessonPercent}%` }}>
                <span>{lessonPercent}%</span>
              </div>
              <div className="profile-level-copy">
                <h3>{t.level} {currentLevel}</h3>
                <p>{levels.find((level) => level.id === currentLevel)?.[lang]}</p>
              </div>
            </div>
            <div className="dashboard-stats profile-stats">
              <Stat label={t.xp} value={xp} />
              <Stat label={t.mastered} value={masteredCount} />
              <Stat label={t.quiz} value={totalQuizzes} />
              <Stat label={t.reviewStreak} value={reviewStreak} />
            </div>

            <RetentionPanel lang={lang} t={t} />

            <h2 className="section-title">{t.settings}</h2>
            {isAdmin && (
              <button className="settings-entry admin-entry" onClick={() => setScreen('admin')}>
                <IconCircle name="files" size={44} />
                <strong>{lang === 'ar' ? 'لوحة الأدمن' : 'Admin Dashboard'}</strong>
                <small>›</small>
              </button>
            )}
            <button className="settings-entry" onClick={() => { setTab('community'); setCommunityView('saved') }}>
              <IconCircle name="star" size={44} />
              <strong>{lang === 'ar' ? 'المنشورات المحفوظة' : 'Saved posts'}</strong>
              <small>›</small>
            </button>
            <button className="settings-entry" onClick={() => { setTab('community'); setCommunityView('notif-settings') }}>
              <IconCircle name="notifications" size={44} />
              <strong>{lang === 'ar' ? 'إعدادات الإشعارات' : 'Notification settings'}</strong>
              <small>›</small>
            </button>
            <button className="settings-entry" onClick={() => setScreen('settings')}>
              <IconCircle name="settings" size={44} />
              <strong>{t.settings}</strong>
              <small>›</small>
            </button>

            <h2 className="section-title">
              {t.achievements}
              <span className="achievement-count">{unlockedAchievements}/{achievements.length}</span>
            </h2>
            <div className="achievement-grid">
              {achievements.map((item) => (
                <div key={item.id} className={`achievement-badge ${item.unlocked ? 'active' : ''}`} title={item.descAr}>
                  <span className="achievement-icon"><AppIcon name={item.unlocked ? item.icon : 'locked'} size={28} /></span>
                  <small>{lang === 'ar' ? item.titleAr : item.titleEn}</small>
                  {!item.unlocked && item.progress > 0 && (
                    <span className="achievement-progress"><i style={{ width: `${item.progress * 100}%` }} /></span>
                  )}
                </div>
              ))}
            </div>

            {!isGuest && <Button variant="danger" onClick={logout}>{t.signOut}</Button>}
          </section>
        )}
      </main>

      {/* Abdoul Sensei FAB — app-shell level so it's available on every main tab
          (hidden during lessons/exercises/focus and dedicated community screens). */}
      {!inCommunityScreen && (
      <button className="sensei-fab" onClick={() => setScreen('sensei')} aria-label={t.aiSensei} title={t.aiSensei}>
        <span className="sensei-fab-kanji">先生</span>
      </button>
      )}

      {achievementToast && (
        <button className="achievement-toast" onClick={() => setAchievementToast(null)} aria-live="polite">
          <span className="achievement-toast-icon"><AppIcon name={achievementToast.icon} size={26} /></span>
          <span className="achievement-toast-text">
            <small>{t.achievementUnlocked}</small>
            <strong>{lang === 'ar' ? achievementToast.titleAr : achievementToast.titleEn}</strong>
          </span>
        </button>
      )}

      {!inCommunityScreen && (
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
      )}
    </>
  )
}
