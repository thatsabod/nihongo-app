export default function Result({ score, total, xpEarned, onHome, onRetry }) {
  return (
    <div style={{ minHeight: '100vh', background: '#1a1a2e', fontFamily: 'sans-serif', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      
      <div style={{ fontSize: '64px', marginBottom: '12px' }}>
        {score === total ? '🏆' : score >= total * 0.7 ? '🌟' : '📚'}
      </div>

      <h2 style={{ fontSize: '26px', marginBottom: '4px' }}>Quiz Done!</h2>
      <p style={{ color: '#aaa', marginBottom: '20px' }}>Your score</p>

      <div style={{ fontSize: '72px', fontWeight: '700', color: '#e84393' }}>
        {score}/{total}
      </div>

      <p style={{ fontSize: '18px', margin: '12px 0 4px', color: score === total ? '#1d9e75' : score >= total * 0.7 ? '#ef9f27' : '#e24b4a' }}>
        {score === total ? 'Perfect! 🏆' : score >= total * 0.7 ? 'Great job! 💪' : 'Keep practicing! 🔄'}
      </p>

      <p style={{ color: '#e84393', fontSize: '14px', marginBottom: '32px' }}>
        +{xpEarned} XP earned ⚡
      </p>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
        <div style={{ background: '#16213e', borderRadius: '12px', padding: '16px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#1d9e75' }}>{score}</div>
          <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>Correct</div>
        </div>
        <div style={{ background: '#16213e', borderRadius: '12px', padding: '16px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#e24b4a' }}>{total - score}</div>
          <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>Wrong</div>
        </div>
        <div style={{ background: '#16213e', borderRadius: '12px', padding: '16px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#e84393' }}>{Math.round((score / total) * 100)}%</div>
          <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>Accuracy</div>
        </div>
      </div>

      <button onClick={onHome}
        style={{ width: '100%', maxWidth: '320px', padding: '15px', background: 'linear-gradient(90deg,#e84393,#a855f7)', border: 'none', borderRadius: '12px', color: 'white', fontSize: '16px', fontWeight: '500', cursor: 'pointer', marginBottom: '10px' }}>
        Back to Home
      </button>

      <button onClick={onRetry}
        style={{ width: '100%', maxWidth: '320px', padding: '15px', background: 'none', border: '1px solid #e84393', borderRadius: '12px', color: 'white', fontSize: '16px', cursor: 'pointer' }}>
        Try Again 🔄
      </button>
    </div>
  )
}