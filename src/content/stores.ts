// Phase 6 — ready-to-use normalized content stores, built once from the real
// lesson/kanji data. This is the single import point for any feature that needs
// id-keyed, typed content (Smart Review resolution, and the Phase 7 AI Sensei,
// which builds grounded prompts from known vocab/grammar/kanji + weak items).
//
// Building at module load is cheap (plain object construction) and keeps the
// raw content files untouched.

import { lessons, n4Lessons, n3Lessons, kanjiN5 } from '../data.js'
import { buildContentStores, type ContentStores } from './contentStore.ts'
import type { JLPTLevel } from '../types/learning'

export const contentStoresByLevel: Record<'N5' | 'N4' | 'N3', ContentStores> = {
  N5: buildContentStores(lessons, kanjiN5, 'N5'),
  N4: buildContentStores(n4Lessons, kanjiN5, 'N4'),
  N3: buildContentStores(n3Lessons, kanjiN5, 'N3'),
}

export function getContentStores(level: JLPTLevel): ContentStores | undefined {
  return (contentStoresByLevel as Record<string, ContentStores>)[level]
}

// Look up a single normalized item across a level's stores by kind + id.
export function lookupVocabulary(level: JLPTLevel, id: string) {
  return getContentStores(level)?.vocabulary[id]
}
export function lookupGrammar(level: JLPTLevel, id: string) {
  return getContentStores(level)?.grammar[id]
}
export function lookupKanji(level: JLPTLevel, id: string) {
  return getContentStores(level)?.kanji[id]
}
