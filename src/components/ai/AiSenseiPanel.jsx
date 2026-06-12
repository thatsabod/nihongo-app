import { useMemo, useState } from 'react'
import AppIcon from '../AppIcon.jsx'
import { buildSenseiContext } from '../../ai/senseiContext.ts'
import { buildPrompt, SENSEI_FEATURES } from '../../ai/promptTemplates.ts'
import { requestSensei, isSenseiEnabled, remainingDailyQuota } from '../../ai/senseiClient.ts'
import { lookupGrammar } from '../../content/stores.ts'

// AI Sensei entry UI (Phase 7 — design only). Shows the grounded learner
// context, the 7 features, and for each: a transparent preview of the exact
// prompt that WOULD be sent. "Ask Sensei" calls the inert client, which makes
// no external request and returns a clear "not enabled yet" message.
export default function AiSenseiPanel({ lang, level, currentLessonId, currentLessonTitleAr, completedLessonIds = [], onClose }) {
  const isAr = lang === 'ar'
  const ctx = useMemo(
    () => buildSenseiContext(level, { currentLessonId, currentLessonTitleAr, completedLessonIds }),
    [level, currentLessonId, currentLessonTitleAr, completedLessonIds],
  )
  const [active, setActive] = useState(null) // { feature, prompt }
  const [response, setResponse] = useState(null)
  const [busy, setBusy] = useState(false)
  const enabled = isSenseiEnabled()

  const runFeature = (feature) => {
    let params
    if (feature.requiresGrammar) {
      const firstWeak = ctx.weakGrammar[0]
      const g = firstWeak ? lookupGrammar(level, firstWeak.itemId) : undefined
      params = g ? { grammar: g } : undefined
    }
    if (feature.requiresWrongAnswer) {
      const m = ctx.recentMistakes[0]
      params = m
        ? { wrongAnswer: { questionAr: m.questionAr, grammarTitle: m.itemType === 'grammar' ? m.itemId : undefined } }
        : undefined
    }
    setActive({ feature, prompt: buildPrompt(feature.id, ctx, params) })
    setResponse(null)
  }

  const ask = async () => {
    if (!active || busy) return
    setBusy(true)
    setResponse(null)
    try {
      const res = await requestSensei({ feature: active.feature.id, context: ctx, prompt: active.prompt })
      setResponse(res)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sensei-overlay" dir={isAr ? 'rtl' : 'ltr'}>
      <header className="sensei-head">
        <button className="icon-btn" onClick={onClose}><AppIcon name="back" size={22} /></button>
        <div>
          <p className="eyebrow">{isAr ? 'مساعد التعلّم' : 'Learning assistant'}</p>
          <h1>{isAr ? 'عبدول سينسيه 先生' : 'Abdoul Sensei 先生'}</h1>
        </div>
      </header>

      {/* Grounded context — what Sensei "knows" */}
      <section className="sensei-context">
        <span className="sensei-chip"><AppIcon name="star" size={14} />{level}</span>
        {ctx.currentLessonTitleAr && (
          <span className="sensei-chip">{isAr ? 'الدرس' : 'Lesson'}: {ctx.currentLessonTitleAr}</span>
        )}
        <span className="sensei-chip">{isAr ? 'دروس مكتملة' : 'Completed'}: {ctx.completedLessonIds.length}</span>
        <span className={`sensei-chip ${ctx.weakGrammar.length ? 'weak' : ''}`}>{isAr ? 'قواعد ضعيفة' : 'Weak grammar'}: {ctx.weakGrammar.length}</span>
        <span className={`sensei-chip ${ctx.weakVocabulary.length ? 'weak' : ''}`}>{isAr ? 'مفردات ضعيفة' : 'Weak vocab'}: {ctx.weakVocabulary.length}</span>
        <span className={`sensei-chip ${ctx.weakKanji.length ? 'weak' : ''}`}>{isAr ? 'كانجي ضعيف' : 'Weak kanji'}: {ctx.weakKanji.length}</span>
        <span className="sensei-chip">{isAr ? 'مراجعات اليوم' : 'Reviews due'}: {ctx.reviewDueCount}</span>
      </section>

      <div className="sensei-notice">
        <AppIcon name="hint" size={16} />
        <span>{enabled
          ? (isAr
            ? `سينسيه مفعّل ويعتمد على بياناتك فقط. المتبقي اليوم: ${remainingDailyQuota()} طلبًا.`
            : `Sensei is live and grounded in your data. ${remainingDailyQuota()} requests left today.`)
          : (isAr
            ? 'عبدول سينسيه مصمَّم ليعتمد على بياناتك فقط. لم يتم تفعيل أي خدمة ذكاء اصطناعي بعد.'
            : 'Abdoul Sensei is grounded in your data only. No AI service is connected yet.')}</span>
      </div>

      {!active ? (
        <div className="sensei-feature-grid">
          {SENSEI_FEATURES.map((f) => (
            <button key={f.id} className="sensei-feature-card" onClick={() => runFeature(f)}>
              <span className="sensei-feature-icon"><AppIcon name={f.icon} size={22} /></span>
              <strong>{isAr ? f.titleAr : f.titleEn}</strong>
              <small>{f.descriptionAr}</small>
            </button>
          ))}
        </div>
      ) : (
        <div className="sensei-detail">
          <button className="btn btn-secondary sensei-back" onClick={() => { setActive(null); setResponse(null) }}>
            <AppIcon name="back" size={16} />{isAr ? 'كل الميزات' : 'All features'}
          </button>
          <h2>{isAr ? active.feature.titleAr : active.feature.titleEn}</h2>

          <div className="sensei-prompt-preview">
            <p className="sensei-prompt-label">{isAr ? 'التلميح الذي سيُرسَل (معاينة)' : 'Prompt that would be sent (preview)'}</p>
            <pre className="sensei-prompt-block sensei-prompt-system" dir="rtl">{active.prompt.system}</pre>
            <pre className="sensei-prompt-block sensei-prompt-user" dir="rtl">{active.prompt.user}</pre>
          </div>

          <button className="btn btn-primary" onClick={ask} disabled={busy}>
            {busy
              ? (isAr ? 'سينسيه يفكر…' : 'Sensei is thinking…')
              : (isAr ? 'اسأل سينسيه' : 'Ask Sensei')}
          </button>

          {response && response.status === 'ok' && response.content && (
            <div className="sensei-answer" dir="rtl">
              {response.content}
            </div>
          )}

          {response && response.status !== 'ok' && (
            <div className={`sensei-response status-${response.status}`}>
              <AppIcon name={response.status === 'disabled' ? 'hint' : 'wrong'} size={18} />
              <p>{response.message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
