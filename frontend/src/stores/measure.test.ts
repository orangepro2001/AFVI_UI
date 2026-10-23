import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { apiKey, type ApiClient } from '@/api/client'
import { createMockApi } from '@/api/mock'
import type { GvBox, GvStats, MedianView } from '@/api/types'
import { useAppStore } from './app'
import { useMeasureStore } from './measure'
import { useWorkbenchStore } from './workbench'

const SIZE = { width: 5860, height: 4020 }

function median(light: number, overrides: Partial<MedianView> = {}): MedianView {
  return {
    light,
    image: { url: `median-${light}.png`, width: 781, height: 536 },
    size: { ...SIZE },
    state: 'ok',
    file: `Median_0_1_${light - 1}.tif`,
    lights: [1, 2, 3],
    ...overrides,
  }
}

function statsOf(box: GvBox, mean = 31.4, std = 2.5): GvStats {
  return {
    box,
    pixels: box.w * box.h,
    mean,
    std,
    min: 10,
    max: 90,
    saturatedHigh: 0,
    saturatedLow: 0,
  }
}

/** A backend whose Median pictures and measurements the test controls. */
function fakeApi(overrides: Partial<ApiClient> = {}) {
  const mock = createMockApi({ live: false })
  const api: ApiClient = {
    ...mock,
    getMedianView: vi.fn(async (light: number) => median(light)),
    measureGv: vi.fn(async (_light: number, box: GvBox) => statsOf(box)),
    ...overrides,
  }
  return api
}

async function setup(api: ApiClient = fakeApi()) {
  const app = createApp({}).provide(apiKey, api)
  const pinia = createPinia()
  app.use(pinia)
  setActivePinia(pinia)
  const stores = app.runWithContext(() => ({
    workbench: useWorkbenchStore(),
    measure: useMeasureStore(),
    app: useAppStore(),
  }))
  await stores.workbench.load()
  return { api, ...stores }
}

const box = (x: number, y: number, w: number, h: number) => ({ x, y, w, h })

/** A promise the test settles by hand, to keep a measurement in flight. */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('measure store: GV', () => {
  it('measures the box on the Median picture of the light and fills the read-out bar', async () => {
    const { api, measure, workbench } = await setup()

    measure.setGvBox(box(100, 200, 300, 400))
    await flushPromises()

    expect(api.measureGv).toHaveBeenCalledWith(2, box(100, 200, 300, 400))
    expect(measure.stats?.mean).toBe(31.4)
    expect(workbench.readout?.avgGv).toBe(31)
    expect(workbench.readout?.stdGv).toBe(2.5)
    expect(measure.error).toBeNull()
  })

  it('asks for one measurement at a time and only for the newest box', async () => {
    const first = deferred<GvStats>()
    const measureGv = vi
      .fn<ApiClient['measureGv']>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementation(async (_light, b) => statsOf(b, 77))
    const { measure } = await setup(fakeApi({ measureGv }))

    measure.setGvBox(box(0, 0, 10, 10))
    await flushPromises()
    measure.setGvBox(box(5, 5, 20, 20))
    measure.setGvBox(box(8, 8, 30, 30))
    measure.setGvBox(box(9, 9, 40, 40))
    expect(measureGv).toHaveBeenCalledTimes(1)

    first.resolve(statsOf(box(0, 0, 10, 10), 5))
    await flushPromises()

    // The answer for the first box is not shown; the newest box was asked for once.
    expect(measureGv).toHaveBeenCalledTimes(2)
    expect(measureGv).toHaveBeenLastCalledWith(2, box(9, 9, 40, 40))
    expect(measure.stats?.mean).toBe(77)
  })

  it('takes the box away with its numbers, also while a measurement is out', async () => {
    const pending = deferred<GvStats>()
    const measureGv = vi.fn<ApiClient['measureGv']>(() => pending.promise)
    const { measure, workbench } = await setup(fakeApi({ measureGv }))

    measure.setGvBox(box(0, 0, 10, 10))
    await flushPromises()
    measure.setGvBox(null)
    pending.resolve(statsOf(box(0, 0, 10, 10)))
    await flushPromises()

    expect(measure.gvBox).toBeNull()
    expect(measure.stats).toBeNull()
    expect(workbench.readout?.avgGv).toBe(0)
    expect(workbench.readout?.stdGv).toBe(0)
    expect(measureGv).toHaveBeenCalledTimes(1)
  })

  it('measures the same box on the Median picture of another light', async () => {
    const { api, measure, workbench } = await setup()
    measure.setGvBox(box(10, 20, 30, 40))
    await flushPromises()

    workbench.light = 3
    await flushPromises()

    expect(api.getMedianView).toHaveBeenLastCalledWith(3)
    expect(api.measureGv).toHaveBeenLastCalledWith(3, box(10, 20, 30, 40))
    expect(api.measureGv).toHaveBeenCalledTimes(2)
  })

  it('reports a failed measurement and recovers on the next one', async () => {
    const measureGv = vi
      .fn<ApiClient['measureGv']>()
      .mockRejectedValueOnce(new Error('TIFF not readable'))
      .mockImplementation(async (_light, b) => statsOf(b))
    const { measure } = await setup(fakeApi({ measureGv }))

    measure.setGvBox(box(0, 0, 10, 10))
    await flushPromises()
    expect(measure.error).toBe('TIFF not readable')
    expect(measure.stats).toBeNull()

    measure.setGvBox(box(0, 0, 11, 11))
    await flushPromises()
    expect(measure.error).toBeNull()
    expect(measure.stats?.pixels).toBe(121)
  })

  it('does not measure without a Median picture of the light', async () => {
    const getMedianView = vi.fn(async (light: number) =>
      median(light, {
        state: 'missing',
        note: 'no Median picture',
        image: { url: '', width: 0, height: 0 },
      }),
    )
    const { api, measure, workbench } = await setup(fakeApi({ getMedianView }))

    expect(workbench.frame?.real).toBe(false)
    expect(measure.canMeasure).toBe(false)
    measure.setGvBox(box(0, 0, 10, 10))
    await flushPromises()

    expect(api.measureGv).not.toHaveBeenCalled()
    expect(measure.stats).toBeNull()
    expect(measure.gvBox).toEqual(box(0, 0, 10, 10))
  })

  it('keeps the tool the design shows as selected', async () => {
    const { measure } = await setup()
    expect(measure.gvTool).toBe('rect')
    measure.setGvTool('select')
    expect(measure.gvTool).toBe('select')
  })
})

