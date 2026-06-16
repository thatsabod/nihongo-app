import { useEffect, useMemo, useState } from 'react'
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../../firebase.js'
import AppIcon from '../AppIcon.jsx'
import { FEATURE_KEYS, NAV_IDS } from '../../config/appConfig.js'
import { saveAppConfig } from '../../hooks/useAppConfig.js'
import { canAccessModule } from '../../config/permissions.js'
import StoriesAdmin from './StoriesAdmin.jsx'
import UsersAdmin from './UsersAdmin.jsx'
import VocabAdmin from './VocabAdmin.jsx'
import GrammarAdmin from './GrammarAdmin.jsx'
import NotificationsAdmin from './NotificationsAdmin.jsx'
import SenseiAdmin from './SenseiAdmin.jsx'

// ── Admin Control Center — a module-router shell. Each module is a focused CMS
// surface; new modules slot in via MODULES + a branch in renderModule. ─────────

const MODULES = [
  { id: 'overview', ar: 'نظرة عامة', en: 'Overview', icon: 'home' },
  { id: 'lessons', ar: 'الدروس', en: 'Lessons', icon: 'files' },
  { id: 'stories', ar: 'القصص', en: 'Stories', icon: 'book' },
  { id: 'vocab', ar: 'المفردات', en: 'Vocabulary', icon: 'vocabulary' },
  { id: 'grammar', ar: 'القواعد', en: 'Grammar', icon: 'writing' },
  { id: 'users', ar: 'المستخدمون', en: 'Users', icon: 'profile' },
  { id: 'sensei', ar: 'سينسي', en: 'Sensei', icon: 'sound' },
  { id: 'notifications', ar: 'الإشعارات', en: 'Notifications', icon: 'notifications' },
  { id: 'config', ar: 'إعدادات التطبيق', en: 'App Config', icon: 'settings' },
  { id: 'flags', ar: 'مفاتيح الميزات', en: 'Feature Flags', icon: 'star' },
  { id: 'roles', ar: 'الأدوار', en: 'Roles', icon: 'profile' },
  { id: 'roadmap', ar: 'خارطة الطريق', en: 'Roadmap', icon: 'vocabulary' },
]

const lessonKey = (levelId, lessonId) => `${levelId}-${lessonId}`
const prettyLesson = (lesson) => JSON.stringify(lesson || {}, null, 2)
function validateLessonJson(text) {
  try {
    const parsed = JSON.parse(text)
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') return { ok: false, key: 'missingFields', parsed: null }
    return { ok: true, key: 'valid', parsed }
  } catch { return { ok: false, key: 'invalidJson', parsed: null } }
}

