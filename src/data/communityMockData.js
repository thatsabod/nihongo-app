// Community feed — tab catalogue, tab-filter predicate, and mock data for the
// post types that have no backend yet (voice rooms, challenges, corrections,
// teacher notes, a few sample shares). Real "help" posts come from Firestore
// (communityQuestions) and are merged in by CommunityHub. Types: ../types/community.ts

export const COMMUNITY_TABS = [
  { id: 'recent', labelAr: 'آخر الأحداث', labelEn: 'Recent' },
  { id: 'forYou', labelAr: 'لك', labelEn: 'For You' },
  { id: 'help', labelAr: 'مساعدة', labelEn: 'Help' },
  { id: 'voice', labelAr: 'غرف صوتية', labelEn: 'Voice rooms' },
  { id: 'exchange', labelAr: 'تبادل لغوي', labelEn: 'Language exchange' },
  { id: 'nearby', labelAr: 'بالقرب مني', labelEn: 'Nearby' },
  { id: 'challenges', labelAr: 'تحديات', labelEn: 'Challenges' },
  { id: 'grammar', labelAr: 'أسئلة القواعد', labelEn: 'Grammar' },
  { id: 'vocab', labelAr: 'مفردات اليوم', labelEn: "Today's vocab" },
]

const has = (post, tag) => post.tags?.includes(tag)

// Pure predicate: does a post belong under the given tab? `recent`/`forYou`
// show everything; the rest filter by post type / tags.
export function postMatchesTab(post, tabId) {
  switch (tabId) {
    case 'recent':
    case 'forYou':
      return true
    case 'help':
      return post.type === 'help' || post.type === 'correction'
    case 'voice':
      return post.type === 'voiceRoom'
    case 'challenges':
      return post.type === 'challenge'
    case 'exchange':
      return has(post, '#تبادل_لغوي') || has(post, '#محادثة')
    case 'grammar':
      return has(post, '#قواعد') || has(post, '#JLPT')
    case 'vocab':
      return has(post, '#مفردات') || (post.type === 'challenge' && post.challenge?.kind === 'translate')
    case 'nearby':
      return Boolean(post.nearby)
    default:
      return true
  }
}

const learner = (id, name, handle, level, avatarUrl) => ({
  id, name, handle, level, nativeLang: 'AR', learningLang: 'JP', avatarUrl,
})

// Mock posts for the non-backed types. Kept deliberately small to avoid a noisy
// feed — they complement the real Firestore questions rather than flood them.
export const MOCK_COMMUNITY_POSTS = [
  {
    id: 'mock-voice-1',
    type: 'voiceRoom',
    user: learner('u-voice-1', 'سارة', '@sara', 'N4'),
    tags: ['#محادثة', '#JLPT'],
    likesCount: 12, commentsCount: 0, saved: false, liked: false,
    timeAr: 'الآن', timeEn: 'now',
    commentsPreview: [],
    source: 'mock',
    voiceRoom: { id: 'vr-1', title: 'محادثة N5 — تعارف بسيط', hostHandle: '@sara', participants: 4, capacity: 8, level: 'N5', live: true },
  },
  {
    id: 'mock-voice-2',
    type: 'voiceRoom',
    user: learner('u-voice-2', 'كينجي', '@kenji', 'N3'),
    tags: ['#محادثة'],
    likesCount: 5, commentsCount: 0, saved: false, liked: false,
    timeAr: 'قبل ٣ د', timeEn: '3m',
    commentsPreview: [],
    source: 'mock',
    voiceRoom: { id: 'vr-2', title: 'نطق الكانا للمبتدئين', hostHandle: '@kenji', participants: 2, capacity: 6, level: 'N5', live: true },
  },
  {
    id: 'mock-challenge-1',
    type: 'challenge',
    user: { id: 'nihongo', name: 'にほんごGO', handle: '@nihongo', isTeacher: true },
    tags: ['#تحدي', '#قواعد'],
    likesCount: 31, commentsCount: 0, saved: false, liked: false,
    timeAr: 'اليوم', timeEn: 'today',
    commentsPreview: [],
    source: 'mock',
    challenge: {
      id: 'ch-1', kind: 'particle',
      promptAr: 'اختر الأداة الصحيحة:', promptJa: 'わたし＿＿がくせいです。',
      options: ['は', 'を', 'に', 'で'], answer: 'は',
    },
  },
  {
    id: 'mock-challenge-2',
    type: 'challenge',
    user: { id: 'nihongo', name: 'にほんごGO', handle: '@nihongo', isTeacher: true },
    tags: ['#مفردات', '#تحدي'],
    likesCount: 18, commentsCount: 0, saved: false, liked: false,
    timeAr: 'اليوم', timeEn: 'today',
    commentsPreview: [],
    source: 'mock',
    challenge: {
      id: 'ch-2', kind: 'translate',
      promptAr: 'ما معنى هذه الكلمة؟', promptJa: 'figureload — 図書館',
      options: ['مكتبة', 'مستشفى', 'مدرسة', 'محطة'], answer: 'مكتبة',
    },
  },
  {
    id: 'mock-correction-1',
    type: 'correction',
    user: learner('u-corr-1', 'يوسف', '@yousef', 'N5'),
    contentAr: 'كتبت جملة، صححوها لو سمحتم 🙏',
    contentJa: 'わたしは まいにち にほんごを べんきょうします。',
    romaji: 'Watashi wa mainichi nihongo o benkyō shimasu.',
    tags: ['#تصحيح', '#N5'],
    likesCount: 9, commentsCount: 2, saved: false, liked: false,
    timeAr: 'قبل ١٠ د', timeEn: '10m',
    commentsPreview: [
      { id: 'c1', authorHandle: '@mina', body: 'ممتازة! تقدر تقول まいにち في البداية أيضاً.' },
      { id: 'c2', authorHandle: '@kenji', body: '👏 جملة صحيحة 100%.' },
    ],
    source: 'mock',
  },
  {
    id: 'mock-teacher-1',
    type: 'teacher',
    user: { id: 'nihongo', name: 'عبدول سينسيه', handle: '@sensei', isTeacher: true },
    contentAr: 'نصيحة اليوم: راجع ١٠ مفردات قبل النوم — التكرار المتباعد يثبّت الحفظ أكثر من الدراسة الطويلة دفعة واحدة.',
    tags: ['#نصيحة', '#JLPT'],
    likesCount: 64, commentsCount: 3, saved: false, liked: false,
    timeAr: 'قبل ساعة', timeEn: '1h',
    commentsPreview: [
      { id: 't1', authorHandle: '@sara', body: 'شكراً سينسيه! 🙏' },
    ],
    source: 'mock',
  },
  {
    id: 'mock-exchange-1',
    type: 'normal',
    user: learner('u-ex-1', 'Mina', '@mina', 'N4'),
    contentAr: 'أبحث عن شريك لتبادل اللغة 🇸🇦⇄🇯🇵 — أتكلم عربي وأتعلم ياباني. مين معي؟',
    tags: ['#تبادل_لغوي', '#محادثة'],
    likesCount: 22, commentsCount: 4, saved: false, liked: false,
    timeAr: 'قبل ٢٠ د', timeEn: '20m',
    nearby: true,
    commentsPreview: [
      { id: 'e1', authorHandle: '@yousef', body: 'أنا مهتم! 一緒に がんばりましょう。' },
    ],
    source: 'mock',
  },
]
