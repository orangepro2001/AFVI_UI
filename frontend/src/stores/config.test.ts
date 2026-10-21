import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { apiKey, type ApiClient } from '@/api/client'
import { createMockApi } from '@/api/mock'
import { useConfigStore } from './config'

function storeWith(api: ApiClient = createMockApi({ live: false })) {
  // Stores read the api through inject: run them inside an app that provides it.
  const app = createApp({}).provide(apiKey, api)
  const pinia = createPinia()
  app.use(pinia)
  setActivePinia(pinia)
  return app.runWithContext(() => useConfigStore())
}

describe('config store', () => {
  it('starts empty and loads the groups', async () => {
    const store = storeWith()
    expect(store.groups).toEqual([])

    await store.load()
    expect(store.groups.map((group) => group.id)).toContain('misc')
  })

  it('requests the groups once', async () => {
    const mock = createMockApi({ live: false })
    const getConfig = vi.fn(mock.getConfig)
    const store = storeWith({ ...mock, getConfig })

    await Promise.all([store.load(), store.load()])
    await store.load()
    expect(getConfig).toHaveBeenCalledTimes(1)
  })

  it('may be retried after a failed request', async () => {
    const mock = createMockApi({ live: false })
    const getConfig = vi.fn(mock.getConfig).mockRejectedValueOnce(new Error('offline'))
    const store = storeWith({ ...mock, getConfig })

    await store.load()
    expect(store.groups).toEqual([])

    await store.load()
    await flushPromises()
    expect(store.groups.length).toBeGreaterThan(0)
    expect(getConfig).toHaveBeenCalledTimes(2)
  })

  it('changes a value by key', async () => {
    const store = storeWith()
    await store.load()

    store.setValue('export.ip', '10.0.0.1')
    store.setValue('format.json', true)
    const entries = store.groups.flatMap((group) => group.entries)
    expect(entries.find((entry) => entry.key === 'export.ip')?.value).toBe('10.0.0.1')
    expect(entries.find((entry) => entry.key === 'format.json')?.value).toBe(true)
  })

  it('ignores unknown keys and a value of the wrong type', async () => {
    const store = storeWith()
    await store.load()
    const before = JSON.stringify(store.groups)

    store.setValue('nope', 'x')
    store.setValue('format.json', 'on')
    store.setValue('export.ip', true)
    expect(JSON.stringify(store.groups)).toBe(before)
  })
})
