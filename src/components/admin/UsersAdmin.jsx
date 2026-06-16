import { useEffect, useState } from 'react'
import { collection, query, orderBy, limit, getDocs, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase.js'
import { ROLES } from '../../config/permissions.js'

// Module 8 — User Management. Search learners via the public-readable
// `publicProfiles`, then read/write the private `users/{uid}` doc (admin-only
// rules) to grant/reset XP, grant gems, change levels & role, ban / suspend.
const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1']

export default function UsersAdmin({ lang = 'ar', adminHandle = '', onNotice }) {
  const t = (ar, en) => (lang === 'ar' ? ar : en)
  const [profiles, setProfiles] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null) // { profile, data }
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const snap = await getDocs(query(collection(db, 'publicProfiles'), orderBy('xp', 'desc'), limit(60)))
        if (active) setProfiles(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      } catch (e) { onNotice?.(`${t('تعذر تحميل المستخدمين.', 'Could not load users.')} ${e.code || ''}`) }
      finally { if (active) setLoading(false) }
    })()
    return () => { active = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = profiles.filter((p) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return [p.userName, p.userUsername, p.userHandle, p.id].some((v) => String(v || '').toLowerCase().includes(q))
  })

  const openUser = async (p) => {
    try {
      const snap = await getDoc(doc(db, 'users', p.id))
      const data = snap.exists() ? snap.data() : {}
      setSelected({ profile: p, data })
      setForm({
        xp: data.xp ?? p.xp ?? 0, gems: data.gems ?? 0, hearts: data.hearts ?? 5, streak: data.streak ?? 0,
        role: data.role || '', isPaid: data.isPaid === true, banned: data.banned === true,
        suspendedUntil: data.suspendedUntil || '',
        unlockedLevels: Array.isArray(data.unlockedLevels) && data.unlockedLevels.length ? data.unlockedLevels : ['N5'],
        grantXp: '', grantGems: '',
      })
    } catch (e) { onNotice?.(`${t('تعذر فتح المستخدم.', 'Could not open user.')} ${e.code || ''}`) }
  }

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const toggleLevel = (l) => setForm((f) => ({ ...f, unlockedLevels: f.unlockedLevels.includes(l) ? f.unlockedLevels.filter((x) => x !== l) : [...f.unlockedLevels, l] }))

  const save = async () => {
    if (!selected || !form) return
    setSaving(true)
    try {
      const xp = Math.max(0, Number(form.xp) || 0) + (Number(form.grantXp) || 0)
      const gems = Math.max(0, Number(form.gems) || 0) + (Number(form.grantGems) || 0)
      const patch = {
        xp, gems, hearts: Number(form.hearts) || 0, streak: Number(form.streak) || 0,
        role: ROLES.includes(form.role) ? form.role : '',
        isPaid: !!form.isPaid, banned: !!form.banned,
        suspendedUntil: form.suspendedUntil || '',
        unlockedLevels: form.unlockedLevels.length ? form.unlockedLevels : ['N5'],
        adminUpdatedBy: adminHandle, adminUpdatedAt: serverTimestamp(),
      }
      await updateDoc(doc(db, 'users', selected.profile.id), patch)
      onNotice?.(t('تم حفظ المستخدم.', 'User saved.'))
      setSelected(null); setForm(null)
    } catch (e) { onNotice?.(`${t('تعذر الحفظ.', 'Save failed.')} ${e.code || ''}`) } finally { setSaving(false) }
  }

  if (selected && form) {
    const p = selected.profile
    return (
      <div className="admin-mod">
        <div className="admin-editor-head"><h2 dir="auto">{p.userName || p.userHandle || p.id}</h2>
          <button className="admin-secondary" onClick={() => { setSelected(null); setForm(null) }}>{t('رجوع', 'Back')}</button></div>
        <p className="admin-hint" dir="ltr">{p.userHandle} · {p.id}</p>
        <div className="admin-panel admin-form">
          <div className="admin-row2">
            <label><span>XP</span><input type="number" value={form.xp} onChange={(e) => setField('xp', e.target.value)} /></label>
            <label><span>{t('منح XP إضافي', 'Grant +XP')}</span><input type="number" placeholder="+0" value={form.grantXp} onChange={(e) => setField('grantXp', e.target.value)} /></label>
          </div>
          <div className="admin-row2">
            <label><span>{t('جواهر', 'Gems')}</span><input type="number" value={form.gems} onChange={(e) => setField('gems', e.target.value)} /></label>
            <label><span>{t('منح جواهر', 'Grant +Gems')}</span><input type="number" placeholder="+0" value={form.grantGems} onChange={(e) => setField('grantGems', e.target.value)} /></label>
          </div>
          <div className="admin-row2">
            <label><span>{t('قلوب', 'Hearts')}</span><input type="number" value={form.hearts} onChange={(e) => setField('hearts', e.target.value)} /></label>
            <label><span>{t('سلسلة', 'Streak')}</span><input type="number" value={form.streak} onChange={(e) => setField('streak', e.target.value)} /></label>
          </div>
          <label><span>{t('الدور', 'Role')}</span>
            <select value={form.role} onChange={(e) => setField('role', e.target.value)}>
              <option value="">{t('مستخدم عادي', '(none)')}</option>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <div>
            <span className="admin-fieldlabel">{t('المستويات المفتوحة', 'Unlocked levels')}</span>
            <div className="admin-levelboxes">
              {LEVELS.map((l) => <label key={l} className="admin-check"><input type="checkbox" checked={form.unlockedLevels.includes(l)} onChange={() => toggleLevel(l)} />{l}</label>)}
            </div>
          </div>
          <div className="admin-row2">
            <label className="admin-check"><input type="checkbox" checked={form.isPaid} onChange={(e) => setField('isPaid', e.target.checked)} />{t('مشترك مدفوع', 'Paid (Pro)')}</label>
            <label className="admin-check admin-ban"><input type="checkbox" checked={form.banned} onChange={(e) => setField('banned', e.target.checked)} />{t('محظور', 'Banned')}</label>
          </div>
          <label><span>{t('إيقاف مؤقت حتى (ISO)', 'Suspend until (ISO date)')}</span><input dir="ltr" placeholder="2026-12-31" value={form.suspendedUntil} onChange={(e) => setField('suspendedUntil', e.target.value)} /></label>
          <button className="admin-primary" onClick={save} disabled={saving}>{saving ? t('جاري الحفظ...', 'Saving...') : t('حفظ التغييرات', 'Save changes')}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-mod">
      <h2>{t('إدارة المستخدمين', 'User Management')}</h2>
      <input className="admin-search" placeholder={t('ابحث بالاسم أو المعرّف…', 'Search name / handle…')} value={search} onChange={(e) => setSearch(e.target.value)} />
      {loading ? <p className="admin-hint">{t('جاري التحميل…', 'Loading…')}</p> : (
        <div className="admin-list">
          {filtered.length ? filtered.map((p) => (
            <button key={p.id} className="admin-listrow admin-userrow" onClick={() => openUser(p)}>
              <span className="admin-listicon" aria-hidden="true">{(p.userAvatar && p.userAvatar.length <= 3) ? p.userAvatar : '👤'}</span>
              <span className="admin-listmeta"><strong dir="auto">{p.userName || p.userHandle || p.id}</strong>
                <span className="admin-hint" dir="ltr">{p.userHandle} · ⚡{p.xp || 0}</span></span>
              <AppChevron />
            </button>
          )) : <p className="admin-hint">{t('لا نتائج.', 'No results.')}</p>}
        </div>
      )}
      <p className="admin-hint">{t('ملاحظة: تتطلب قراءة/كتابة المستخدمين نشر قواعد Firestore.', 'Note: reading/writing users requires the deployed Firestore admin rules.')}</p>
    </div>
  )
}

function AppChevron() { return <span className="admin-chev" aria-hidden="true">›</span> }
