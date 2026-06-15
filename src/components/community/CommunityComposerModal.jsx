import { useEffect, useRef, useState } from 'react'

const MAX_IMAGES = 4
const IMAGE_TYPES = ['post', 'question', 'achievement']

// Twitter/X-style post composer (bottom sheet). Supports several post types that
// all persist into the existing communityQuestions collection via onSubmit:
// post / question / achievement / poll / voiceRoom. Images + scheduling are
// staged for the next phase.
const TYPES = (isAr) => [
  { id: 'post', emoji: '📝', label: isAr ? 'منشور' : 'Post' },
  { id: 'question', emoji: '❓', label: isAr ? 'سؤال' : 'Question' },
  { id: 'achievement', emoji: '🏆', label: isAr ? 'إنجاز' : 'Achievement' },
  { id: 'poll', emoji: '📊', label: isAr ? 'استفتاء' : 'Poll' },
  { id: 'voiceRoom', emoji: '🎙️', label: isAr ? 'غرفة صوتية' : 'Voice room' },
]
const DURATIONS = [1, 3, 7]
const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1']
const MAX_OPTIONS = 5

export default function CommunityComposerModal({ lang, initialType = 'post', onClose, onSubmit }) {
  const isAr = lang === 'ar'
  const t = (ar, en) => (isAr ? ar : en)
  const [type, setType] = useState(initialType)
  const [text, setText] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [duration, setDuration] = useState(3)
  const [room, setRoom] = useState({ title: '', level: 'N5', capacity: 8 })
  const [images, setImages] = useState([]) // { file, url }
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => () => images.forEach((im) => URL.revokeObjectURL(im.url)), [images])

  const addImages = (fileList) => {
    const picked = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'))
    setImages((prev) => [...prev, ...picked.map((f) => ({ file: f, url: URL.createObjectURL(f) }))].slice(0, MAX_IMAGES))
  }
  const removeImage = (i) => setImages((prev) => {
    const im = prev[i]
    if (im) URL.revokeObjectURL(im.url)
    return prev.filter((_, j) => j !== i)
  })
  const showImages = IMAGE_TYPES.includes(type)

  const placeholder = {
    post: t('بماذا تفكر؟', 'What’s on your mind?'),
    question: t('اكتب سؤالك عن اليابانية…', 'Ask your Japanese question…'),
    achievement: t('شارك إنجازك! 🎉', 'Share your achievement! 🎉'),
    poll: t('اكتب سؤال الاستفتاء…', 'Ask your poll question…'),
    voiceRoom: t('وصف قصير للغرفة (اختياري)', 'Short room description (optional)'),
  }[type]

  const validOptions = options.map((o) => o.trim()).filter(Boolean)
  const canSubmit = type === 'voiceRoom'
    ? room.title.trim().length > 0
    : type === 'poll'
      ? text.trim().length > 0 && validOptions.length >= 2
      : (text.trim().length > 0 || images.length > 0)

  const submit = async () => {
    if (!canSubmit || busy) return
    setBusy(true)
    const payload = { type, text: text.trim() }
    if (showImages && images.length) payload.images = images.map((im) => im.file)
    if (type === 'poll') {
      payload.poll = {
        options: validOptions.slice(0, MAX_OPTIONS).map((o, i) => ({ id: `o${i}`, text: o })),
        durationDays: duration,
      }
    }
    if (type === 'voiceRoom') {
      payload.voiceRoom = { title: room.title.trim(), level: room.level, capacity: Number(room.capacity) || 8 }
    }
    try { await onSubmit(payload) } finally { setBusy(false) }
  }

  return (
    <div className="cmx-root" dir={isAr ? 'rtl' : 'ltr'}>
      <button className="cmx-backdrop" aria-label={t('إغلاق', 'Close')} onClick={onClose} />
      <div className="cmx-sheet" role="dialog" aria-modal="true">
        <span className="cmx-handle" aria-hidden="true" />
        <header className="cmx-head">
          <button className="cmx-cancel" onClick={onClose}>{t('إلغاء', 'Cancel')}</button>
          <strong>{t('منشور جديد', 'New post')}</strong>
          <button className="cmx-publish" disabled={!canSubmit || busy} onClick={submit}>
            {busy ? t('جارٍ…', '…') : t('نشر', 'Post')}
          </button>
        </header>

        <div className="cmx-types">
          {TYPES(isAr).map((ty) => (
            <button key={ty.id} type="button" className={`cmx-type ${type === ty.id ? 'active' : ''}`} onClick={() => setType(ty.id)}>
              <span aria-hidden="true">{ty.emoji}</span>{ty.label}
            </button>
          ))}
        </div>

        <div className="cmx-body">
          {type === 'voiceRoom' && (
            <input
              className="cmx-input"
              value={room.title}
              onChange={(e) => setRoom((r) => ({ ...r, title: e.target.value }))}
              placeholder={t('اسم الغرفة', 'Room name')}
              dir="auto"
            />
          )}

          <textarea
            className="cmx-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            dir="auto"
            rows={type === 'voiceRoom' ? 2 : 4}
          />

          {showImages && (
            <div className="cmx-images">
              {images.map((im, i) => (
                <div key={i} className="cmx-img-thumb">
                  <img src={im.url} alt="" />
                  <button type="button" className="cmx-img-remove" onClick={() => removeImage(i)} aria-label={t('حذف الصورة', 'Remove image')}>×</button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <button type="button" className="cmx-img-add" onClick={() => fileRef.current?.click()}>
                  📷<span>{t('صورة', 'Image')}</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addImages(e.target.files); e.target.value = '' }} />
            </div>
          )}

          {type === 'poll' && (
            <div className="cmx-poll">
              {options.map((o, i) => (
                <div key={i} className="cmx-poll-opt">
                  <input
                    value={o}
                    onChange={(e) => setOptions((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                    placeholder={`${t('خيار', 'Option')} ${i + 1}`}
                    dir="auto"
                  />
                  {options.length > 2 && (
                    <button type="button" className="cmx-opt-remove" onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))} aria-label={t('حذف', 'Remove')}>×</button>
                  )}
                </div>
              ))}
              {options.length < MAX_OPTIONS && (
                <button type="button" className="cmx-opt-add" onClick={() => setOptions((prev) => [...prev, ''])}>
                  + {t('إضافة خيار', 'Add option')}
                </button>
              )}
              <div className="cmx-chiprow">
                <span>{t('المدة', 'Duration')}:</span>
                {DURATIONS.map((d) => (
                  <button key={d} type="button" className={`cmx-chip ${duration === d ? 'active' : ''}`} onClick={() => setDuration(d)}>
                    {d} {t('يوم', 'd')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {type === 'voiceRoom' && (
            <div className="cmx-room">
              <div className="cmx-chiprow">
                <span>{t('المستوى', 'Level')}:</span>
                {LEVELS.map((l) => (
                  <button key={l} type="button" className={`cmx-chip ${room.level === l ? 'active' : ''}`} onClick={() => setRoom((r) => ({ ...r, level: l }))}>{l}</button>
                ))}
              </div>
              <label className="cmx-room-cap">
                {t('أقصى عدد المشاركين', 'Max participants')}
                <input type="number" min="2" max="50" value={room.capacity} onChange={(e) => setRoom((r) => ({ ...r, capacity: e.target.value }))} />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
