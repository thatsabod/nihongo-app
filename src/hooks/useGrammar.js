import { useEffect, useState } from 'react'
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.js'

// Module 4 — Grammar CMS data layer. Admin-authored grammar points live in
// Firestore `grammar` (title, level, structure, explanation, examples). Managed
// content store, ready to surface in a grammar reference / lesson merge.
export function useGrammar() {
  const [items, setItems] = useState([])
  useEffect(() => {
    let active = true
    let unsub = () => {}
    try {
      unsub = onSnapshot(
        collection(db, 'grammar'),
        (snap) => { if (active) setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))) },
        () => { if (active) setItems([]) },
      )
    } catch { setItems([]) }
    return () => { active = false; unsub() }
  }, [])
  return items
}

export async function saveGrammar(id, data, updatedBy = '') {
  await setDoc(doc(db, 'grammar', id), { ...data, updatedBy, updatedAt: serverTimestamp() }, { merge: true })
}
export async function deleteGrammar(id) {
  await deleteDoc(doc(db, 'grammar', id))
}

export default useGrammar
