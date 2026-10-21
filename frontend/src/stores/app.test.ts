import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

  it('loads the active model', async () => {
    const store = await withStore()
    expect(store.model).toBeNull()
    await store.load()
    expect(store.model?.name).toBe('TEST1020-00')
    expect(store.model?.base).toBe('TEST1020')
  })

  it('switches the model with selectModel', async () => {
    const store = await withStore()
    await store.load()
    await store.selectModel('21csp043-09')
    expect(store.model?.name).toBe('21csp043-09')
    expect(store.model?.base).toBe('21csp043')
  })

  it('starts with the other dialogs and the overlay closed', async () => {
    const store = await withStore()
    expect(store.modelOpen).toBe(false)
    expect(store.grabOpen).toBe(false)
    expect(store.generateOpen).toBe(false)
    expect(store.busy).toBe(false)
  })

  describe('runBusy', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('shows the overlay for the given time', async () => {
      const store = await withStore()
      store.runBusy(1000)
      expect(store.busy).toBe(true)

      vi.advanceTimersByTime(999)
      expect(store.busy).toBe(true)

      vi.advanceTimersByTime(1)
      expect(store.busy).toBe(false)
    })

    it('restarts the countdown when called again while the overlay shows', async () => {
      const store = await withStore()
      store.runBusy(1000)
      expect(store.busy).toBe(true)

      vi.advanceTimersByTime(500)
      store.runBusy(1000)
      expect(store.busy).toBe(true)

      vi.advanceTimersByTime(600)
      expect(store.busy).toBe(true)

      vi.advanceTimersByTime(400)
      expect(store.busy).toBe(false)
    })
  })
})
