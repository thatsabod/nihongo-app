const makeQuestions = (items) =>
  items.map(([kana, answer, ...alts]) => ({
    kana,
    answer,
    options: [...new Set([answer, ...alts])].slice(0, 4),
  }))

const kanaRows = {
  hiragana: [
    ['あ', 'a', 'i', 'u', 'e'], ['い', 'i', 'a', 'ki', 'e'], ['う', 'u', 'o', 'a', 'ku'], ['え', 'e', 'i', 'o', 'ne'], ['お', 'o', 'a', 'u', 'ko'],
    ['か', 'ka', 'ki', 'sa', 'ta'], ['き', 'ki', 'ka', 'shi', 'ni'], ['く', 'ku', 'su', 'tsu', 'nu'], ['け', 'ke', 'se', 'te', 'ne'], ['こ', 'ko', 'so', 'to', 'no'],
    ['さ', 'sa', 'ka', 'ta', 'na'], ['し', 'shi', 'chi', 'ki', 'ji'], ['す', 'su', 'ku', 'tsu', 'zu'], ['せ', 'se', 'ke', 'te', 'ze'], ['そ', 'so', 'ko', 'to', 'zo'],
    ['た', 'ta', 'sa', 'na', 'ka'], ['ち', 'chi', 'shi', 'ni', 'ji'], ['つ', 'tsu', 'su', 'ku', 'zu'], ['て', 'te', 'se', 'ke', 'de'], ['と', 'to', 'so', 'ko', 'do'],
    ['な', 'na', 'ta', 'sa', 'ma'], ['に', 'ni', 'chi', 'mi', 'ki'], ['ぬ', 'nu', 'su', 'mu', 'ku'], ['ね', 'ne', 'te', 'me', 'se'], ['の', 'no', 'to', 'mo', 'so'],
    ['は', 'ha', 'na', 'ma', 'ra'], ['ひ', 'hi', 'ni', 'mi', 'ri'], ['ふ', 'fu', 'su', 'mu', 'nu'], ['へ', 'he', 'se', 'me', 'ne'], ['ほ', 'ho', 'no', 'mo', 'so'],
    ['ま', 'ma', 'ha', 'na', 'ra'], ['み', 'mi', 'hi', 'ni', 'ri'], ['む', 'mu', 'fu', 'nu', 'su'], ['め', 'me', 'he', 'ne', 'se'], ['も', 'mo', 'ho', 'no', 'to'],
    ['や', 'ya', 'ma', 'ra', 'wa'], ['ゆ', 'yu', 'mu', 'ru', 'fu'], ['よ', 'yo', 'mo', 'ro', 'no'],
    ['ら', 'ra', 'ya', 'ma', 'wa'], ['り', 'ri', 'mi', 'hi', 'ni'], ['る', 'ru', 'mu', 'yu', 'fu'], ['れ', 're', 'me', 'he', 'ne'], ['ろ', 'ro', 'mo', 'yo', 'no'],
    ['わ', 'wa', 'ya', 'ra', 'ma'], ['を', 'wo', 'wa', 'yo', 'ro'], ['ん', 'n', 'wa', 'no', 'mu'],
    ['が', 'ga', 'ka', 'da', 'za'], ['ぎ', 'gi', 'ki', 'ji', 'zi'], ['ぐ', 'gu', 'ku', 'zu', 'du'], ['げ', 'ge', 'ke', 'ze', 'de'], ['ご', 'go', 'ko', 'zo', 'do'],
    ['ざ', 'za', 'sa', 'ga', 'da'], ['じ', 'ji', 'shi', 'chi', 'gi'], ['ず', 'zu', 'su', 'gu', 'du'], ['ぜ', 'ze', 'se', 'ge', 'de'], ['ぞ', 'zo', 'so', 'go', 'do'],
    ['だ', 'da', 'ta', 'ga', 'za'], ['ぢ', 'ji', 'chi', 'di', 'gi'], ['づ', 'zu', 'tsu', 'du', 'gu'], ['で', 'de', 'te', 'ge', 'ze'], ['ど', 'do', 'to', 'go', 'zo'],
    ['ば', 'ba', 'ha', 'pa', 'ma'], ['び', 'bi', 'hi', 'pi', 'mi'], ['ぶ', 'bu', 'fu', 'pu', 'mu'], ['べ', 'be', 'he', 'pe', 'me'], ['ぼ', 'bo', 'ho', 'po', 'mo'],
    ['ぱ', 'pa', 'ba', 'ha', 'ma'], ['ぴ', 'pi', 'bi', 'hi', 'mi'], ['ぷ', 'pu', 'bu', 'fu', 'mu'], ['ぺ', 'pe', 'be', 'he', 'me'], ['ぽ', 'po', 'bo', 'ho', 'mo'],
    ['きゃ', 'kya', 'kyu', 'kyo', 'gya'], ['きゅ', 'kyu', 'kya', 'kyo', 'gyu'], ['きょ', 'kyo', 'kya', 'kyu', 'gyo'],
    ['ぎゃ', 'gya', 'kya', 'bya', 'ja'], ['ぎゅ', 'gyu', 'kyu', 'byu', 'ju'], ['ぎょ', 'gyo', 'kyo', 'byo', 'jo'],
    ['しゃ', 'sha', 'shu', 'sho', 'cha'], ['しゅ', 'shu', 'sha', 'sho', 'chu'], ['しょ', 'sho', 'sha', 'shu', 'cho'],
    ['ちゃ', 'cha', 'sha', 'ja', 'kya'], ['ちゅ', 'chu', 'shu', 'ju', 'kyu'], ['ちょ', 'cho', 'sho', 'jo', 'kyo'],
    ['にゃ', 'nya', 'mya', 'rya', 'kya'], ['にゅ', 'nyu', 'myu', 'ryu', 'kyu'], ['にょ', 'nyo', 'myo', 'ryo', 'kyo'],
    ['ひゃ', 'hya', 'bya', 'pya', 'mya'], ['ひゅ', 'hyu', 'byu', 'pyu', 'myu'], ['ひょ', 'hyo', 'byo', 'pyo', 'myo'],
    ['みゃ', 'mya', 'nya', 'rya', 'hya'], ['みゅ', 'myu', 'nyu', 'ryu', 'hyu'], ['みょ', 'myo', 'nyo', 'ryo', 'hyo'],
    ['りゃ', 'rya', 'nya', 'mya', 'kya'], ['りゅ', 'ryu', 'nyu', 'myu', 'kyu'], ['りょ', 'ryo', 'nyo', 'myo', 'kyo'],
    ['じゃ', 'ja', 'sha', 'cha', 'gya'], ['じゅ', 'ju', 'shu', 'chu', 'gyu'], ['じょ', 'jo', 'sho', 'cho', 'gyo'],
    ['びゃ', 'bya', 'pya', 'hya', 'mya'], ['びゅ', 'byu', 'pyu', 'hyu', 'myu'], ['びょ', 'byo', 'pyo', 'hyo', 'myo'],
    ['ぴゃ', 'pya', 'bya', 'hya', 'mya'], ['ぴゅ', 'pyu', 'byu', 'hyu', 'myu'], ['ぴょ', 'pyo', 'byo', 'hyo', 'myo'],
  ],
  katakana: [
    ['ア', 'a', 'i', 'u', 'e'], ['イ', 'i', 'a', 'ki', 'e'], ['ウ', 'u', 'o', 'a', 'ku'], ['エ', 'e', 'i', 'o', 'ne'], ['オ', 'o', 'a', 'u', 'ko'],
    ['カ', 'ka', 'ki', 'sa', 'ta'], ['キ', 'ki', 'ka', 'shi', 'ni'], ['ク', 'ku', 'su', 'tsu', 'nu'], ['ケ', 'ke', 'se', 'te', 'ne'], ['コ', 'ko', 'so', 'to', 'no'],
    ['サ', 'sa', 'ka', 'ta', 'na'], ['シ', 'shi', 'chi', 'ki', 'ji'], ['ス', 'su', 'ku', 'tsu', 'zu'], ['セ', 'se', 'ke', 'te', 'ze'], ['ソ', 'so', 'ko', 'to', 'zo'],
    ['タ', 'ta', 'sa', 'na', 'ka'], ['チ', 'chi', 'shi', 'ni', 'ji'], ['ツ', 'tsu', 'su', 'ku', 'zu'], ['テ', 'te', 'se', 'ke', 'de'], ['ト', 'to', 'so', 'ko', 'do'],
    ['ナ', 'na', 'ta', 'sa', 'ma'], ['ニ', 'ni', 'chi', 'mi', 'ki'], ['ヌ', 'nu', 'su', 'mu', 'ku'], ['ネ', 'ne', 'te', 'me', 'se'], ['ノ', 'no', 'to', 'mo', 'so'],
    ['ハ', 'ha', 'na', 'ma', 'ra'], ['ヒ', 'hi', 'ni', 'mi', 'ri'], ['フ', 'fu', 'su', 'mu', 'nu'], ['ヘ', 'he', 'se', 'me', 'ne'], ['ホ', 'ho', 'no', 'mo', 'so'],
    ['マ', 'ma', 'ha', 'na', 'ra'], ['ミ', 'mi', 'hi', 'ni', 'ri'], ['ム', 'mu', 'fu', 'nu', 'su'], ['メ', 'me', 'he', 'ne', 'se'], ['モ', 'mo', 'ho', 'no', 'to'],
    ['ヤ', 'ya', 'ma', 'ra', 'wa'], ['ユ', 'yu', 'mu', 'ru', 'fu'], ['ヨ', 'yo', 'mo', 'ro', 'no'],
    ['ラ', 'ra', 'ya', 'ma', 'wa'], ['リ', 'ri', 'mi', 'hi', 'ni'], ['ル', 'ru', 'mu', 'yu', 'fu'], ['レ', 're', 'me', 'he', 'ne'], ['ロ', 'ro', 'mo', 'yo', 'no'],
    ['ワ', 'wa', 'ya', 'ra', 'ma'], ['ヲ', 'wo', 'wa', 'yo', 'ro'], ['ン', 'n', 'wa', 'no', 'mu'],
    ['ガ', 'ga', 'ka', 'da', 'za'], ['ギ', 'gi', 'ki', 'ji', 'zi'], ['グ', 'gu', 'ku', 'zu', 'du'], ['ゲ', 'ge', 'ke', 'ze', 'de'], ['ゴ', 'go', 'ko', 'zo', 'do'],
    ['ザ', 'za', 'sa', 'ga', 'da'], ['ジ', 'ji', 'shi', 'chi', 'gi'], ['ズ', 'zu', 'su', 'gu', 'du'], ['ゼ', 'ze', 'se', 'ge', 'de'], ['ゾ', 'zo', 'so', 'go', 'do'],
    ['ダ', 'da', 'ta', 'ga', 'za'], ['ヂ', 'ji', 'chi', 'di', 'gi'], ['ヅ', 'zu', 'tsu', 'du', 'gu'], ['デ', 'de', 'te', 'ge', 'ze'], ['ド', 'do', 'to', 'go', 'zo'],
    ['バ', 'ba', 'ha', 'pa', 'ma'], ['ビ', 'bi', 'hi', 'pi', 'mi'], ['ブ', 'bu', 'fu', 'pu', 'mu'], ['ベ', 'be', 'he', 'pe', 'me'], ['ボ', 'bo', 'ho', 'po', 'mo'],
    ['パ', 'pa', 'ba', 'ha', 'ma'], ['ピ', 'pi', 'bi', 'hi', 'mi'], ['プ', 'pu', 'bu', 'fu', 'mu'], ['ペ', 'pe', 'be', 'he', 'me'], ['ポ', 'po', 'bo', 'ho', 'mo'],
    ['キャ', 'kya', 'kyu', 'kyo', 'gya'], ['キュ', 'kyu', 'kya', 'kyo', 'gyu'], ['キョ', 'kyo', 'kya', 'kyu', 'gyo'],
    ['ギャ', 'gya', 'kya', 'bya', 'ja'], ['ギュ', 'gyu', 'kyu', 'byu', 'ju'], ['ギョ', 'gyo', 'kyo', 'byo', 'jo'],
    ['シャ', 'sha', 'shu', 'sho', 'cha'], ['シュ', 'shu', 'sha', 'sho', 'chu'], ['ショ', 'sho', 'sha', 'shu', 'cho'],
    ['チャ', 'cha', 'sha', 'ja', 'kya'], ['チュ', 'chu', 'shu', 'ju', 'kyu'], ['チョ', 'cho', 'sho', 'jo', 'kyo'],
    ['ニャ', 'nya', 'mya', 'rya', 'kya'], ['ニュ', 'nyu', 'myu', 'ryu', 'kyu'], ['ニョ', 'nyo', 'myo', 'ryo', 'kyo'],
    ['ヒャ', 'hya', 'bya', 'pya', 'mya'], ['ヒュ', 'hyu', 'byu', 'pyu', 'myu'], ['ヒョ', 'hyo', 'byo', 'pyo', 'myo'],
    ['ミャ', 'mya', 'nya', 'rya', 'hya'], ['ミュ', 'myu', 'nyu', 'ryu', 'hyu'], ['ミョ', 'myo', 'nyo', 'ryo', 'hyo'],
    ['リャ', 'rya', 'nya', 'mya', 'kya'], ['リュ', 'ryu', 'nyu', 'myu', 'kyu'], ['リョ', 'ryo', 'nyo', 'myo', 'kyo'],
    ['ジャ', 'ja', 'sha', 'cha', 'gya'], ['ジュ', 'ju', 'shu', 'chu', 'gyu'], ['ジョ', 'jo', 'sho', 'cho', 'gyo'],
    ['ビャ', 'bya', 'pya', 'hya', 'mya'], ['ビュ', 'byu', 'pyu', 'hyu', 'myu'], ['ビョ', 'byo', 'pyo', 'hyo', 'myo'],
    ['ピャ', 'pya', 'bya', 'hya', 'mya'], ['ピュ', 'pyu', 'byu', 'hyu', 'myu'], ['ピョ', 'pyo', 'byo', 'hyo', 'myo'],
  ],
}

