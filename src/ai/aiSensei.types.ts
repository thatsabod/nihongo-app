// Phase 7 — AI Sensei data interfaces.
//
// Design + types only. NO external/paid API is called anywhere in this module
// (see senseiClient.ts — the client is an inert stub until explicitly approved).
// The Sensei is grounded: it reads the learner's real context (current lesson,
// level, completed lessons, weak grammar/vocab/kanji, recent mistakes, reviews
// due) built from the normalized Phase 6 stores + progress models — never
// random content.

import type { GrammarPoint, JLPTLevel, MistakeRecord } from '../types/learning'

// The seven AI Sensei capabilities from the spec.
export type SenseiFeatureId =
  | 'explainGrammar'
  | 'simplerExamples'
  | 'quizWeakPoints'
  | 'readingFromVocab'
  | 'speakingPrompts'
  | 'explainWrongAnswer'
  | 'sevenDayPlan'

export interface SenseiFeature {
  id: SenseiFeatureId
  titleAr: string
  titleEn: string
  descriptionAr: string
  icon: string
  // Some features need extra input (a selected grammar point / a wrong answer).
  requiresGrammar?: boolean
  requiresWrongAnswer?: boolean
}

// A resolved weak point, ready to display or feed into a prompt.
export interface WeakPointRef {
  itemId: string
  itemType: 'grammar' | 'vocab' | 'kanji'
  label: string
  wrongCount: number
}

// Everything the Sensei "knows" about the learner at request time.
export interface SenseiContext {
  level: JLPTLevel
  currentLessonId?: string
  currentLessonTitleAr?: string
  completedLessonIds: string[]
  weakGrammar: WeakPointRef[]
  weakVocabulary: WeakPointRef[]
  weakKanji: WeakPointRef[]
  recentMistakes: MistakeRecord[]
  reviewDueCount: number
  knownVocabularyCount: number
  // Phase D — short Arabic summary of recent Call Sensei sessions, injected at
  // call time so the live tutor remembers past topics/mistakes across calls.
  recentCallMemory?: string
  generatedAt: number
}

// Optional, feature-specific inputs (resolved from stores by the caller).
export interface SenseiRequestParams {
  grammar?: GrammarPoint
  wrongAnswer?: {
    questionAr?: string
    expected?: string
    got?: string
    grammarTitle?: string
  }
  topic?: string
}

// A grounded prompt pair, ready for a (future, approved) provider.
export interface SenseiPrompt {
  system: string
  user: string
}

export interface PromptTemplate {
  feature: SenseiFeatureId
  build: (ctx: SenseiContext, params?: SenseiRequestParams) => SenseiPrompt
}

export interface SenseiRequest {
  feature: SenseiFeatureId
  context: SenseiContext
  params?: SenseiRequestParams
  prompt: SenseiPrompt
}

export type SenseiResponseStatus = 'disabled' | 'ok' | 'error'

export interface SenseiResponse {
  status: SenseiResponseStatus
  feature: SenseiFeatureId
  // Human-facing message (Arabic). For 'disabled' this explains AI is not wired.
  message: string
  // Only populated once a real provider is connected (future, with approval).
  content?: string
}
