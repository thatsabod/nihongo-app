// Global Japanese reading dictionary — the fallback used by <JapaneseText> so
// EVERY kanji word gets furigana, not only the ones in a screen's vocab list.
//
// Layers (later overrides earlier):
//   1. GENERATED — auto-extracted from all lesson vocab + story furigana maps
//      (src/data/lessonReadings.generated.json, ~1.2k word→kana entries).
//   2. COMMON — curated gap-filler: proper nouns, counters, very common words,
//      and single-kanji verb/adjective stems so conjugations (見ました, 行って,
//      高かった…) still get furigana. Beginner-correct; longer keys win, so
//      compounds (銀行, 来る…) override bare-stem readings via longest-match.
//
// Readings are stored as HIRAGANA. Romaji mode converts on the fly (kanaToRomaji).
// Unknown kanji render gracefully as plain text (no wrong guesses).

import GENERATED from './lessonReadings.generated.json'

const COMMON = {
  // proper nouns + common nouns (incl. words missing from vocab)
  東京: 'とうきょう', 日本: 'にほん', 日本人: 'にほんじん', 日本語: 'にほんご', 英語: 'えいご',
  大阪: 'おおさか', 京都: 'きょうと', 中国: 'ちゅうごく', 韓国: 'かんこく', 銀行: 'ぎんこう',
  旅行: 'りょこう', 勉強: 'べんきょう', 質問: 'しつもん', 宿題: 'しゅくだい', 教室: 'きょうしつ',
  会社: 'かいしゃ', 受付: 'うけつけ', 階: 'かい', 私: 'わたし', 僕: 'ぼく', 名前: 'なまえ',
  電話: 'でんわ', 時間: 'じかん', 今日: 'きょう', 昨日: 'きのう', 明日: 'あした', 毎日: 'まいにち',
  友達: 'ともだち', 家族: 'かぞく', 映画: 'えいが', 音楽: 'おんがく', 天気: 'てんき', 元気: 'げんき',
  病院: 'びょういん', 図書館: 'としょかん', 駅: 'えき', 電車: 'でんしゃ', 飛行機: 'ひこうき',
  自転車: 'じてんしゃ', 学校: 'がっこう', 大学: 'だいがく', 先生: 'せんせい', 学生: 'がくせい',
  仕事: 'しごと', 部屋: 'へや', 料理: 'りょうり', 買い物: 'かいもの', 散歩: 'さんぽ',
  // single-kanji verb stems (stable kun readings; compounds resolved by longer keys)
  見: 'み', 食: 'た', 飲: 'の', 買: 'か', 書: 'か', 読: 'よ', 聞: 'き', 話: 'はな', 持: 'も',
  待: 'ま', 言: 'い', 思: 'おも', 知: 'し', 帰: 'かえ', 入: 'はい', 出: 'で', 立: 'た', 座: 'すわ',
  歩: 'ある', 走: 'はし', 泳: 'およ', 起: 'お', 寝: 'ね', 休: 'やす', 使: 'つか', 作: 'つく',
  行: 'い', 働: 'はたら', 住: 'す', 遊: 'あそ', 歌: 'うた', 撮: 'と', 貸: 'か', 借: 'か', 会: 'あ',
  開: 'あ', 閉: 'し', 降: 'ふ', 乗: 'の', 着: 'き', 洗: 'あら', 教: 'おし', 習: 'なら', 終: 'お',
  始: 'はじ', 押: 'お', 引: 'ひ', 切: 'き', 消: 'け', 付: 'つ', 取: 'と', 渡: 'わた', 探: 'さが',
  // 来 (irregular — longer keys override the bare stem)
  来: 'き', 来る: 'くる', 来ない: 'こない', 来い: 'こい',
  // single-kanji adjective stems
  高: 'たか', 安: 'やす', 新: 'あたら', 古: 'ふる', 大: 'おお', 小: 'ちい', 長: 'なが',
  短: 'みじか', 早: 'はや', 速: 'はや', 多: 'おお', 少: 'すく', 楽: 'たの', 悲: 'かな',
  嬉: 'うれ', 怖: 'こわ', 暗: 'くら', 暑: 'あつ', 熱: 'あつ', 寒: 'さむ', 重: 'おも', 軽: 'かる',
  強: 'つよ', 弱: 'よわ', 近: 'ちか', 遠: 'とお', 広: 'ひろ', 狭: 'せま', 忙: 'いそが',
  // numbers + time/counter kanji
  一: 'いち', 二: 'に', 三: 'さん', 四: 'よん', 五: 'ご', 六: 'ろく', 七: 'なな', 八: 'はち',
  九: 'きゅう', 十: 'じゅう', 百: 'ひゃく', 千: 'せん', 万: 'まん', 円: 'えん', 年: 'ねん',
  月: 'つき', 日: 'ひ', 時: 'じ', 分: 'ふん', 週: 'しゅう', 人: 'ひと', 今: 'いま', 何: 'なに',
  水: 'みず', 火: 'ひ', 木: 'き', 金: 'きん', 土: 'つち', 花: 'はな', 山: 'やま', 川: 'かわ',
  空: 'そら', 海: 'うみ', 雨: 'あめ', 雪: 'ゆき', 車: 'くるま', 家: 'いえ', 店: 'みせ',
  本: 'ほん', 紙: 'かみ', 手: 'て', 足: 'あし', 目: 'め', 口: 'くち', 耳: 'みみ', 顔: 'かお',
  犬: 'いぬ', 猫: 'ねこ', 鳥: 'とり', 魚: 'さかな', 肉: 'にく', 米: 'こめ', 茶: 'ちゃ',
}

// Merge: curated wins on key collisions.
export const READINGS = { ...GENERATED, ...COMMON }

export const READINGS_MAX_LEN = Object.keys(READINGS).reduce((m, k) => Math.max(m, k.length), 1)

// ── Hiragana/Katakana → Hepburn romaji (for Romanized mode fallback) ─────────
const ROMA = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', を: 'o', ん: 'n',
}
const DIGRAPH = {
  きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo', ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo',
  しゃ: 'sha', しゅ: 'shu', しょ: 'sho', じゃ: 'ja', じゅ: 'ju', じょ: 'jo',
  ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho', にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo',
  ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo', びゃ: 'bya', びゅ: 'byu', びょ: 'byo',
  ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo', みゃ: 'mya', みゅ: 'myu', みょ: 'myo',
  りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo',
}
const kataToHira = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))

export function kanaToRomaji(input) {
  const kana = kataToHira(String(input || ''))
  let out = ''
  let i = 0
  while (i < kana.length) {
    const two = kana.substr(i, 2)
    if (DIGRAPH[two]) { out += DIGRAPH[two]; i += 2; continue }
    const c = kana[i]
    if (c === 'っ') { // sokuon: double next consonant
      const nextRoma = DIGRAPH[kana.substr(i + 1, 2)] || ROMA[kana[i + 1]] || ''
      if (nextRoma) out += nextRoma[0]
      i += 1; continue
    }
    if (c === 'ー') { out += out.slice(-1); i += 1; continue }
    out += ROMA[c] != null ? ROMA[c] : c
    i += 1
  }
  return out
}

// Look up a single surface form in the global dictionary (exact key).
export function readingFor(surface) {
  return READINGS[surface] || null
}
