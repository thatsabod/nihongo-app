// Phase E — client-side daily realtime call-minutes quota. localStorage only,
// no backend / no paid-API change: it just caps how many realtime minutes a
// learner can spend per day to keep OpenAI Realtime cost bounded. Resets daily.

const KEY = 'nihongo-call-minutes'
export const DAILY_CALL_MINUTES = 30

function todayKey(now = Date.now()) {
  const d = new Date(now)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!v || v.date !== todayKey()) return { date: todayKey(), seconds: 0 }
    return { date: v.date, seconds: Math.max(0, Number(v.seconds) || 0) }
  } catch {
    return { date: todayKey(), seconds: 0 }
  }
}

export function callSecondsUsedToday() { return read().seconds }

export function callMinutesRemaining() {
  return Math.max(0, DAILY_CALL_MINUTES - read().seconds / 60)
}

// Allow starting only if there's at least ~30s of budget left.
export function canStartCall() { return callMinutesRemaining() > 0.5 }

export function addCallSeconds(seconds) {
  const cur = read()
  const next = { date: todayKey(), seconds: cur.seconds + Math.max(0, Math.round(seconds) || 0) }
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* ignore */ }
  return next
}

export function quotaMessage(isAr) {
  const used = Math.round(callSecondsUsedToday() / 60)
  return isAr
    ? `وصلت إلى حد المكالمات اليومي (${DAILY_CALL_MINUTES} دقيقة). جرّب مرة ثانية بكرة 🙏`
    : `You've reached today's call limit (${DAILY_CALL_MINUTES} min, used ${used}). Try again tomorrow 🙏`
}
