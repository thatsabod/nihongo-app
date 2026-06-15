// Post-call "راجع محادثتك" — the full conversation as chat bubbles with the key
// takeaway on top and inline correction tips (better sentence + Arabic why) on
// the student turns that had mistakes. Richer than the summary report; used by
// Guided Voice Practice before the rating step.
export default function ConversationReviewScreen({ lang, turns = [], report, status, onContinue, onRetry }) {
  const isAr = lang === 'ar'
  const t = (ar, en) => (isAr ? ar : en)
  const loading = status === 'loading'
  const mistakes = Array.isArray(report?.mistakes) ? report.mistakes : []
  const takeaway = report?.summary || report?.recommendedReview?.[0] || ''
  const usable = (turns || []).filter((x) => x && x.text)

  // Attach each mistake to the first matching student bubble (fuzzy contains);
  // anything that doesn't match a bubble is shown in a corrections list below.
  const tipFor = {}
  const used = new Set()
  usable.forEach((turn, i) => {
    if (turn.role !== 'student') return
    const m = mistakes.find((mm) => mm && mm.you && !used.has(mm)
      && (String(turn.text).includes(mm.you) || mm.you.includes(String(turn.text))))
    if (m) { used.add(m); tipFor[i] = m }
  })
  const unmatched = mistakes.filter((m) => m && (m.better || m.why) && !used.has(m))

  return (
    <div className="convrev" dir={isAr ? 'rtl' : 'ltr'}>
      <header className="convrev-head">
        <h1>{t('راجع محادثتك', 'Review your conversation')}</h1>
      </header>

      <div className="convrev-body">
        {(loading || takeaway) && (
          <div className="convrev-takeaway">
            <span className="convrev-takeaway-label">💡 {t('الخلاصة', 'Key takeaway')}</span>
            <p>{loading ? t('جاري تحليل المحادثة…', 'Analyzing the conversation…') : takeaway}</p>
          </div>
        )}

        <div className="convrev-thread">
          {usable.map((turn, i) => (
            <div key={i} className={`convrev-row ${turn.role}`}>
              <div className={`convrev-bubble ${turn.role}`}>{turn.text}</div>
              {tipFor[i] && (
                <div className="convrev-tip">
                  <span className="convrev-tip-label">✨ {t('الأفضل', 'Better')}</span>
                  {tipFor[i].better && <span className="convrev-tip-better" dir="auto">{tipFor[i].better}</span>}
                  {tipFor[i].why && <span className="convrev-tip-why">{tipFor[i].why}</span>}
                </div>
              )}
            </div>
          ))}
        </div>

        {unmatched.length > 0 && (
          <section className="convrev-corrections">
            <h3>✨ {t('تصحيحات', 'Corrections')}</h3>
            {unmatched.map((m, i) => (
              <div key={i} className="convrev-tip">
                {m.you && <span className="convrev-tip-you">{m.you}</span>}
                {m.better && <span className="convrev-tip-better" dir="auto">{m.better}</span>}
                {m.why && <span className="convrev-tip-why">{m.why}</span>}
              </div>
            ))}
          </section>
        )}

        {status === 'error' && (
          <div className="convrev-errnote">
            <p>{t('تعذّر تحليل المحادثة.', 'Could not analyze the conversation.')}</p>
            {onRetry && <button className="btn btn-ghost" onClick={onRetry}>{t('إعادة المحاولة', 'Try again')}</button>}
          </div>
        )}
      </div>

      <footer className="convrev-foot">
        <button className="btn btn-primary convrev-continue" onClick={onContinue}>{t('متابعة', 'Continue')}</button>
      </footer>
    </div>
  )
}
