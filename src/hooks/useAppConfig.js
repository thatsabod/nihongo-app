import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.js'
import { DEFAULT_APP_CONFIG, mergeAppConfig } from '../config/appConfig.js'

// Live subscription to the app-wide CMS config (`config/app`). Returns the
// merged config (defaults ∪ Firestore). Falls back to defaults if the doc is
// absent, on a permission error, or offline — so the app never breaks.
export function useAppConfig() {
  const [config, setConfig] = useState(DEFAULT_APP_CONFIG)
  useEffect(() => {
    let active = true
    let unsub = () => {}
    try {
      unsub = onSnapshot(
        doc(db, 'config', 'app'),
        (snap) => { if (active) setConfig(mergeAppConfig(snap.exists() ? snap.data() : null)) },
        () => { if (active) setConfig(DEFAULT_APP_CONFIG) },
      )
    } catch {
      setConfig(DEFAULT_APP_CONFIG)
    }
    return () => { active = false; unsub() }
  }, [])
  return config
}

// Admin write: merge a partial patch into `config/app` (stamps editor + time).
export async function saveAppConfig(patch, updatedBy = '') {
  await setDoc(
    doc(db, 'config', 'app'),
    { ...patch, updatedBy, updatedAt: serverTimestamp() },
    { merge: true },
  )
}

export default useAppConfig