describe('measure store: ruler', () => {
  it('keeps the line it was given, and the end the keys move', async () => {
    const { measure } = await setup()
    const line = { from: { x: 5086, y: 2032 }, to: { x: 8590, y: 3836 } }

    measure.setRuler(line)
    expect(measure.ruler).toEqual(line)
    expect(measure.rulerEnd).toBe('to')
    // A copy: the caller's object is not shared with the store.
    expect(measure.ruler).not.toBe(line)

    measure.setRuler(line, 'from')
    expect(measure.rulerEnd).toBe('from')
    measure.setRuler(null)
    expect(measure.ruler).toBeNull()
  })
})

describe('measure store: another picture', () => {
  it('pulls the box and the ruler back into a smaller picture', async () => {
    const small = { width: 1000, height: 800 }
    const getMedianView = vi.fn(async (light: number) =>
      median(light, light === 3 ? { size: small } : {}),
    )
    const { measure, workbench } = await setup(fakeApi({ getMedianView }))
    measure.setGvBox(box(900, 700, 400, 400))
    measure.setRuler({ from: { x: 100, y: 100 }, to: { x: 5000, y: 3000 } })
    await flushPromises()

    workbench.light = 3
    await flushPromises()

    expect(measure.gvBox).toEqual(box(900, 700, 100, 100))
    expect(measure.ruler).toEqual({ from: { x: 100, y: 100 }, to: { x: 1000, y: 800 } })
  })

  it('drops what was measured when another model is loaded', async () => {
    const { measure, app } = await setup()
    app.model = { name: 'A-00', base: 'A', resolution: '2.0', surface: 'Top' }
    await flushPromises()
    measure.setGvBox(box(0, 0, 10, 10))
    measure.setRuler({ from: { x: 1, y: 1 }, to: { x: 9, y: 9 } })
    await flushPromises()
    expect(measure.stats).not.toBeNull()

    app.model = { name: 'B-00', base: 'B', resolution: '2.0', surface: 'Top' }
    await flushPromises()

    expect(measure.gvBox).toBeNull()
    expect(measure.stats).toBeNull()
    expect(measure.ruler).toBeNull()
  })

  it('drops it when another host is chosen too', async () => {
    const { measure, app } = await setup()
    measure.setGvBox(box(0, 0, 10, 10))
    measure.setRuler({ from: { x: 1, y: 1 }, to: { x: 9, y: 9 } })

    app.inventoryEpoch++
    await flushPromises()

    expect(measure.gvBox).toBeNull()
    expect(measure.ruler).toBeNull()
  })
})
