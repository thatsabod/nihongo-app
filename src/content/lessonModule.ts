// Phase 5 — scalable lesson/module data model.
//
// The strict type contracts (LessonModule, LessonSection, …) live in
// src/types/learning.ts. This file is the BUILDER: it projects the existing
// runtime lesson objects (src/content/lessons/*.js — title/focus/vocab/
// grammar/exercises) into the normalized, typed LessonModule shape WITHOUT
// migrating or mutating any raw content. That keeps the redesign additive and
// fully reversible (Phase 9 rules) while giving every lesson — current and
// future — one consistent, scalable structure to read from.
//
// TODO(Phase 6): once VocabularyItem/GrammarPoint/Kanji/Exercise/Review
// content is normalized into id-keyed stores, the *Ids arrays below should
// reference those canonical ids instead of being derived on the fly here.

import type {
  JLPTLevel,
  LessonModule,
  LessonSection,
  LessonSectionType,
  LessonStatus,
} from '../types/learning'

// ── Loose shape of the existing runtime lesson objects ──────────────────────
// Intentionally permissive: raw lessons are plain JS and vary field-by-field.
interface RawVocab {
  id?: string
  type?: string
  jp?: string
  kanji?: string
  hiragana?: string
  reading?: string
  meaning?: string
}
interface RawGrammarExample {
  jp?: string
  romaji?: string
  ar?: string
}
interface RawGrammar {
  title?: string
  particle?: string
  pattern?: string
  explanation?: string
  example?: RawGrammarExample
}
interface RawExercise {
  type?: string
  prompt?: string
  answer?: string
  hint?: string
}
export interface RawLesson {
  id: number | string
  title?: { ar?: string; en?: string; ja?: string }
  titleJa?: string
  focus?: string
  vocab?: RawVocab[]
  grammar?: RawGrammar[]
  exercises?: RawExercise[]
  examples?: { jp?: string; romaji?: string; ar?: string }[]
}

// ── Section metadata (single source of truth for the lesson path) ───────────
interface SectionMeta {
  ar: string
  en: string
  icon: string
  minutes: number
  tab: string
}

const SECTION_META: Record<LessonSectionType, SectionMeta> = {
  warmup: { ar: 'تهيئة', en: 'Warm-up', icon: 'streak', minutes: 2, tab: 'overview' },
  vocabulary: { ar: 'المفردات', en: 'Vocabulary', icon: 'vocabulary', minutes: 5, tab: 'vocabulary' },
  grammar: { ar: 'القواعد', en: 'Grammar', icon: 'grammar', minutes: 5, tab: 'grammar' },
  examples: { ar: 'أمثلة', en: 'Examples', icon: 'hint', minutes: 3, tab: 'review' },
  dialogue: { ar: 'حوار', en: 'Dialogue', icon: 'quiz', minutes: 4, tab: 'review' },
  reading: { ar: 'قراءة', en: 'Reading', icon: 'grammar', minutes: 4, tab: 'review' },
  listening: { ar: 'استماع', en: 'Listening', icon: 'quiz', minutes: 3, tab: 'review' },
  speaking: { ar: 'محادثة', en: 'Speaking', icon: 'quiz', minutes: 3, tab: 'exercises' },
  practice: { ar: 'تدريب', en: 'Practice', icon: 'quiz', minutes: 5, tab: 'exercises' },
  review: { ar: 'مراجعة الأخطاء', en: 'Mistake Review', icon: 'next', minutes: 3, tab: 'review' },
  masteryCheck: { ar: 'اختبار الإتقان', en: 'Mastery Check', icon: 'star', minutes: 4, tab: 'exercises' },
}

// Order the sections appear in the guided lesson path.
const SECTION_ORDER: LessonSectionType[] = [
  'warmup', 'vocabulary', 'grammar', 'examples', 'practice', 'review', 'masteryCheck',
]

// A LessonSection plus UI-only display fields (icon/tab/titleEn). The strict
// LessonModule.sections uses the canonical LessonSection; views are for render.
export interface LessonSectionView extends LessonSection {
  titleEn: string
  icon: string
  tab: string
}

type VisitedMap = Record<string, number>