export default function AdminDashboard({
  lang = 'ar', levels = [], lessonsByLevel = {}, overrides = {},
  baseStoriesByLevel = {}, storyOverrides = [],
  initialLevel = 'N5', adminHandle = '', appConfig, role = 'admin', onBack, onNotice,
}) {
  const isAr = lang === 'ar'
  const t = (ar, en) => (isAr ? ar : en)
  const [module, setModule] = useState('overview')
  const allowed = (id) => canAccessModule(role, id) || role === 'owner' || role === 'admin'
  const modules = MODULES.filter((m) => allowed(m.id))

  useEffect(() => { if (!allowed(module)) setModule('overview') }) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="admin-dashboard admin-cc" dir={isAr ? 'rtl' : 'ltr'}>
      <header className="admin-hero">
        <button className="admin-back" onClick={onBack} aria-label={t('رجوع', 'Back')}>
          <AppIcon name="back" size={22} />
        </button>
        <div>
          <p>{adminHandle} · {role}</p>
          <h1>{t('مركز التحكم', 'Control Center')}</h1>
          <span>{t('أدِر التطبيق بالكامل بدون لمس الكود.', 'Manage the whole app without touching code.')}</span>
        </div>
        <span className="admin-badge"><AppIcon name="settings" size={20} /></span>
      </header>

      <div className="admin-cc-body">
        <nav className="admin-modnav">
          {modules.map((m) => (
            <button key={m.id} className={module === m.id ? 'active' : ''} onClick={() => setModule(m.id)}>
              <AppIcon name={m.icon} size={18} /><span>{m[lang] || m.en}</span>
            </button>
          ))}
        </nav>

        <div className="admin-cc-main">
          {module === 'overview' && <OverviewModule t={t} levels={levels} lessonsByLevel={lessonsByLevel} overrides={overrides} appConfig={appConfig} role={role} onGo={setModule} />}
          {module === 'lessons' && <LessonsModule lang={lang} t={t} levels={levels} lessonsByLevel={lessonsByLevel} overrides={overrides} initialLevel={initialLevel} adminHandle={adminHandle} onNotice={onNotice} />}
          {module === 'stories' && <StoriesAdmin lang={lang} levels={levels} baseStoriesByLevel={baseStoriesByLevel} storyOverrides={storyOverrides} adminHandle={adminHandle} onNotice={onNotice} />}
          {module === 'vocab' && <VocabAdmin lang={lang} adminHandle={adminHandle} onNotice={onNotice} />}
          {module === 'grammar' && <GrammarAdmin lang={lang} adminHandle={adminHandle} onNotice={onNotice} />}
          {module === 'users' && <UsersAdmin lang={lang} adminHandle={adminHandle} onNotice={onNotice} />}
          {module === 'sensei' && <SenseiAdmin lang={lang} adminHandle={adminHandle} onNotice={onNotice} />}
          {module === 'notifications' && <NotificationsAdmin lang={lang} adminHandle={adminHandle} onNotice={onNotice} />}
          {module === 'config' && <ConfigModule t={t} appConfig={appConfig} adminHandle={adminHandle} onNotice={onNotice} />}
          {module === 'flags' && <FlagsModule t={t} appConfig={appConfig} adminHandle={adminHandle} onNotice={onNotice} />}
          {module === 'roles' && <RolesModule t={t} role={role} />}
          {module === 'roadmap' && <RoadmapModule t={t} />}
        </div>
      </div>
    </main>
  )
}

// ── Overview ─────────────────────────────────────────────────────────────────
function OverviewModule({ t, levels, lessonsByLevel, overrides, appConfig, role, onGo }) {
  const totalLessons = Object.values(lessonsByLevel).reduce((n, l) => n + (l?.length || 0), 0)
  const overrideCount = Object.keys(overrides || {}).length
  const flags = appConfig?.featureFlags || {}
  const onCount = FEATURE_KEYS.filter((k) => flags[k] !== false).length
  return (
    <div className="admin-mod">
      <h2>{t('نظرة عامة', 'Overview')}</h2>
      <div className="admin-stats">
        <button className="admin-stat" onClick={() => onGo('lessons')}><strong>{totalLessons}</strong><span>{t('دروس', 'Lessons')}</span></button>
        <button className="admin-stat" onClick={() => onGo('lessons')}><strong>{overrideCount}</strong><span>{t('تعديلات منشورة', 'Overrides')}</span></button>
        <button className="admin-stat" onClick={() => onGo('flags')}><strong>{onCount}/{FEATURE_KEYS.length}</strong><span>{t('ميزات مفعّلة', 'Features on')}</span></button>
        <div className="admin-stat"><strong>{levels.length}</strong><span>{t('مستويات', 'Levels')}</span></div>
      </div>
      <p className="admin-hint">{t('دورك الحالي:', 'Your role:')} <strong>{role}</strong></p>
    </div>
  )
}

