export default function Home({ xp, streak, lastScore, onStartQuiz, onVocab, onLetters }) {
  const xpPercent = Math.min((xp / 1000) * 100, 100)

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a2e', fontFamily: 'sans-serif', color: 'white' }}>

      {/* Header */}
      <div style={{ background: '#16213e', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '22px' }}>
          にほんご<span style={{ color: '#e84393' }}>GO</span>
        </h1>
        <div style={{ background: '#0f3460', padding: '6px 14px', borderRadius: '20px', fontSize: '13px' }}>
          🔥 {streak} days
        </div>
      </div>

      {/* XP Card */}
      <div style={{ margin: '20px 16px', background: '#16213e', borderRadius: '16px', padding: '22px' }}>
        <p style={{ color: '#aaa', margin: '0 0 4px', fontSize: '14px' }}>Welcome! 🎌</p>
        <h2 style={{ margin: '0 0 4px', fontSize: '20px' }}>Level N5 — Beginner</h2>
        <p style={{ color: '#e84393', fontSize: '13px', margin: '0 0 14px' }}>⚡ {xp} XP</p>
        <div style={{ background: '#0f3460', borderRadius: '8px', height: '8px' }}>
          <div style={{ background: 'linear-gradient(90deg,#e84393,#a855f7)', width: `${xpPercent}%`, height: '100%', borderRadius: '8px', transition: 'width 0.5s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#aaa', marginTop: '6px' }}>
          <span>{xp} XP</span><span>1000 XP</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', padding: '0 16px', marginBottom: '16px' }}>
        {[
          ['46', 'characters'],
          ['🔥', `${streak} days`],
          [lastScore > 0 ? lastScore : '—', 'last score']
        ].map(([val, label], i) => (
          <div key={i} style={{ background: '#16213e', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: '600' }}>{val}</div>
            <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div style={{ padding: '0 16px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button onClick={onStartQuiz}
          style={{ width: '100%', padding: '15px', background: 'linear-gradient(90deg,#e84393,#a855f7)', border: 'none', borderRadius: '12px', color: 'white', fontSize: '16px', fontWeight: '500', cursor: 'pointer' }}>
          🧠 Start Character Quiz
        </button>
        <button onClick={onLetters}
          style={{ width: '100%', padding: '15px', background: '#16213e', border: '1px solid #a855f7', borderRadius: '12px', color: 'white', fontSize: '16px', cursor: 'pointer' }}>
          🎌 Learn Hiragana Chart
        </button>
        <button onClick={onVocab}
          style={{ width: '100%', padding: '15px', background: '#16213e', border: '1px solid #e84393', borderRadius: '12px', color: 'white', fontSize: '16px', cursor: 'pointer' }}>
          📚 Vocabulary Cards
        </button>
      </div>

      {/* Lessons path */}
      <div style={{ padding: '0 16px' }}>
        <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '12px' }}>Learning Path</p>

        {[
          { icon: '✅', bg: '#e1f5ee', title: 'Hiragana — Part 1', sub: 'あ い う え お', badge: 'Done', badgeBg: '#e1f5ee', badgeColor: '#0f6e56', border: 'none', opacity: 1 },
          { icon: '▶️', bg: '#fbeaf0', title: 'Hiragana — Part 2', sub: 'か き く け こ', badge: 'In Progress', badgeBg: '#fbeaf0', badgeColor: '#993556', border: '1px solid #e84393', opacity: 1 },
          { icon: '🔒', bg: '#333', title: 'Katakana', sub: 'ア イ ウ エ オ', badge: 'Locked', badgeBg: '#333', badgeColor: '#aaa', border: 'none', opacity: 0.4 },
          { icon: '🔒', bg: '#333', title: 'Kanji — Level 1', sub: '日 月 火 水 木', badge: 'Locked', badgeBg: '#333', badgeColor: '#aaa', border: 'none', opacity: 0.4 },
        ].map((item, i) => (
          <div key={i} style={{ background: '#16213e', borderRadius: '12px', padding: '14px 16px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px', border: item.border, opacity: item.opacity }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
              {item.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '500', fontSize: '14px' }}>{item.title}</div>
              <div style={{ color: '#aaa', fontSize: '12px', marginTop: '2px' }}>{item.sub}</div>
            </div>
            <span style={{ background: item.badgeBg, color: item.badgeColor, fontSize: '11px', padding: '2px 8px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
              {item.badge}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
