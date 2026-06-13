// Self-contained inline icons for the Community feed (stroke = currentColor),
// so the feed stays visually consistent without depending on the shared
// iconRegistry. Mobile-friendly default size; pass `size` to override.

const Svg = ({ size = 22, children, fill = 'none' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

export const IconDM = (p) => <Svg {...p}><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 9 9 0 0 1-3.8-.8L3 21l1.8-5.2A8.5 8.5 0 1 1 21 11.5z" /></Svg>
export const IconBell = (p) => <Svg {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></Svg>
export const IconSearch = (p) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Svg>
export const IconProfile = (p) => <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Svg>
export const IconRequests = (p) => <Svg {...p}><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 12-4.9" /><path d="M18 12v6M15 15h6" /></Svg>
export const IconHeart = ({ filled, ...p }) => <Svg {...p} fill={filled ? 'currentColor' : 'none'}><path d="M19 6.5c-1.7-1.9-4.5-2-6.3-.3l-.7.7-.7-.7C9.5 4.5 6.7 4.6 5 6.5c-1.6 1.8-1.5 4.5.2 6.2l6.8 6.8 6.8-6.8c1.7-1.7 1.8-4.4.2-6.2z" /></Svg>
export const IconComment = (p) => <Svg {...p}><path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.5L3 21l2-5.7A8.4 8.4 0 1 1 21 11.5z" /></Svg>
export const IconBookmark = ({ filled, ...p }) => <Svg {...p} fill={filled ? 'currentColor' : 'none'}><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" /></Svg>
export const IconShare = (p) => <Svg {...p}><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><path d="M16 6l-4-4-4 4" /><path d="M12 2v13" /></Svg>
export const IconTranslate = (p) => <Svg {...p}><path d="M4 5h7" /><path d="M7 4c0 5-2 8-5 9" /><path d="M5 9c0 2 2 4 6 5" /><path d="m12 20 4-9 4 9" /><path d="M13.5 17h5" /></Svg>
export const IconMic = (p) => <Svg {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /></Svg>
export const IconCheck = (p) => <Svg {...p}><path d="m5 13 4 4L19 7" /></Svg>
export const IconPencil = (p) => <Svg {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></Svg>
export const IconBack = (p) => <Svg {...p}><path d="M15 18l-6-6 6-6" /></Svg>
export const IconForward = (p) => <Svg {...p}><path d="M9 18l6-6-6-6" /></Svg>
export const IconSend = (p) => <Svg {...p}><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4z" /></Svg>
export const IconPlus = (p) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
export const IconGear = (p) => <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 4.6 15H4.5a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1A2 2 0 1 1 8.4 5.4l.1.1a1.6 1.6 0 0 0 1.8.3H10.4A1.6 1.6 0 0 0 11.5 4.5V4.4a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V11.6a1.6 1.6 0 0 0 1.1 1.1h.1a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.2 1z" /></Svg>
export const IconImage = (p) => <Svg {...p}><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></Svg>
