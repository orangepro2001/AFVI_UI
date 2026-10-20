import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { apiKey, type ApiClient } from '@/api/client'
import { createMockApi } from '@/api/mock'
import { useSettingsStore } from './settings'

function storeWith(api: ApiClient = createMockApi({ live: false })) {
  const app = createApp({}).provide(apiKey, api)
  const pinia = createPinia()
  app.use(pinia)
  setActivePinia(pinia)
  return app.runWithContext(() => useSettingsStore())
}

describe('settings store', () => {
  it('loads the snapshot', async () => {
    const store = storeWith()
    await store.load()
    expect(store.metal?.enabled).toBe(false)
    expect(store.sr?.enabled).toBe(true)
    expect(store.sr?.light).toBe('3')
  })

  it('snaps and clamps the mask sliders', async () => {
    const store = storeWith()
    await store.load()
    store.setMorphic('sr', 0.756)
    expect(store.sr!.morphic).toBe(0.76)
    store.setMorphic('sr', 2)
    expect(store.sr!.morphic).toBe(1)
    store.setSensitivity('metal', -1)
    expect(store.metal!.sensitivity).toBe(0)
  })

  it('switches masks and edits their dropdowns', async () => {
    const store = storeWith()
    await store.load()
    store.setMaskEnabled('metal', true)
    expect(store.metal!.enabled).toBe(true)
    store.setMaskLight('metal', '2')
    expect(store.metal!.light).toBe('2')
    store.setMaskChannel('metal', 'Blue')
    expect(store.metal!.channel).toBe('Blue')
  })

  it('honours the availability of the lights', async () => {
    const store = storeWith()
    await store.load()
    store.setInspectionLight(1, true)
    expect(store.inspectionLights[0]!.enabled).toBe(true)
    store.setInspectionLight(4, true)
    expect(store.inspectionLights[3]!.enabled).toBe(false)

    store.setGlobalAlignLight(3)
    expect(store.globalAlignLight).toBe(3)
    store.setGlobalAlignLight(4)
    expect(store.globalAlignLight).toBe(3)
  })

  it('requests the settings once', async () => {
    const mock = createMockApi({ live: false })
    const getSettings = vi.fn(mock.getSettings)
    const store = storeWith({ ...mock, getSettings })

    await store.load()
    await store.load()
    expect(getSettings).toHaveBeenCalledTimes(1)
  })
})
