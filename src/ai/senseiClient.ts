// AI Sensei client — calls the Anthropic Messages API when a key is present.
//
// Activation model:
//   - No VITE_ANTHROPIC_API_KEY in .env.local  → returns a transparent
//     'disabled' response (the pre-approval design state, unchanged).
//   - Key present → real call, grounded in the prompt built from the
//     learner's own data (senseiContext + promptTemplates stay unchanged).
//
// ⚠️ LOCAL/DEV ONLY: a VITE_-prefixed key is embedded in the client bundle —
// anyone who opens DevTools on a deployed site can read it. Do NOT deploy
// with this mechanism. TODO(production): move this call into a Firebase
// Cloud Function holding the key server-side, and have the app call that.

import Anthropic from '@anthropic-ai/sdk'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { auth } from '../firebase.js'
import type { SenseiRequest, SenseiResponse } from './aiSensei.types'

// Switch to 'claude-haiku-4-5' for the cheapest/fastest option.
const SENSEI_MODEL = 'claude-opus-4-8'
const MAX_TOKENS = 4096
const DAILY_LIMIT = 20
const USAGE_KEY = 'nihongo-sensei-usage'

const apiKey = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
  ?.VITE_ANTHROPIC_API_KEY

// 'direct' — local dev with a VITE_ key in .env.local (browser calls Anthropic).
// 'cloud'  — production: signed-in user goes through the askSensei Cloud
//            Function, which holds the real key server-side.
// 'off'    — no key and no signed-in user.
export type SenseiMode = 'direct' | 'cloud' | 'off'

export function senseiMode(): SenseiMode {
  if (apiKey) return 'direct'
  if (auth.currentUser) return 'cloud'
  return 'off'
}

export const isSenseiEnabled = (): boolean => senseiMode() !== 'off'

// Per-day request counter (resets at local midnight). Protects against a
// runaway bill from a single enthusiastic study session.
function consumeDailyQuota(): { ok: boolean; used: number } {
  const today = new Date().toISOString().slice(0, 10)
  let usage: { date: string; count: number }
  try {
    usage = JSON.parse(localStorage.getItem(USAGE_KEY) || 'null') || { date: today, count: 0 }
  } catch {
    usage = { date: today, count: 0 }
  }
  if (usage.date !== today) usage = { date: today, count: 0 }
  if (usage.count >= DAILY_LIMIT) return { ok: false, used: usage.count }
  usage.count += 1
  localStorage.setItem(USAGE_KEY, JSON.stringify(usage))
  return { ok: true, used: usage.count }
}

export function remainingDailyQuota(): number {
  const today = new Date().toISOString().slice(0, 10)
  try {
    const usage = JSON.parse(localStorage.getItem(USAGE_KEY) || 'null')
    if (!usage || usage.date !== today) return DAILY_LIMIT
    return Math.max(0, DAILY_LIMIT - usage.count)
  } catch {
    return DAILY_LIMIT
  }
}

// Production path: ask the askSensei Cloud Function (auth + quota enforced
// server-side; the API key never reaches the browser).
async function requestSenseiViaCloud(request: SenseiRequest): Promise<SenseiResponse> {
  try {
    const ask = httpsCallable<{ system: string; user: string }, { content: string; remaining: number }>(
      getFunctions(),
      'askSensei',
    )
    const result = await ask({ system: request.prompt.system, user: request.prompt.user })
    return {
      status: 'ok',
      feature: request.feature,
      message: '',
      content: result.data.content || 'لم يصل ردّ نصي. حاول مرة أخرى.',
    }
  } catch (err) {
    const code = (err as { code?: string })?.code || ''
    const serverMessage = (err as { message?: string })?.message || ''
    let message = 'حدث خطأ أثناء الاتصال بسينسيه. حاول مرة أخرى.'
    if (code.includes('resource-exhausted') || code.includes('failed-precondition') || code.includes('invalid-argument')) {
      // These carry a human-readable Arabic message from the function itself.
      message = serverMessage || message
    } else if (code.includes('unauthenticated')) {
      message = 'سجّل الدخول بحسابك لاستخدام عبدول سينسيه.'
    } else if (code.includes('not-found') || code.includes('unimplemented')) {
      message = 'خدمة سينسيه لم تُنشر على الخادم بعد.'
    } else if (code.includes('unavailable') || code.includes('deadline-exceeded')) {
      message = 'تعذّر الوصول للخادم. تحقق من اتصالك ثم حاول مجددًا.'
    }
    console.error('Sensei cloud request failed:', err)
    return { status: 'error', feature: request.feature, message }
  }
}

export async function requestSensei(request: SenseiRequest): Promise<SenseiResponse> {
  if (!apiKey) {
    if (auth.currentUser) return requestSenseiViaCloud(request)
    return {
      status: 'disabled',
      feature: request.feature,
      message:
        'مساعد «عبدول سينسيه» يتطلب تسجيل الدخول بحسابك. سجّل الدخول ثم حاول مرة أخرى.',
    }
  }

  const quota = consumeDailyQuota()
  if (!quota.ok) {
    return {
      status: 'error',
      feature: request.feature,
      message: `وصلت إلى الحد اليومي (${DAILY_LIMIT} طلبًا). عُد غدًا لمتابعة التعلّم مع سينسيه 🌸`,
    }
  }

  try {
    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
    const response = await client.messages.create({
      model: SENSEI_MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: 'adaptive' },
      system: request.prompt.system,
      messages: [{ role: 'user', content: request.prompt.user }],
    })

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim()

    return {
      status: 'ok',
      feature: request.feature,
      message: '',
      content: text || 'لم يصل ردّ نصي. حاول مرة أخرى.',
    }
  } catch (err) {
    let message = 'حدث خطأ أثناء الاتصال بسينسيه. حاول مرة أخرى.'
    if (err instanceof Anthropic.AuthenticationError) {
      message = 'مفتاح API غير صالح. تأكد من VITE_ANTHROPIC_API_KEY في ملف .env.local ثم أعد تشغيل الخادم.'
    } else if (err instanceof Anthropic.RateLimitError) {
      message = 'الخدمة مشغولة الآن (حد المعدّل). انتظر دقيقة ثم حاول مجددًا.'
    } else if (err instanceof Anthropic.APIConnectionError) {
      message = 'تعذّر الوصول للإنترنت أو الخدمة. تحقق من اتصالك.'
    } else if (err instanceof Anthropic.APIError) {
      message = /credit balance/i.test(err.message)
        ? 'رصيد حساب Anthropic غير كافٍ. أضف رصيدًا من Console → Plans & Billing ثم حاول مجددًا.'
        : `خطأ من الخدمة (${err.status}). حاول لاحقًا.`
    }
    console.error('Sensei request failed:', err)
    return { status: 'error', feature: request.feature, message }
  }
}
