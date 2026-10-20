import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiKey } from '@/api/client'
import { createMockApi } from '@/api/mock'
import { LOG_LIMIT, useMachineStore } from './machine'

function storeWith(api = createMockApi({ intervalMs: 1000 })) {
  // Stores read the api through inject: run them inside an app that provides it.
  const app = createApp({}).provide(apiKey, api)
  const pinia = createPinia()
  app.use(pinia)
  setActivePinia(pinia)
  return app.runWithContext(() => useMachineStore())
}

afterEach(() => {
  vi.useRealTimers()
})

describe('machine store', () => {
  it('loads the snapshot and then follows the stream', async () => {
    vi.useFakeTimers()
    const store = storeWith()
    expect(store.ready).toBe(false)

    await store.start()
    expect(store.ready).toBe(true)
    const before = store.stats!.cpu.usage

    vi.advanceTimersByTime(1000)
    expect(store.stats!.cpu.usage).not.toBe(before)

    store.stop()
  })

  it('stops following after stop()', async () => {
    vi.useFakeTimers()
    const store = storeWith()
    await store.start()
    store.stop()
    const frozen = store.stats

    vi.advanceTimersByTime(10_000)
    expect(store.stats).toBe(frozen)
  })

  it('keeps only the last LOG_LIMIT lines', async () => {
    vi.useFakeTimers()
    const store = storeWith()
    await store.start()

    vi.advanceTimersByTime(3000 * (LOG_LIMIT + 20))
    expect(store.logs).toHaveLength(LOG_LIMIT)
    store.stop()
  })
})
