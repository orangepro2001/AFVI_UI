import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { apiKey, type ApiClient } from '@/api/client'
import { createMockApi } from '@/api/mock'
import type { MedianView } from '@/api/types'
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

  it('starts without a pointer and with the tools unlocked', () => {
    const store = storeWith()
    expect(store.pointerSeen).toBe(false)
    expect(store.toolsLocked).toBe(false)
  })

  it('keeps the strip RGB when pointing without a picture', async () => {
    const store = storeWith()
    await store.load()

    store.pointAt(10, 10)
    expect(store.pointerSeen).toBe(true)
    expect(store.readout!.rgb).toEqual([31, 31, 31])
  })

  it('zeroes the RGB and scales XY when pointing at another picture', async () => {
    const store = storeWith()
    await store.load()

    store.pointAt(100, 50, { url: 'x.png', width: 781, height: 536 })
    expect(store.readout!.rgb).toEqual([0, 0, 0])
    expect(store.readout!.xy.x).toBe(Math.round((100 * 16384) / 781))
    expect(store.readout!.xy.y).toBe(Math.round((50 * 12080) / 536))
  })

  it('starts with the strip of the snapshot as the picture', async () => {
    const store = storeWith()
    expect(store.frame).toBeNull()
    await store.load()
    expect(store.frame?.image).toEqual(store.snapshot!.image)
    expect(store.frame?.size).toEqual({ width: 16384, height: 12080 })
  })
})

const RESOLUTION = { width: 5860, height: 4020 }

function medianView(light: number, overrides: Partial<MedianView> = {}): MedianView {
  return {
    light,
    image: { url: `median-${light}.png`, width: 781, height: 536 },
    size: RESOLUTION,
    state: 'ok',
    file: `Median_0_1_${light - 1}.tif`,
    lights: [1, 2, 3],
    ...overrides,
  }
}

function withMedian(getMedianView: ApiClient['getMedianView']) {
  return storeWith({ ...createMockApi({ live: false }), getMedianView })
}

describe('workbench store: the Median picture', () => {
  it('has no picture to show until the first answer about the Median picture is in', async () => {
    let answer: (view: MedianView) => void = () => undefined
    const store = withMedian(() => new Promise<MedianView>((resolve) => (answer = resolve)))
    const loading = store.load()
    await flushPromises()

    // The page can draw (the snapshot is in); the viewer waits for its picture.
    expect(store.snapshot).not.toBeNull()
    expect(store.readout).not.toBeNull()
    expect(store.frame).toBeNull()
    store.pointAt(10, 10)
    expect(store.pointerSeen).toBe(false)

    answer(medianView(2))
    await loading
    expect(store.frame?.real).toBe(true)
  })

  it('shows the design picture once the answer is that there is none', async () => {
    const store = withMedian(() => Promise.reject(new Error('no host')))
    await store.load()
    expect(store.frame?.real).toBe(false)
  })

  it('shows the Median picture of the selected light and its size', async () => {
    const getMedianView = vi.fn(async (light: number) => medianView(light))
    const store = withMedian(getMedianView)
    await store.load()

    expect(getMedianView).toHaveBeenCalledWith(2)
    expect(store.frame).toEqual({
      image: { url: 'median-2.png', width: 781, height: 536 },
      size: RESOLUTION,
      real: true,
    })
    await flushPromises()
    expect(store.readout!.wh).toEqual({ w: 5860, h: 4020 })
    // Before the pointer has been over it, XY is the middle of this picture, not of the snapshot's.
    expect(store.readout!.xy).toEqual({ x: 2930, y: 2010 })
    expect(store.readout!.strip.x - store.readout!.xy.x).toBe(14670)
  })

  it('maps the pointer onto the pixels of the Median picture', async () => {
    const store = withMedian(async (light) => medianView(light))
    await store.load()

    store.pointAt(390, 268)
    expect(store.readout!.xy).toEqual({
      x: Math.round((390 * 5860) / 781),
      y: Math.round((268 * 4020) / 536),
    })
    expect(store.readout!.wh).toEqual({ w: 5860, h: 4020 })
    expect(store.pointerSeen).toBe(true)
  })

  it('takes the gray value under the pointer as the RGB of the read-out', async () => {
    const store = withMedian(async (light) => medianView(light))
    await store.load()

    store.pointAt(10, 10, undefined, 123)
    expect(store.readout!.rgb).toEqual([123, 123, 123])
    store.pointAt(11, 10)
    expect(store.readout!.rgb).toEqual([123, 123, 123])
  })

  it('loads the picture of another light when the bulb changes, and ignores a late answer', async () => {
    let releaseSecond: (view: MedianView) => void = () => undefined
    const getMedianView = vi.fn((light: number) =>
      light === 1
        ? new Promise<MedianView>((resolve) => (releaseSecond = resolve))
        : Promise.resolve(medianView(light)),
    )
    const store = withMedian(getMedianView)
    await store.load()

    store.light = 1
    await flushPromises()
    store.light = 3
    await flushPromises()
    expect(store.median?.light).toBe(3)

    // Light-1 answers last: it is no longer the light that was asked for.
    releaseSecond(medianView(1))
    await flushPromises()
    expect(store.median?.light).toBe(3)
  })

  it('falls back to the snapshot picture where the model has no Median picture', async () => {
    const store = withMedian(async (light) =>
      medianView(light, {
        state: 'missing',
        note: 'none',
        image: { url: '', width: 0, height: 0 },
      }),
    )
    await store.load()

    expect(store.median?.state).toBe('missing')
    expect(store.frame?.real).toBe(false)
    expect(store.frame?.image).toEqual(store.snapshot!.image)
    expect(store.readout!.wh).toEqual({ w: 16384, h: 12080 })
  })

  it('falls back too when asking for it fails', async () => {
    const store = withMedian(() => Promise.reject(new Error('no host')))
    await store.load()

    expect(store.median).toBeNull()
    expect(store.snapshot).not.toBeNull()
    expect(store.frame?.real).toBe(false)
  })

  it('reads the picture again when another model is loaded', async () => {
    const getMedianView = vi.fn(async (light: number) => medianView(light))
    const store = withMedian(getMedianView)
    await store.load()
    expect(getMedianView).toHaveBeenCalledTimes(1)

    const { useAppStore } = await import('./app')
    const app = useAppStore()
    app.model = { name: 'B-00', base: 'B', resolution: '2.0', surface: 'Top' }
    await flushPromises()
    expect(getMedianView).toHaveBeenCalledTimes(2)
    app.inventoryEpoch++
    await flushPromises()
    expect(getMedianView).toHaveBeenCalledTimes(3)
  })
})
