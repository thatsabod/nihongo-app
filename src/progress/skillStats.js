// Per-skill (vocab / grammar / kanji) retention aggregates, derived from the
// SRS store. Pure functions, no I/O — mirror masteryModel.js / reviewQueue.js.
//
// Note: the SRS store does NOT keep per-item accuracy (only SM-2 fields), so
// "strength" is an honest PROXY from masteryLevel (0–5: +1 per correct recall,
// −1 per lapse), expressed as a 0–100% memory-strength score. The synthetic
// `mistake` itemType (per-exercise pseudo-items) is excluded so it can't pollute
// the three real skill columns.

export const RETENTION_SKILLS = ['vocab', 'grammar', 'kanji']

export function getSkillRetention(state, now = Date.now()) {
  const srs = (state && state.srs) || {}
  const out = {}
  for (const skill of RETENTION_SKILLS) {
    out[skill] = { total: 0, due: 0, strong: 0, masterySum: 0, strengthPct: 0 }
  }
  for (const record of Object.values(srs)) {
    if (!record) continue
    const bucket = out[record.itemType] // undefined for 'mistake'/unknown → skipped
    if (!bucket) continue
    bucket.total += 1
    if ((record.nextReviewAt || 0) <= now) bucket.due += 1
    const level = record.masteryLevel || 0
    bucket.masterySum += level
    if (level >= 4) bucket.strong += 1
  }
  for (const skill of RETENTION_SKILLS) {
    const b = out[skill]
    b.strengthPct = b.total ? Math.round((b.masterySum / (b.total * 5)) * 100) : 0
  }
  return out
}
