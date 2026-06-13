// "Call Abdoul Sensei" — voice-conversation helpers.
//
// The call reuses the same request path as the panel (requestSensei), so the
// deployed Cloud Function needs no changes: the running conversation is
// flattened into the user prompt each turn. Replies are tuned for SPEECH —
// short, conversational, markdown-free — and spoken with a mixed Arabic/
// Japanese TTS splitter.

import type { SenseiContext, SenseiPrompt } from './aiSensei.types'
import { senseiVoiceIdentity, SENSEI_VOICE_RULES_AR } from './senseiPersona'
import { stopAudio } from '../utils/audioPlayer.js'

export interface CallTurn {
  role: 'student' | 'sensei'
  text: string
}

const JP_RUN = /[぀-ヿ㐀-鿿ー、。！？]+/g

function weakSummaryShort(ctx: SenseiContext): string {
  const bits: string[] = []
  if (ctx.weakGrammar.length) bits.push(`قواعد ضعيفة: ${ctx.weakGrammar.slice(0, 3).map((w) => w.label).join('، ')}`)
  if (ctx.weakVocabulary.length) bits.push(`مفردات ضعيفة: ${ctx.weakVocabulary.slice(0, 5).map((w) => w.label).join('، ')}`)
  return bits.join(' | ') || 'لا توجد نقاط ضعف مسجلة'
}

// Build the prompt for one call turn: persona tuned for voice + full history.
export function buildCallPrompt(ctx: SenseiContext, history: CallTurn[]): SenseiPrompt {
  const system = [
    senseiVoiceIdentity(),
    `مستوى الطالب: ${ctx.level}.`,
    ctx.currentLessonTitleAr ? `درسه الحالي: ${ctx.currentLessonTitleAr}.` : '',
    `وضع الطالب: ${weakSummaryShort(ctx)}.`,
    ...SENSEI_VOICE_RULES_AR,
  ].filter(Boolean).join('\n')

  const transcript = history
    .map((t) => (t.role === 'student' ? `الطالب: ${t.text}` : `سينسيه: ${t.text}`))
    .join('\n')

  const user = [
    'هذه المكالمة حتى الآن:',
    transcript,
    '',
    'ردّ الآن على آخر ما قاله الطالب، ردًّا واحدًا قصيرًا فقط.',
  ].join('\n')

  return { system, user }
}

// Split mixed Arabic/Japanese text and speak each run with the right voice.
// speechSynthesis queues utterances, so segments play back-to-back in order.
export function speakMixed(text: string, { onEnd }: { onEnd?: () => void } = {}): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onEnd?.()
    return
  }
  const synth = window.speechSynthesis
  stopAudio()

  // Strip anything that reads badly aloud (markdown leftovers, emoji).
  const clean = text.replace(/[*#_`>~]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!clean) {
    onEnd?.()
    return
  }

  const segments: { text: string; ja: boolean }[] = []
  let last = 0
  for (const match of clean.matchAll(JP_RUN)) {
    const idx = match.index ?? 0
    if (idx > last) segments.push({ text: clean.slice(last, idx), ja: false })
    segments.push({ text: match[0], ja: true })
    last = idx + match[0].length
  }
  if (last < clean.length) segments.push({ text: clean.slice(last), ja: false })

  const spoken = segments.filter((s) => s.text.trim().length > 0)
  if (!spoken.length) {
    onEnd?.()
    return
  }

  const voices = synth.getVoices()
  const jaVoice = voices.find((v) => v.lang?.startsWith('ja'))
  const arVoice = voices.find((v) => v.lang?.startsWith('ar'))

  spoken.forEach((seg, i) => {
    const utterance = new SpeechSynthesisUtterance(seg.text)
    if (seg.ja) {
      utterance.lang = 'ja-JP'
      if (jaVoice) utterance.voice = jaVoice
      utterance.rate = 0.85
    } else {
      utterance.lang = 'ar'
      if (arVoice) utterance.voice = arVoice
      utterance.rate = 1
    }
    if (i === spoken.length - 1 && onEnd) utterance.onend = () => onEnd()
    utterance.onerror = () => {
      if (i === spoken.length - 1) onEnd?.()
    }
    try {
      synth.speak(utterance)
    } catch {
      if (i === spoken.length - 1) onEnd?.()
    }
  })
}

export function stopSpeaking(): void {
  stopAudio()
}
