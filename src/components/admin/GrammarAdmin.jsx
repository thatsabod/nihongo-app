import { useMemo, useState } from 'react'
import useGrammar, { saveGrammar, deleteGrammar } from '../../hooks/useGrammar.js'

// Module 4 — Grammar CMS. CRUD over the `grammar` collection (title, level,
// structure, explanation, examples). Managed content store.
const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1']
const blankEx = () => ({ jp: '', romaji: '', ar: '' })
const blank = (level) => ({ id: '', title: '', level, structure: '', explanation: '', examples: [blankEx()] })

export default function GrammarAdmin({ lang = 'ar', adminHandle = '', onNotice }) {
  const t = (ar, en) => (lang === 'ar' ? ar : en)
  const items = useGrammar()
  const [level, setLevel] = useState('N5')
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)

  const rows = useMemo(() => items.filter((g) => (g.level || 'N5') === level), [items, level])
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const setEx = (i, k, v) => setForm((f) => ({ ...f, examples: f.examples.map((e, j) => (j === i ? { ...e, [k]: v } : e)) }))

  const save = async () => {
    if (!form?.title?.trim()) return
    setBusy(true)
    try {
      const id = form.id || `g-${form.level}-${Date.now()}`
      await saveGrammar(id, {
        title: form.title, level: form.level, structure: form.structure, explanation: form.explanation,
        examples: form.examples.filter((e) => e.jp.trim()),
      }, adminHandle)
      onNotice?.(t('تم حفظ القاعدة.', 'Grammar saved.')); setForm(null)
    } catch (e) { onNotice?.(`${t('تعذر الحفظ.', 'Save failed.')} ${e.code || ''}`) } finally { setBusy(false) }
  }
  const remove = async (g) => { try { await deleteGrammar(g.id); onNotice?.(t('تم الحذف.', 'Deleted.')) } catch (e) { onNotice?.(e.code || '') } }

  if (form) {
    return (
      <div className="admin-mod">
        <div className="admin-editor-head"><h2>{form.id ? t('تعديل قاعدة', 'Edit grammar') : t('قاعدة جديدة', 'New grammar')}</h2>
          <button className="admin-secondary" onClick={() => setForm(null)}>{t('إلغاء', 'Cancel')}</button></div>
        <div className="admin-panel admin-form">
          <div className="admin-row2">
            <label><span>{t('العنوان', 'Title')}</span><input dir="auto" value={form.title} onChange={(e) => setField('title', e.target.value)} /></label>
            <label><span>{t('المستوى', 'Level')}</span><select value={form.level} onChange={(e) => setField('level', e.target.value)}>{LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}</select></label>
          </div>
          <label><span>{t('التركيب', 'Structure')}</span><input dir="ltr" value={form.structure} onChange={(e) => setField('structure', e.target.value)} /></label>
          <label><span>{t('الشرح (عربي)', 'Explanation (AR)')}</span><textarea className="admin-json" rows={3} value={form.explanation} onChange={(e) => setField('explanation', e.target.value)} /></label>
        </div>
        <div className="admin-panel admin-form">
          <div className="admin-editor-head"><h3>{t('أمثلة', 'Examples')}</h3>
            <button className="admin-secondary" onClick={() => setField('examples', [...form.examples, blankEx()])}>+ {t('مثال', 'Example')}</button></div>
          {form.examples.map((ex, i) => (
            <div key={i} className="admin-scene">
              <div className="admin-scene-head"><strong>{i + 1}</strong><button className="admin-x" onClick={() => setField('examples', form.examples.filter((_, j) => j !== i))}>✕</button></div>
              <input dir="ltr" placeholder="日本語" value={ex.jp} onChange={(e) => setEx(i, 'jp', e.target.value)} />
              <input dir="ltr" placeholder="romaji" value={ex.romaji} onChange={(e) => setEx(i, 'romaji', e.target.value)} />
              <input placeholder={t('العربية', 'Arabic')} value={ex.ar} onChange={(e) => setEx(i, 'ar', e.target.value)} />
            </div>
          ))}
        </div>
        <button className="admin-primary" onClick={save} disabled={busy}>{busy ? t('جاري الحفظ...', 'Saving...') : t('حفظ', 'Save')}</button>
      </div>
    )
  }

  return (
    <div className="admin-mod">
      <div className="admin-editor-head"><h2>{t('إدارة القواعد', 'Grammar')}</h2>
        <button className="admin-primary" onClick={() => setForm(blank(level))}>+ {t('قاعدة', 'Grammar')}</button></div>
      <div className="stories-levels">{LEVELS.map((l) => <button key={l} type="button" className={`stories-level ${level === l ? 'active' : ''}`} onClick={() => setLevel(l)}>{l}</button>)}</div>
      <div className="admin-list">
        {rows.map((g) => (
          <div key={g.id} className="admin-listrow">
            <span className="admin-listmeta"><strong dir="auto">{g.title}</strong>
              <span className="admin-hint" dir="ltr">{g.structure}</span></span>
            <span className="admin-listacts">
              <button className="admin-secondary" onClick={() => setForm({ ...blank(g.level || 'N5'), ...g, examples: g.examples?.length ? g.examples : [blankEx()] })}>{t('تعديل', 'Edit')}</button>
              <button className="admin-danger" onClick={() => remove(g)}>{t('حذف', 'Delete')}</button>
            </span>
          </div>
        ))}
        {!rows.length && <p className="admin-hint">{t('لا توجد قواعد مخصّصة بعد.', 'No custom grammar yet.')}</p>}
      </div>
    </div>
  )
}
