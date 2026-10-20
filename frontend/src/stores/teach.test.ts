import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { apiKey, type ApiClient } from '@/api/client'
import { createMockApi } from '@/api/mock'
import { useTeachStore } from './teach'

function storeWith(api: ApiClient = createMockApi({ live: false })) {
  // Stores read the api through inject: run them inside an app that provides it.
  const app = createApp({}).provide(apiKey, api)
  const pinia = createPinia()
  app.use(pinia)
  setActivePinia(pinia)
  return app.runWithContext(() => useTeachStore())
}

describe('teach store', () => {
  it('loads the snapshot, the checkboxes and the overlays', async () => {
    const store = storeWith()
    expect(store.snapshot).toBeNull()

    await store.load()
    expect(store.snapshot).not.toBeNull()
    expect(Object.keys(store.checked).length).toBeGreaterThan(0)
    expect(store.overlay).not.toBeNull()
  })

  it('starts with the specification, unit mode, light 2 and the red channel', () => {
    const store = storeWith()
    expect(store.section).toBe('spec')
    expect(store.mode).toBe('unit')
    expect(store.light).toBe(2)
    expect(store.channel).toBe('red')
  })

  it('toggles a checked node and leaves unknown ids alone', async () => {
    const store = storeWith()
    await store.load()

    expect(store.checked['u-osp-lpad']).toBe(true)
    store.toggleChecked('u-osp-lpad')
    expect(store.checked['u-osp-lpad']).toBe(false)
    store.toggleChecked('u-osp-lpad')
    expect(store.checked['u-osp-lpad']).toBe(true)

    const before = { ...store.checked }
    store.toggleChecked('does-not-exist')
    expect(store.checked).toEqual(before)
  })

  it('toggles an overlay flag only for the selected mode', async () => {
    const store = storeWith()
    await store.load()

    const before = store.overlay!.unit.ac
    store.toggleOverlay('ac')
    expect(store.overlay!.unit.ac).toBe(!before)
    expect(store.overlay!.dummy.ac).toBe(before)
  })

  it('requests the snapshot once', async () => {
    const mock = createMockApi({ live: false })
    const getTeach = vi.fn(mock.getTeach)
    const store = storeWith({ ...mock, getTeach })

    await store.load()
    await store.load()
    expect(getTeach).toHaveBeenCalledTimes(1)
  })
})
