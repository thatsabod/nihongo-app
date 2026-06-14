// Shared type contracts for the learning-experience redesign.
// These describe the *target* shapes for lesson/content/progress data.
// Existing lesson files (src/content/lessons/*.js) are NOT migrated to
// this shape yet — they continue to work as-is. New code (sample lesson
// modules, progress models, future Smart Review/AI Sensei features)
// should read/write data using these types.

export type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1'

export type LessonSectionType =
  | 'warmup'
  | 'vocabulary'
  | 'grammar'
  | 'examples'
  | 'dialogue'
  | 'reading'
  | 'listening'
  | 'speaking'
  | 'practice'
  | 'review'
  | 'masteryCheck'

export interface LessonSection {
  id: string
  type: LessonSectionType
  titleAr: string
  completed: boolean
  order: number
  estimatedMinutes: number
}

export type LessonStatus = 'locked' | 'available' | 'inProgress' | 'completed'

export interface LessonModule {
  id: string
  level: JLPTLevel
  titleAr: string
  titleJa?: string
  descriptionAr: string
  estimatedMinutes: number
  order: number
  status?: LessonStatus
  sections: LessonSection[]
  vocabularyIds: string[]
  grammarIds: string[]
  kanjiIds: string[]
  exerciseIds: string[]
  reviewIds: string[]
}

export interface VocabularyItem {
  id: string
  japanese: string
  kana: string
  romaji: string
  meaningAr: string
  level: JLPTLevel
  lessonId?: string
  tags: string[]
  exampleSentenceJa?: string
  exampleSentenceAr?: string
  audioSrc?: string
}

export interface GrammarExample {
  japanese: string
  romaji?: string
  arabic: string
}

export interface GrammarPoint {
  id: string
  pattern: string
  titleAr: string
  explanationAr: string
  usageAr: string
  level: JLPTLevel
  examples: GrammarExample[]
  commonMistakesAr: string[]
  arabLearnerNotesAr: string[]
  relatedGrammarIds?: string[]
}

export type ExerciseType =
  | 'mcq'
  | 'fillBlank'
  | 'sentenceOrder'
  | 'translationArToJa'
  | 'translationJaToAr'
  | 'particleChoice'
  | 'kanjiRecognition'
  | 'listening'
  | 'speaking'

export interface Exercise {
  id: string
  type: ExerciseType
  level: JLPTLevel
  questionAr: string
  promptJa?: string
  options?: string[]
  correctAnswer: string | string[]
  explanationAr: string
  relatedVocabularyIds?: string[]
  relatedGrammarIds?: string[]
  relatedKanjiIds?: string[]
}

export interface Kanji {
  id: string
  character: string
  meaningAr: string
  onyomi: string[]
  kunyomi: string[]
  readingRomaji: string
  level: JLPTLevel
  strokeCount?: number
  exampleWordsJa?: string[]
  lessonId?: string
  tags: string[]
}

export interface Sentence {
  id: string
  japanese: string
  romaji?: string
  arabic: string
  level: JLPTLevel
  lessonId?: string
  vocabularyIds?: string[]
  grammarIds?: string[]
  audioSrc?: string
}

export interface DialogueLine {
  speaker: string
  japanese: string
  romaji?: string
  arabic: string
}

export interface Dialogue {
  id: string
  titleAr: string
  level: JLPTLevel
  lessonId?: string
  lines: DialogueLine[]
  vocabularyIds?: string[]
  grammarIds?: string[]
}

export interface ReadingPassage {
  id: string
  titleAr: string
  japanese: string
  arabic: string
  level: JLPTLevel
  lessonId?: string
  vocabularyIds?: string[]
  grammarIds?: string[]
  comprehensionExerciseIds?: string[]
}

// --- Progress / review / SRS models -----------------------------------

// Matches the runtime item-type tags written by the progress/mistake models
// (LessonSections tracking, reviewQueue keys, SmartReview). 'vocab' — not
// 'vocabulary' — is the established key used everywhere in the app.
// 'speaking' — a freeform correction captured from a live Call Sensei session;
// it carries its own {you,better,why} payload (see MistakeRecord.data) rather
// than resolving to a lesson item.
export type SrsItemType = 'vocab' | 'grammar' | 'kanji' | 'mistake' | 'speaking'

export interface SrsRecord {
  itemId: string
  itemType: SrsItemType
  ease: number
  interval: number
  repetitions: number
  lastReviewedAt: number
  nextReviewAt: number
  mistakeCount: number
  masteryLevel: number
}

export interface MistakeRecord {
  itemId: string
  itemType: SrsItemType
  lessonId?: string
  exerciseType?: string
  questionAr?: string
  wrongCount: number
  lastWrongAt: number
  resolved: boolean
  // Self-contained payload for 'speaking' mistakes from a live call — the
  // review card renders this directly instead of resolving a lesson item.
  data?: { you: string; better: string; why: string }
}

export interface ReviewItem {
  itemId: string
  itemType: SrsItemType
  dueAt: number
}

export interface LessonProgressRecord {
  lessonId: string
  sectionsCompleted: number
  totalSections: number
  accuracy: number
  masteryScore: number
  lastStudiedAt: number
}

export interface UserProgressState {
  srs: Record<string, SrsRecord>
  mistakes: Record<string, MistakeRecord>
  lessons: Record<string, LessonProgressRecord>
}
