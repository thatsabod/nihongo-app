import { useRef, useState } from 'react'
import { IconPlus, IconSend, IconImage } from './CommunityIcons.jsx'

// Bottom chat composer: attachments (+) → image/file/location, text input,
// paper-plane send.
// NOTE: image/file currently send a text placeholder naming the file (no binary
// upload yet — TODO: Firebase Storage upload + imageUrl/fileUrl on the message).
// Location sends a real Google-Maps link from the device's geolocation.
export default function ChatComposer({ value, onChange, onSend, onSendText, lang }) {
  const isAr = lang === 'ar'
  const [attachOpen, setAttachOpen] = useState(false)
  const imgRef = useRef(null)
  const fileRef = useRef(null)
  const canSend = value.trim().length > 0

  const submit = () => { if (canSend) onSend() }

  const onPickImage = (e) => {
    const f = e.target.files?.[0]
    if (f) onSendText?.(`📷 ${isAr ? 'صورة' : 'Image'}: ${f.name}`)
    e.target.value = ''
    setAttachOpen(false)
  }
  const onPickFile = (e) => {
    const f = e.target.files?.[0]
    if (f) onSendText?.(`📎 ${isAr ? 'ملف' : 'File'}: ${f.name}`)
    e.target.value = ''
    setAttachOpen(false)
  }
  const shareLocation = () => {
    setAttachOpen(false)
    if (!navigator.geolocation) { onSendText?.(isAr ? '📍 الموقع غير مدعوم على هذا الجهاز' : '📍 Location not supported'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        onSendText?.(`📍 ${isAr ? 'موقعي' : 'My location'}: https://maps.google.com/?q=${latitude.toFixed(5)},${longitude.toFixed(5)}`)
      },
      () => onSendText?.(isAr ? '📍 تعذّر تحديد الموقع' : '📍 Could not get location'),
    )
  }

  return (
    <footer className="cm-composer">
      <input ref={imgRef} type="file" accept="image/*" hidden onChange={onPickImage} />
      <input ref={fileRef} type="file" hidden onChange={onPickFile} />
      <div className="cm-attach-wrap">
        <button className="cm-composer-btn" onClick={() => setAttachOpen((v) => !v)} aria-label={isAr ? 'إرفاق' : 'Attach'}>
          <IconPlus size={22} />
        </button>
        {attachOpen && (
          <div className="cm-attach-menu">
            <button onClick={() => imgRef.current?.click()}><IconImage size={18} />{isAr ? 'صورة' : 'Image'}</button>
            <button onClick={() => fileRef.current?.click()}>📎 {isAr ? 'ملف' : 'File'}</button>
            <button onClick={shareLocation}>📍 {isAr ? 'موقع' : 'Location'}</button>
          </div>
        )}
      </div>
      <input
        className="cm-composer-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
        placeholder={isAr ? 'اكتب رسالة...' : 'Message...'}
        dir="auto"
      />
      <button className="cm-send-btn" onClick={submit} disabled={!canSend} aria-label={isAr ? 'إرسال' : 'Send'}>
        <IconSend size={20} />
      </button>
    </footer>
  )
}
