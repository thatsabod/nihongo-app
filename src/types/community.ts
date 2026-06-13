// Central type definitions for the Community feed (redesign).
//
// The app builds with esbuild (no tsc step), so these are not build-enforced —
// they're the single source of truth for the feed's data shapes, consumed by the
// mock-data module and used as reference by the .jsx components. Real posts are
// adapted from Firestore `communityQuestions`; mock data covers only the new
// post types that have no backend yet (voice rooms, challenges, etc.).

export type PostType =
  | 'normal'      // a learner shares progress / a thought
  | 'help'        // a grammar/vocab/sentence question (maps to Firestore questions)
  | 'correction'  // a Japanese sentence others can correct
  | 'voiceRoom'   // an active voice-room card
  | 'challenge'   // a small daily challenge
  | 'teacher'     // teacher/admin post (special styling)

export type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1'

export interface CommunityUser {
  id: string
  name: string
  handle: string                 // e.g. "@mina"
  avatarUrl?: string
  level?: JlptLevel              // learner level
  nativeLang?: string           // e.g. "AR"
  learningLang?: string         // e.g. "JP"
  isTeacher?: boolean
  isCurrentUser?: boolean
}

export interface CommunityComment {
  id: string
  authorHandle: string
  authorName?: string
  body: string
  userId?: string               // owner id (for edit/delete)
  createdAt?: string
}

export interface CommunityPost {
  id: string
  type: PostType
  user: CommunityUser
  contentAr?: string            // primary text (Arabic)
  contentJa?: string            // optional Japanese
  romaji?: string               // optional reading
  translationAr?: string        // optional translation (revealed by Translate)
  tags: string[]                // e.g. ["#N5", "#قواعد"]
  likesCount: number
  commentsCount: number
  saved: boolean
  liked: boolean
  createdAt?: string
  commentsPreview: CommunityComment[]
  // Type-specific payloads:
  voiceRoom?: VoiceRoom
  challenge?: DailyChallenge
  // Link back to the Firestore source so action handlers can reach it:
  source?: 'question' | 'mock'
  raw?: unknown                 // original Firestore question (when source==='question')
}

export interface VoiceRoom {
  id: string
  title: string
  hostHandle: string
  participants: number
  capacity?: number
  level?: JlptLevel
  live: boolean
}

export interface DailyChallenge {
  id: string
  kind: 'translate' | 'particle' | 'grammar'
  promptAr: string
  promptJa?: string
  options?: string[]
  answer?: string
}

export interface CommunityTab {
  id: string
  labelAr: string
  labelEn: string
}
