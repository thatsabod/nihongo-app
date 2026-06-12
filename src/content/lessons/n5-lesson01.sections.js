// Sample LessonModule (see src/types/learning.ts) describing N5 Lesson 1
// as a guided path of sections. This is a proof-of-shape for the new
// content model — it does NOT replace `lessonOne` in lessons.n5.js and
// is not yet wired into LessonView/the lesson map.
//
// `vocabularyIds`/`grammarIds`/`exerciseIds` reference the `id` fields
// already present on lessonOne's vocab/grammar/exercise entries.

/** @type {import('../../types/learning').LessonModule} */
export const n5Lesson01Sections = {
  id: 'n5-1',
  level: 'N5',
  titleAr: 'تحية وتعارف',
  titleJa: '挨拶と自己紹介',
  descriptionAr: 'بناء جمل اسمية بسيطة للتعريف عن النفس والآخرين باستخدام は و です.',
  estimatedMinutes: 18,
  order: 1,
  sections: [
    { id: 'n5-1-warmup', type: 'warmup', titleAr: 'تمهيد', completed: false, order: 1, estimatedMinutes: 2 },
    { id: 'n5-1-vocabulary', type: 'vocabulary', titleAr: 'المفردات', completed: false, order: 2, estimatedMinutes: 5 },
    { id: 'n5-1-grammar', type: 'grammar', titleAr: 'القواعد', completed: false, order: 3, estimatedMinutes: 6 },
    { id: 'n5-1-examples', type: 'examples', titleAr: 'أمثلة وجمل', completed: false, order: 4, estimatedMinutes: 3 },
    { id: 'n5-1-practice', type: 'practice', titleAr: 'تمارين', completed: false, order: 5, estimatedMinutes: 4 },
  ],
  vocabularyIds: [
    'watashi', 'watashitachi', 'anata', 'ano-hito', 'ano-kata', 'minasan',
    'san', 'chan', 'kun', 'jin', 'sensei', 'kyoushi', 'gakusei', 'kaishain',
    'shain', 'ginkouin', 'isha', 'kenkyuusha', 'engineer', 'daigaku',
    'byouin', 'denki', 'dare', 'donata', 'nansai', 'sai', 'ik-kusai', 'hai', 'iie', 'imc',
  ],
  // lessonOne.grammar entries don't have stable ids yet (only `title`/`pattern`
  // strings) — these are placeholder slugs for the eventual normalization pass.
  grammarIds: [
    'wa-desu', 'ja-arimasen', 'ka-question', 'mo-also', 'no-possession', 'san-suffix',
  ],
  kanjiIds: [],
  // Same as grammarIds: lessonOne.exercises are positional (no `id` field yet),
  // so these are placeholder slugs (lesson1 has 7 exercises today).
  exerciseIds: ['n5-1-ex-1', 'n5-1-ex-2', 'n5-1-ex-3', 'n5-1-ex-4', 'n5-1-ex-5', 'n5-1-ex-6', 'n5-1-ex-7'],
  reviewIds: [],
}