// ── Lessons (existing JSON override editor) ──────────────────────────────────
function LessonsModule({ lang, t, levels, lessonsByLevel, overrides, initialLevel, adminHandle, onNotice }) {
  const [levelId, setLevelId] = useState(initialLevel)
  const levelLessons = lessonsByLevel[levelId] || []
  const [lessonIndex, setLessonIndex] = useState(0)
  const selectedLesson = levelLessons[lessonIndex] || levelLessons[0] || null
  const selectedKey = selectedLesson ? lessonKey(levelId, selectedLesson.id ?? lessonIndex + 1) : ''
  const selectedOverride = selectedKey ? overrides[selectedKey] : null
  const activeLesson = selectedOverride?.lesson || selectedLesson || {}
  const [jsonText, setJsonText] = useState(prettyLesson(activeLesson))
  const [status, setStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const validation = useMemo(() => validateLessonJson(jsonText), [jsonText])

  useEffect(() => { setLessonIndex(0) }, [levelId])
  useEffect(() => { setJsonText(prettyLesson(activeLesson)); setStatus('') }, [selectedKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const msg = {
    valid: t('JSON صحيح وجاهز للحفظ.', 'JSON is valid and ready.'),
    invalidJson: t('صيغة JSON غير صحيحة.', 'Invalid JSON syntax.'),
    missingFields: t('لازم يكون المحتوى object صالح.', 'Content must be a valid object.'),
  }
  const stats = { vocab: activeLesson?.vocab?.length || 0, grammar: activeLesson?.grammar?.length || 0, examples: activeLesson?.examples?.length || 0 }

  const saveOverride = async (published) => {
    if (!selectedLesson || !validation.ok) return
    setIsSaving(true); setStatus(t('جاري الحفظ...', 'Saving...'))
    try {
      const lessonId = selectedLesson.id ?? lessonIndex + 1
      await setDoc(doc(db, 'lessonOverrides', lessonKey(levelId, lessonId)), {
        levelId, lessonId, lesson: { ...validation.parsed, id: lessonId },
        published, updatedBy: adminHandle, updatedAt: serverTimestamp(),
      }, { merge: true })
      const m = t('تم حفظ الدرس.', 'Lesson saved.'); setStatus(m); onNotice?.(m)
    } catch (error) {
      const m = `${t('تعذر الحفظ.', 'Could not save.')} ${error.code || error.message || ''}`.trim(); setStatus(m); onNotice?.(m)
    } finally { setIsSaving(false) }
  }
  const deleteOverride = async () => {
    if (!selectedKey) return
    setIsSaving(true)
    try {
      await deleteDoc(doc(db, 'lessonOverrides', selectedKey))
      const m = t('تم حذف التعديل.', 'Override deleted.'); setStatus(m); onNotice?.(m)
    } catch (error) {
      const m = `${t('تعذر الحذف.', 'Could not delete.')} ${error.code || error.message || ''}`.trim(); setStatus(m); onNotice?.(m)
    } finally { setIsSaving(false) }
  }
  const statusLabel = selectedOverride ? (selectedOverride.published === true ? t('منشور', 'Published') : t('مسودة', 'Draft')) : t('بدون تعديل', 'No override')

  return (
    <div className="admin-mod admin-layout">
      <aside className="admin-panel admin-sidebar">
        <label><span>{t('المستوى', 'Level')}</span>
          <select value={levelId} onChange={(e) => setLevelId(e.target.value)}>
            {levels.map((level) => <option key={level.id} value={level.id}>{level.id} - {level[lang] || level.en}</option>)}
          </select>
        </label>
        <label><span>{t('الدرس', 'Lesson')}</span>
          <select value={lessonIndex} onChange={(e) => setLessonIndex(Number(e.target.value))}>
            {levelLessons.map((lesson, index) => <option key={lesson.id ?? index} value={index}>{index + 1}. {lesson.title?.[lang] || lesson.title?.en || `${index + 1}`}</option>)}
          </select>
        </label>
        <div className="admin-summary">
          <h2>{t('ملخص', 'Summary')} · {statusLabel}</h2>
          <span><strong>{stats.vocab}</strong>{t('مفردات', 'Vocab')}</span>
          <span><strong>{stats.grammar}</strong>{t('قواعد', 'Grammar')}</span>
          <span><strong>{stats.examples}</strong>{t('أمثلة', 'Examples')}</span>
        </div>
        <button className="admin-secondary" onClick={() => setJsonText(prettyLesson(selectedLesson))}>{t('رجوع للأصل', 'Reset to base')}</button>
        <button className="admin-danger" onClick={deleteOverride} disabled={!selectedOverride || isSaving}>{t('حذف التعديل', 'Delete override')}</button>
      </aside>
      <section className="admin-panel admin-editor">
        <div className="admin-editor-head">
          <h2>{activeLesson.title?.[lang] || activeLesson.title?.en || t('الدرس', 'Lesson')}</h2>
          <span className={validation.ok ? 'admin-valid' : 'admin-invalid'}>{msg[validation.key]}</span>
        </div>
        <textarea className="admin-json" dir="ltr" spellCheck="false" value={jsonText} onChange={(e) => setJsonText(e.target.value)} />
        <div className="admin-actions">
          <button className="admin-secondary" onClick={() => saveOverride(false)} disabled={!validation.ok || isSaving}>{t('حفظ كمسودة', 'Save Draft')}</button>
          <button className="admin-primary" onClick={() => saveOverride(true)} disabled={!validation.ok || isSaving}>{isSaving ? t('جاري الحفظ...', 'Saving...') : t('نشر التعديل', 'Publish')}</button>
        </div>
        {status && <p className="admin-status">{status}</p>}
      </section>
    </div>
  )
}

// ── App Config (app name + nav labels/visibility) ────────────────────────────
function ConfigModule({ t, appConfig, adminHandle, onNotice }) {
  const [appName, setAppName] = useState(appConfig?.appName || { ar: '', en: '' })
  const [labels, setLabels] = useState(appConfig?.nav?.labels || {})
  const [hidden, setHidden] = useState(appConfig?.nav?.hidden || [])
  const [saving, setSaving] = useState(false)
  const toggleHidden = (id) => setHidden((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]))
  const setLabel = (id, k, v) => setLabels((m) => ({ ...m, [id]: { ...(m[id] || {}), [k]: v } }))
  const save = async () => {
    setSaving(true)
    try {
      await saveAppConfig({ appName, nav: { labels, hidden } }, adminHandle)
      onNotice?.(t('تم حفظ الإعدادات.', 'Settings saved.'))
    } catch (e) { onNotice?.(`${t('تعذر الحفظ.', 'Save failed.')} ${e.code || ''}`) } finally { setSaving(false) }
  }
  return (
    <div className="admin-mod">
      <h2>{t('إعدادات التطبيق', 'App Configuration')}</h2>
      <div className="admin-panel admin-form">
        <h3>{t('اسم التطبيق', 'App name')}</h3>
        <div className="admin-row2">
          <label><span>AR</span><input value={appName.ar || ''} onChange={(e) => setAppName({ ...appName, ar: e.target.value })} /></label>
          <label><span>EN</span><input dir="ltr" value={appName.en || ''} onChange={(e) => setAppName({ ...appName, en: e.target.value })} /></label>
        </div>
        <h3>{t('شريط التنقل السفلي', 'Bottom navigation')}</h3>
        <p className="admin-hint">{t('غيّر التسميات أو أخفِ تبويبات.', 'Rename labels or hide tabs.')}</p>
        {NAV_IDS.map((id) => (
          <div key={id} className="admin-navrow">
            <strong className="admin-navid">{id}</strong>
            <input placeholder={t('عربي', 'AR')} value={labels[id]?.ar || ''} onChange={(e) => setLabel(id, 'ar', e.target.value)} />
            <input dir="ltr" placeholder="EN" value={labels[id]?.en || ''} onChange={(e) => setLabel(id, 'en', e.target.value)} />
            <label className="admin-check"><input type="checkbox" checked={hidden.includes(id)} onChange={() => toggleHidden(id)} disabled={id === 'home' || id === 'profile'} />{t('إخفاء', 'Hide')}</label>
          </div>
        ))}
        <button className="admin-primary" onClick={save} disabled={saving}>{saving ? t('جاري الحفظ...', 'Saving...') : t('حفظ', 'Save')}</button>
      </div>
    </div>
  )
}

// ── Feature Flags ────────────────────────────────────────────────────────────
function FlagsModule({ t, appConfig, adminHandle, onNotice }) {
  const [flags, setFlags] = useState(appConfig?.featureFlags || {})
  const [saving, setSaving] = useState(false)
  const labels = {
    club: t('النادي', 'Club'), stories: t('القصص', 'Stories'), community: t('المجتمع', 'Community'),
    ai: t('أبدول سينسي', 'Abdool Sensei'), speaking: t('المحادثة', 'Speaking'),
    listening: t('الاستماع', 'Listening'), challenges: t('التحديات', 'Challenges'),
  }
  const toggle = async (key) => {
    const next = { ...flags, [key]: flags[key] === false }
    setFlags(next); setSaving(true)
    try { await saveAppConfig({ featureFlags: next }, adminHandle) }
    catch (e) { onNotice?.(`${t('تعذر الحفظ.', 'Save failed.')} ${e.code || ''}`); setFlags(flags) } finally { setSaving(false) }
  }
  return (
    <div className="admin-mod">
      <h2>{t('مفاتيح الميزات', 'Feature Flags')}</h2>
      <p className="admin-hint">{t('تفعيل/إيقاف ميزات للتطبيق كله فورًا.', 'Enable/disable features app-wide, instantly.')}</p>
      <div className="admin-panel admin-flags">
        {FEATURE_KEYS.map((key) => {
          const on = flags[key] !== false
          return (
            <div key={key} className="admin-flagrow">
              <span>{labels[key] || key}</span>
              <button type="button" role="switch" aria-checked={on} className={`admin-switch ${on ? 'on' : ''}`} disabled={saving} onClick={() => toggle(key)}>
                <span className="admin-switch-knob" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Roles ────────────────────────────────────────────────────────────────────
function RolesModule({ t, role }) {
  return (
    <div className="admin-mod">
      <h2>{t('الأدوار والصلاحيات', 'Roles & permissions')}</h2>
      <p className="admin-hint">{t('دورك:', 'Your role:')} <strong>{role}</strong></p>
      <div className="admin-panel admin-form">
        <p>{t(
          'الأدوار: Owner / Admin / Moderator / Content Manager / Teacher. يُحفظ الدور في users/{uid}.role. لأسباب أمنية لا يمكن للمستخدم تغيير دوره بنفسه (قواعد Firestore تمنع ذلك)؛ يتم تعيين الأدوار من Firebase Console أو دالة سحابية للمالك.',
          'Roles: Owner / Admin / Moderator / Content Manager / Teacher. The role lives on users/{uid}.role. For security, a user cannot change their own role (Firestore rules block it); roles are assigned from the Firebase Console or an owner-only Cloud Function.',
        )}</p>
      </div>
    </div>
  )
}

// ── Roadmap (transparent module status of the Control Center) ────────────────
const ROADMAP = [
  ['Lessons', 'live'], ['Stories CMS', 'live'], ['Vocabulary (CSV import)', 'live'],
  ['Grammar', 'live'], ['User management', 'live'],
  ['Abdool Sensei prompts', 'live'], ['Notifications', 'live'],
  ['App Config', 'live'], ['Feature Flags', 'live'], ['Roles', 'foundation'],
  ['Exercises', 'planned'], ['Media Library', 'planned (needs Storage)'], ['Community moderation', 'planned'],
  ['Home builder', 'planned'], ['Analytics', 'planned'], ['Backup & Restore', 'planned'],
]
function RoadmapModule({ t }) {
  return (
    <div className="admin-mod">
      <h2>{t('خارطة الطريق', 'Control Center roadmap')}</h2>
      <p className="admin-hint">{t('حالة وحدات لوحة التحكم.', 'Status of every control-center module.')}</p>
      <div className="admin-roadmap">
        {ROADMAP.map(([name, status]) => (
          <div key={name} className={`admin-roadrow status-${status.split(' ')[0]}`}>
            <span>{name}</span><span className="admin-roadbadge">{status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