// Which section types this lesson actually has content for.
function sectionPresence(lesson: RawLesson): Record<LessonSectionType, boolean> {
  const hasGrammar = Array.isArray(lesson.grammar) && lesson.grammar.length > 0
  return {
    warmup: true, // always — a quick intro framed from the lesson focus
    vocabulary: (lesson.vocab?.length || 0) > 0,
    grammar: hasGrammar,
    examples: (lesson.examples?.length || 0) > 0 || hasGrammar,
    dialogue: false, // TODO(Phase 6): populate when dialogue content exists
    reading: false, // TODO(Phase 6): populate when reading passages exist
    listening: false, // TODO(Phase 6)
    speaking: false, // folded into practice for now
    practice: (lesson.exercises?.length || 0) > 0,
    review: true, // mistake review is always available
    masteryCheck: true,
  }
}

// Build the ordered, display-ready section list (microlearning chunks).
export function deriveLessonSections(
  lesson: RawLesson,
  visited: VisitedMap = {},
  lessonFullyDone = false,
): LessonSectionView[] {
  const present = sectionPresence(lesson)
  let position = 0
  return SECTION_ORDER.filter((type) => present[type]).map((type) => {
    const meta = SECTION_META[type]
    const completed = type === 'masteryCheck' ? lessonFullyDone : Boolean(visited[type])
    position += 1
    return {
      id: `${lesson.id}-${type}`,
      type,
      order: position,
      titleAr: meta.ar,
      titleEn: meta.en,
      icon: meta.icon,
      estimatedMinutes: meta.minutes,
      tab: meta.tab,
      completed,
    }
  })
}

// Strip UI-only fields to get canonical LessonSection[] for the data model.
export function toLessonSections(views: LessonSectionView[]): LessonSection[] {
  return views.map(({ id, type, titleAr, completed, order, estimatedMinutes }) => ({
    id, type, titleAr, completed, order, estimatedMinutes,
  }))
}

export function totalLessonMinutes(sections: { estimatedMinutes: number }[]): number {
  return sections.reduce((sum, s) => sum + s.estimatedMinutes, 0)
}

// Unique kanji glyphs appearing in this lesson's vocabulary surfaces.
function deriveKanjiIds(lesson: RawLesson): string[] {
  const set = new Set<string>()
  for (const item of lesson.vocab || []) {
    const surface = item.kanji || item.jp || ''
    for (const ch of surface) {
      if (/[㐀-鿿]/.test(ch)) set.add(ch)
    }
  }
  return [...set]
}

function deriveStatus(lessonFullyDone: boolean, visited: VisitedMap, fallback?: LessonStatus): LessonStatus {
  if (fallback) return fallback
  if (lessonFullyDone) return 'completed'
  if (visited && Object.keys(visited).length > 0) return 'inProgress'
  return 'available'
}

export interface BuildLessonModuleContext {
  level: JLPTLevel
  order: number
  status?: LessonStatus
  visited?: VisitedMap
  lessonFullyDone?: boolean
}

// Project a raw runtime lesson into the normalized, typed LessonModule.
export function buildLessonModule(lesson: RawLesson, ctx: BuildLessonModuleContext): LessonModule {
  const visited = ctx.visited || {}
  const fullyDone = Boolean(ctx.lessonFullyDone)
  const sectionViews = deriveLessonSections(lesson, visited, fullyDone)
  const sections = toLessonSections(sectionViews)

  return {
    id: String(lesson.id),
    level: ctx.level,
    titleAr: lesson.title?.ar || '',
    titleJa: lesson.title?.ja || lesson.titleJa,
    descriptionAr: lesson.focus || '',
    estimatedMinutes: totalLessonMinutes(sections),
    order: ctx.order,
    status: deriveStatus(fullyDone, visited, ctx.status),
    sections,
    vocabularyIds: (lesson.vocab || []).map((v) => v.id || v.jp || '').filter(Boolean),
    grammarIds: (lesson.grammar || []).map((g) => g.title || '').filter(Boolean),
    kanjiIds: deriveKanjiIds(lesson),
    exerciseIds: (lesson.exercises || []).map((_, i) => `${lesson.id}-ex-${i}`),
    reviewIds: [], // TODO(Phase 6): reference normalized review-item ids
  }
}

// Project an entire level's lessons into typed modules in one pass. `visitedBy`
// / `doneBy` are optional per-lesson lookups (keyed by String(lesson.id)) so
// status and section completion reflect real progress when available.
export function buildLessonModules(
  lessons: RawLesson[],
  level: JLPTLevel,
  visitedBy: Record<string, VisitedMap> = {},
  doneBy: Record<string, boolean> = {},
): LessonModule[] {
  return lessons.map((lesson, index) =>
    buildLessonModule(lesson, {
      level,
      order: index + 1,
      visited: visitedBy[String(lesson.id)] || {},
      lessonFullyDone: Boolean(doneBy[String(lesson.id)]),
    }),
  )
}
