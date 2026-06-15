// Original interactive N5 stories (Duolingo-Stories style) for Arabic-speaking
// learners. Hand-authored and JLPT-N5-verified, then converted from kana to
// natural KANJI with a per-story `furigana` map (kanji-run → hiragana reading)
// — the global <JapaneseText> renderer uses it to show furigana ABOVE the kanji
// while keeping the original kanji text visible. Each story:
//   { id, title, titleAr, titleEn, sentences:[{jp,romaji,ar}], vocab, questions,
//     script:[ line | q ], furigana:{ kanjiRun: reading }, xp, gems }
// The data (all 10) lives in n5Stories.full.json (generated + verified by the
// n5-stories-kanjify workflow); this module just surfaces it.
import STORIES from './n5Stories.full.json'

export const N5_STORIES = STORIES
