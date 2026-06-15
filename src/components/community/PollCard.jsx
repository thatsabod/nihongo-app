import { useEffect, useState } from 'react'

// In-feed poll. Before voting (and before it ends): tappable options. After the
// user votes or the poll ends: result bars. Vote tallies are loaded on demand
// via loadTally(postId) so we don't keep a listener per poll.
export default function PollCard({ poll, postId, lang, votedOptionId, onVote, loadTally }) {
  const isAr = lang === 'ar'
  const t = (ar, en) => (isAr ? ar : en)
  const ended = poll?.endsAt ? poll.endsAt < Date.now() : false
  const showResults = Boolean(votedOptionId) || ended
  const [tally, setTally] = useState(null)

  useEffect(() => {
    let alive = true
    if (showResults && loadTally) {
      loadTally(postId).then((tl) => { if (alive) setTally(tl || {}) })
    }
    return () => { alive = false }
  }, [showResults, postId, votedOptionId, loadTally])

  const options = poll?.options || []
  const total = tally ? Object.values(tally).reduce((a, b) => a + b, 0) : 0

  return (
    <div className="cm-poll">
      {options.map((opt) => {
        if (showResults) {
          const count = tally?.[opt.id] || 0
          const pct = total ? Math.round((count / total) * 100) : 0
          return (
            <div key={opt.id} className={`cm-poll-result ${votedOptionId === opt.id ? 'mine' : ''}`}>
              <span className="cm-poll-bar" style={{ width: `${pct}%` }} />
              <span className="cm-poll-result-row">
                <span dir="auto">{opt.text}{votedOptionId === opt.id ? ' ✓' : ''}</span>
                <strong>{pct}%</strong>
              </span>
            </div>
          )
        }
        return (
          <button key={opt.id} type="button" className="cm-poll-vote" dir="auto" onClick={() => onVote?.(postId, opt.id)}>
            {opt.text}
          </button>
        )
      })}
      <p className="cm-poll-meta">
        {showResults ? `${total} ${t('صوت', 'votes')}` : t('اختر إجابة', 'Tap to vote')}
        {ended ? ` · ${t('انتهى', 'ended')}` : ''}
      </p>
    </div>
  )
}
