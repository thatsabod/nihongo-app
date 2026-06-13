import { useState } from 'react'

// Small in-feed challenge: pick a particle / translation / grammar answer.
// Self-grading, local-only (no backend) — gives instant correct/wrong feedback.
export default function DailyChallengeCard({ challenge, lang }) {
  const isAr = lang === 'ar'
  const [picked, setPicked] = useState(null)
  if (!challenge) return null
  const answered = picked != null

  return (
    <div className="cm-challenge">
      <p className="cm-challenge-prompt" dir="auto">{challenge.promptAr}</p>
      {challenge.promptJa && <p className="cm-challenge-jp" dir="ltr">{challenge.promptJa}</p>}
      <div className="cm-challenge-options">
        {(challenge.options || []).map((opt) => {
          const isAnswer = opt === challenge.answer
          const state = answered ? (opt === picked ? (isAnswer ? 'correct' : 'wrong') : (isAnswer ? 'reveal' : '')) : ''
          return (
            <button
              key={opt}
              className={`cm-challenge-opt ${state}`}
              disabled={answered}
              onClick={() => setPicked(opt)}
              dir="auto"
            >
              {opt}
            </button>
          )
        })}
      </div>
      {answered && (
        <p className={`cm-challenge-result ${picked === challenge.answer ? 'ok' : 'no'}`}>
          {picked === challenge.answer
            ? (isAr ? '✓ صحيح! أحسنت.' : '✓ Correct!')
            : (isAr ? `✗ الإجابة: ${challenge.answer}` : `✗ Answer: ${challenge.answer}`)}
        </p>
      )}
    </div>
  )
}
