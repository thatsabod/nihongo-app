// Phase 6 — normalized content stores.
//
// Projects the existing runtime lesson/kanji data into id-keyed, typed records
// (the contracts in src/types/learning.ts). This is the normalized layer the
// Phase 5 LessonModule.*Ids arrays resolve against, and the data source future
// Smart Review / AI Sensei features should read from. Purely additive and
// reversible: nothing here mutates or replaces the raw content files.
//
// TODO(Phase 7): AI Sensei reads these stores (known vocab/grammar/kanji +
// weak items) to build grounded prompts — no random content.

import type {
  Dialogue,
  Exercise,
  ExerciseType,
  GrammarPoint,
  JLPTLevel,
  Kanji,
  ReadingPassage,
  Sentence,
  VocabularyItem,
} from '../types/learning'
import type { RawLesson } from './lessonModule.ts'

// ── Raw kanji shape (data.js makeQuestions output) ──────────────────────────
interface RawKanji {
  kana: string // the glyph
  answer: string // primary romaji reading
  options?: string[]
}

type Store<T> = Record<string, T>

// Map the loose lesson exercise.type strings onto the normalized ExerciseType.
function mapExerciseType(raw?: string): ExerciseType {
  switch (raw) {
    case 'choose': return 'translationJaToAr'
    case 'complete': return 'particleChoice'
    case 'order': return 'sentenceOrder'
    case 'answer': return 'mcq'
    default: return 'mcq'
  }
}

// ── Vocabulary ──────────────────────────────────────────────────────────────
export function buildVocabularyStore(lessons: RawLesson[], level: JLPTLevel): Store<VocabularyItem> {
  const store: Store<VocabularyItem> = {}
  for (const lesson of lessons) {
    for (const v of lesson.vocab || []) {
      const id = v.id || v.jp
      if (!id || store[id]) continue
      store[id] = {
        id,
        japanese: v.kanji || v.jp || '',
        kana: v.hiragana || v.jp || '',
        romaji: v.reading || '',
        meaningAr: v.meaning || '',
        level,
        lessonId: String(lesson.id),
        tags: v.type ? [v.type] : [],
      }
    }
  }
  return store
}

// ── Grammar ─────────────────────────────────────────────────────────────────
export function buildGrammarStore(lessons: RawLesson[], level: JLPTLevel): Store<GrammarPoint> {
  const store: Store<GrammarPoint> = {}
  for (const lesson of lessons) {
    for (const g of lesson.grammar || []) {
      const id = g.title
      if (!id || store[id]) continue
      const example = g.example
      store[id] = {
        id,
        pattern: g.pattern || g.particle || '',
        titleAr: g.title || '',
        explanationAr: g.explanation || '',
        usageAr: g.particle ? `الأداة: ${g.particle}` : '',
        level,
        examples: example?.jp
          ? [{ japanese: example.jp, romaji: example.romaji, arabic: example.ar || '' }]
          : [],
        commonMistakesAr: [], // TODO(Phase 6+): author per-grammar common mistakes
        arabLearnerNotesAr: [], // TODO(Phase 6+): Arab-learner-specific notes
      }
    }
  }
  return store
}

// ── Kanji ───────────────────────────────────────────────────────────────────
export function buildKanjiStore(kanji: RawKanji[], level: JLPTLevel): Store<Kanji> {
  const store: Store<Kanji> = {}
  for (const k of kanji) {
    if (!k.kana || store[k.kana]) continue
    store[k.kana] = {
      id: k.kana,
      character: k.kana,
      meaningAr: '', // TODO(Phase 6): kanji glosses not in current dataset
      onyomi: [],
      kunyomi: [],
      readingRomaji: k.answer || '',
      level,
      tags: [],
    }
  }
  return store
}

// ── Sentences (from lesson examples) ────────────────────────────────────────
export function buildSentenceStore(lessons: RawLesson[], level: JLPTLevel): Store<Sentence> {
  const store: Store<Sentence> = {}
  for (const lesson of lessons) {
    ;(lesson.examples || []).forEach((ex, i) => {
      if (!ex.jp) return
      const id = `${lesson.id}-sent-${i}`
      store[id] = {
        id,
        japanese: ex.jp,
        romaji: ex.romaji,
        arabic: ex.ar || '',
        level,
        lessonId: String(lesson.id),
      }
    })
  }
  return store
}

// ── Exercises ───────────────────────────────────────────────────────────────
export function buildExerciseStore(lessons: RawLesson[], level: JLPTLevel): Store<Exercise> {
  const store: Store<Exercise> = {}
  for (const lesson of lessons) {
    ;(lesson.exercises || []).forEach((ex, i) => {
      const id = `${lesson.id}-ex-${i}`
      store[id] = {
        id,
        type: mapExerciseType(ex.type),
        level,
        questionAr: ex.prompt || '',
        correctAnswer: ex.answer || '',
        explanationAr: ex.hint || '',
      }
    })
  }
  return store
}

// ── Dialogues ────────────────────────────────────────────────────────────────
export function buildDialogueStore(lessons: RawLesson[], level: JLPTLevel): Store<Dialogue> {
  const store: Store<Dialogue> = {}
  for (const lesson of lessons) {
    const d = lesson.dialogue
    if (!d?.lines?.length) continue
    const id = `${lesson.id}-dialogue`
    store[id] = {
      id,
      titleAr: d.titleAr || '',
      level,
      lessonId: String(lesson.id),
      lines: d.lines.map((line) => ({
        speaker: line.speaker || '',
        japanese: line.jp || '',
        romaji: line.romaji,
        arabic: line.ar || '',
      })),
    }
  }
  return store
}

// ── Reading passages ─────────────────────────────────────────────────────────
export function buildReadingStore(lessons: RawLesson[], level: JLPTLevel): Store<ReadingPassage> {
  const store: Store<ReadingPassage> = {}
  for (const lesson of lessons) {
    const r = lesson.reading
    if (!r?.sentences?.length) continue
    const id = `${lesson.id}-reading`
    store[id] = {
      id,
      titleAr: r.titleAr || '',
      japanese: r.sentences.map((s) => s.jp || '').join(''),
      arabic: r.sentences.map((s) => s.ar || '').join(' '),
      level,
      lessonId: String(lesson.id),
    }
  }
  return store
}

// ── Combined store ──────────────────────────────────────────────────────────
export interface ContentStores {
  vocabulary: Store<VocabularyItem>
  grammar: Store<GrammarPoint>
  kanji: Store<Kanji>
  sentences: Store<Sentence>
  exercises: Store<Exercise>
  dialogues: Store<Dialogue>
  reading: Store<ReadingPassage>
}

// Build every normalized store for a level in one call. Kanji is shared across
// levels today, so callers pass the relevant kanji list explicitly.
export function buildContentStores(
  lessons: RawLesson[],
  kanji: RawKanji[],
  level: JLPTLevel,
): ContentStores {
  return {
    vocabulary: buildVocabularyStore(lessons, level),
    grammar: buildGrammarStore(lessons, level),
    kanji: buildKanjiStore(kanji, level),
    sentences: buildSentenceStore(lessons, level),
    exercises: buildExerciseStore(lessons, level),
    dialogues: buildDialogueStore(lessons, level),
    reading: buildReadingStore(lessons, level),
  }
}
