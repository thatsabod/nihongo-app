// Generate reliable interactive questions for a story from its own content
// (no AI, no risk of wrong answers): missing-word (blank a vocab word that
// actually appears in a sentence), match-pair (vocab ⇄ Arabic meaning), and
// comprehension MCQ (from the lesson's authored reading questions).

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

export function buildStoryQuestions(story) {
  const out = []
  const vocab = (story?.vocab || []).filter((v) => (v.hiragana || v.jp) && v.meaning)
  const sentences = story?.sentences || []

  // 1) Missing-word — blank a vocab surface that genuinely occurs in a sentence
  // (match whichever form the sentence uses — kanji or kana).
  const usedSentences = new Set()
  for (const v of shuffle(vocab)) {
    if (out.filter((q) => q.kind === 'missing').length >= 2) break
    const candidates = [v.kanji, v.jp, v.hiragana].filter(Boolean)
    let surface = null
    let idx = -1
    for (const c of candidates) {
      const found = sentences.findIndex((s, i) => !usedSentences.has(i) && s.jp && s.jp.includes(c))
      if (found >= 0) { surface = c; idx = found; break }
    }
    if (!surface) continue
    const distractors = shuffle(vocab.filter((x) => (x.kanji || x.jp || x.hiragana) !== surface)).slice(0, 2).map((x) => x.kanji || x.jp || x.hiragana)
    if (distractors.length < 2) continue
    usedSentences.add(idx)
    out.push({
      kind: 'missing',
      prompt: sentences[idx].jp.replace(surface, '＿＿'),
      answer: surface,
      options: shuffle([surface, ...distractors]),
    })
  }

  // 2) True/False — "「word」 = meaning?" (reliable: real meaning vs a swapped one).
  if (vocab.length >= 3) {
    const v = shuffle(vocab)[0]
    const isTrue = Math.random() < 0.5
    const meaning = isTrue ? v.meaning : (shuffle(vocab.filter((x) => x.meaning !== v.meaning))[0]?.meaning)
    if (meaning) out.push({ kind: 'tf', word: v.hiragana || v.jp, meaning, answer: isTrue })
  }

  // 3) Match-pair — vocab kana ⇄ Arabic meaning.
  if (vocab.length >= 4) {
    const picks = shuffle(vocab).slice(0, Math.min(5, vocab.length))
    out.push({ kind: 'match', pairs: picks.map((v) => ({ jp: v.hiragana || v.jp, ar: v.meaning })) })
  }

  // 4) Sentence-order — scramble a spaced sentence (3–7 tokens) to rebuild.
  for (const s of shuffle(sentences.filter((x) => x.jp && x.jp.includes(' ')))) {
    const tokens = s.jp.replace(/[。、！？]/g, '').trim().split(/\s+/).filter(Boolean)
    if (tokens.length >= 3 && tokens.length <= 7) {
      out.push({ kind: 'order', tokens: shuffle(tokens), answer: tokens, ar: s.ar })
      break
    }
  }

  // 3) Comprehension — authored reading questions (best quality).
  for (const q of (story?.questions || []).slice(0, 2)) {
    if (q.q && Array.isArray(q.options) && q.options.length >= 2 && q.answer) {
      out.push({ kind: 'mcq', prompt: q.q, options: shuffle(q.options), answer: q.answer })
    }
  }

  return out.slice(0, 5)
}
