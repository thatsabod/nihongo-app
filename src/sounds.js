let sharedCtx = null
let unlocked = false
let lastRemoteAudio = null

const SINGLE_KANA_SPEECH = {
  い: 'い',
  イ: 'イ',
}

function isProbablyMobile() {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')
}

function normalizeSpeechText(text) {
  const value = String(text || '').trim()
  return SINGLE_KANA_SPEECH[value] || value
}

function googleTtsUrl(text) {
  return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ja&q=${encodeURIComponent(text)}`
}

function playRemoteJapanese(text) {
  if (typeof Audio === 'undefined') return false
  const speechText = normalizeSpeechText(text)
  if (!speechText) return false
  try {
    if (lastRemoteAudio) {
      lastRemoteAudio.pause()
      lastRemoteAudio.src = ''
    }
    const audio = new Audio(googleTtsUrl(speechText))
    audio.preload = 'auto'
    audio.volume = 1
    lastRemoteAudio = audio
    const played = audio.play()
    if (played?.catch) played.catch(() => speakWithWebSpeech(speechText, { force: true }))
    return true
  } catch {
    return false
  }
}

function getAudioContext() {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || window.webkitAudioContext
  if (!Ctor) return null
  if (!sharedCtx) sharedCtx = new Ctor()
  if (sharedCtx.state === 'suspended') sharedCtx.resume()
  return sharedCtx
}

// Call once on the first user gesture (tap/click) so mobile browsers (iOS
// Safari in particular) unlock the shared AudioContext and speechSynthesis
// before any exercise tries to play a sound.
export function unlockAudio() {
  unlocked = true
  const ctx = getAudioContext()
  if (ctx && ctx.state === 'suspended') ctx.resume()
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance('あ')
      u.lang = 'ja-JP'
      u.volume = 0.01
      u.rate = 0.7
      window.speechSynthesis.speak(u)
    } catch {
      // Some mobile browsers throw during the first unlock attempt.
    }
  }
}

function tone(ctx, { freq, start, duration, type = 'sine', peakGain = 0.18 }) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.connect(g)
  g.connect(ctx.destination)
  o.type = type
  o.frequency.setValueAtTime(freq, ctx.currentTime + start)
  g.gain.setValueAtTime(0, ctx.currentTime + start)
  g.gain.linearRampToValueAtTime(peakGain, ctx.currentTime + start + 0.02)
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration)
  o.start(ctx.currentTime + start)
  o.stop(ctx.currentTime + start + duration)
}

// Gentle two-note "ding" chime.
export const playCorrect = () => {
  const ctx = getAudioContext()
  if (!ctx) return
  tone(ctx, { freq: 880, start: 0, duration: 0.18, peakGain: 0.16 })
  tone(ctx, { freq: 1320, start: 0.08, duration: 0.22, peakGain: 0.14 })
}

// Soft low "pop" — short and unobtrusive.
export const playWrong = () => {
  const ctx = getAudioContext()
  if (!ctx) return
  tone(ctx, { freq: 320, start: 0, duration: 0.16, type: 'triangle', peakGain: 0.14 })
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

function speakWithWebSpeech(text, options = {}) {
  const config = typeof options === 'number' ? { rate: options } : options
  if (typeof window === 'undefined' || !window.speechSynthesis) return false

  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(normalizeSpeechText(text))
  const voices = getJapaneseVoices()
  const voiceIndex = config.voiceIndex ?? 0
  const voice = voices.length ? voices[Math.abs(voiceIndex) % voices.length] : null

  u.lang = 'ja-JP'
  if (voice) u.voice = voice
  u.rate = config.rate ?? 0.6728
  u.pitch = config.pitch ?? 0.96
  u.volume = 1

  try {
    window.speechSynthesis.speak(u)
    return true
  } catch {
    return false
  }
}

export const speakJapanese = (text, options = {}) => {
  const config = typeof options === 'number' ? { rate: options } : options
  const speechText = normalizeSpeechText(text)
  if (!speechText) return

  const voices = getJapaneseVoices()
  const mobile = isProbablyMobile()
  const shouldUseRemote = config.remote === true
    || (mobile && voices.length === 0 && speechText.length > 1)

  if (shouldUseRemote && playRemoteJapanese(speechText)) return
  if (speakWithWebSpeech(speechText, config)) return
  playRemoteJapanese(speechText)
}
