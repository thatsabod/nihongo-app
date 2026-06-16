// Global Japanese text renderer with furigana (ruby) support — the single
// source of truth used across lessons, quizzes, stories, reviews and any screen
// that shows Japanese. Replaces the per-screen copies (Quiz/Exam `RubyText`,
// LessonSections `LessonJP`, inline `<ruby>` in Vocab/Smart review).
//
// VISIBILITY is gated app-wide by the `.hide-furigana` root class (see
// utils/exerciseSettings.js → `applyPronunciationVisibility`): when "Show
// pronunciation" is OFF, every `<rt>` is hidden globally. The reading MODE
// (kana vs romaji) is baked into the `reading`/`readingMap` the caller passes
// (callers derive it from `exerciseSettings.pronunciationMode` /
// `kanjiReadingMode`), so this component itself stays pure/stateless.
//
// Two ways to supply readings:
//   • readingMap: { kanjiSurface -> reading } — matches vocab surfaces inside a
//     sentence and adds ruby (use for sentences backed by a vocab list).
//   • reading: a single reading string for `text` — splits kanji runs and aligns
//     (use for single words / answer options).
// `plain` forces NO furigana — use for reading-recognition exercises so the
// answer is never revealed.

import { READINGS, READINGS_MAX_LEN, kanaToRomaji } from '../data/japaneseReadings.js'
import useExerciseSettings from '../hooks/useExerciseSettings.js'

const KANJI_RE = /[㐀-鿿]/

export const hasKanji = (value = '') => KANJI_RE.test(String(value || ''))
export const hasJapanese = (value = '') => /[぀-ヿ㐀-鿿]/.test(String(value || ''))

// Build a kanji-surface → reading map from a vocab list, honoring the reading
// mode ('romaji' | 'hiragana'/anything-else). Only kanji-bearing surfaces.
export function buildReadingMap(vocab = [], mode = 'hiragana') {
  const map = {}
  ;(vocab || []).forEach((item) => {
    const surface = item.kanji || item.jp
    if (!surface || !hasKanji(surface)) return
    map[surface] = mode === 'romaji' ? (item.reading || '') : (item.hiragana || item.jp || '')
  })
  return map
}

// Align a single `reading` to the kanji run(s) inside `text` (from Quiz/Exam).
export function getRubyReadings(text, reading) {
  const parts = String(text || '').split(/([㐀-鿿]+)/g).filter(Boolean)
  const kanjiParts = parts.filter((part) => hasKanji(part))
  const rawReading = String(reading || '').trim()

  if (/[぀-ヿ]/.test(rawReading)) {
    let remaining = rawReading
    parts.forEach((part) => {
      if (hasKanji(part) || !part) return
      if (remaining.startsWith(part)) remaining = remaining.slice(part.length)
      else if (remaining.endsWith(part)) remaining = remaining.slice(0, -part.length)
    })
    if (kanjiParts.length === 1 && remaining) return [remaining]
  }

  const readingChunks = rawReading.split(/\s+/).filter(Boolean)
  if (readingChunks.length === kanjiParts.length) return readingChunks

  return kanjiParts.map(() => rawReading)
}

// Render `text` with a single `reading` aligned to its kanji run(s).
function renderWithReading(text, reading) {
  const parts = String(text || '').split(/([㐀-鿿]+)/g).filter(Boolean)
  const readings = getRubyReadings(text, reading)
  return parts.map((part, index) => {
    if (!hasKanji(part)) return <span key={`${part}-${index}`}>{part}</span>
    const kanjiIndex = parts.slice(0, index).filter((previous) => hasKanji(previous)).length
    const rt = readings[kanjiIndex] || reading
    return (
      <ruby key={`${part}-${index}`}>
        {part}
        <rt>{rt}</rt>
      </ruby>
    )
  })
}

