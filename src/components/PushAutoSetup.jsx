import { useEffect, useState } from 'react'
import { pushSupported, permissionState, vapidConfigured, enablePush } from '../firebase/messaging.js'

// Auto FCM setup for signed-in users (no manual card needed):
//  • permission granted  → silently register/refresh the token on app open
//  • permission default  → show a small, dismissible prompt banner
//  • permission denied   → nothing here (a subtle hint lives in Account settings)
const DISMISS_KEY = 'nihongo-push-prompt-dismissed'
const DISMISS_MS = 7 * 86400000 // re-ask at most weekly

export default function PushAutoSetup({ uid, level = '', lang = 'ar' }) {
  const t = (ar, en) => (lang === 'ar' ? ar : en)
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!uid) return undefined
    let active = true
    ;(async () => {
      if (!(await pushSupported()) || !vapidConfigured()) return
      const perm = permissionState()
      if (perm === 'granted') { enablePush(uid, { level }).catch(() => {}); return } // silent
      if (perm === 'default') {
        let dismissedAt = 0
        try { dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0) } catch { /* ignore */ }
        if (active && Date.now() - dismissedAt > DISMISS_MS) setShow(true)
      }
    })()
    return () => { active = false }
  }, [uid, level])

  if (!show) return null
  const enable = async () => { setBusy(true); try { await enablePush(uid, { level }) } finally { setBusy(false); setShow(false) } }
  const later = () => { try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* ignore */ } setShow(false) }

  return (
    <div className="push-banner" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <span className="push-banner-text">{t('فعّل الإشعارات حتى تصلك المراجعات والتنبيهات', 'Enable notifications to get your reviews and alerts')}</span>
      <div className="push-banner-actions">
        <button className="btn btn-primary push-banner-on" disabled={busy} onClick={enable}>{busy ? t('…', '…') : t('تفعيل', 'Enable')}</button>
        <button type="button" className="push-banner-later" onClick={later}>{t('لاحقاً', 'Later')}</button>
      </div>
    </div>
  )
}
