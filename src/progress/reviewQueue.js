// Smart Review queue builder — assembles a prioritized daily-review session
// from the additive learning-progress store (SRS schedule + mistake log).
//
// Items the student got wrong (weak areas) and items whose SRS interval is due
// are resolved back into full vocab/grammar content by matching the stored
// item IDs against the lesson data. Pure functions only — no storage, no UI.

import { getWeakItems } from './mistakeLog.js'

// Build fast lookups: vocab by `id||jp`, grammar by `title`, kanji by glyph.
// Each value keeps the originating lessonId so review answers can be tracked.
export function buildContentIndex(allLessons, allKanji = []) {
  const vocab = new Map()
  const grammar = new Map()
  const kanji = new Map()
  for (const lesson of allLessons || []) {
    const lessonId = String(lesson.id)
    for (const item of lesson.vocab || []) {
      const id = item.id || item.jp
      if (id && !vocab.has(id)) vocab.set(id, { item, lessonId })
    }
    for (const rule of lesson.grammar || []) {
      if (rule.title && !grammar.has(rule.title)) grammar.set(rule.title, { rule, lessonId })
    }
  }
  for (const k of allKanji) {
    // kanjiN5 items: { kana: glyph, answer: reading, ... }
    if (k.kana && !kanji.has(k.kana)) kanji.set(k.kana, { item: k, lessonId: '' })
  }
  return { vocab, grammar, kanji }
}

// Split a stored key (`vocab:gakusei`, `grammar:は + です ...`) into its parts.
// itemId may itself contain colons, so only the first segment is the type.
function splitKey(key) {
  const idx = key.indexOf(':')
  if (idx < 0) return { itemType: '', itemId: key }
  return { itemType: key.slice(0, idx), itemId: key.slice(idx + 1) }
}

function resolveItem(index, itemType, itemId, mistakes, key) {
  if (itemType === 'speaking') {
    // Call-derived corrections carry their own payload — no lesson lookup.
    const rec = mistakes?.[key]
    if (!rec || rec.resolved) return null
    const data = rec.data || { you: '', better: rec.questionAr || itemId, why: '' }
    return { kind: 'speaking', item: data, lessonId: '' }
  }
  if (itemType === 'vocab') {
    const hit = index.vocab.get(itemId)
    return hit ? { kind: 'vocab', item: hit.item, lessonId: hit.lessonId } : null
  }
  if (itemType === 'grammar') {
    const hit = index.grammar.get(itemId)
    return hit ? { kind: 'grammar', item: hit.rule, lessonId: hit.lessonId } : null
  }
  if (itemType === 'kanji') {
    const hit = index.kanji.get(itemId)
    return hit ? { kind: 'kanji', item: hit.item, lessonId: hit.lessonId } : null
  }
  return null
}

// Returns up to `max` review items, weak (wrong ≥2) first, then SRS-due,
// each annotated with `{ kind, key, itemType, itemId, item, lessonId, wrongCount, due }`.
export function buildReviewSession(allLessons, state, now = Date.now(), max = 15, allKanji = []) {
  const index = buildContentIndex(allLessons, allKanji)
  const mistakes = state?.mistakes || {}
  const srs = state?.srs || {}
  const seen = new Set()
  const out = []

  const push = (key, extra) => {
    if (seen.has(key)) return
    const { itemType, itemId } = splitKey(key)
    const resolved = resolveItem(index, itemType, itemId, mistakes, key)
    if (!resolved) return
    seen.add(key)
    out.push({ key, itemType, itemId, wrongCount: 0, due: false, ...resolved, ...extra })
  }

  // 1) Weak areas first — sorted by how many times they were missed.
  const weak = getWeakItems(mistakes)
    .map((record) => ({ record, key: `${record.itemType}:${record.itemId}` }))
    .sort((a, b) => (b.record.wrongCount || 0) - (a.record.wrongCount || 0))
  for (const { record, key } of weak) {
    push(key, { wrongCount: record.wrongCount || 0 })
  }

  // 2) SRS-due items next (excludes anything already queued above).
  const due = Object.entries(srs)
    .filter(([, record]) => record && record.nextReviewAt <= now)
    .sort((a, b) => (a[1].nextReviewAt || 0) - (b[1].nextReviewAt || 0))
  for (const [key, record] of due) {
    push(key, { due: true, wrongCount: record.mistakeCount || 0 })
  }

  return out.slice(0, max)
}