export const hiragana = makeQuestions(kanaRows.hiragana)
export const katakana = makeQuestions(kanaRows.katakana)

const kanjiRows = [
  ['一', 'ichi'], ['二', 'ni'], ['三', 'san'], ['四', 'yon'], ['五', 'go'],
  ['六', 'roku'], ['七', 'nana'], ['八', 'hachi'], ['九', 'kyuu'], ['十', 'juu'],
  ['百', 'hyaku'], ['千', 'sen'], ['万', 'man'], ['円', 'en'], ['日', 'nichi'],
  ['月', 'getsu'], ['火', 'ka'], ['水', 'sui'], ['木', 'moku'], ['金', 'kin'],
  ['土', 'do'], ['曜', 'you'], ['年', 'nen'], ['時', 'ji'], ['分', 'fun'],
  ['半', 'han'], ['今', 'ima'], ['毎', 'mai'], ['何', 'nani'], ['人', 'hito'],
  ['男', 'otoko'], ['女', 'onna'], ['子', 'ko'], ['父', 'chichi'], ['母', 'haha'],
  ['友', 'tomo'], ['先', 'sen'], ['生', 'sei'], ['学', 'gaku'], ['校', 'kou'],
  ['本', 'hon'], ['語', 'go'], ['国', 'kuni'], ['会', 'kai'], ['社', 'sha'],
  ['店', 'mise'], ['駅', 'eki'], ['車', 'kuruma'], ['電', 'den'], ['気', 'ki'],
  ['天', 'ten'], ['雨', 'ame'], ['空', 'sora'], ['山', 'yama'], ['川', 'kawa'],
  ['花', 'hana'], ['魚', 'sakana'], ['口', 'kuchi'], ['目', 'me'], ['耳', 'mimi'],
  ['手', 'te'], ['足', 'ashi'], ['力', 'chikara'], ['上', 'ue'], ['下', 'shita'],
  ['中', 'naka'], ['外', 'soto'], ['右', 'migi'], ['左', 'hidari'], ['前', 'mae'],
  ['後', 'ato'], ['北', 'kita'], ['南', 'minami'], ['東', 'higashi'], ['西', 'nishi'],
  ['大', 'oo'], ['小', 'chii'], ['少', 'suku'], ['多', 'oo'], ['長', 'naga'],
  ['高', 'taka'], ['安', 'yasu'], ['新', 'atara'], ['古', 'furu'], ['白', 'shiro'],
  ['赤', 'aka'], ['青', 'ao'], ['行', 'iku'], ['来', 'kuru'], ['見', 'mi'],
  ['聞', 'kiku'], ['食', 'tabe'], ['飲', 'nomi'], ['読', 'yomi'], ['書', 'kaki'],
  ['話', 'hana'], ['買', 'kai'], ['休', 'yasu'], ['出', 'de'], ['入', 'hai'],
  ['立', 'tachi'], ['名', 'na'], ['道', 'michi'], ['週', 'shuu'], ['間', 'aida'],
]

