import { IconDM, IconRequests, IconSearch, IconBell, IconProfile } from './CommunityIcons.jsx'

// Sticky community top bar: DMs + friend-requests (start), rounded search
// (center), notifications + profile (end). Badges show unread counts.
export default function CommunityHeader({
  lang, searchValue, onSearchChange,
  onOpenMessages, unreadMessages = 0,
  onOpenRequests, requestsCount = 0,
  onOpenNotifications, unreadNotifications = 0,
  onOpenProfile,
}) {
  const isAr = lang === 'ar'
  const Badge = ({ n }) => (n > 0 ? <b className="cm-badge">{n > 99 ? '99+' : n}</b> : null)
  return (
    <header className="cm-header">
      <div className="cm-header-group">
        <button className="cm-icon-btn" onClick={onOpenMessages} aria-label={isAr ? 'الرسائل' : 'Messages'}>
          <IconDM size={22} /><Badge n={unreadMessages} />
        </button>
        <button className="cm-icon-btn" onClick={onOpenRequests} aria-label={isAr ? 'طلبات الصداقة' : 'Requests'}>
          <IconRequests size={22} /><Badge n={requestsCount} />
        </button>
      </div>

      <label className="cm-search">
        <IconSearch size={18} />
        <input
          type="search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={isAr ? 'ابحث عن مواضيع، طلاب، أسئلة...' : 'Search topics, learners, questions...'}
          dir="auto"
        />
      </label>

      <div className="cm-header-group">
        <button className="cm-icon-btn" onClick={onOpenNotifications} aria-label={isAr ? 'الإشعارات' : 'Notifications'}>
          <IconBell size={22} /><Badge n={unreadNotifications} />
        </button>
        <button className="cm-icon-btn cm-icon-profile" onClick={onOpenProfile} aria-label={isAr ? 'ملفي' : 'Profile'}>
          <IconProfile size={22} />
        </button>
      </div>
    </header>
  )
}
