import { useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../../firebase.js'
import useBroadcasts, { saveBroadcast, deleteBroadcast } from '../../hooks/useBroadcasts.js'

// Module 9 — Notifications. Compose in-app and/or Web Push broadcasts (global /
// level-specific / scheduled). The app shows the newest active+due in-app one;
// push goes through the sendAdminBroadcastPush Cloud Function.
const AUDIENCES = ['all', 'N5', 'N4', 'N3', 'N2', 'N1']

export default function NotificationsAdmin({ lang = 'ar', adminHandle = '', onNotice }) {
  const t = (ar, en) => (lang === 'ar' ? ar : en)
  const items = useBroadcasts()
  const [form, setForm] = useState({ title: '', body: '', level: 'all', scheduledAt: '', clickAction: '/', image: '', mode: 'both' })
  const [busy, setBusy] = useState(false)
  const [stats, setStats] = useState(null)

  const send = async () => {
    if (!form.title.trim() && !form.body.trim()) return
    setBusy(true); setStats(null)
    const id = `bc-${Date.now()}`
    const wantInApp = form.mode === 'both' || form.mode === 'inapp'
    const wantPush = form.mode === 'both' || form.mode === 'push'
    try {
      if (wantInApp) {
        await saveBroadcast(id, { title: form.title, body: form.body, level: form.level, scheduledAt: form.scheduledAt || '', clickAction: form.clickAction || '/', active: true }, adminHandle)
      }
      // Push is immediate (scheduled push would need a scheduled function).
      if (wantPush && !form.scheduledAt) {
        const call = httpsCallable(functions, 'sendAdminBroadcastPush')
        const res = await call({
          title: form.title, body: form.body, audience: form.level,
          clickAction: form.clickAction || '/', image: form.image || '',
          type: 'admin_broadcast', broadcastId: wantInApp ? id : undefined,
        })
        setStats(res.data || null)
      }
      onNotice?.(form.scheduledAt ? t('تمت الجدولة.', 'Scheduled.') : t('تم الإرسال.', 'Sent.'))
      setForm({ ...form, title: '', body: '', image: '' })
    } catch (e) { onNotice?.(`${t('تعذر الإرسال.', 'Send failed.')} ${e.code || e.message || ''}`) } finally { setBusy(false) }
  }
  const toggle = async (b) => { try { await saveBroadcast(b.id, { active: b.active === false }, adminHandle) } catch (e) { onNotice?.(e.code || '') } }
  const remove = async (b) => { try { await deleteBroadcast(b.id); onNotice?.(t('تم الحذف.', 'Deleted.')) } catch (e) { onNotice?.(e.code || '') } }

  const sorted = [...items].sort((a, b) => String(b.scheduledAt || b.id).localeCompare(String(a.scheduledAt || a.id)))

  return (
    <div className="admin-mod">
      <h2>{t('الإشعارات', 'Notifications')}</h2>
      <div className="admin-panel admin-form">
        <label><span>{t('العنوان', 'Title')}</span><input dir="auto" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label><span>{t('النص', 'Message')}</span><textarea className="admin-json" rows={3} dir="auto" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></label>
        <div className="admin-row2">
          <label><span>{t('الجمهور', 'Audience')}</span><select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>{AUDIENCES.map((a) => <option key={a} value={a}>{a === 'all' ? t('الجميع', 'Everyone') : a}</option>)}</select></label>
          <label><span>{t('طريقة الإرسال', 'Delivery')}</span><select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
            <option value="both">{t('داخل التطبيق + Push', 'In-app + Push')}</option>
            <option value="inapp">{t('داخل التطبيق فقط', 'In-app only')}</option>
            <option value="push">{t('Push فقط', 'Push only')}</option>
          </select></label>
        </div>
        <div className="admin-row2">
          <label><span>{t('وجهة النقر', 'Click route')}</span><input dir="ltr" placeholder="/" value={form.clickAction} onChange={(e) => setForm({ ...form, clickAction: e.target.value })} /></label>
          <label><span>{t('جدولة (ISO، للداخلي)', 'Schedule (ISO, in-app)')}</span><input dir="ltr" placeholder="2026-12-31T09:00" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} /></label>
        </div>
        <label><span>{t('صورة (رابط، اختياري)', 'Image URL (optional)')}</span><input dir="ltr" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} /></label>
        <button className="admin-primary" onClick={send} disabled={busy}>{busy ? t('جاري...', 'Sending...') : (form.scheduledAt && form.mode !== 'push' ? t('جدولة', 'Schedule') : t('إرسال', 'Send'))}</button>
        {stats && (
          <p className="admin-hint">{t('نتيجة Push:', 'Push result:')} {t('أجهزة', 'devices')} {stats.totalTokens} · {t('نجح', 'sent')} {stats.successCount} · {t('فشل', 'failed')} {stats.failureCount} · {t('حُذفت رموز غير صالحة', 'invalid removed')} {stats.invalidRemoved}</p>
        )}
        <p className="admin-hint">{t('ملاحظة: الجدولة تخص الإشعار داخل التطبيق؛ Push يُرسل فورًا.', 'Note: scheduling applies to in-app; push sends immediately.')}</p>
      </div>

      <h3 className="admin-fieldlabel">{t('المرسلة / المجدولة', 'Sent / scheduled')}</h3>
      <div className="admin-list">
        {sorted.map((b) => (
          <div key={b.id} className={`admin-listrow ${b.active === false ? 'is-dim' : ''}`}>
            <span className="admin-listmeta"><strong dir="auto">{b.title || t('(بدون عنوان)', '(no title)')}</strong>
              <span className="admin-hint" dir="auto">{b.level === 'all' || !b.level ? t('الجميع', 'Everyone') : b.level}{b.scheduledAt ? ` · ⏰ ${b.scheduledAt}` : ''}</span></span>
            <span className="admin-listacts">
              <button className="admin-secondary" onClick={() => toggle(b)}>{b.active === false ? t('تفعيل', 'Activate') : t('إيقاف', 'Disable')}</button>
              <button className="admin-danger" onClick={() => remove(b)}>{t('حذف', 'Delete')}</button>
            </span>
          </div>
        ))}
        {!sorted.length && <p className="admin-hint">{t('لا إشعارات بعد.', 'No notifications yet.')}</p>}
      </div>
    </div>
  )
}
