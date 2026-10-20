import { describe, expect, it } from 'vitest'
import { createMockApi } from '@/api/mock'
import { createSession } from '@/api/mock/session'

describe('createSession', () => {
  it('logs in Admin with one account', () => {
    const session = createSession()
    expect(session.current).toBe('Admin')
    expect(session.since).toBe('2026-10-20 16:35:23')
    expect(session.users).toEqual([{ index: '01', name: 'Admin', level: 'Master', state: 'Login' }])
  })

  it('is what the mock API returns', async () => {
    const api = createMockApi({ live: false })
    const session = await api.getSession()
    expect(session).toEqual(createSession())
  })
})
