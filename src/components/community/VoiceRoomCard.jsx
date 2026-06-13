import { IconMic } from './CommunityIcons.jsx'

// Active voice-room card: title, level, participants, Join. (No peer-audio
// backend yet — onJoin currently surfaces a notice; wire to real rooms later.)
export default function VoiceRoomCard({ room, lang, onJoin }) {
  const isAr = lang === 'ar'
  if (!room) return null
  return (
    <div className="cm-voiceroom">
      <span className="cm-voiceroom-icon"><IconMic size={22} /></span>
      <div className="cm-voiceroom-body">
        <strong dir="auto">{room.title}</strong>
        <span className="cm-voiceroom-meta">
          {room.live && <em className="cm-live-dot" />}
          {room.level ? `${room.level} · ` : ''}
          {isAr ? `${room.participants} مشارك` : `${room.participants} in room`}
          {room.capacity ? ` / ${room.capacity}` : ''}
        </span>
      </div>
      <button className="cm-join-btn" onClick={() => onJoin?.(room)}>
        {isAr ? 'انضمام' : 'Join'}
      </button>
    </div>
  )
}