// Render `text`, adding ruby over the longest matching readingMap surfaces.
function renderWithMap(text, readingMap) {
  const sortedKeys = Object.keys(readingMap).sort((a, b) => b.length - a.length)
  const parts = []
  let remaining = String(text || '')
  let i = 0
  while (remaining.length > 0) {
    let matched = false
    for (const key of sortedKeys) {
      if (key && remaining.startsWith(key)) {
        parts.push(<ruby key={i++}>{key}<rt>{readingMap[key]}</rt></ruby>)
        remaining = remaining.slice(key.length)
        matched = true
        break
      }
    }
    if (!matched) {
      const last = parts[parts.length - 1]
      if (typeof last === 'string') parts[parts.length - 1] = last + remaining[0]
      else parts.push(remaining[0])
      remaining = remaining.slice(1)
    }
  }
  return parts
}

// Walk `text`, adding ruby over each kanji run resolved by (1) the local
// readingMap (screen vocab / authored map — highest priority, used verbatim)
// then (2) the global READINGS dictionary when `useFallback` (converted to
// romaji in Romanized mode). Unknown kanji stay plain (graceful).
function resolveNodes(text, localMap, useFallback, mode) {
  const local = localMap && Object.keys(localMap).length ? localMap : null
  const localKeys = local ? Object.keys(local).sort((a, b) => b.length - a.length) : null
  const nodes = []
  let i = 0
  let buf = ''
  let key = 0
  const flush = () => { if (buf) { nodes.push(buf); buf = '' } }
  while (i < text.length) {
    let matchKey = null
    let matchReading = null
    if (local) {
      for (const k of localKeys) { if (k && text.startsWith(k, i)) { matchKey = k; matchReading = local[k]; break } }
    }
    if (!matchKey && useFallback) {
      const limit = Math.min(READINGS_MAX_LEN, text.length - i)
      for (let L = limit; L >= 1; L -= 1) {
        const sub = text.substr(i, L)
        const r = READINGS[sub]
        if (r != null) { matchKey = sub; matchReading = mode === 'romanized' ? kanaToRomaji(r) : r; break }
      }
    }
    if (matchKey && hasKanji(matchKey) && matchReading) {
      flush()
      nodes.push(<ruby key={key++}>{matchKey}<rt>{matchReading}</rt></ruby>)
      i += matchKey.length
    } else {
      buf += text[i]
      i += 1
    }
  }
  flush()
  return nodes
}

export default function JapaneseText({
  text,
  reading,
  readingMap,
  plain = false,
  fallback = false,
  className = '',
  dir = 'ltr',
  as: Tag = 'span',
  ...rest
}) {
  const { settings } = useExerciseSettings()
  const mode = settings.pronunciationMode
  const content = text == null ? '' : String(text)
  if (!content) return null
  if (plain || !hasJapanese(content)) return <Tag className={className} dir={dir} {...rest}>{content}</Tag>
  // Explicit single reading (legacy RubyText path) — no global fallback (test-safe).
  if (reading && !readingMap && !fallback) {
    if (hasKanji(content)) return <Tag className={className} dir={dir} {...rest}>{renderWithReading(content, reading)}</Tag>
    return <Tag className={className} dir={dir} {...rest}>{content}</Tag>
  }
  // Local map and/or global dictionary fallback.
  if ((readingMap && Object.keys(readingMap).length) || fallback) {
    return <Tag className={className} dir={dir} {...rest}>{resolveNodes(content, readingMap, fallback, mode)}</Tag>
  }
  return <Tag className={className} dir={dir} {...rest}>{content}</Tag>
}

// ── Back-compat named exports (drop-in for the old per-screen components) ─────
// RubyText: explicit reading only (no global fallback) — keeps kanji-reading
// quizzes/exams from leaking answers.
export function RubyText({ text, reading, className = '' }) {
  return <JapaneseText text={text} reading={reading} className={['jp-inline', className].filter(Boolean).join(' ')} />
}

// LessonJP: vocab map + global fallback so every kanji in lesson sentences,
// dialogue, examples and reading passages gets furigana.
export function LessonJP({ text, readingMap = {}, className = '' }) {
  if (!text) return null
  return <JapaneseText text={text} readingMap={readingMap} fallback className={['jp-line', className].filter(Boolean).join(' ')} />
}
