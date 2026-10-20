import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'
import { apiKey } from '@/api/client'
import { createMockApi } from '@/api/mock'
import { useAppStore } from './app'

async function withStore() {
  const api = createMockApi({ live: false })
  const pinia = createPinia()
  // Stores read the api through inject: create the one under test inside an app that has it.
  const app = createApp({}).provide(apiKey, api)
  app.use(pinia)
  setActivePinia(pinia)
  return app.runWithContext(() => useAppStore())
}

describe('app store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with the login dialog closed', async () => {
    const store = await withStore()
    expect(store.loginOpen).toBe(false)
  })

  it('loads the session and parses the login time', async () => {
    const store = await withStore()
    await store.load()
    expect(store.session?.current).toBe('Admin')
    const since = store.user.since
    expect(since.getFullYear()).toBe(2026)
    expect(since.getMonth()).toBe(9)
    expect(since.getDate()).toBe(20)
    expect(since.getHours()).toBe(16)
    expect(since.getMinutes()).toBe(35)
    expect(since.getSeconds()).toBe(23)
  })
})
