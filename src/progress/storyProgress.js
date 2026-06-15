// Local per-story progress for the Stories library (scene reached + completion).
// Separate localStorage key so it never collides with lesson/SRS progress.
const KEY = 'nihongo-story-progress'

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {} } catch { return {} }
}

const EMPTY = { sceneIndex: 0, completed: false, accuracy: 0, plays: 0 }

export function getStoryState(id) {
  return { ...EMPTY, ...(readAll()[id] || {}) }
}

export function saveStoryState(id, patch) {
  const all = readAll()
  all[id] = { ...EMPTY, ...(all[id] || {}), ...patch }
  try { localStorage.setItem(KEY, JSON.stringify(all)) } catch { /* ignore quota */ }
  return all[id]
}

// % complete for a story of `total` scenes.
export function storyPercent(state, total) {
  if (state?.completed) return 100
  if (!total) return 0
  return Math.min(100, Math.round(((state?.sceneIndex || 0) / total) * 100))
}
