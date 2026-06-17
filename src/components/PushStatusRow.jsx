// Read-only external-notification status (no buttons). Registration is handled
// automatically by PushAutoSetup; this just reflects the browser permission.
const supported = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator

export default function PushStatusRow({ lang = 'ar' }) {
  const t = (ar, en) => (lang === 'ar' ? ar : en)
  const perm = supported ? Notification.permission : 'unsupported'
  const { label, cls } = !supported
    ? { label: t('غير مدعومة', 'Unsupported'), cls: '' }
    : perm === 'granted' ? { label: t('مفعّلة', 'On'), cls: 'on' }
      : perm === 'denied' ? { label: t('محظورة من المتصفح', 'Blocked in browser'), cls: 'blocked' }
        : { label: t('تظهر تلقائيًا عند الدخول', 'Prompted automatically'), cls: '' }
  return (
    <div className="push-statusrow">
      <span className="push-statusrow-label">{t('الإشعارات الخارجية', 'External notifications')}</span>
      <span className={`push-status ${cls}`}>{label}</span>
    </div>
  )
}
