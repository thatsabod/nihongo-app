// Phase D — Call Sensei session persistence + cross-call memory + mistakes→review.
//
// Each finished live call (transcript + generated report) is saved to a private
// per-user `callSessions` Firestore collection. At the start of the next call we
// load the most recent few and distil a short Arabic "memory" string that is
// injected into the realtime prompt, so the tutor remembers past topics and
// recurring mistakes. Call mistakes are also pushed into the local Smart Review
// store as self-graded "speaking" cards.
//
// All Firestore calls are best-effort: they never throw to the caller, so a
// persistence/network hiccup can never break the live-call UX.
import { addDoc, collection, getDocs, limit, query, serverTimestamp, where } from 'firebase/firestore'
import { auth, db } from '../firebase.js'
import { readProgressState, recordSpeakingMistake } from '../progress/progressStorage.js'

const COLLECTION = 'callSessions'
const MEMORY_SESSIONS = 3

function sanitizeReport(r) {
  if (!r) return null
  const list = (v) => (Array.isArray(v) ? v.slice(0, 8).map((x) => String(x).slice(0, 200)) : [])
  return {
    summary: String(r.summary || '').slice(0, 600),
    score: typeof r.score === 'number' ? r.score : null,
    wordsLearned: list(r.wordsLearned),
    grammarUsed: list(r.grammarUsed),
    pronunciationNotes: list(r.pronunciationNotes),
    recommendedReview: list(r.recommendedReview),
    mistakes: (Array.isArray(r.mistakes) ? r.mistakes : []).slice(0, 8).map((m) => ({
      you: String(m?.you || '').slice(0, 200),
      better: String(m?.better || '').slice(0, 200),
      why: String(m?.why || '').slice(0, 200),
    })),
  }
}

// Persist one finished call. Returns the new doc id, or null if not signed in /
// on any failure. `uid` is set to the current user so the security rule allows it.
export async function saveCallSession({ mode, scenario, durationSeconds, turns, report, difficultyRating = null, xpEarned = 0, wordsUsed = 0, startedAt = null, endedAt = null }) {
  const uid = auth.currentUser?.uid
  if (!uid) return null
  try {
    const ref = await addDoc(collection(db, COLLECTION), {
      uid,
      mode: mode || 'free',
      scenario: scenario || null,
      durationSeconds: Math.max(0, Math.round(durationSeconds || 0)),
      startedAtMs: startedAt || null,
      endedAtMs: endedAt || null,
      difficultyRating: difficultyRating || null,
      xpEarned: Math.max(0, Math.round(xpEarned || 0)),
      wordsUsed: Math.max(0, Math.round(wordsUsed || 0)),
      turns: (Array.isArray(turns) ? turns : [])
        .slice(0, 80)
        .map((t) => ({ role: t.role === 'sensei' ? 'sensei' : 'student', text: String(t?.text || '').slice(0, 1000) })),
      report: sanitizeReport(report),
      createdAt: serverTimestamp(),
      // Client timestamp lets us sort recent sessions without a composite index
      // (a single-field where('uid') query uses the automatic index).
      createdAtMs: Date.now(),
    })
    return ref.id
  } catch (err) {
    console.warn('saveCallSession failed:', err?.message || err)
    return null
  }
}

// Fetch the learner's most recent sessions (newest first). Single-field filter
// on uid → no composite index required; sorted client-side by createdAtMs.
export async function fetchRecentCallSessions(max = MEMORY_SESSIONS) {
  const uid = auth.currentUser?.uid
  if (!uid) return []
  try {
    const snap = await getDocs(query(collection(db, COLLECTION), where('uid', '==', uid), limit(50)))
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    rows.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0))
    return rows.slice(0, max)
  } catch (err) {
    console.warn('fetchRecentCallSessions failed:', err?.message || err)
    return []
  }
}

// Distil recent sessions into a short Arabic memory string for the realtime
// prompt (and the setup screen). Kept compact — the server caps it again.
export function buildCallMemory(sessions) {
  if (!sessions || !sessions.length) return ''
  const bits = []
  for (const s of sessions) {
    const topic = s.report?.summary ? String(s.report.summary).slice(0, 90) : ''
    const fixes = (s.report?.mistakes || [])
      .slice(0, 2)
      .map((m) => m?.better)
      .filter(Boolean)
      .join('، ')
    if (topic) bits.push(`• ${topic}${fixes ? ` (راجعنا: ${fixes})` : ''}`)
    else if (fixes) bits.push(`• راجعنا سابقاً: ${fixes}`)
    if (bits.length >= MEMORY_SESSIONS) break
  }
  return bits.join('\n').slice(0, 320)
}

// Stable short id for a corrected phrase so repeats of the same mistake dedupe
// onto one review item instead of piling up.
function speakingId(text) {
  let h = 0
  const s = String(text || '')
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0
  return 'c' + (h >>> 0).toString(36)
}

// Push the report's mistakes into the local Smart Review store as self-graded
// "speaking" cards. Best-effort, synchronous (localStorage). No-op if empty.
export function pushCallMistakesToReview(report) {
  const list = Array.isArray(report?.mistakes) ? report.mistakes : []
  if (!list.length) return 0
  let state = readProgressState()
  let added = 0
  for (const m of list) {
    const better = String(m?.better || '').trim()
    if (!better) continue
    state = recordSpeakingMistake(state, {
      itemId: speakingId(better),
      questionAr: better,
      data: { you: String(m?.you || '').trim(), better, why: String(m?.why || '').trim() },
    })
    added += 1
  }
  return added
}
