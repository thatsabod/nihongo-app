import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.js'

// Module 12 — Abdool Sensei control. Editable AI settings live in Firestore
// `config/ai`; the client merges them into the call (greeting, an extra tutor
// instruction appended to the context sent to the function, and XP per call).
export const DEFAULT_AI_CONFIG = {
  greeting: {
    ar: 'مرحبًا! أنا أبدول سينسي. عمّ تريد أن نتحدث اليوم؟',
    en: "Hi! I'm Abdool Sensei. What would you like to practice today?",
  },
  promptAppend: '', // extra instruction appended to the tutor's context
  xpPerCall: 20,
  updatedAt: null,
  updatedBy: '',
}

export function mergeAiConfig(remote) {
  const base = DEFAULT_AI_CONFIG
  if (!remote || typeof remote !== 'object') return { ...base }
  return { ...base, ...remote, greeting: { ...base.greeting, ...(remote.greeting || {}) } }
}

export function useAiConfig() {
  const [config, setConfig] = useState(DEFAULT_AI_CONFIG)
  useEffect(() => {
    let active = true
    let unsub = () => {}
    try {
      unsub = onSnapshot(
        doc(db, 'config', 'ai'),
        (snap) => { if (active) setConfig(mergeAiConfig(snap.exists() ? snap.data() : null)) },
        () => { if (active) setConfig(DEFAULT_AI_CONFIG) },
      )
    } catch { setConfig(DEFAULT_AI_CONFIG) }
    return () => { active = false; unsub() }
  }, [])
  return config
}

export async function saveAiConfig(patch, updatedBy = '') {
  await setDoc(doc(db, 'config', 'ai'), { ...patch, updatedBy, updatedAt: serverTimestamp() }, { merge: true })
}

export default useAiConfig
