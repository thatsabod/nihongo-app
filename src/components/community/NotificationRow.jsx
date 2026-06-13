import { IconHeart, IconComment, IconShare, IconRequests, IconProfile, IconPencil, IconMic, IconBell, IconCheck } from './CommunityIcons.jsx'

// Map a notification type → { icon, titleAr, titleEn }. Unknown types fall back
// to a bell + the stored text.
function meta(type, isAr) {
  switch (type) {
    case 'question_reply': return { Icon: IconComment, title: isAr ? 'ردّ على سؤالك' : 'replied to your question' }
    case 'question_repost': return { Icon: IconShare, title: isAr ? 'أعاد نشر سؤالك' : 'reposted your question' }
    case 'like': return { Icon: IconHeart, title: isAr ? 'أعجب بمنشورك' : 'liked your post' }
    case 'comment': return { Icon: IconComment, title: isAr ? 'علّق على منشورك' : 'commented on your post' }
    case 'correction': return { Icon: IconPencil, title: isAr ? 'صحّح جملتك' : 'corrected your sentence' }
    case 'friend_request': return { Icon: IconRequests, title: isAr ? 'يريد متابعتك' : 'wants to follow you' }
    case 'friend_accept': return { Icon: IconCheck, title: isAr ? 'قبل طلب المتابعة' : 'accepted your request' }
    case 'mention': return { Icon: IconProfile, title: isAr ? 'أشار إليك' : 'mentioned you' }
    case 'voice_join': return { Icon: IconMic, title: isAr ? 'انضم إلى غرفتك' : 'joined your voice room' }
    case 'challenge_result': return { Icon: IconCheck, title: isAr ? 'نتيجة التحدي' : 'challenge result' }
    case 'teacher': return { Icon: IconBell, title: isAr ? 'إعلان من المعلّم' : 'teacher announcement' }
    default: return { Icon: IconBell, title: '' }
  }
}

export default function NotificationRow({ notification, lang, onClick }) {
  const isAr = lang === 'ar'
  const { Icon, title } = meta(notification.type, isAr)
  const handle = notification.fromHandle || (isAr ? 'نظام' : 'System')
  return (
    <button className={`cm-notif ${notification.read ? 'read' : 'unread'}`} onClick={onClick}>
      <span className="cm-notif-icon"><Icon size={18} /></span>
      <span className="cm-notif-main">
        <span className="cm-notif-title">
          <strong>{handle}</strong>{title ? ` ${title}` : ''}
        </span>
        {notification.text && <span className="cm-notif-desc" dir="auto">{notification.text}</span>}
        {notification.time && <span className="cm-notif-time">{notification.time}</span>}
      </span>
      {!notification.read && <span className="cm-notif-dot" aria-hidden="true" />}
    </button>
  )
}
