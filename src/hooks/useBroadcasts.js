import { useEffect, useState } from 'react'
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.js'

// Module 9 — Notifications. Admin broadcasts live in Firestore `broadcasts`;
// the app reads them (public) and shows the newest active+due one as a notice,
// filtered by audience (all / a JLPT level). Falls back to empty on error.
export function useBroadcasts() {
  const [items, setItems] = useState([])
  useEffect(() => {
    let active = true
    let unsub = () => {}
    try {
      unsub = onSnapshot(
        collection(db, 'broadcasts'),
        (snap) => { if (active) setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))) },
        () => { if (active) setItems([]) },
      )
    } catch { setItems([]) }
    return () => { active = false; unsub() }
  }, [])
  return items
}

export async function saveBroadcast(id, data, createdBy = '') {
  await setDoc(doc(db, 'broadcasts', id), { ...data, createdBy, updatedAt: serverTimestamp() }, { merge: true })
}
export async function deleteBroadcast(id) {
  await deleteDoc(doc(db, 'broadcasts', id))
}

// The newest active broadcast that is due (scheduledAt passed) and targets this
// learner's level — that the learner hasn't seen yet (localStorage).
const SEEN_KEY = 'nihongo-seen-broadcasts'
function readSeen() { try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')) } catch { return new Set() } }
export function markBroadcastSeen(id) {
  try { const s = readSeen(); s.add(id); localStorage.setItem(SEEN_KEY, JSON.stringify([...s].slice(-200))) } catch { /* ignore */ }
}
export function pickBroadcast(items, level, now = Date.now()) {
  const seen = readSeen()
  return items
    .filter((b) => b.active !== false && !seen.has(b.id))
    .filter((b) => !b.scheduledAt || Date.parse(b.scheduledAt) <= now)
    .filter((b) => !b.level || b.level === 'all' || b.level === level)
    .sort((a, b) => String(b.scheduledAt || b.id).localeCompare(String(a.scheduledAt || a.id)))[0] || null
}

export default useBroadcasts
