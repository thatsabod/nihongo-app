// Exercise display settings — the in-exercise gear bottom sheet (Duolingo-style).
//
// Single localStorage store. `pronunciationMode` mirrors the app-wide
// `kanjiReadingMode` (romanized→romaji, japanese→hiragana) so the existing
// reading machinery follows it; `showPronunciation` toggles furigana visibility
// globally by adding a root CSS class (`.hide-furigana rt { display:none }`),
// which gates every `<ruby>` reading without editing each render site.

const KEY = 'exerciseSettings'
export const EXERCISE_SETTINGS_EVENT = 'nihongo-exercise-settings-changed'

const DEFAULTS = { showPronunciation: true, pronunciationMode: 'japanese' } // 'japanese' | 'romanized'

export function getExerciseSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!saved || typeof saved !== 'object') return { ...DEFAULTS }
    return {
      showPronunciation: saved.showPronunciation !== false,
      pronunciationMode: saved.pronunciationMode === 'romanized' ? 'romanized' : 'japanese',
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function setExerciseSettings(partial, { silent = false } = {}) {
  const next = { ...getExerciseSettings(), ...partial }
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* ignore quota */ }
  applyPronunciationVisibility(next)
  if (!silent && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EXERCISE_SETTINGS_EVENT, { detail: next }))
  }
  return next
}

// 'japanese' -> 'hiragana', 'romanized' -> 'romaji' (matches kanjiReadingMode).
export function pronModeToReadingMode(mode) {
  return mode === 'romanized' ? 'romaji' : 'hiragana'
}
export function readingModeToPronMode(readingMode) {
  return readingMode === 'romaji' ? 'romanized' : 'japanese'
}

// Hide/show all furigana (<rt>) app-wide via a root class. Idempotent.
export function applyPronunciationVisibility(settings = getExerciseSettings()) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('hide-furigana', !settings.showPronunciation)
}
