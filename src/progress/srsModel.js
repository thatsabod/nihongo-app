// Lightweight SM-2 style spaced-repetition scheduler.
// Pure functions only — no storage, no UI. See src/types/learning.ts
// for the SrsRecord shape this operates on.

const DAY_MS = 24 * 60 * 60 * 1000
const MIN_EASE = 1.3
const DEFAULT_EASE = 2.5

export function createSrsRecord(itemId, itemType) {
  return {
    itemId,
    itemType,
    ease: DEFAULT_EASE,
    interval: 0,
    repetitions: 0,
    lastReviewedAt: 0,
    nextReviewAt: 0,
    mistakeCount: 0,
    masteryLevel: 0,
  }
}

// quality: 0 (wrong) – 5 (perfect recall). Exercise UIs only know
// right/wrong today, so callers typically pass 2 (wrong) or 4 (correct).
export function scheduleNext(record, quality, now = Date.now()) {
  const prev = record || createSrsRecord('', 'vocabulary')
  const wasCorrect = quality >= 3

  let { ease, interval, repetitions, mistakeCount, masteryLevel } = prev

  if (!wasCorrect) {
    repetitions = 0
    interval = 1
    mistakeCount += 1
    masteryLevel = Math.max(0, masteryLevel - 1)
  } else {
    repetitions += 1
    masteryLevel = Math.min(5, masteryLevel + 1)
    if (repetitions === 1) interval = 1
    else if (repetitions === 2) interval = 6
    else interval = Math.round(interval * ease)
  }

  ease = Math.max(MIN_EASE, ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))

  return {
    ...prev,
    ease,
    interval,
    repetitions,
    mistakeCount,
    masteryLevel,
    lastReviewedAt: now,
    nextReviewAt: now + interval * DAY_MS,
  }
}

export function isDue(record, now = Date.now()) {
  if (!record) return true
  return record.nextReviewAt <= now
}

export function recordAnswer(record, itemId, itemType, wasCorrect, now = Date.now()) {
  const base = record || createSrsRecord(itemId, itemType)
  return scheduleNext(base, wasCorrect ? 4 : 2, now)
}
