// Canonical list of every icon name available in the app.
// Keep this in sync with the keys of `ICON_PATHS` in `paths.js`.

export const ICON_NAMES = [
  'gems',
  'achievement',
  'profile',
  'streak',
  'life',
  'coins',
  'gift',
  'calendar',
  'settings',
  'home',
  'lessons',
  'vocabulary',
  'quiz',
  'writing',
  'listening',
  'speaking',
  'progress',
  'ranking',
  'star',
  'locked',
  'unlocked',
  'search',
  'filter',
  'save',
  'share',
  'messages',
  'notifications',
  'back',
  'next',
  'play',
  'pause',
  'correct',
  'wrong',
  'info',
  'help',
  'hint',
  'files',
  'download',
  'upload',
  'camera',
  'gallery',
  'night-mode',
  'language',
  'sound',
  'mute',
  'store',
  'map',
  'explore',
  'grammar',
  'culture',
  'levels',
  'goal',
  'timer',
  'streak-7',
  'club',
]

/**
 * Union of every valid icon name.
 * @typedef {typeof ICON_NAMES[number]} IconName
 */

/**
 * Type guard: checks whether a string is a known icon name.
 * @param {string} name
 * @returns {name is IconName}
 */
export function isIconName(name) {
  return ICON_NAMES.includes(name)
}
