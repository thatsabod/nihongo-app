import { useEffect, useState } from 'react'
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.js'

// Stories CMS data layer. Admin-authored stories live in Firestore
// `storyOverrides/{id}`; the app merges them over the bundled stories so admins
// can create / edit / delete / reorder stories with no code change. Falls back
// to the bundled stories on any error.

// Live list of override docs (admin-authored stories). Empty on error/offline.
export function useStoryOverrides() {
  const [docs, setDocs] = useState([])
  useEffect(() => {
    let active = true
    let unsub = () => {}
    try {
      unsub = onSnapshot(
        collection(db, 'storyOverrides'),
        (snap) => { if (active) setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))) },
        () => { if (active) setDocs([]) },
      )
    } catch { setDocs([]) }
    return () => { active = false; unsub() }
  }, [])
  return docs
}

export async function saveStoryOverride(id, data, updatedBy = '') {
  await setDoc(doc(db, 'storyOverrides', id), { ...data, id, updatedBy, updatedAt: serverTimestamp() }, { merge: true })
}

export async function deleteStoryOverride(id) {
  await deleteDoc(doc(db, 'storyOverrides', id))
}

// Build an app-shape story from an editable override doc. Scenes become line
// steps; questions are interleaved after every 2 scenes (Story Mode 2.0), with
// leftovers appended. Furigana comes from the global dictionary at render time.
export function buildAdminStory(o) {
  const scenes = (o.scenes || []).filter((s) => s && s.jp)
  const sentences = scenes.map((s) => ({ jp: s.jp, romaji: s.romaji || '', ar: s.ar || '' }))
  const qs = (o.questions || []).filter((q) => q && q.prompt && q.answer && Array.isArray(q.options))
  const script = []
  let qi = 0
  scenes.forEach((s, i) => {
    script.push({ type: 'line', jp: s.jp, romaji: s.romaji || '', ar: s.ar || '' })
    if ((i + 1) % 2 === 0 && qi < qs.length) {
      const q = qs[qi++]
      script.push({ type: 'q', prompt: q.prompt, options: q.options, answer: q.answer, explain: q.explain || '' })
    }
  })
  while (qi < qs.length) {
    const q = qs[qi++]
    script.push({ type: 'q', prompt: q.prompt, options: q.options, answer: q.answer, explain: q.explain || '' })
  }
  return {
    id: o.id,
    title: o.titleAr || o.titleEn || o.id,
    titleAr: o.titleAr || '',
    titleEn: o.titleEn || '',
    icon: o.icon || '',
    sentences,
    vocab: o.vocab || [],
    questions: [],
    script,
    xp: o.xp,
    gems: o.gems,
    _custom: true,
  }
}

// Merge override docs over the bundled `STORIES_BY_LEVEL`. Published, non-deleted
// overrides replace a bundled story with the same id or add a new one; deleted
// overrides remove a matching bundled story. Each level is then sorted by the
// optional `order` field (un-ordered keep their relative position).
export function mergeStoryOverrides(base, overrideDocs = []) {
  const out = {}
  for (const [lvl, list] of Object.entries(base || {})) out[lvl] = [...(list || [])]
  for (const o of overrideDocs) {
    const lvl = o.level || 'N5'
    if (!out[lvl]) out[lvl] = []
    const idx = out[lvl].findIndex((s) => s.id === o.id)
    if (o.deleted) { if (idx >= 0) out[lvl].splice(idx, 1); continue }
    if (o.published === false) { if (idx >= 0) out[lvl].splice(idx, 1); continue } // draft: hide from learners
    const story = buildAdminStory(o)
    story._order = typeof o.order === 'number' ? o.order : undefined
    if (idx >= 0) out[lvl][idx] = { ...story, _order: story._order ?? out[lvl][idx]._order }
    else out[lvl].push(story)
  }
  for (const lvl of Object.keys(out)) {
    out[lvl] = out[lvl]
      .map((s, i) => ({ s, i }))
      .sort((a, b) => (a.s._order ?? 1000 + a.i) - (b.s._order ?? 1000 + b.i))
      .map((x) => x.s)
  }
  return out
}

export default useStoryOverrides
