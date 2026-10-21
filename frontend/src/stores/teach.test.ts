import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { apiKey, type ApiClient } from '@/api/client'
import { createMockApi } from '@/api/mock'
import type { SpecNode, TeachSnapshot } from '@/api/types'
import { useAppStore } from './app'
import { useTeachStore } from './teach'

function storeWith(api: ApiClient = createMockApi({ live: false })) {
  // Stores read the api through inject: run them inside an app that provides it.
  const app = createApp({}).provide(apiKey, api)
  const pinia = createPinia()
  app.use(pinia)
  setActivePinia(pinia)
  return app.runWithContext(() => useTeachStore())
}

/** A snapshot with one checked node whose three lights differ. */
function lightSnapshot(): TeachSnapshot {
  const node: SpecNode = {
    id: 'u-lights',
    name: 'Lights',
    tone: 'green',
    checked: false,
    lightChecked: [true, false, true],
  }
  const set = {
    globalAlign: [],
    srAlign: [],
    overlay: { mk: true, ac: false, ic: false, sk: false },
    tree: [node],
  }
  const image = { url: 'x.png', width: 10, height: 10 }
  return {
    unit: set,
    dummy: { ...set },
    alignImages: { metal: image, sr: image, dmg: image },
  }
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

  it('keeps one checkbox table per light and toggles only the selected one', async () => {
    const mock = createMockApi({ live: false })
    const store = storeWith({ ...mock, getTeach: async () => lightSnapshot() })
    await store.load()

    expect(store.checked['u-lights']).toBe(false)
    store.light = 1
    expect(store.checked['u-lights']).toBe(true)
    store.light = 3
    expect(store.checked['u-lights']).toBe(true)

    store.toggleChecked('u-lights')
    expect(store.checked['u-lights']).toBe(false)
    store.light = 1
    expect(store.checked['u-lights']).toBe(true)
    store.light = 2
    expect(store.checked['u-lights']).toBe(false)
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

describe('teach store model switch', () => {
  it('reloads the tree when another model is loaded', async () => {
    const mock = createMockApi({ live: false })
    const getTeach = vi.fn(mock.getTeach)
    const app = createApp({}).provide(apiKey, { ...mock, getTeach })
    const pinia = createPinia()
    app.use(pinia)
    setActivePinia(pinia)

    const appStore = app.runWithContext(() => useAppStore())
    const store = app.runWithContext(() => useTeachStore())

    await appStore.load()
    expect(getTeach).toHaveBeenCalledTimes(0)

    await store.load()
    expect(getTeach).toHaveBeenCalledTimes(1)

    app.runWithContext(() => store.select('u-au-cpad'))
    await flushPromises()
    expect(store.selectedId).toBe('u-au-cpad')

    await appStore.selectModel('another-01')
    await flushPromises()

    expect(getTeach).toHaveBeenCalledTimes(2)
    expect(store.selectedId).toBeNull()
    expect(store.snapshot).not.toBeNull()
  })

  it('does not reload when the first model arrives', async () => {
    const mock = createMockApi({ live: false })
    const getTeach = vi.fn(mock.getTeach)
    const app = createApp({}).provide(apiKey, { ...mock, getTeach })
    const pinia = createPinia()
    app.use(pinia)
    setActivePinia(pinia)

    const appStore = app.runWithContext(() => useAppStore())
    const store = app.runWithContext(() => useTeachStore())
    await store.load()

    await appStore.load()
    await flushPromises()

    expect(appStore.model).not.toBeNull()
    expect(getTeach).toHaveBeenCalledTimes(1)
  })

  it('reloads the tree when another host is chosen, even with the same model', async () => {
    const mock = createMockApi({ live: false })
    const getTeach = vi.fn(mock.getTeach)
    const app = createApp({}).provide(apiKey, { ...mock, getTeach })
    const pinia = createPinia()
    app.use(pinia)
    setActivePinia(pinia)

    const appStore = app.runWithContext(() => useAppStore())
    const store = app.runWithContext(() => useTeachStore())

    await store.load()
    expect(getTeach).toHaveBeenCalledTimes(1)

    app.runWithContext(() => store.select('u-au-cpad'))
    await flushPromises()
    expect(store.selectedId).toBe('u-au-cpad')

    await appStore.reloadInventory()
    await flushPromises()

    expect(getTeach).toHaveBeenCalledTimes(2)
    expect(store.selectedId).toBeNull()
    expect(store.snapshot).not.toBeNull()
  })

  it('reloads once when the model and the epoch change together', async () => {
    const mock = createMockApi({ live: false })
    const getTeach = vi.fn(mock.getTeach)
    const app = createApp({}).provide(apiKey, { ...mock, getTeach })
    const pinia = createPinia()
    app.use(pinia)
    setActivePinia(pinia)

    const appStore = app.runWithContext(() => useAppStore())
    const store = app.runWithContext(() => useTeachStore())
    await store.load()
    expect(getTeach).toHaveBeenCalledTimes(1)

    await Promise.all([appStore.selectModel('another-01'), appStore.reloadInventory()])
    await flushPromises()

    expect(getTeach).toHaveBeenCalledTimes(2)
  })
})

describe('teach store selection', () => {
  it('starts with no selection, the strip and empty tables', () => {
    const store = storeWith()
    expect(store.selectedId).toBeNull()
    expect(store.viewerMode).toBe('strip')
    expect(store.alignImage).toBeNull()
    expect(store.overlayEnabled).toBe(false)
    expect(store.tables.upper).toEqual([])
    expect(store.tables.lower).toEqual([])
    expect(store.tables.channel).toEqual([])
  })

  it('shows the align picture of Metal and a blank viewer for User Mask', async () => {
    const store = storeWith()
    await store.load()

    store.select('u-metal')
    expect(store.viewerMode).toBe('align')
    expect(store.alignImage?.width).toBe(781)
    expect(store.overlayEnabled).toBe(false)

    store.select('u-etc-user-mask')
    expect(store.viewerMode).toBe('blank')
    expect(store.alignImage).toBeNull()
    expect(store.overlayEnabled).toBe(true)
  })

  it('fills the tables of a pad and follows the light and channel tabs', async () => {
    const store = storeWith()
    await store.load()

    store.select('u-au-cpad')
    await flushPromises()

    expect(store.tables.upper).toHaveLength(9)
    expect(store.tables.lower).toHaveLength(9)
    expect(store.tables.channel).toHaveLength(18)
    expect(store.tables.upper[0]).toEqual({
      no: 1,
      name: 'Mask Inspection(Bright)',
      value: true,
      tone: 'green',
    })
    expect(store.tables.upper[4].value).toBe('100.000')

    store.light = 1
    expect(store.tables.upper).toEqual([])
    expect(store.tables.lower).toEqual([])
    expect(store.tables.channel).toEqual([])

    store.light = 2
    store.channel = 'green'
    expect(store.tables.channel).toHaveLength(18)
  })

  it('empties the tables when the analysis request fails', async () => {
    const mock = createMockApi({ live: false })
    const failing: ApiClient = {
      ...mock,
      getNodeAnalysis: (id) =>
        id === 'u-osp-cpad' ? Promise.reject(new Error('offline')) : mock.getNodeAnalysis(id),
    }
    const store = storeWith(failing)
    await store.load()

    store.select('u-au-cpad')
    await flushPromises()
    expect(store.tables.upper).toHaveLength(9)

    store.select('u-osp-cpad')
    await flushPromises()
    expect(store.tables.upper).toEqual([])
    expect(store.tables.channel).toEqual([])
  })

  it('toggles only boolean rows of the analysis tables', async () => {
    const store = storeWith()
    await store.load()

    store.select('u-au-cpad')
    await flushPromises()

    store.toggleAnalysisRow('upper', 1)
    expect(store.tables.upper[0].value).toBe(false)
    store.toggleAnalysisRow('upper', 1)
    expect(store.tables.upper[0].value).toBe(true)

    store.toggleAnalysisRow('upper', 5)
    expect(store.tables.upper[4].value).toBe('100.000')
  })

  it('keeps only the newest analysis answer', async () => {
    const store = storeWith()
    await store.load()

    store.select('u-au-cpad')
    store.select('u-etc-user-mask')
    await flushPromises()

    expect(store.tables.upper).toEqual([])
    expect(store.tables.channel).toHaveLength(5)
  })

  it('clears the selection with null', async () => {
    const store = storeWith()
    await store.load()

    store.select('u-au-cpad')
    await flushPromises()
    store.select(null)

    expect(store.viewerMode).toBe('strip')
    expect(store.tables.upper).toEqual([])
    expect(store.tables.lower).toEqual([])
    expect(store.tables.channel).toEqual([])
  })

  it('clears the selection when the mode changes', async () => {
    const store = storeWith()
    await store.load()

    store.select('u-au-cpad')
    await flushPromises()
    store.mode = 'dummy'
    expect(store.selectedId).toBeNull()
  })

  it('fills the tables of a NonMetal item', async () => {
    const store = storeWith()
    await store.load()

    store.select('u-nonmetal-sr-all')
    await flushPromises()

    expect(store.tables.upper).toHaveLength(4)
    expect(store.tables.upper[1].value).toBe(false)
    expect(store.tables.channel).toHaveLength(6)
    expect(store.overlayEnabled).toBe(true)
  })
})
