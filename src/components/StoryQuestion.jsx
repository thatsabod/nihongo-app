import { useMemo, useState } from 'react'
import AppIcon from './AppIcon.jsx'
import { playCorrect, playWrong } from '../sounds.js'
import JapaneseText from './JapaneseText.jsx'

// Shared answer feedback (with a celebration burst on correct) + Continue.
function Feedback({ ok, msg, lang, onNext }) {
  const t = (ar, en) => (lang === 'ar' ? ar : en)
  return (
    <div className={`sq-feedback ${ok ? 'ok' : 'bad'}`}>
      <span className="sq-feedback-msg">
        {ok && <span className="sq-burst" aria-hidden="true">🎉</span>}
        <AppIcon name={ok ? 'correct' : 'wrong'} size={18} />{msg}
      </span>
      <button className="btn btn-primary sq-continue" onClick={onNext}>{t('متابعة', 'Continue')}</button>
    </div>
  )
}

// One interactive story question. Owns its answer state + feedback, then calls
// onNext(isCorrect). Kinds: mcq, missing, match, tf, order.
export default function StoryQuestion({ q, lang, readingMap, onNext }) {
  const isAr = lang === 'ar'
  const t = (ar, en) => (isAr ? ar : en)

  if (q.kind === 'match') return <MatchQuestion q={q} lang={lang} readingMap={readingMap} onNext={onNext} />
  if (q.kind === 'tf') return <TrueFalseQuestion q={q} lang={lang} readingMap={readingMap} onNext={onNext} />
  if (q.kind === 'order') return <OrderQuestion q={q} lang={lang} onNext={onNext} />

  // mcq / missing — single choice
  const [picked, setPicked] = useState(null)
  const answered = picked != null
  const isCorrect = picked === q.answer
  const prompt = q.kind === 'missing' ? t('اختر الكلمة الناقصة', 'Select the missing word') : q.prompt

  const choose = (opt) => {
    if (answered) return
    setPicked(opt)
    if (opt === q.answer) playCorrect()
    else playWrong()
  }

  return (
    <div className="sq">
      {q.kind === 'missing' && <p className="sq-sentence" dir="ltr"><JapaneseText text={q.prompt} readingMap={readingMap} fallback={!!readingMap} /></p>}
      <p className="sq-prompt"><JapaneseText as="span" dir="auto" text={prompt} readingMap={readingMap} fallback={!!readingMap} /></p>
      <div className="sq-options">
        {q.options.map((opt) => {
          const state = !answered ? '' : opt === q.answer ? 'correct' : opt === picked ? 'wrong' : ''
          return (
            <button key={opt} type="button" className={`sq-option ${state}`} dir="auto" disabled={answered} onClick={() => choose(opt)}>
              <JapaneseText as="span" dir="auto" text={opt} readingMap={readingMap} fallback={!!readingMap} />
            </button>
          )
        })}
      </div>
      {answered && (
        <Feedback ok={isCorrect} lang={lang} onNext={() => onNext(isCorrect)} msg={feedbackMsg(isCorrect, q, t)} />
      )}
    </div>
  )
}

// Feedback line for a single-choice question: praise/answer + optional authored explanation.
function feedbackMsg(isCorrect, q, t) {
  const base = isCorrect ? t('أحسنت!', 'Nice!') : `${t('الإجابة', 'Answer')}: ${q.answer}`
  return q.explain ? `${base} — ${q.explain}` : base
}

// True/False on a vocab meaning ("「word」 = meaning?").
function TrueFalseQuestion({ q, lang, readingMap, onNext }) {
  const t = (ar, en) => (lang === 'ar' ? ar : en)
  const [picked, setPicked] = useState(null)
  const answered = picked !== null
  const isCorrect = picked === q.answer
  const choose = (val) => { if (answered) return; setPicked(val); if (val === q.answer) playCorrect(); else playWrong() }
  const tfClass = (val) => (!answered ? '' : q.answer === val ? 'correct' : picked === val ? 'wrong' : '')
  return (
    <div className="sq">
      <p className="sq-prompt">{t('صح أم خطأ؟', 'True or false?')}</p>
      <p className="sq-tf-stmt" dir="auto"><span dir="ltr">「<JapaneseText as="span" text={q.word} readingMap={readingMap} fallback={!!readingMap} />」</span> = {q.meaning}</p>
      <div className="sq-tf">
        <button type="button" className={`sq-tf-btn ${tfClass(true)}`} disabled={answered} onClick={() => choose(true)} aria-label={t('صح', 'True')}>
          <AppIcon name="correct" size={30} />
        </button>
        <button type="button" className={`sq-tf-btn ${tfClass(false)}`} disabled={answered} onClick={() => choose(false)} aria-label={t('خطأ', 'False')}>
          <AppIcon name="wrong" size={30} />
        </button>
      </div>
      {answered && (
        <Feedback ok={isCorrect} lang={lang} onNext={() => onNext(isCorrect)} msg={isCorrect ? t('أحسنت!', 'Nice!') : t('غير صحيح', 'Not quite')} />
      )}
    </div>
  )
}

