import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { apiKey, type ApiClient } from '@/api/client'
import { createMockApi } from '@/api/mock'
import { useWorkbenchStore } from './workbench'

function storeWith(api: ApiClient = createMockApi({ live: false })) {
  // Stores read the api through inject: run them inside an app that provides it.
  const app = createApp({}).provide(apiKey, api)
  const pinia = createPinia()
  app.use(pinia)
  setActivePinia(pinia)
  return app.runWithContext(() => useWorkbenchStore())
}

describe('workbench store', () => {
  it('loads the snapshot and the readout', async () => {
    const store = storeWith()
    expect(store.snapshot).toBeNull()

    await store.load()
    expect(store.snapshot).not.toBeNull()
    expect(store.readout).not.toBeNull()
    expect(store.readout!.cell).toBe(18)
  })

  it('requests the snapshot once', async () => {
    const mock = createMockApi({ live: false })
    const getWorkbench = vi.fn(mock.getWorkbench)
    const store = storeWith({ ...mock, getWorkbench })

    await store.load()
    await store.load()
    expect(getWorkbench).toHaveBeenCalledTimes(1)
  })

  it('selects a tool and lets it go again', async () => {
    const store = storeWith()
    await store.load()

    expect(store.tool).toBeNull()
    store.toggleTool('ruler')
    expect(store.tool).toBe('ruler')
    store.toggleTool('ruler')
    expect(store.tool).toBeNull()
    store.toggleTool('ruler')
    store.toggleTool('gv')
    expect(store.tool).toBe('gv')
  })

  it('starts with the reference view, light and channel', () => {
    const store = storeWith()
    expect(store.view).toBe('rect')
    expect(store.light).toBe(2)
    expect(store.channel).toBe('red')
  })

  it('maps the middle of the image onto the strip', async () => {
    const store = storeWith()
    await store.load()

    store.pointAt(363, 267)
    expect(store.readout!.xy).toEqual({ x: 8192, y: 6040 })
    expect(store.readout!.strip.x - store.readout!.xy.x).toBe(14670)
  })
})
