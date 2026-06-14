// Phase C — post-call study report.
//
// When a live call ends, the transcript is sent ONCE to Abdoul Sensei through
// the existing requestSensei path (the askSensei Cloud Function in production,
// or the direct key in local dev). No new backend, no new secret: the per-user
// daily AI quota applies unchanged. The model is asked to return strict JSON,
// which we parse defensively — if parsing fails we still surface the raw text
// so the learner always gets something useful.
import { requestSensei } from './senseiClient.ts'

const MIN_TURNS = 2 // need at least one real exchange to say anything useful

function transcriptText(turns) {
  return turns
    .filter((t) => t && t.text)
    .map((t) => `${t.role === 'student' ? 'الطالب' : 'سينسيه'}: ${String(t.text).slice(0, 600)}`)
    .join('\n')
    .slice(0, 6000)
}

export function buildReportPrompt(turns, ctx) {
  const level = ctx?.level || 'N5'
  const transcript = transcriptText(turns)
  const system =
    'أنت عبدول سينسيه، معلم ياباني. حلّل مكالمة تدريب وأنشئ تقريراً موجزاً للطالب بالعربية البسيطة. ' +
    'أعد JSON صالحاً فقط دون أي نص قبله أو بعده ودون أسوار شيفرة (code fences).'
  const user = [
    `مستوى الطالب: ${level}. حلّل هذه المكالمة وأعد التقرير بهذا الشكل بالضبط:`,
    '{',
    '  "summary": "جملة أو جملتان تلخّصان أداء الطالب",',
    '  "score": عدد من 0 إلى 100,',
    '  "wordsLearned": ["الكلمة اليابانية — المعنى بالعربية"],',
    '  "grammarUsed": ["النمط النحوي — مثال قصير"],',
    '  "mistakes": [{"you": "ما قاله الطالب", "better": "الصياغة الأفضل", "why": "سبب قصير"}],',
    '  "pronunciationNotes": ["ملاحظة نطق قصيرة"],',
    '  "recommendedReview": ["ما يُنصح بمراجعته لاحقاً"]',
    '}',
    'اجعل كل قائمة من 0 إلى 5 عناصر. إن لم يوجد عنصر اجعل القائمة فارغة []. لا تخترع أخطاء لم تحدث فعلاً.',
    '',
    'نص المكالمة:',
    transcript,
  ].join('\n')
  return { system, user }
}

const toStrList = (v) =>
  Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, 8) : []

const toMistakeList = (v) => {
  if (!Array.isArray(v)) return []
  return v
    .map((m) => {
      if (!m) return null
      if (typeof m === 'string') return { you: '', better: m.trim(), why: '' }
      return {
        you: String(m.you || m.student || '').trim(),
        better: String(m.better || m.correct || m.fix || '').trim(),
        why: String(m.why || m.reason || '').trim(),
      }
    })
    .filter((m) => m && (m.you || m.better || m.why))
    .slice(0, 8)
}

export function parseReport(content) {
  const text = String(content || '')
  const match = text.match(/\{[\s\S]*\}/)
  if (match) {
    try {
      const obj = JSON.parse(match[0])
      const score = Number(obj.score)
      return {
        summary: String(obj.summary || '').trim(),
        score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : null,
        wordsLearned: toStrList(obj.wordsLearned),
        grammarUsed: toStrList(obj.grammarUsed),
        mistakes: toMistakeList(obj.mistakes),
        pronunciationNotes: toStrList(obj.pronunciationNotes),
        recommendedReview: toStrList(obj.recommendedReview),
        raw: false,
      }
    } catch {
      /* fall through to raw text */
    }
  }
  // Couldn't parse structured JSON — keep the raw text so the user still gets value.
  return {
    summary: text.trim(),
    score: null,
    wordsLearned: [],
    grammarUsed: [],
    mistakes: [],
    pronunciationNotes: [],
    recommendedReview: [],
    raw: true,
  }
}

export async function generateCallReport(turns, ctx) {
  const usable = (turns || []).filter((t) => t && t.text)
  if (usable.length < MIN_TURNS) return { status: 'empty' }
  const prompt = buildReportPrompt(usable, ctx)
  const res = await requestSensei({ feature: 'speakingPrompts', context: ctx, prompt })
  if (res.status === 'ok' && res.content) {
    return { status: 'ok', report: parseReport(res.content) }
  }
  return { status: res.status === 'disabled' ? 'disabled' : 'error', message: res.message || '' }
}
