export const playCorrect = () => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.connect(g)
  g.connect(ctx.destination)
  o.frequency.setValueAtTime(523, ctx.currentTime)
  o.frequency.setValueAtTime(659, ctx.currentTime + 0.1)
  o.frequency.setValueAtTime(784, ctx.currentTime + 0.2)
  g.gain.setValueAtTime(0.3, ctx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
  o.start()
  o.stop(ctx.currentTime + 0.4)
}

export const playWrong = () => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.connect(g)
  g.connect(ctx.destination)
  o.type = 'sawtooth'
  o.frequency.setValueAtTime(200, ctx.currentTime)
  o.frequency.setValueAtTime(150, ctx.currentTime + 0.1)
  g.gain.setValueAtTime(0.3, ctx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
  o.start()
  o.stop(ctx.currentTime + 0.3)
}

export const speakJapanese = (text, rate = 0.72) => {
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ja-JP'
  u.rate = rate
  u.pitch = 1
  u.volume = 1
  window.speechSynthesis.speak(u)
}
