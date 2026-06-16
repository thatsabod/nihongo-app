import { useState } from 'react'
import useBroadcasts, { saveBroadcast, deleteBroadcast } from '../../hooks/useBroadcasts.js'

// Module 9 — Notifications. Compose global / level-specific / scheduled
// broadcasts; the app shows the newest active+due one to matching learners.
const AUDIENCES = ['all', 'N5', 'N4', 'N3', 'N2', 'N1']

export default function NotificationsAdmin({ lang = 'ar', adminHandle = '', onNotice }) {
  const t = (ar, en) => (lang === 'ar' ? ar : en)
  const items = useBroadcasts()
  const [form, setForm] = useState({ title: '', body: '', level: 'all', scheduledAt: '', active: true })
  const [busy, setBusy] = useState(false)

  const send = async () => {
    if (!form.title.trim() && !form.body.trim()) return
    setBusy(true)
    try {
      const id = `bc-${Date.now()}`
      await saveBroadcast(id, { title: form.title, body: form.body, level: form.level, scheduledAt: form.scheduledAt || '', active: true }, adminHandle)
      onNotice?.(form.scheduledAt ? t('تمت جدولة الإشعار.', 'Notification scheduled.') : t('تم إرسال الإشعار.', 'Notification sent.'))
      setForm({ title: '', body: '', level: 'all', scheduledAt: '', active: true })
    } catch (e) { onNotice?.(`${t('تعذر الإرسال.', 'Send failed.')} ${e.code || ''}`) } finally { setBusy(false) }
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
          <label><span>{t('جدولة (ISO، اختياري)', 'Schedule (ISO, optional)')}</span><input dir="ltr" placeholder="2026-12-31T09:00" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} /></label>
        </div>
        <button className="admin-primary" onClick={send} disabled={busy}>{busy ? t('جاري...', 'Sending...') : (form.scheduledAt ? t('جدولة', 'Schedule') : t('إرسال للجميع', 'Send'))}</button>
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
