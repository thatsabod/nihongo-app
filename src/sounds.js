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

let cachedJapaneseVoices = []
let voiceLoadRequested = false

const preferredVoiceHints = [
  'nanami',
  'kyoko',
  'otoya',
  'haruka',
  'ichiro',
  'google 日本語',
  'google japanese',
  'microsoft',
  'japanese',
  '日本',
]

function rankVoice(voice) {
  const name = `${voice.name} ${voice.lang}`.toLowerCase()
  const hintIndex = preferredVoiceHints.findIndex((hint) => name.includes(hint))
  return hintIndex === -1 ? 100 : hintIndex
}

export function getJapaneseVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return []
  const voices = window.speechSynthesis.getVoices()
  const japanese = voices
    .filter((voice) => voice.lang?.toLowerCase().startsWith('ja'))
    .sort((a, b) => rankVoice(a) - rankVoice(b) || a.name.localeCompare(b.name))

  if (japanese.length) cachedJapaneseVoices = japanese

  if (!voiceLoadRequested) {
    voiceLoadRequested = true
    window.speechSynthesis.onvoiceschanged = () => {
      cachedJapaneseVoices = window.speechSynthesis
        .getVoices()
        .filter((voice) => voice.lang?.toLowerCase().startsWith('ja'))
        .sort((a, b) => rankVoice(a) - rankVoice(b) || a.name.localeCompare(b.name))
    }
  }

  return cachedJapaneseVoices
}

export const speakJapanese = (text, options = {}) => {
  const config = typeof options === 'number' ? { rate: options } : options
  if (typeof window === 'undefined' || !window.speechSynthesis) return

  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voices = getJapaneseVoices()
  const voiceIndex = config.voiceIndex ?? 0
  const voice = voices.length ? voices[Math.abs(voiceIndex) % voices.length] : null

  u.lang = 'ja-JP'
  if (voice) u.voice = voice
  u.rate = config.rate ?? 0.6728
  u.pitch = config.pitch ?? 0.96
  u.volume = 1

  window.speechSynthesis.speak(u)
}
