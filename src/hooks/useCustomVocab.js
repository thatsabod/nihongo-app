import { useEffect, useState } from 'react'
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../firebase.js'
import { setCustomReadings, hasKanji } from '../data/japaneseReadings.js'

// Module 3 — Vocabulary CMS data layer. Admin vocab lives in Firestore `vocab`;
// the app loads it once and merges kanji→reading into the global furigana
// dictionary (real app-wide impact). Falls back to empty on error/offline.

// Live list of custom vocab + side-effect: feed the furigana dictionary.
export function useCustomVocab() {
  const [items, setItems] = useState([])
  useEffect(() => {
    let active = true
    let unsub = () => {}
    try {
      unsub = onSnapshot(
        collection(db, 'vocab'),
        (snap) => {
          if (!active) return
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          setItems(list)
          const map = {}
          for (const v of list) {
            const surface = v.kanji || v.jp
            const reading = v.hiragana || v.reading
            if (surface && reading && hasKanji(surface)) map[surface] = reading
          }
          setCustomReadings(map)
        },
        () => { if (active) setItems([]) },
      )
    } catch { setItems([]) }
    return () => { active = false; unsub() }
  }, [])
  return items
}

export async function saveVocab(id, data, updatedBy = '') {
  await setDoc(doc(db, 'vocab', id), { ...data, updatedBy, updatedAt: serverTimestamp() }, { merge: true })
}
export async function deleteVocab(id) {
  await deleteDoc(doc(db, 'vocab', id))
}

// Minimal CSV parser (handles quoted fields + commas). Returns array of rows.
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  const s = String(text || '').replace(/\r\n?/g, '\n')
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i]
    if (inQuotes) {
      if (c === '"' && s[i + 1] === '"') { field += '"'; i += 1 }
      else if (c === '"') inQuotes = false
      else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else field += c
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows.filter((r) => r.some((c) => c.trim()))
}

const HEADER_ALIASES = {
  kanji: ['kanji', 'jp', 'word', 'japanese', '漢字', 'الكلمة'],
  hiragana: ['hiragana', 'kana', 'reading', 'furigana', 'よみ', 'القراءة'],
  romaji: ['romaji', 'romanized', 'roomaji'],
  meaning: ['meaning', 'english', 'arabic', 'translation', 'المعنى', 'معنى'],
  example: ['example', 'sentence', 'مثال'],
}
function mapHeaders(headerRow) {
  const idx = {}
  headerRow.forEach((h, i) => {
    const key = String(h || '').trim().toLowerCase()
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(key)) { idx[field] = i; break }
    }
  })
  return idx
}

// Parse CSV text and bulk-create vocab for a level. Returns count imported.
export async function importVocabCsv(text, level = 'N5', updatedBy = '') {
  const rows = parseCsv(text)
  if (rows.length < 2) return 0
  const idx = mapHeaders(rows[0])
  // If no recognizable header, assume columns: kanji, hiragana, romaji, meaning, example
  const hasHeader = Object.keys(idx).length > 0
  const cols = hasHeader ? idx : { kanji: 0, hiragana: 1, romaji: 2, meaning: 3, example: 4 }
  const dataRows = hasHeader ? rows.slice(1) : rows
  const cell = (r, k) => (cols[k] != null ? String(r[cols[k]] || '').trim() : '')
  let batch = writeBatch(db)
  let n = 0
  let inBatch = 0
  for (const r of dataRows) {
    const kanji = cell(r, 'kanji')
    if (!kanji) continue
    const id = `csv-${level}-${kanji}-${n}`.replace(/[^\w\-　-鿿]/g, '_').slice(0, 120)
    batch.set(doc(db, 'vocab', id), {
      jp: kanji, kanji, hiragana: cell(r, 'hiragana'), reading: cell(r, 'romaji'),
      meaning: cell(r, 'meaning'), example: cell(r, 'example'), level,
      source: 'csv', updatedBy, updatedAt: serverTimestamp(),
    }, { merge: true })
    n += 1; inBatch += 1
    if (inBatch >= 400) { await batch.commit(); batch = writeBatch(db); inBatch = 0 }
  }
  if (inBatch > 0) await batch.commit()
  return n
}

export default useCustomVocab