export const kanjiN5 = makeQuestions(
  kanjiRows.map(([kana, answer], index) => {
    const alts = kanjiRows
      .filter((_, altIndex) => altIndex !== index)
      .slice(index + 1)
      .concat(kanjiRows.slice(0, index))
      .map(([, reading]) => reading)
    return [kana, answer, ...alts]
  })
)

export const characterGroups = {
  hiragana: [
    { label: 'あ', chars: kanaRows.hiragana.slice(0, 5) },
    { label: 'か', chars: kanaRows.hiragana.slice(5, 10) },
    { label: 'さ', chars: kanaRows.hiragana.slice(10, 15) },
    { label: 'た', chars: kanaRows.hiragana.slice(15, 20) },
    { label: 'な', chars: kanaRows.hiragana.slice(20, 25) },
    { label: 'は', chars: kanaRows.hiragana.slice(25, 30) },
    { label: 'ま', chars: kanaRows.hiragana.slice(30, 35) },
    { label: 'や', chars: kanaRows.hiragana.slice(35, 38) },
    { label: 'ら', chars: kanaRows.hiragana.slice(38, 43) },
    { label: 'わ', chars: kanaRows.hiragana.slice(43, 46) },
    { label: 'Dakuten', chars: kanaRows.hiragana.slice(46, 71) },
    { label: 'Combinations', chars: kanaRows.hiragana.slice(71) },
  ],
  katakana: [
    { label: 'ア', chars: kanaRows.katakana.slice(0, 5) },
    { label: 'カ', chars: kanaRows.katakana.slice(5, 10) },
    { label: 'サ', chars: kanaRows.katakana.slice(10, 15) },
    { label: 'タ', chars: kanaRows.katakana.slice(15, 20) },
    { label: 'ナ', chars: kanaRows.katakana.slice(20, 25) },
    { label: 'ハ', chars: kanaRows.katakana.slice(25, 30) },
    { label: 'マ', chars: kanaRows.katakana.slice(30, 35) },
    { label: 'ヤ', chars: kanaRows.katakana.slice(35, 38) },
    { label: 'ラ', chars: kanaRows.katakana.slice(38, 43) },
    { label: 'ワ', chars: kanaRows.katakana.slice(43, 46) },
    { label: 'Dakuten', chars: kanaRows.katakana.slice(46, 71) },
    { label: 'Combinations', chars: kanaRows.katakana.slice(71) },
  ],
  kanji: [
    { label: 'Numbers', chars: kanjiN5.slice(0, 13).map(({ kana, answer }) => [kana, answer]) },
    { label: 'Nature', chars: kanjiN5.slice(13, 22).map(({ kana, answer }) => [kana, answer]) },
    { label: 'People', chars: kanjiN5.slice(22, 30).map(({ kana, answer }) => [kana, answer]) },
    { label: 'Description', chars: kanjiN5.slice(30, 35).map(({ kana, answer }) => [kana, answer]) },
    { label: 'General', chars: kanjiN5.slice(35).map(({ kana, answer }) => [kana, answer]) },
  ],
}

