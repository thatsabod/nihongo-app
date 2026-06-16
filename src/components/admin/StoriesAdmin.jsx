import { useMemo, useState } from 'react'
import AppIcon from '../AppIcon.jsx'
import { saveStoryOverride, deleteStoryOverride } from '../../hooks/useStoryOverrides.js'

// Module 2 — Stories CMS. Visual editor over the bundled stories + Firestore
// `storyOverrides`. Admins create / edit / delete / publish / reorder stories
// (meta + scenes + questions) with no code. Learners get the merged result.
const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1']
const blankScene = () => ({ jp: '', romaji: '', ar: '' })
const blankQuestion = () => ({ prompt: '', options: ['', '', ''], answer: '', explain: '' })

function storyToForm(st, level) {
  return {
    id: st.id, level,
    titleAr: st.titleAr || st.title || '', titleEn: st.titleEn || '', icon: st.icon || '',
    xp: st.xp || 20, gems: st.gems || 10,
    scenes: (st.sentences || []).map((s) => ({ jp: s.jp || '', romaji: s.romaji || '', ar: s.ar || '' })),
    questions: (st.script || []).filter((x) => x.type === 'q').map((q) => ({
      prompt: q.prompt || '', options: (q.options || ['', '', '']).slice(), answer: q.answer || '', explain: q.explain || '',
    })),
    published: true,
  }
}
const overrideToForm = (o) => ({
  id: o.id, level: o.level || 'N5', titleAr: o.titleAr || '', titleEn: o.titleEn || '', icon: o.icon || '',
  xp: o.xp || 20, gems: o.gems || 10,
  scenes: (o.scenes || []).map((s) => ({ ...blankScene(), ...s })),
  questions: (o.questions || []).map((q) => ({ ...blankQuestion(), ...q, options: (q.options || ['', '', '']).slice() })),
  published: o.published !== false,
})

