import { useEffect, useMemo, useState } from 'react'
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../../firebase.js'
import AppIcon from '../AppIcon.jsx'

const adminCopy = {
  ar: {
    title: 'لوحة الأدمن',
    subtitle: 'تعديل محتوى الدروس بدون لمس ملفات التطبيق.',
    level: 'المستوى',
    lesson: 'الدرس',
    base: 'النسخة الأصلية',
    published: 'منشور',
    draft: 'مسودة',
    noOverride: 'بدون تعديل',
    saveDraft: 'حفظ كمسودة',
    publish: 'نشر التعديل',
    reset: 'رجوع للأصل',
    remove: 'حذف التعديل',
    back: 'رجوع',
    json: 'محتوى الدرس JSON',
    valid: 'JSON صحيح وجاهز للحفظ.',
    invalidJson: 'صيغة JSON غير صحيحة.',
    missingFields: 'لازم يكون المحتوى object صالح للدرس.',
    saving: 'جاري الحفظ...',
    saved: 'تم حفظ الدرس.',
    saveFailed: 'تعذر حفظ الدرس.',
    deleted: 'تم حذف تعديل الدرس.',
    deleteFailed: 'تعذر حذف التعديل.',
    counts: 'ملخص المحتوى',
    vocab: 'مفردات',
    grammar: 'قواعد',
    examples: 'أمثلة',
  },
  en: {
    title: 'Admin Dashboard',
    subtitle: 'Edit lesson content without changing app files.',
    level: 'Level',
    lesson: 'Lesson',
    base: 'Base version',
    published: 'Published',
    draft: 'Draft',
    noOverride: 'No override',
    saveDraft: 'Save Draft',
    publish: 'Publish Override',
    reset: 'Reset to base',
    remove: 'Delete override',
    back: 'Back',
    json: 'Lesson JSON',
    valid: 'JSON is valid and ready.',
    invalidJson: 'Invalid JSON syntax.',
    missingFields: 'Content must be a valid lesson object.',
    saving: 'Saving...',
    saved: 'Lesson saved.',
    saveFailed: 'Could not save lesson.',
    deleted: 'Lesson override deleted.',
    deleteFailed: 'Could not delete override.',
    counts: 'Content summary',
    vocab: 'Vocabulary',
    grammar: 'Grammar',
    examples: 'Examples',
  },
}

function lessonKey(levelId, lessonId) {
  return `${levelId}-${lessonId}`
}

function prettyLesson(lesson) {
  return JSON.stringify(lesson || {}, null, 2)
}

function validateLessonJson(text) {
  try {
    const parsed = JSON.parse(text)
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      return { ok: false, messageKey: 'missingFields', parsed: null }
    }
    return { ok: true, messageKey: 'valid', parsed }
  } catch {
    return { ok: false, messageKey: 'invalidJson', parsed: null }
  }
}

