import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { apiKey, type ApiClient } from '@/api/client'
import { createMockApi } from '@/api/mock'
import { useCalibrationStore } from './calibration'

function storeWith(api: ApiClient = createMockApi({ live: false })) {
  const app = createApp({}).provide(apiKey, api)
  const pinia = createPinia()
  app.use(pinia)
  setActivePinia(pinia)
  return app.runWithContext(() => useCalibrationStore())
}

describe('calibration store', () => {
  it('loads the twenty channels', async () => {
    const store = storeWith()
    await store.load()
    expect(store.channels.length).toBe(20)
    expect(store.enabled).toBe(true)
    expect(store.pageIndex).toBe(2)
  })

  it('switches the reference channels on', async () => {
    const store = storeWith()
    await store.load()
    const on = new Set([2, 3, 4, 14, 16, 18, 20])
    for (const entry of store.channels) {
      expect(entry.on).toBe(on.has(entry.channel))
    }
  })

  it('clamps the brightness and mirrors the value', async () => {
    const store = storeWith()
    await store.load()
    store.setBrightness(2, 1200)
    expect(store.channels[1]!.brightness).toBe(1000)
    expect(store.channels[1]!.value).toBe(1000)
    store.setBrightness(2, -5)
    expect(store.channels[1]!.brightness).toBe(0)
    expect(store.channels[1]!.value).toBe(0)
  })

  it('switches a channel and ignores unknown ones', async () => {
    const store = storeWith()
    await store.load()
    store.setChannelOn(1, true)
    expect(store.channels[0]!.on).toBe(true)
    const before = store.channels.map((entry) => ({ ...entry }))
    store.setBrightness(99, 500)
    store.setChannelOn(99, true)
    expect(store.channels).toEqual(before)
  })

  it('requests the calibration once', async () => {
    const mock = createMockApi({ live: false })
    const getCalibration = vi.fn(mock.getCalibration)
    const store = storeWith({ ...mock, getCalibration })

    await store.load()
    await store.load()
    expect(getCalibration).toHaveBeenCalledTimes(1)
  })
})
