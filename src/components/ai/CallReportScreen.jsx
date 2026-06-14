import AppIcon from '../AppIcon.jsx'

// Phase C — full-screen study report shown after a live call ends. Renders the
// structured report from generateCallReport(); handles loading / empty / error
// states so the user always sees a clear outcome.
export default function CallReportScreen({ report, status, lang, onClose, onRetry }) {
  const isAr = lang === 'ar'
  const t = (ar, en) => (isAr ? ar : en)

  if (status === 'loading') {
    return (
      <div className="call-report" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="call-report-loading">
          <span className="call-report-spinner" aria-hidden="true" />
          <p>{t('سينسيه يحضّر تقرير مكالمتك…', 'Sensei is preparing your call report…')}</p>
        </div>
      </div>
    )
  }

  if (status !== 'ok' || !report) {
    const msg =
      status === 'empty'
        ? t('المكالمة كانت قصيرة جداً لإنشاء تقرير.', 'The call was too short to make a report.')
        : status === 'disabled'
          ? t('سجّل الدخول بحسابك للحصول على تقرير المكالمة.', 'Sign in to get a call report.')
          : t('تعذّر إنشاء التقرير الآن. حاول مرة أخرى.', 'Could not create the report right now.')
    return (
      <div className="call-report" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="call-report-empty">
          <span className="call-report-empty-icon" aria-hidden="true">📋</span>
          <p>{msg}</p>
          <div className="call-report-actions">
            {status === 'error' && onRetry && (
              <button className="btn btn-ghost" onClick={onRetry}>
                {t('إعادة المحاولة', 'Try again')}
              </button>
            )}
            <button className="btn btn-primary" onClick={onClose}>
              {t('تم', 'Done')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const sections = [
    { key: 'wordsLearned', icon: '🆕', label: t('كلمات تعلّمتها', 'Words you learned'), items: report.wordsLearned },
    { key: 'grammarUsed', icon: '📐', label: t('قواعد استخدمتها', 'Grammar you used'), items: report.grammarUsed },
    { key: 'pronunciationNotes', icon: '🗣️', label: t('ملاحظات النطق', 'Pronunciation notes'), items: report.pronunciationNotes },
    { key: 'recommendedReview', icon: '🔁', label: t('راجع هذا لاحقاً', 'Review next'), items: report.recommendedReview },
  ].filter((s) => s.items && s.items.length)

  const hasMistakes = report.mistakes && report.mistakes.length > 0
  const scoreClass = report.score == null ? '' : report.score >= 75 ? 'good' : report.score >= 50 ? 'mid' : 'low'

  return (
    <div className="call-report" dir={isAr ? 'rtl' : 'ltr'}>
      <header className="call-report-head">
        <h2>{t('تقرير المكالمة', 'Call report')}</h2>
        <button className="call-report-close" onClick={onClose} aria-label={t('إغلاق', 'Close')}>
          <AppIcon name="wrong" size={20} />
        </button>
      </header>

      <div className="call-report-body">
        {report.score != null && (
          <div className={`call-report-score ${scoreClass}`}>
            <div className="call-report-score-num">
              {report.score}
              <small>/100</small>
            </div>
            <p>{t('تقييم هذه المكالمة', "This call's score")}</p>
          </div>
        )}

        {report.summary && <p className="call-report-summary">{report.summary}</p>}

        {hasMistakes && (
          <section className="call-report-section">
            <h3>⚠️ {t('أخطاء لتصحيحها', 'Mistakes to fix')}</h3>
            <ul className="call-report-mistakes">
              {report.mistakes.map((m, i) => (
                <li key={i} className="call-report-mistake">
                  {m.you && <span className="cr-you">{m.you}</span>}
                  {m.better && <span className="cr-better">{m.better}</span>}
                  {m.why && <span className="cr-why">{m.why}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {sections.map((s) => (
          <section className="call-report-section" key={s.key}>
            <h3>
              <span aria-hidden="true">{s.icon}</span> {s.label}
            </h3>
            <ul className="call-report-list">
              {s.items.map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>
          </section>
        ))}

        {!hasMistakes && !sections.length && !report.summary && (
          <p className="call-report-summary">{t('لا توجد ملاحظات لهذه المكالمة.', 'No notes for this call.')}</p>
        )}
      </div>

      <footer className="call-report-foot">
        <button className="btn btn-primary call-report-done" onClick={onClose}>
          {t('تم — رجوع', 'Done')}
        </button>
      </footer>
    </div>
  )
}