// Tap-the-pairs: tap one Arabic meaning + its Japanese word to match.
function MatchQuestion({ q, lang, readingMap, onNext }) {
  const t = (ar, en) => (lang === 'ar' ? ar : en)
  const left = useMemo(() => q.pairs.map((p, i) => ({ i, label: p.ar })), [q])
  const right = useMemo(() => [...q.pairs.map((p, i) => ({ i, label: p.jp }))].sort(() => Math.random() - 0.5), [q])
  const [sel, setSel] = useState(null)
  const [matched, setMatched] = useState([])
  const [wrong, setWrong] = useState(null)
  const [misses, setMisses] = useState(0)
  const done = matched.length === q.pairs.length

  const tap = (col, item) => {
    if (matched.includes(item.i)) return
    if (!sel) { setSel({ col, i: item.i }); return }
    if (sel.col === col) { setSel({ col, i: item.i }); return }
    if (sel.i === item.i) { setMatched((m) => [...m, item.i]); playCorrect(); setSel(null) }
    else { setWrong(item.i); setMisses((n) => n + 1); playWrong(); setTimeout(() => setWrong(null), 350); setSel(null) }
  }

  const cellClass = (col, item) => [
    'sq-match-cell',
    matched.includes(item.i) ? 'matched' : '',
    sel && sel.col === col && sel.i === item.i ? 'active' : '',
    wrong === item.i ? 'wrong' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className="sq">
      <p className="sq-prompt">{t('وصّل الأزواج', 'Tap the pairs')}</p>
      <div className="sq-match">
        <div className="sq-match-col">
          {left.map((item) => (
            <button key={`l${item.i}`} type="button" className={cellClass('l', item)} disabled={matched.includes(item.i)} dir="auto" onClick={() => tap('l', item)}>{item.label}</button>
          ))}
        </div>
        <div className="sq-match-col">
          {right.map((item) => (
            <button key={`r${item.i}`} type="button" className={cellClass('r', item)} disabled={matched.includes(item.i)} dir="ltr" onClick={() => tap('r', item)}><JapaneseText as="span" text={item.label} readingMap={readingMap} fallback={!!readingMap} /></button>
          ))}
        </div>
      </div>
      {done && <Feedback ok lang={lang} onNext={() => onNext(misses === 0)} msg={misses === 0 ? t('ممتاز!', 'Perfect!') : t('أحسنت!', 'Nice!')} />}
    </div>
  )
}

// Sentence order: tap word chips to rebuild the sentence in the right order.
function OrderQuestion({ q, lang, onNext }) {
  const t = (ar, en) => (lang === 'ar' ? ar : en)
  const [built, setBuilt] = useState([]) // { tk, i }
  const [bank, setBank] = useState(() => q.tokens.map((tk, i) => ({ tk, i })))
  const [checked, setChecked] = useState(null) // null | bool

  const pick = (item) => { if (checked != null) return; setBuilt((b) => [...b, item]); setBank((bk) => bk.filter((x) => x.i !== item.i)) }
  const undo = (item) => { if (checked != null) return; setBuilt((b) => b.filter((x) => x.i !== item.i)); setBank((bk) => [...bk, item]) }
  const check = () => {
    const ok = built.map((x) => x.tk).join('｜') === q.answer.join('｜')
    setChecked(ok)
    if (ok) playCorrect(); else playWrong()
  }

  return (
    <div className="sq">
      <p className="sq-prompt">{t('رتّب الجملة', 'Arrange the sentence')}</p>
      {q.ar && <p className="sq-order-hint" dir="rtl">{q.ar}</p>}
      <div className={`sq-order-build ${checked === true ? 'ok' : checked === false ? 'bad' : ''}`} dir="ltr">
        {built.length ? built.map((item) => (
          <button key={item.i} type="button" className="sq-chip" disabled={checked != null} onClick={() => undo(item)}>{item.tk}</button>
        )) : <span className="sq-order-placeholder">…</span>}
      </div>
      <div className="sq-order-bank" dir="ltr">
        {bank.map((item) => (
          <button key={item.i} type="button" className="sq-chip" onClick={() => pick(item)}>{item.tk}</button>
        ))}
      </div>
      {checked == null ? (
        <button className="btn btn-primary sq-continue" disabled={built.length !== q.tokens.length} onClick={check}>{t('تحقّق', 'Check')}</button>
      ) : (
        <Feedback ok={checked} lang={lang} onNext={() => onNext(checked)} msg={checked ? t('أحسنت!', 'Nice!') : `${t('الصحيح', 'Correct')}: ${q.answer.join(' ')}`} />
      )}
    </div>
  )
}