export const vocab = [
  { jp: '水', reading: 'mizu', meaning: 'ماء' },
  { jp: '食べる', reading: 'taberu', meaning: 'يأكل' },
  { jp: '学校', reading: 'gakkou', meaning: 'مدرسة' },
  { jp: '友達', reading: 'tomodachi', meaning: 'صديق' },
  { jp: '電車', reading: 'densha', meaning: 'قطار' },
  { jp: 'ありがとう', reading: 'arigatou', meaning: 'شكرا' },
  { jp: 'すみません', reading: 'sumimasen', meaning: 'عذرا' },
  { jp: 'はい', reading: 'hai', meaning: 'نعم' },
  { jp: 'いいえ', reading: 'iie', meaning: 'لا' },
  { jp: '先生', reading: 'sensei', meaning: 'أستاذ' },
]

export const lessons = [
  {
    id: 1,
    title: { ar: 'التعارف والتحية', en: 'Introductions' },
    focus: 'はじめまして',
    vocab: [
      { jp: 'なまえ', reading: 'namae', meaning: 'الاسم' },
      { jp: 'はじめまして', reading: 'hajimemashite', meaning: 'تشرفت بمعرفتك' },
      { jp: 'よろしく', reading: 'yoroshiku', meaning: 'يسعدني' },
      { jp: 'せんせい', reading: 'sensei', meaning: 'أستاذ' },
      { jp: 'がくせい', reading: 'gakusei', meaning: 'طالب' },
      { jp: 'にほんご', reading: 'nihongo', meaning: 'اللغة اليابانية' },
    ],
    grammar: { ar: 'X は Y です — X هو Y', en: 'X は Y です — X is Y' },
    examples: [
      { jp: 'わたしはがくせいです。', ar: 'أنا طالب.', en: 'I am a student.' },
      { jp: 'あなたはせんせいですか。', ar: 'هل أنت أستاذ؟', en: 'Are you a teacher?' },
    ],
  },
  {
    id: 2,
    title: { ar: 'الأشياء حولنا', en: 'Things Around Us' },
    focus: 'これ / それ / あれ',
    vocab: [
      { jp: 'これ', reading: 'kore', meaning: 'هذا' },
      { jp: 'それ', reading: 'sore', meaning: 'ذلك' },
      { jp: 'あれ', reading: 'are', meaning: 'ذاك' },
      { jp: 'ほん', reading: 'hon', meaning: 'كتاب' },
      { jp: 'かばん', reading: 'kaban', meaning: 'حقيبة' },
      { jp: 'えんぴつ', reading: 'enpitsu', meaning: 'قلم رصاص' },
    ],
    grammar: { ar: 'これ は X です — هذا هو X', en: 'これ は X です — This is X' },
    examples: [
      { jp: 'これはほんです。', ar: 'هذا كتاب.', en: 'This is a book.' },
      { jp: 'それはなんですか。', ar: 'ما هذا؟', en: 'What is that?' },
    ],
  },
  {
    id: 3,
    title: { ar: 'الأرقام والوقت', en: 'Numbers & Time' },
    focus: 'なんじ',
    vocab: [
      { jp: 'いち', reading: 'ichi', meaning: 'واحد' },
      { jp: 'に', reading: 'ni', meaning: 'اثنان' },
      { jp: 'さん', reading: 'san', meaning: 'ثلاثة' },
      { jp: 'よん', reading: 'yon', meaning: 'أربعة' },
      { jp: 'ご', reading: 'go', meaning: 'خمسة' },
      { jp: 'なんじ', reading: 'nanji', meaning: 'كم الساعة؟' },
    ],
    grammar: { ar: 'X じ です — الساعة X', en: 'X じ です — It is X o clock' },
    examples: [
      { jp: 'いまなんじですか。', ar: 'كم الساعة الآن؟', en: 'What time is it now?' },
      { jp: 'くじです。', ar: 'الساعة التاسعة.', en: 'It is nine.' },
    ],
  },
  {
    id: 4,
    title: { ar: 'الأنشطة اليومية', en: 'Daily Activities' },
    focus: 'ます',
    vocab: [
      { jp: 'たべます', reading: 'tabemasu', meaning: 'يأكل' },
      { jp: 'のみます', reading: 'nomimasu', meaning: 'يشرب' },
      { jp: 'みます', reading: 'mimasu', meaning: 'يشاهد' },
      { jp: 'ききます', reading: 'kikimasu', meaning: 'يسمع' },
      { jp: 'よみます', reading: 'yomimasu', meaning: 'يقرأ' },
      { jp: 'かきます', reading: 'kakimasu', meaning: 'يكتب' },
    ],
    grammar: { ar: 'فعل + ます — صيغة مهذبة للفعل', en: 'Verb + ます — polite verb form' },
    examples: [
      { jp: 'まいあさごはんをたべます。', ar: 'آكل الفطور كل صباح.', en: 'I eat breakfast every morning.' },
      { jp: 'なんじにねますか。', ar: 'في كم تنام؟', en: 'What time do you sleep?' },
    ],
  },
  {
    id: 5,
    title: { ar: 'المواصلات والتنقل', en: 'Transportation' },
    focus: 'で / に',
    vocab: [
      { jp: 'いきます', reading: 'ikimasu', meaning: 'يذهب' },
      { jp: 'きます', reading: 'kimasu', meaning: 'يأتي' },
      { jp: 'かえります', reading: 'kaerimasu', meaning: 'يرجع' },
      { jp: 'でんしゃ', reading: 'densha', meaning: 'قطار' },
      { jp: 'バス', reading: 'basu', meaning: 'باص' },
      { jp: 'えき', reading: 'eki', meaning: 'محطة' },
    ],
    grammar: { ar: 'X で Y に いきます — أذهب إلى Y بواسطة X', en: 'X で Y に いきます — Go to Y by X' },
    examples: [
      { jp: 'でんしゃでがっこうにいきます。', ar: 'أذهب إلى المدرسة بالقطار.', en: 'I go to school by train.' },
      { jp: 'どこにいきますか。', ar: 'إلى أين تذهب؟', en: 'Where are you going?' },
    ],
  },
]
