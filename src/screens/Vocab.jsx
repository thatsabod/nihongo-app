import { useState } from 'react'
import { speakJapanese } from '../sounds.js'
import { vocab } from '../data.js'

export default function Vocab({ onBack }) {
  const [flipped, setFlipped] = useState({})

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a2e', fontFamily: 'sans-serif', color: 'white', padding: '24px 16px' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '14px', cursor: 'pointer', padding: 0, marginBottom: '20px' }}>
        ← Back
      </button>
      <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Vocabulary Cards</h2>
      <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '20px' }}>
        Tap card to see meaning · 🔊 to hear pronunciation
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {vocab.map((v, i) => (
          <div key={i}
            style={{
              background: flipped[i] ? '#0f3460' : '#16213e',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
              cursor: 'pointer',
              border: flipped[i] ? '1px solid #e84393' : '0.5px solid #333',
              minHeight: '110px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'background 0.2s'
            }}>

            {flipped[i] ? (
              <>
                <div style={{ fontSize: '13px', color: '#e84393' }}>{v.reading}</div>
                <div style={{ fontSize: '20px', fontWeight: '500' }}>{v.meaning}</div>
                <button
                  onClick={(e) => { e.stopPropagation(); speakJapanese(v.jp) }}
                  style={{ marginTop: '6px', background: '#1a1a2e', border: '0.5px solid #333', borderRadius: '8px', color: '#aaa', fontSize: '12px', padding: '4px 10px', cursor: 'pointer' }}>
                  🔊 {v.reading}
                </button>
              </>
            ) : (
              <>
                <div onClick={() => setFlipped(f => ({ ...f, [i]: true }))}
                  style={{ width: '100%' }}>
                  <div style={{ fontSize: '34px', marginBottom: '4px' }}>{v.jp}</div>
                  <div style={{ fontSize: '11px', color: '#555' }}>tap to reveal</div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}