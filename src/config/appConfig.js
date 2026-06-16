// App-wide CMS config (the "Application Control Center" data layer). The app
// ships with these DEFAULTS and reads live overrides from Firestore `config/app`
// (see hooks/useAppConfig). Anything here is editable from the Admin panel with
// no code change; a missing/å offline doc safely falls back to defaults.

// Toggleable features (Module 13 — Feature Flags).
export const FEATURE_KEYS = ['club', 'stories', 'community', 'ai', 'speaking', 'listening', 'challenges']

// Bottom-nav tabs that can be relabelled / hidden (Module 10 — App Config).
export const NAV_IDS = ['home', 'club', 'community', 'profile']

export const DEFAULT_APP_CONFIG = {
  appName: { ar: 'نيهونغو', en: 'Nihongo' },
  featureFlags: {
    club: true, stories: true, community: true, ai: true,
    speaking: true, listening: true, challenges: true,
  },
  nav: {
    // id -> { ar, en } label override (empty = use built-in label)
    labels: {},
    // nav ids to hide from the bottom bar
    hidden: [],
  },
  updatedAt: null,
  updatedBy: '',
}

// Deep-merge a Firestore config doc over the defaults (one level of nesting for
// featureFlags / nav). Unknown/missing keys keep their default.
export function mergeAppConfig(remote) {
  const base = DEFAULT_APP_CONFIG
  if (!remote || typeof remote !== 'object') return { ...base }
  return {
    ...base,
    ...remote,
    appName: { ...base.appName, ...(remote.appName || {}) },
    featureFlags: { ...base.featureFlags, ...(remote.featureFlags || {}) },
    nav: {
      labels: { ...(remote.nav?.labels || {}) },
      hidden: Array.isArray(remote.nav?.hidden) ? remote.nav.hidden : [],
    },
  }
}

// Convenience: is a feature enabled in the given (merged) config?
export function featureOn(config, key) {
  return config?.featureFlags?.[key] !== false
}
