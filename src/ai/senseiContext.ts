// Phase 7 — builds the AI Sensei's grounded context from REAL learner data:
// the normalized Phase 6 content stores + the additive progress/mistake models.
// No network, no randomness — every weak point resolves to actual content.

import type { JLPTLevel, MistakeRecord, SrsRecord } from '../types/learning'
import type { SenseiContext, WeakPointRef } from './aiSensei.types'
import { readProgressState } from '../progress/progressStorage.js'
import { getWeakItems, getRecentMistakes } from '../progress/mistakeLog.js'
import { contentStoresByLevel } from '../content/stores.ts'

interface BuildContextOptions {
  currentLessonId?: string
  currentLessonTitleAr?: string
  completedLessonIds?: string[]
}

export function buildSenseiContext(
  level: JLPTLevel,
  options: BuildContextOptions = {},
  now: number = Date.now(),
): SenseiContext {
  const state = readProgressState()
  const stores = (contentStoresByLevel as Record<string, (typeof contentStoresByLevel)['N5']>)[level]

  const weak = getWeakItems(state.mistakes) as MistakeRecord[]

  const weakGrammar: WeakPointRef[] = weak
    .filter((r: MistakeRecord) => r.itemType === 'grammar')
    .map((r: MistakeRecord) => ({ itemId: r.itemId, itemType: 'grammar' as const, label: r.itemId, wrongCount: r.wrongCount }))

  const weakVocabulary: WeakPointRef[] = weak
    .filter((r: MistakeRecord) => r.itemType === 'vocab')
    .map((r: MistakeRecord) => {
      const v = stores?.vocabulary[r.itemId]
      return {
        itemId: r.itemId,
        itemType: 'vocab' as const,
        label: v ? `${v.japanese} — ${v.meaningAr}` : r.itemId,
        wrongCount: r.wrongCount,
      }
    })

  const weakKanji: WeakPointRef[] = weak
    .filter((r: MistakeRecord) => r.itemType === 'kanji')
    .map((r: MistakeRecord) => {
      const k = stores?.kanji[r.itemId]
      return {
        itemId: r.itemId,
        itemType: 'kanji' as const,
        label: k ? `${k.character} (${k.readingRomaji})` : r.itemId,
        wrongCount: r.wrongCount,
      }
    })

  const reviewDueCount = (Object.values(state.srs || {}) as SrsRecord[]).filter(
    (record: SrsRecord) => record.nextReviewAt <= now,
  ).length

  return {
    level,
    currentLessonId: options.currentLessonId,
    currentLessonTitleAr: options.currentLessonTitleAr,
    completedLessonIds: options.completedLessonIds || [],
    weakGrammar,
    weakVocabulary,
    weakKanji,
    recentMistakes: getRecentMistakes(state.mistakes, 8),
    reviewDueCount,
    knownVocabularyCount: stores ? Object.keys(stores.vocabulary).length : 0,
    generatedAt: now,
  }
}
