// Role-based access for the Admin Control Center (Module 16). Roles are stored
// on `users/{uid}.role`. `owner`/`admin` get everything; narrower roles get a
// subset so non-technical staff can be granted scoped access later.

export const ROLES = ['owner', 'admin', 'moderator', 'content-manager', 'teacher']

// Admin modules and which roles may open them.
export const MODULE_ACCESS = {
  overview: ['owner', 'admin', 'moderator', 'content-manager', 'teacher'],
  lessons: ['owner', 'admin', 'content-manager', 'teacher'],
  stories: ['owner', 'admin', 'content-manager', 'teacher'],
  vocab: ['owner', 'admin', 'content-manager', 'teacher'],
  grammar: ['owner', 'admin', 'content-manager', 'teacher'],
  users: ['owner', 'admin', 'moderator'],
  sensei: ['owner', 'admin'],
  notifications: ['owner', 'admin', 'moderator'],
  config: ['owner', 'admin'],
  flags: ['owner', 'admin'],
  roles: ['owner', 'admin'],
  roadmap: ['owner', 'admin', 'moderator', 'content-manager', 'teacher'],
}

export function normalizeRole(role, { isLegacyAdmin = false } = {}) {
  const r = String(role || '').toLowerCase()
  if (ROLES.includes(r)) return r
  return isLegacyAdmin ? 'admin' : ''
}

export function canAccessModule(role, moduleId) {
  return (MODULE_ACCESS[moduleId] || []).includes(role)
}
