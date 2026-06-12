import AppIcon from '../AppIcon.jsx'

// Shown inline after a wrong answer — surfaces the correct answer, grammar
// explanation (in Arabic), a related example sentence, and any vocab involved.
// The student must tap "Got it, continue" to advance; no auto-skip.
export default function MistakeFeedback({ isAr, correctAnswer, grammarRule, vocabMatches, onContinue, onRetry }) {
  return (
    <div className="mistake-feedback">
      <div className="mistake-feedback-header">
        <AppIcon name="wrong" size={18} />
        <span>{isAr ? 'إجابة خاطئة' : 'Incorrect'}</span>
      </div>

      {correctAnswer && (
        <div className="mistake-correct-answer">
          <span className="mistake-correct-label">{isAr ? 'الإجابة الصحيحة:' : 'Correct answer:'}</span>
          <span className="mistake-correct-value" dir="ltr">{correctAnswer}</span>
        </div>
      )}

      {grammarRule && (
        <div className="mistake-grammar">
          <div className="mistake-grammar-point">
            {grammarRule.particle && (
              <span className="grammar-particle-badge" dir="ltr" style={{ fontSize: '0.8rem', padding: '3px 10px' }}>
                {grammarRule.particle}
              </span>
            )}
            <strong>{grammarRule.title}</strong>
          </div>

          {grammarRule.explanation && (
            <p className="mistake-explanation" dir="rtl">{grammarRule.explanation}</p>
          )}

          {grammarRule.example && (
            <div className="mistake-example">
              <span className="mistake-example-jp" dir="ltr">{grammarRule.example.jp}</span>
              {grammarRule.example.romaji && (
                <small className="mistake-example-romaji" dir="ltr">{grammarRule.example.romaji}</small>
              )}
              <span className="mistake-example-ar" dir="rtl">{grammarRule.example.ar}</span>
            </div>
          )}
        </div>
      )}

      {vocabMatches && vocabMatches.length > 0 && (
        <div className="mistake-vocab">
          <p className="mistake-vocab-label">{isAr ? 'مفردات ذات صلة:' : 'Related vocabulary:'}</p>
          <div className="mistake-vocab-chips">
            {vocabMatches.map((item) => (
              <div key={item.id || item.jp} className="mistake-vocab-chip">
                <span dir="ltr">{item.kanji || item.jp}</span>
                <small>{item.meaning}</small>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mistake-actions">
        {onRetry && (
          <button className="btn btn-secondary mistake-retry-btn" onClick={onRetry}>
            {isAr ? 'حاول مرة أخرى' : 'Try again'}
          </button>
        )}
        <button className="btn btn-primary mistake-continue-btn" onClick={onContinue}>
          {isAr ? 'فهمت، التالي' : 'Got it, continue'}
          <AppIcon name="next" size={16} />
        </button>
      </div>
    </div>
  )
}
