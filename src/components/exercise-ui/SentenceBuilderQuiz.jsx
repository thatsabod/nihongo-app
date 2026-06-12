import { useState } from 'react'
import { speakJapanese, playCorrect, playWrong } from '../../sounds.js'
import RuaaMascot from '../RuaaMascot.jsx'
import IconCircle from '../IconCircle.jsx'
import { ExercisePane } from './ExerciseContainer.jsx'
import QuestionCard, { SentenceDisplay } from './QuestionCard.jsx'
import ActionButton from './ActionButton.jsx'

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

// Reusable "build the sentence from the word bank" exercise.
// `bank` is the full set of word-bank tokens (correct words + distractors);
// `answer` is the correct token order. Check stays disabled until every
// answer slot is filled. Supports click-to-move and drag-and-drop.
export default function SentenceBuilderQuiz({
  prompt,
  isNewWord,
  sentence,
  reading,
  speakText,
  bank,
  answer,
  lang = 'en',
  onAnswer,
  mascotCharacter = 'joni',
}) {
  const isAr = lang === 'ar'
  const [pool, setPool] = useState(() => shuffle(bank).map((w, i) => ({ w, key: `b${i}` })))
  const [selected, setSelected] = useState([])
  const [result, setResult] = useState(null)

  const add = (item) => {
    if (result) return
    setSelected((s) => [...s, item])
    setPool((p) => p.filter((x) => x.key !== item.key))
  }

  const remove = (item) => {
    if (result) return
    setPool((p) => [...p, item])
    setSelected((s) => s.filter((x) => x.key !== item.key))
  }

  const undo = () => {
    if (result || selected.length === 0) return
    remove(selected[selected.length - 1])
  }

  const check = () => {
    if (result || selected.length === 0) return
    const built = selected.map((item) => item.w)
    const correct = built.every((w, i) => w === answer[i])
    setResult(correct ? 'correct' : 'wrong')
    if (correct) playCorrect()
    else playWrong()
    setTimeout(() => onAnswer(correct), 1200)
  }

  const dragStart = (item) => (event) => {
    event.dataTransfer.setData('text/plain', item.key)
  }

  const dropOn = (zone) => (event) => {
    event.preventDefault()
    if (result) return
    const key = event.dataTransfer.getData('text/plain')
    if (zone === 'answer') {
      const item = pool.find((x) => x.key === key)
      if (item) add(item)
    } else {
      const item = selected.find((x) => x.key === key)
      if (item) remove(item)
    }
  }

  const allowDrop = (event) => event.preventDefault()

  const mascotMode = result ? (result === 'correct' ? 'cheer' : 'skeptical') : 'thinking'

  return (
    <ExercisePane>
      {isNewWord && (
        <span className="vocab-new-word-badge">
          <IconCircle name="lessons" size={20} />
          {isAr ? 'كلمة جديدة' : 'NEW WORD'}
        </span>
      )}
      <RuaaMascot mode={mascotMode} character={mascotCharacter} />
      <QuestionCard prompt={prompt || (isAr ? 'ترجم هذه الجملة' : 'Translate this sentence')} />

      <SentenceDisplay dir="ltr" onClick={() => speakJapanese(speakText || sentence)}>
        <span className="speaking-sentence">
          {reading && <small className="speaking-reading">{reading}</small>}
          <span>{sentence}</span>
        </span>
      </SentenceDisplay>

      <div
        className={`build-answer sentence-build-answer ${result || ''}`}
        onDragOver={allowDrop}
        onDrop={dropOn('answer')}
      >
        {selected.length === 0
          ? <span className="build-placeholder">{isAr ? 'اضغط الكلمات بالترتيب...' : 'Tap the words in order...'}</span>
          : selected.map((item) => (
            <button
              key={item.key}
              type="button"
              className="word-chip"
              draggable={!result}
              disabled={Boolean(result)}
              onDragStart={dragStart(item)}
              onClick={() => remove(item)}
            >
              {item.w}
            </button>
          ))
        }
      </div>

      <div className="build-pool" onDragOver={allowDrop} onDrop={dropOn('pool')}>
        {pool.map((item) => (
          <button
            key={item.key}
            type="button"
            className="word-chip"
            draggable={!result}
            disabled={Boolean(result)}
            onDragStart={dragStart(item)}
            onClick={() => add(item)}
          >
            {item.w}
          </button>
        ))}
      </div>

      <div className="sentence-builder-actions">
        {selected.length > 0 && !result && (
          <button type="button" className="muted-link" onClick={undo}>
            {isAr ? 'تراجع' : 'Undo'}
          </button>
        )}
        {selected.length > 0 && !result && (
          <ActionButton onClick={check}>
          {isAr ? 'تحقّق' : 'CHECK'}
          </ActionButton>
        )}
      </div>

      {result === 'wrong' && (
        <p className="iex-result wrong">{isAr ? `الجواب: ${answer.join(' ')}` : `Answer: ${answer.join(' ')}`}</p>
      )}
    </ExercisePane>
  )
}
