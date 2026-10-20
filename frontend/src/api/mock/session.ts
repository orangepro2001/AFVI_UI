import type { SessionInfo } from '../types'

/** The account the reference design is logged in with: Admin, since 2026-10-20 16:35:23. */
export function createSession(): SessionInfo {
  return {
    current: 'Admin',
    since: '2026-10-20 16:35:23',
    users: [{ index: '01', name: 'Admin', level: 'Master', state: 'Login' }],
  }
}
