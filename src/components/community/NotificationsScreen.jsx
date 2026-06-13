import NotificationRow from './NotificationRow.jsx'
import { IconBack, IconGear } from './CommunityIcons.jsx'

// Dedicated notifications screen — community/app activity only (messages are
// excluded; they live in DMs). Reuses the live Firestore notifications.
export default function NotificationsScreen({ lang, notifications, onOpenNotification, onBack, onOpenSettings }) {
  const isAr = lang === 'ar'
  return (
    <section className="cm-screen">
      <header className="cm-screen-head">
        <button className="cm-icon-btn" onClick={onBack} aria-label={isAr ? 'رجوع' : 'Back'}><IconBack size={22} /></button>
        <h1>{isAr ? 'الإشعارات' : 'Notifications'}</h1>
        <button className="cm-icon-btn" onClick={onOpenSettings} aria-label={isAr ? 'إعدادات' : 'Settings'}><IconGear size={20} /></button>
      </header>
      <div className="cm-notif-list">
        {notifications.length ? notifications.map((n) => (
          <NotificationRow key={n.id} notification={n} lang={lang} onClick={() => onOpenNotification(n)} />
        )) : (
          <p className="cm-empty">{isAr ? 'لا توجد إشعارات جديدة.' : 'No notifications yet.'}</p>
        )}
      </div>
    </section>
  )
}
