import { useEffect, useState } from 'react'
import AppIcon from './AppIcon.jsx'
import { pushSupported, permissionState, vapidConfigured, enablePush, disablePush } from '../firebase/messaging.js'

// Account-settings control for Web Push (FCM). Requests permission, saves the
// device token, and shows clear device status. Never spams the prompt.
export default function PushSettings({ uid, level = '', lang = 'ar' }) {
  const t = (ar, en) => (lang === 'ar' ? ar : en)
  const [supported, setSupported] = useState(null)
  const [perm, setPerm] = useState('default')
  const [busy, setBusy] = useState(false)
  const [enabledHere, setEnabledHere] = useState(false)

  useEffect(() => {
    let active = true
    pushSupported().then((s) => { if (active) { setSupported(s); setPerm(permissionState()) } })
    return () => { active = false }
  }, [])

  if (supported === null) return null
  if (!supported) {
    return (
      <div className="push-settings">
        <div className="push-row"><span className="push-label"><AppIcon name="notifications" size={18} /> {t('إشعارات الدفع', 'Push notifications')}</span>
          <span className="push-status unsupported">{t('غير مدعوم', 'Unsupported')}</span></div>
        <p className="push-hint">{t('متصفحك لا يدعم إشعارات الدفع. ستبقى الإشعارات داخل التطبيق تعمل.', 'Your browser doesn’t support push. In-app notifications still work.')}</p>
      </div>
    )
  }

  const enable = async () => {
    setBusy(true)
    try {
      const res = await enablePush(uid, { level })
      setPerm(permissionState())
      if (res.ok) setEnabledHere(true)
      else if (res.status === 'no-vapid') { /* shown below */ }
    } finally { setBusy(false) }
  }
  const disable = async () => { setBusy(true); try { await disablePush(uid); setEnabledHere(false) } finally { setBusy(false) } }

  const granted = perm === 'granted'
  const denied = perm === 'denied'

  return (
    <div className="push-settings">
      <div className="push-row">
        <span className="push-label"><AppIcon name="notifications" size={18} /> {t('إشعارات الدفع', 'Push notifications')}</span>
        <span className={`push-status ${granted ? 'on' : denied ? 'blocked' : ''}`}>
          {granted ? t('مفعّلة', 'Enabled') : denied ? t('محظورة', 'Blocked') : t('متوقفة', 'Off')}
        </span>
      </div>

      {!vapidConfigured() && (
        <p className="push-hint">{t('لم تُضبط مفاتيح الدفع بعد (VAPID). أبلغ المسؤول لتفعيلها.', 'Push keys (VAPID) not configured yet. Ask the admin to enable.')}</p>
      )}
      {denied && (
        <p className="push-hint">{t('الإشعارات محظورة من إعدادات المتصفح. فعّلها من إعدادات الموقع ثم أعد المحاولة.', 'Notifications are blocked in your browser settings. Allow them from site settings, then retry.')}</p>
      )}

      <div className="push-actions">
        {!granted && !denied && (
          <button className="btn btn-primary" disabled={busy || !vapidConfigured()} onClick={enable}>
            {busy ? t('جارٍ…', 'Working…') : t('تفعيل الإشعارات', 'Enable notifications')}
          </button>
        )}
        {granted && !enabledHere && (
          <button className="btn btn-primary" disabled={busy || !vapidConfigured()} onClick={enable}>
            {busy ? t('جارٍ…', 'Working…') : t('تفعيل على هذا الجهاز', 'Enable on this device')}
          </button>
        )}
        {granted && enabledHere && (
          <button className="settings-entry" disabled={busy} onClick={disable}>{t('إيقاف على هذا الجهاز', 'Turn off on this device')}</button>
        )}
      </div>
    </div>
  )
}
