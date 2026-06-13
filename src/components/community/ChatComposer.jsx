import { useState } from 'react'
import { IconPlus, IconSend, IconImage } from './CommunityIcons.jsx'

// Bottom chat composer: attachments (+) → image/file/location menu (UI stubs
// for now), text input, paper-plane send.
export default function ChatComposer({ value, onChange, onSend, lang }) {
  const isAr = lang === 'ar'
  const [attachOpen, setAttachOpen] = useState(false)
  const canSend = value.trim().length > 0

  const submit = () => { if (canSend) onSend() }

  return (
    <footer className="cm-composer">
      <div className="cm-attach-wrap">
        <button className="cm-composer-btn" onClick={() => setAttachOpen((v) => !v)} aria-label={isAr ? 'إرفاق' : 'Attach'}>
          <IconPlus size={22} />
        </button>
        {attachOpen && (
          <div className="cm-attach-menu">
            <button onClick={() => setAttachOpen(false)}><IconImage size={18} />{isAr ? 'صورة' : 'Image'}</button>
            <button onClick={() => setAttachOpen(false)}>📎 {isAr ? 'ملف' : 'File'}</button>
            <button onClick={() => setAttachOpen(false)}>📍 {isAr ? 'موقع' : 'Location'}</button>
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
