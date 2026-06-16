import { useMemo, useState } from 'react'
import useCustomVocab, { saveVocab, deleteVocab, importVocabCsv } from '../../hooks/useCustomVocab.js'

// Module 3 — Vocabulary CMS. CRUD + CSV bulk import. Custom vocab feeds the
// global furigana dictionary, so its kanji get readings app-wide.
const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1']
const blank = (level) => ({ id: '', kanji: '', hiragana: '', reading: '', meaning: '', example: '', level })

export default function VocabAdmin({ lang = 'ar', adminHandle = '', onNotice }) {
  const t = (ar, en) => (lang === 'ar' ? ar : en)
  const items = useCustomVocab()
  const [level, setLevel] = useState('N5')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(null)
  const [csv, setCsv] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [busy, setBusy] = useState(false)

  const rows = useMemo(() => items
    .filter((v) => (v.level || 'N5') === level)
    .filter((v) => { const q = search.trim().toLowerCase(); return !q || [v.kanji, v.jp, v.hiragana, v.meaning].some((x) => String(x || '').toLowerCase().includes(q)) })
    .sort((a, b) => String(a.kanji || a.jp).localeCompare(String(b.kanji || b.jp))), [items, level, search])

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const save = async () => {
    if (!form?.kanji?.trim()) return
    setBusy(true)
    try {
      const id = form.id || `v-${form.level}-${form.kanji}-${Date.now()}`.replace(/\s+/g, '')
      await saveVocab(id, {
        jp: form.kanji, kanji: form.kanji, hiragana: form.hiragana, reading: form.reading,
        meaning: form.meaning, example: form.example, level: form.level, source: form.id ? undefined : 'manual',
      }, adminHandle)
      onNotice?.(t('تم حفظ الكلمة.', 'Vocabulary saved.')); setForm(null)
    } catch (e) { onNotice?.(`${t('تعذر الحفظ.', 'Save failed.')} ${e.code || ''}`) } finally { setBusy(false) }
  }
  const remove = async (v) => { try { await deleteVocab(v.id); onNotice?.(t('تم الحذف.', 'Deleted.')) } catch (e) { onNotice?.(e.code || '') } }
  const runImport = async () => {
    setBusy(true)
    try { const n = await importVocabCsv(csv, level, adminHandle); onNotice?.(t(`تم استيراد ${n} كلمة.`, `Imported ${n} words.`)); setCsv(''); setShowImport(false) }
    catch (e) { onNotice?.(`${t('تعذر الاستيراد.', 'Import failed.')} ${e.code || ''}`) } finally { setBusy(false) }
  }
  const onFile = (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setCsv(String(r.result || '')); r.readAsText(f) }

  if (form) {
    return (
      <div className="admin-mod">
        <div className="admin-editor-head"><h2>{form.id ? t('تعديل كلمة', 'Edit word') : t('كلمة جديدة', 'New word')}</h2>
          <button className="admin-secondary" onClick={() => setForm(null)}>{t('إلغاء', 'Cancel')}</button></div>
        <div className="admin-panel admin-form">
          <div className="admin-row2">
            <label><span>{t('الكلمة (كانجي/ياباني)', 'Word (kanji/JP)')}</span><input dir="ltr" value={form.kanji} onChange={(e) => setField('kanji', e.target.value)} /></label>
            <label><span>{t('القراءة (هيراغانا)', 'Reading (hiragana)')}</span><input dir="ltr" value={form.hiragana} onChange={(e) => setField('hiragana', e.target.value)} /></label>
          </div>
          <div className="admin-row2">
            <label><span>Romaji</span><input dir="ltr" value={form.reading} onChange={(e) => setField('reading', e.target.value)} /></label>
            <label><span>{t('المستوى', 'Level')}</span><select value={form.level} onChange={(e) => setField('level', e.target.value)}>{LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}</select></label>
          </div>
          <label><span>{t('المعنى', 'Meaning')}</span><input value={form.meaning} onChange={(e) => setField('meaning', e.target.value)} /></label>
          <label><span>{t('مثال', 'Example')}</span><input dir="ltr" value={form.example} onChange={(e) => setField('example', e.target.value)} /></label>
          <button className="admin-primary" onClick={save} disabled={busy}>{busy ? t('جاري الحفظ...', 'Saving...') : t('حفظ', 'Save')}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-mod">
      <div className="admin-editor-head"><h2>{t('إدارة المفردات', 'Vocabulary')}</h2>
        <span className="admin-listacts">
          <button className="admin-secondary" onClick={() => setShowImport((s) => !s)}>{t('استيراد CSV', 'Import CSV')}</button>
          <button className="admin-primary" onClick={() => setForm(blank(level))}>+ {t('كلمة', 'Word')}</button>
        </span></div>

      {showImport && (
        <div className="admin-panel admin-form">
          <p className="admin-hint">{t('الأعمدة: kanji, hiragana, romaji, meaning, example — أو الصق CSV بترويسة.', 'Columns: kanji, hiragana, romaji, meaning, example — or paste CSV with a header row.')}</p>
          <input type="file" accept=".csv,text/csv" onChange={onFile} />
          <textarea className="admin-json" dir="ltr" rows={6} placeholder={'kanji,hiragana,romaji,meaning\n学校,がっこう,gakkou,مدرسة'} value={csv} onChange={(e) => setCsv(e.target.value)} />
          <button className="admin-primary" onClick={runImport} disabled={busy || !csv.trim()}>{busy ? t('جاري...', 'Importing...') : t(`استيراد إلى ${level}`, `Import to ${level}`)}</button>
        </div>
      )}

      <div className="stories-levels">{LEVELS.map((l) => <button key={l} type="button" className={`stories-level ${level === l ? 'active' : ''}`} onClick={() => setLevel(l)}>{l}</button>)}</div>
      <input className="admin-search" placeholder={t('بحث…', 'Search…')} value={search} onChange={(e) => setSearch(e.target.value)} />
      <p className="admin-hint">{rows.length} {t('كلمة', 'words')}</p>
      <div className="admin-list">
        {rows.map((v) => (
          <div key={v.id} className="admin-listrow">
            <span className="admin-listmeta"><strong dir="ltr">{v.kanji || v.jp} {v.hiragana ? `（${v.hiragana}）` : ''}</strong>
              <span className="admin-hint" dir="auto">{v.meaning}</span></span>
            <span className="admin-listacts">
              <button className="admin-secondary" onClick={() => setForm({ ...blank(v.level || 'N5'), ...v, kanji: v.kanji || v.jp || '' })}>{t('تعديل', 'Edit')}</button>
              <button className="admin-danger" onClick={() => remove(v)}>{t('حذف', 'Delete')}</button>
            </span>
          </div>
        ))}
        {!rows.length && <p className="admin-hint">{t('لا توجد مفردات مخصّصة بعد.', 'No custom vocabulary yet.')}</p>}
      </div>
    </div>
  )
}