export default function StoriesAdmin({ lang = 'ar', levels = [], baseStoriesByLevel = {}, storyOverrides = [], adminHandle = '', onNotice }) {
  const t = (ar, en) => (lang === 'ar' ? ar : en)
  const levelIds = (levels.length ? levels.map((l) => l.id) : LEVELS)
  const [level, setLevel] = useState(levelIds[0] || 'N5')
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  const rows = useMemo(() => {
    const ovs = storyOverrides.filter((o) => (o.level || 'N5') === level)
    const ovById = Object.fromEntries(ovs.map((o) => [o.id, o]))
    const bundled = (baseStoriesByLevel[level] || []).map((st) => ({ st, ov: ovById[st.id], custom: false }))
    const bundledIds = new Set((baseStoriesByLevel[level] || []).map((s) => s.id))
    const custom = ovs.filter((o) => !bundledIds.has(o.id)).map((o) => ({ st: o, ov: o, custom: true }))
    return [...bundled, ...custom]
  }, [storyOverrides, baseStoriesByLevel, level])

  const statusOf = (ov) => (!ov ? 'bundled' : ov.deleted ? 'deleted' : ov.published === false ? 'draft' : 'edited')

  const startNew = () => setForm({
    id: `custom-${Date.now()}`, level, titleAr: '', titleEn: '', icon: '📖', xp: 20, gems: 10,
    scenes: [blankScene(), blankScene()], questions: [], published: true, isNew: true,
  })
  const startEdit = (row) => setForm(row.ov ? overrideToForm(row.ov) : storyToForm(row.st, level))

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const setScene = (i, k, v) => setForm((f) => ({ ...f, scenes: f.scenes.map((s, j) => (j === i ? { ...s, [k]: v } : s)) }))
  const moveScene = (i, d) => setForm((f) => { const a = [...f.scenes]; const j = i + d; if (j < 0 || j >= a.length) return f; [a[i], a[j]] = [a[j], a[i]]; return { ...f, scenes: a } })
  const setQ = (i, k, v) => setForm((f) => ({ ...f, questions: f.questions.map((q, j) => (j === i ? { ...q, [k]: v } : q)) }))
  const setQOpt = (i, oi, v) => setForm((f) => ({ ...f, questions: f.questions.map((q, j) => (j === i ? { ...q, options: q.options.map((o, k) => (k === oi ? v : o)) } : q)) }))

  const save = async (published) => {
    if (!form) return
    setSaving(true)
    try {
      const scenes = form.scenes.filter((s) => s.jp.trim())
      const questions = form.questions.filter((q) => q.prompt.trim() && q.answer.trim() && q.options.some((o) => o.trim()))
        .map((q) => ({ ...q, options: q.options.filter((o) => o.trim()) }))
      await saveStoryOverride(form.id, {
        level: form.level, titleAr: form.titleAr, titleEn: form.titleEn, icon: form.icon,
        xp: Number(form.xp) || 20, gems: Number(form.gems) || 10, scenes, questions, published, deleted: false,
      }, adminHandle)
      onNotice?.(published ? t('تم نشر القصة.', 'Story published.') : t('تم حفظ المسودة.', 'Draft saved.'))
      setForm(null)
    } catch (e) { onNotice?.(`${t('تعذر الحفظ.', 'Save failed.')} ${e.code || ''}`) } finally { setSaving(false) }
  }
  const remove = async (row) => {
    try {
      if (row.custom) await deleteStoryOverride(row.st.id)
      else await saveStoryOverride(row.st.id, { level, deleted: true }, adminHandle)
      onNotice?.(t('تم حذف القصة.', 'Story removed.'))
    } catch (e) { onNotice?.(`${t('تعذر الحذف.', 'Delete failed.')} ${e.code || ''}`) }
  }
  const restore = async (row) => { try { await deleteStoryOverride(row.st.id); onNotice?.(t('تمت الاستعادة.', 'Restored.')) } catch (e) { onNotice?.(e.code || '') } }

  if (form) {
    return (
      <div className="admin-mod">
        <div className="admin-editor-head"><h2>{form.isNew ? t('قصة جديدة', 'New story') : t('تعديل القصة', 'Edit story')}</h2>
          <button className="admin-secondary" onClick={() => setForm(null)}>{t('إلغاء', 'Cancel')}</button></div>
        <div className="admin-panel admin-form">
          <div className="admin-row2">
            <label><span>{t('العنوان (عربي)', 'Title (AR)')}</span><input value={form.titleAr} onChange={(e) => setField('titleAr', e.target.value)} /></label>
            <label><span>Title (EN)</span><input dir="ltr" value={form.titleEn} onChange={(e) => setField('titleEn', e.target.value)} /></label>
          </div>
          <div className="admin-row2">
            <label><span>{t('الأيقونة', 'Icon (emoji)')}</span><input value={form.icon} onChange={(e) => setField('icon', e.target.value)} /></label>
            <label><span>{t('المستوى', 'Level')}</span><select value={form.level} onChange={(e) => setField('level', e.target.value)}>{levelIds.map((l) => <option key={l} value={l}>{l}</option>)}</select></label>
          </div>
          <div className="admin-row2">
            <label><span>XP</span><input type="number" value={form.xp} onChange={(e) => setField('xp', e.target.value)} /></label>
            <label><span>{t('جواهر', 'Gems')}</span><input type="number" value={form.gems} onChange={(e) => setField('gems', e.target.value)} /></label>
          </div>
        </div>

        <div className="admin-panel admin-form">
          <div className="admin-editor-head"><h3>{t('المشاهد (الجُمل)', 'Scenes (sentences)')}</h3>
            <button className="admin-secondary" onClick={() => setField('scenes', [...form.scenes, blankScene()])}>+ {t('مشهد', 'Scene')}</button></div>
          {form.scenes.map((s, i) => (
            <div key={i} className="admin-scene">
              <div className="admin-scene-head"><strong>{i + 1}</strong>
                <span><button onClick={() => moveScene(i, -1)} disabled={i === 0}>↑</button><button onClick={() => moveScene(i, 1)} disabled={i === form.scenes.length - 1}>↓</button>
                  <button className="admin-x" onClick={() => setField('scenes', form.scenes.filter((_, j) => j !== i))}>✕</button></span></div>
              <input dir="ltr" placeholder="日本語 (jp)" value={s.jp} onChange={(e) => setScene(i, 'jp', e.target.value)} />
              <input dir="ltr" placeholder="romaji" value={s.romaji} onChange={(e) => setScene(i, 'romaji', e.target.value)} />
              <input placeholder={t('العربية', 'Arabic')} value={s.ar} onChange={(e) => setScene(i, 'ar', e.target.value)} />
            </div>
          ))}
        </div>

        <div className="admin-panel admin-form">
          <div className="admin-editor-head"><h3>{t('الأسئلة', 'Questions')}</h3>
            <button className="admin-secondary" onClick={() => setField('questions', [...form.questions, blankQuestion()])}>+ {t('سؤال', 'Question')}</button></div>
          {form.questions.map((q, i) => (
            <div key={i} className="admin-scene">
              <div className="admin-scene-head"><strong>Q{i + 1}</strong><button className="admin-x" onClick={() => setField('questions', form.questions.filter((_, j) => j !== i))}>✕</button></div>
              <input placeholder={t('نص السؤال', 'Prompt (JP + AR gloss)')} value={q.prompt} onChange={(e) => setQ(i, 'prompt', e.target.value)} />
              {q.options.map((o, oi) => (
                <div key={oi} className="admin-optrow">
                  <input dir="auto" placeholder={`${t('خيار', 'Option')} ${oi + 1}`} value={o} onChange={(e) => setQOpt(i, oi, e.target.value)} />
                  <label className="admin-check"><input type="radio" name={`ans-${i}`} checked={q.answer === o && !!o} onChange={() => setQ(i, 'answer', o)} />{t('صحيح', 'Correct')}</label>
                </div>
              ))}
              <input placeholder={t('شرح (عربي)', 'Explanation (AR)')} value={q.explain} onChange={(e) => setQ(i, 'explain', e.target.value)} />
            </div>
          ))}
        </div>

        <div className="admin-actions">
          <button className="admin-secondary" onClick={() => save(false)} disabled={saving}>{t('حفظ كمسودة', 'Save Draft')}</button>
          <button className="admin-primary" onClick={() => save(true)} disabled={saving}>{saving ? t('جاري الحفظ...', 'Saving...') : t('نشر', 'Publish')}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-mod">
      <div className="admin-editor-head"><h2>{t('إدارة القصص', 'Stories')}</h2>
        <button className="admin-primary" onClick={startNew}>+ {t('قصة جديدة', 'New story')}</button></div>
      <div className="stories-levels">
        {levelIds.map((l) => <button key={l} type="button" className={`stories-level ${level === l ? 'active' : ''}`} onClick={() => setLevel(l)}>{l}</button>)}
      </div>
      <div className="admin-list">
        {rows.length ? rows.map((row) => {
          const status = statusOf(row.ov)
          return (
            <div key={row.st.id} className={`admin-listrow ${status === 'deleted' ? 'is-dim' : ''}`}>
              <span className="admin-listicon" aria-hidden="true">{row.st.icon || (row.st.titleAr ? '📖' : '📖')}</span>
              <span className="admin-listmeta"><strong dir="auto">{row.st.titleAr || row.st.title || row.st.id}</strong>
                <span className={`admin-tag tag-${status}`}>{t({ bundled: 'أساسي', edited: 'مُعدّل', draft: 'مسودة', deleted: 'محذوف' }[status], status)}</span></span>
              <span className="admin-listacts">
                <button className="admin-secondary" onClick={() => startEdit(row)}>{t('تعديل', 'Edit')}</button>
                {row.ov && !row.custom && <button className="admin-secondary" onClick={() => restore(row)}>{t('استعادة', 'Restore')}</button>}
                <button className="admin-danger" onClick={() => remove(row)}>{t('حذف', 'Delete')}</button>
              </span>
            </div>
          )
        }) : <p className="admin-hint">{t('لا توجد قصص.', 'No stories.')}</p>}
      </div>
    </div>
  )
}
