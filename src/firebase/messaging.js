// Firebase Cloud Messaging — Web Push (frontend). Registers the SW, requests
// permission, fetches an FCM token, and stores it per-device under
// users/{uid}/fcmTokens/{tokenId}. Foreground messages via onMessage.
//
// Requires a VAPID public key (Firebase Console → Project settings → Cloud
// Messaging → Web Push certificates) exposed as VITE_FIREBASE_VAPID_KEY.
import { getMessaging, getToken, onMessage, isSupported, deleteToken } from 'firebase/messaging'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { app, db } from '../firebase.js'

const VAPID_RAW = import.meta.env.VITE_FIREBASE_VAPID_KEY
const VAPID_KEY = (VAPID_RAW || '').trim()
const SW_URL = '/firebase-messaging-sw.js'

// Runtime diagnostic (build-time injected value). `type:'undefined'` means the
// var was NOT present in the build (Vercel dashboard var not reaching the build
// step — name/scope/cache). `type:'string', length:0` means it was injected but
// empty. `length ~87` means it's the real key.
export function vapidDiagnostics() {
  return { type: typeof VAPID_RAW, length: VAPID_KEY.length, head: VAPID_KEY.slice(0, 6), configured: Boolean(VAPID_KEY) }
}
try { console.info('[push] VAPID diag:', vapidDiagnostics()) } catch { /* noop */ }

let messagingInstance = null
let supportedCache = null

export async function pushSupported() {
  if (supportedCache != null) return supportedCache
  try {
    supportedCache = typeof window !== 'undefined'
      && 'serviceWorker' in navigator
      && 'Notification' in window
      && (await isSupported())
  } catch { supportedCache = false }
  return supportedCache
}

export function permissionState() {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission // 'granted' | 'denied' | 'default'
}

export function vapidConfigured() { return Boolean(VAPID_KEY) }

// Local "registered on this device" flag — lets the app treat push as enabled
// without re-prompting. Source of truth is still Notification.permission.
const LOCAL_ENABLED_KEY = 'nihongo-push-enabled'
export function pushLocallyEnabled() {
  try { return localStorage.getItem(LOCAL_ENABLED_KEY) === '1' } catch { return false }
}
function setLocalEnabled(on) {
  try { if (on) localStorage.setItem(LOCAL_ENABLED_KEY, '1'); else localStorage.removeItem(LOCAL_ENABLED_KEY) } catch { /* ignore */ }
}

async function getMessagingInstance() {
  if (messagingInstance) return messagingInstance
  if (!(await pushSupported())) return null
  messagingInstance = getMessaging(app)
  return messagingInstance
}

async function registerSW() {
  if (!('serviceWorker' in navigator)) return null
  try { return await navigator.serviceWorker.register(SW_URL) } catch { return null }
}

// Stable, Firestore-safe doc id from a token (tokens contain ':' '/' etc.).
function tokenDocId(token) {
  let h = 5381
  for (let i = 0; i < token.length; i += 1) h = ((h << 5) + h + token.charCodeAt(i)) >>> 0
  return `t${h.toString(36)}`
}

// Request permission (if needed), fetch the token, persist it. Returns a status
// object — never throws. `level` is stored for level-targeted broadcasts.
export async function enablePush(uid, { level = '' } = {}) {
  if (!uid) return { ok: false, status: 'no-user' }
  if (!(await pushSupported())) return { ok: false, status: 'unsupported' }
  if (!VAPID_KEY) return { ok: false, status: 'no-vapid' }

  let perm = permissionState()
  if (perm === 'default') {
    try { perm = await Notification.requestPermission() } catch { return { ok: false, status: 'error' } }
  }
  if (perm !== 'granted') return { ok: false, status: perm === 'denied' ? 'denied' : 'dismissed' }

  const messaging = await getMessagingInstance()
  if (!messaging) return { ok: false, status: 'unsupported' }
  const registration = await registerSW()

  let token
  try {
    token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration || undefined })
  } catch { return { ok: false, status: 'token-error' } }
  if (!token) return { ok: false, status: 'token-error' }

  try {
    await setDoc(doc(db, 'users', uid, 'fcmTokens', tokenDocId(token)), {
      token,
      platform: navigator.platform || '',
      userAgent: navigator.userAgent || '',
      level: level || '',
      enabled: true,
      createdAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
    }, { merge: true })
  } catch { return { ok: false, status: 'save-error', token } }

  setLocalEnabled(true)
  return { ok: true, status: 'granted', token }
}

// Mark this device's token disabled (and revoke locally). Best-effort.
export async function disablePush(uid) {
  if (!uid || !(await pushSupported())) return { ok: false }
  const messaging = await getMessagingInstance()
  if (!messaging) return { ok: false }
  try {
    const token = await getToken(messaging, { vapidKey: VAPID_KEY }).catch(() => null)
    if (token) {
      await setDoc(doc(db, 'users', uid, 'fcmTokens', tokenDocId(token)), { enabled: false, lastSeenAt: serverTimestamp() }, { merge: true })
      await deleteToken(messaging).catch(() => {})
    }
    setLocalEnabled(false)
    return { ok: true }
  } catch { return { ok: false } }
}

// Foreground messages (app open). Returns an unsubscribe fn (or noop).
export function onForegroundMessage(cb) {
  let unsub = () => {}
  getMessagingInstance().then((messaging) => {
    if (messaging) unsub = onMessage(messaging, cb)
  }).catch(() => {})
  return () => unsub()
}
