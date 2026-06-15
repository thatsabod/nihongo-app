// Words encountered in stories, auto-collected into a personal vocabulary book.
const KEY = 'nihongo-story-vocab'

export function readStoryVocab() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') || [] } catch { return [] }
}

// Add a story's vocab (dedup by surface). Returns how many new words were added.
export function collectStoryVocab(items, now = Date.now()) {
  const all = readStoryVocab()
  const seen = new Set(all.map((v) => v.key))
  let added = 0
  for (const v of items || []) {
    const key = v.hiragana || v.jp
    if (!key || seen.has(key)) continue
    seen.add(key)
    all.push({
      key,
      jp: v.kanji || v.jp || key,
      reading: v.hiragana || v.reading || '',
      romaji: v.reading || '',
      meaning: v.meaning || '',
      addedAt: now,
    })
    added += 1
  }
  try { localStorage.setItem(KEY, JSON.stringify(all.slice(0, 800))) } catch { /* ignore quota */ }
  return added
}
