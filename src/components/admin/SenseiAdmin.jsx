import { useState } from 'react'
import useAiConfig, { saveAiConfig } from '../../hooks/useAiConfig.js'

// Module 12 — Abdool Sensei control. Edit the AI tutor's greeting, an extra
// instruction appended to every call's context, and XP per call — no code.
export default function SenseiAdmin({ lang = 'ar', adminHandle = '', onNotice }) {
  const t = (ar, en) => (lang === 'ar' ? ar : en)
  const cfg = useAiConfig()
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)
  const f = form || { greeting: cfg.greeting, promptAppend: cfg.promptAppend, xpPerCall: cfg.xpPerCall }
  const setField = (k, v) => setForm({ ...f, [k]: v })
  const setGreeting = (k, v) => setForm({ ...f, greeting: { ...f.greeting, [k]: v } })

  const save = async () => {
    setBusy(true)
    try {
      await saveAiConfig({ greeting: f.greeting, promptAppend: f.promptAppend, xpPerCall: Number(f.xpPerCall) || 20 }, adminHandle)
      onNotice?.(t('تم حفظ إعدادات سينسي.', 'Sensei settings saved.')); setForm(null)
    } catch (e) { onNotice?.(`${t('تعذر الحفظ.', 'Save failed.')} ${e.code || ''}`) } finally { setBusy(false) }
  }

  return (
    <div className="admin-mod">
      <h2>{t('تحكّم أبدول سينسي', 'Abdool Sensei')}</h2>
      <p className="admin-hint">{t('يُطبَّق فورًا على مكالمات سينسي (التحية + تعليمات إضافية + نقاط الخبرة).', 'Applied live to Sensei calls (greeting + extra instruction + XP).')}</p>
      <div className="admin-panel admin-form">
        <h3>{t('التحية', 'Greeting')}</h3>
        <label><span>AR</span><textarea className="admin-json" rows={2} dir="rtl" value={f.greeting.ar || ''} onChange={(e) => setGreeting('ar', e.target.value)} /></label>
        <label><span>EN</span><textarea className="admin-json" rows={2} dir="ltr" value={f.greeting.en || ''} onChange={(e) => setGreeting('en', e.target.value)} /></label>
        <h3>{t('تعليمات إضافية للمعلّم', 'Extra tutor instruction')}</h3>
        <p className="admin-hint">{t('تُضاف إلى تعليمات سينسي في كل مكالمة (مثل: ركّز على النطق، استخدم جُملًا قصيرة).', 'Appended to the tutor instructions on every call (e.g. focus on pronunciation, keep sentences short).')}</p>
        <textarea className="admin-json" rows={4} dir="auto" value={f.promptAppend || ''} onChange={(e) => setField('promptAppend', e.target.value)} />
        <label><span>{t('نقاط الخبرة لكل مكالمة', 'XP per call')}</span><input type="number" value={f.xpPerCall} onChange={(e) => setField('xpPerCall', e.target.value)} /></label>
        <button className="admin-primary" onClick={save} disabled={busy}>{busy ? t('جاري الحفظ...', 'Saving...') : t('حفظ', 'Save')}</button>
      </div>
      <p className="admin-hint">{t('ملاحظة: التعليمات الأساسية للنظام تُبنى في الدالة السحابية؛ هذه الإضافة تمر عبر سياق المكالمة بدون نشر.', 'Note: the base system prompt is built in the Cloud Function; this addendum flows via the call context with no deploy needed.')}</p>
    </div>
  )
}
