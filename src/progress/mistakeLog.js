// Mistake tracking — records wrong answers so they can resurface in a
// future "Review your mistakes" experience. Pure functions operating on
// a Record<string, MistakeRecord> map (see src/types/learning.ts).

export function mistakeKey(itemType, itemId) {
  return `${itemType}:${itemId}`
}

export function recordMistake(mistakes, { itemId, itemType, lessonId, exerciseType, questionAr, data }, now = Date.now()) {
  const key = mistakeKey(itemType, itemId)
  const existing = mistakes[key]
  return {
    ...mistakes,
    [key]: {
      itemId,
      itemType,
      lessonId: lessonId ?? existing?.lessonId,
      exerciseType: exerciseType ?? existing?.exerciseType,
      questionAr: questionAr ?? existing?.questionAr,
      // Self-contained payload for 'speaking' (call) mistakes; harmlessly
      // undefined for every existing lesson-item caller.
      data: data ?? existing?.data,
      wrongCount: (existing?.wrongCount || 0) + 1,
      lastWrongAt: now,
      resolved: false,
    },
  }
}

export function resolveMistake(mistakes, itemType, itemId) {
  const key = mistakeKey(itemType, itemId)
  if (!mistakes[key]) return mistakes
  return {
    ...mistakes,
    [key]: { ...mistakes[key], resolved: true },
  }
}

// "Weak" = wrong at least twice and not yet resolved.
export function getWeakItems(mistakes, minWrongCount = 2) {
  return Object.values(mistakes || {}).filter(
    (record) => !record.resolved && record.wrongCount >= minWrongCount,
  )
}

export function getRecentMistakes(mistakes, limit = 10) {
  return Object.values(mistakes || {})
    .filter((record) => !record.resolved)
    .sort((a, b) => b.lastWrongAt - a.lastWrongAt)
    .slice(0, limit)
}