export default function AdminDashboard({
  lang = 'ar',
  levels = [],
  lessonsByLevel = {},
  overrides = {},
  initialLevel = 'N5',
  adminHandle = '',
  onBack,
  onNotice,
}) {
  const t = adminCopy[lang] || adminCopy.ar
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

  useEffect(() => {
    setLessonIndex(0)
  }, [levelId])

  useEffect(() => {
    setJsonText(prettyLesson(activeLesson))
    setStatus('')
  }, [selectedKey])

  const stats = useMemo(() => ({
    vocab: activeLesson?.vocab?.length || 0,
    grammar: activeLesson?.grammar?.length || 0,
    examples: activeLesson?.examples?.length || 0,
  }), [activeLesson])

  const saveOverride = async (published) => {
    if (!selectedLesson || !validation.ok) return
    setIsSaving(true)
    setStatus(t.saving)
    try {
      const lessonId = selectedLesson.id ?? lessonIndex + 1
      const cleanedLesson = {
        ...validation.parsed,
        id: lessonId,
      }
      await setDoc(doc(db, 'lessonOverrides', lessonKey(levelId, lessonId)), {
        levelId,
        lessonId,
        lesson: cleanedLesson,
        published,
        updatedBy: adminHandle,
        updatedAt: serverTimestamp(),
      }, { merge: true })
      setStatus(t.saved)
      onNotice?.(t.saved)
    } catch (error) {
      const message = `${t.saveFailed} ${error.code || error.message || ''}`.trim()
      setStatus(message)
      onNotice?.(message)
    } finally {
      setIsSaving(false)
    }
  }

  const deleteOverride = async () => {
    if (!selectedKey) return
    setIsSaving(true)
    try {
      await deleteDoc(doc(db, 'lessonOverrides', selectedKey))
      setStatus(t.deleted)
      onNotice?.(t.deleted)
    } catch (error) {
      const message = `${t.deleteFailed} ${error.code || error.message || ''}`.trim()
      setStatus(message)
      onNotice?.(message)
    } finally {
      setIsSaving(false)
    }
  }

  const statusLabel = selectedOverride
    ? selectedOverride.published === true ? t.published : t.draft
    : t.noOverride

  return (
    <main className="admin-dashboard">
      <header className="admin-hero">
        <button className="admin-back" onClick={onBack} aria-label={t.back}>
          <AppIcon name="back" size={22} />
        </button>
        <div>
          <p>{adminHandle}</p>
          <h1>{t.title}</h1>
          <span>{t.subtitle}</span>
        </div>
        <span className="admin-badge">
          <AppIcon name="files" size={22} />
          {statusLabel}
        </span>
      </header>

      <section className="admin-layout">
        <aside className="admin-panel admin-sidebar">
          <label>
            <span>{t.level}</span>
            <select value={levelId} onChange={(event) => setLevelId(event.target.value)}>
              {levels.map((level) => (
                <option key={level.id} value={level.id}>{level.id} - {level[lang] || level.en}</option>
              ))}
            </select>
          </label>

          <label>
            <span>{t.lesson}</span>
            <select value={lessonIndex} onChange={(event) => setLessonIndex(Number(event.target.value))}>
              {levelLessons.map((lesson, index) => (
                <option key={lesson.id ?? index} value={index}>
                  {index + 1}. {lesson.title?.[lang] || lesson.title?.en || `${t.lesson} ${index + 1}`}
                </option>
              ))}
            </select>
          </label>

          <div className="admin-summary">
            <h2>{t.counts}</h2>
            <span><strong>{stats.vocab}</strong>{t.vocab}</span>
            <span><strong>{stats.grammar}</strong>{t.grammar}</span>
            <span><strong>{stats.examples}</strong>{t.examples}</span>
          </div>

          <button className="admin-secondary" onClick={() => setJsonText(prettyLesson(selectedLesson))}>
            {t.reset}
          </button>
          <button className="admin-danger" onClick={deleteOverride} disabled={!selectedOverride || isSaving}>
            {t.remove}
          </button>
        </aside>

        <section className="admin-panel admin-editor">
          <div className="admin-editor-head">
            <div>
              <p>{t.json}</p>
              <h2>{activeLesson.title?.[lang] || activeLesson.title?.en || t.lesson}</h2>
            </div>
            <span className={validation.ok ? 'admin-valid' : 'admin-invalid'}>
              {t[validation.messageKey]}
            </span>
          </div>

          <textarea
            className="admin-json"
            dir="ltr"
            spellCheck="false"
            value={jsonText}
            onChange={(event) => setJsonText(event.target.value)}
          />

          <div className="admin-actions">
            <button className="admin-secondary" onClick={() => saveOverride(false)} disabled={!validation.ok || isSaving}>
              {t.saveDraft}
            </button>
            <button className="admin-primary" onClick={() => saveOverride(true)} disabled={!validation.ok || isSaving}>
              {isSaving ? t.saving : t.publish}
            </button>
          </div>
          {status && <p className="admin-status">{status}</p>}
        </section>
      </section>
    </main>
  )
}
