import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { apiKey, type ApiClient } from '@/api/client'
import { createMockApi } from '@/api/mock'
import { useReviewStore } from './review'

function storeWith(api: ApiClient = createMockApi({ live: false })) {
  const app = createApp({}).provide(apiKey, api)
  const pinia = createPinia()
  app.use(pinia)
  setActivePinia(pinia)
  return app.runWithContext(() => useReviewStore())
}

describe('review store', () => {
  it('loads the defects', async () => {
    const store = storeWith()
    expect(store.loaded).toBe(false)
    await store.load()
    expect(store.loaded).toBe(true)
    expect(store.defects).toEqual([])
  })

  it('requests the defects once', async () => {
    const mock = createMockApi({ live: false })
    const getDefects = vi.fn(mock.getDefects)
    const store = storeWith({ ...mock, getDefects })

    await store.load()
    await store.load()
    expect(getDefects).toHaveBeenCalledTimes(1)
  })
})
