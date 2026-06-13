// Forgiving answer comparison for sentence-building / ordering exercises.
//
// Rule (product requirement): never fail an answer solely because punctuation
// is missing. Many "arrange the words" items end in 。 but expose no tappable
// 。 chip, so a structurally-correct answer can never be byte-equal to the
// stored answer. We compare meaning/structure by stripping whitespace and
// punctuation from BOTH sides before equality.
const STRIP = /[\s　。、，．・…〜ー！？「」『』（）()[\]{}.,!?؛،؟:：；;]/g

export function normalizeAnswer(value) {
  return String(value == null ? '' : value).replace(STRIP, '')
}

// True when two answers match ignoring whitespace + punctuation differences.
export function answersMatch(a, b) {
  return normalizeAnswer(a) === normalizeAnswer(b)
}
