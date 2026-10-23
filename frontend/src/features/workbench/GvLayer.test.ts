import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiKey, type ApiClient } from '@/api/client'
import { createMockApi } from '@/api/mock'
import type { GvBox, GvStats, MedianView } from '@/api/types'
import { useMeasureStore } from '@/stores/measure'
import { useWorkbenchStore } from '@/stores/workbench'
import GvLayer from './GvLayer.vue'

// The picture is 781 x 536 on screen and 5860 x 4020 pixels in the TIFF.
const KX = 5860 / 781
const KY = 4020 / 536

let wrapper: ReturnType<typeof mount> | undefined

function median(overrides: Partial<MedianView> = {}): MedianView {
  return {
    light: 2,
    image: { url: 'median.png', width: 781, height: 536 },
    size: { width: 5860, height: 4020 },
    state: 'ok',
    lights: [1, 2, 3],
    ...overrides,
  }
}

function stats(box: GvBox): GvStats {
  return {
    box,
    pixels: box.w * box.h,
    mean: 28.6,
    std: 3.25,
    min: 9,
    max: 41,
    saturatedHigh: 0,
    saturatedLow: 0,
  }
}

async function mountLayer(view: MedianView = median(), overrides: Partial<ApiClient> = {}) {
  const api: ApiClient = {
    ...createMockApi({ live: false }),
    getMedianView: async () => view,
    measureGv: vi.fn(async (_light: number, box: GvBox) => stats(box)),
    ...overrides,
  }
  const pinia = createPinia()
  setActivePinia(pinia)
  wrapper = mount(GvLayer, { global: { plugins: [pinia], provide: { [apiKey as symbol]: api } } })
  // The stores were created by the component's app, which provides the api.
  const workbench = useWorkbenchStore()
  const measure = useMeasureStore()
  await workbench.load()
  await flushPromises()
  const svg = wrapper.find('svg').element as SVGSVGElement
  // happy-dom has no layout: the svg is the 781 x 536 picture at the page origin.
  svg.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 781, height: 536, right: 781, bottom: 536 }) as DOMRect
  svg.setPointerCapture = () => undefined
  return { api, workbench, measure, svg: wrapper.find('svg') }
}

function pointer(type: string, x: number, y: number) {
  return new PointerEvent(type, { clientX: x, clientY: y, button: 0, bubbles: true })
}

function key(name: string, init: KeyboardEventInit = {}) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: name, ...init }))
}

async function drag(target: Element, from: [number, number], to: [number, number]) {
  target.dispatchEvent(pointer('pointerdown', ...from))
  target.dispatchEvent(pointer('pointermove', ...to))
  target.dispatchEvent(pointer('pointerup', ...to))
  await flushPromises()
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})

describe('GvLayer', () => {
  it('draws nothing until a box is drawn', async () => {
    await mountLayer()
    expect(wrapper!.find('[data-gv-box]').exists()).toBe(false)
  })

  it('draws a box with the rect tool and measures it', async () => {
    const { api, measure, svg } = await mountLayer()

    await drag(svg.element, [100, 100], [200, 160])

    const x = Math.round(100 * KX)
    const y = Math.round(100 * KY)
    expect(measure.gvBox).toEqual({
      x,
      y,
      w: Math.round(200 * KX) - x,
      h: Math.round(160 * KY) - y,
    })
    expect(api.measureGv).toHaveBeenLastCalledWith(2, measure.gvBox)
    expect(wrapper!.find('[data-gv-label]').text()).toBe('GV : 29')
    expect(wrapper!.findAll('[data-gv-handle]')).toHaveLength(8)
    // The tool stays the rect tool, as in the reference design.
    expect(measure.gvTool).toBe('rect')
  })

  it('draws a box the other way round too', async () => {
    const { measure, svg } = await mountLayer()
    await drag(svg.element, [300, 300], [200, 250])
    expect(measure.gvBox).toEqual({
      x: Math.round(200 * KX),
      y: Math.round(250 * KY),
      w: Math.round(300 * KX) - Math.round(200 * KX),
      h: Math.round(300 * KY) - Math.round(250 * KY),
    })
  })

  it('keeps the box over the drag-out edges of the picture', async () => {
    const { measure, svg } = await mountLayer()
    await drag(svg.element, [700, 500], [900, 700])
    expect(measure.gvBox).toEqual({
      x: Math.round(700 * KX),
      y: Math.round(500 * KY),
      w: 5860 - Math.round(700 * KX),
      h: 4020 - Math.round(500 * KY),
    })
  })

  it('treats a click as a click: no box, and the old box stays', async () => {
    const { measure, svg } = await mountLayer()
    await drag(svg.element, [100, 100], [101, 101])
    expect(measure.gvBox).toBeNull()

    await drag(svg.element, [100, 100], [200, 200])
    const before = { ...measure.gvBox! }
    await drag(svg.element, [400, 400], [401, 400])
    expect(measure.gvBox).toEqual(before)
  })

  it('replaces the box when another one is drawn', async () => {
    const { measure, svg } = await mountLayer()
    await drag(svg.element, [100, 100], [200, 200])
    await drag(svg.element, [300, 100], [400, 200])
    expect(measure.gvBox!.x).toBe(Math.round(300 * KX))
    expect(wrapper!.findAll('[data-gv-box]')).toHaveLength(1)
  })

  it('draws a new box also from inside the old one with the rect tool', async () => {
    const { measure, svg } = await mountLayer()
    await drag(svg.element, [100, 100], [300, 300])
    const inside = wrapper!.find('[data-gv-box]').element
    inside.dispatchEvent(pointer('pointerdown', 150, 150))
    svg.element.dispatchEvent(pointer('pointermove', 200, 200))
    svg.element.dispatchEvent(pointer('pointerup', 200, 200))
    await flushPromises()
    expect(measure.gvBox!.x).toBe(Math.round(150 * KX))
  })

  it('goes back to the old box when Escape cancels a drag', async () => {
    const { measure, svg } = await mountLayer()
    await drag(svg.element, [100, 100], [200, 200])
    const old = { ...measure.gvBox! }

    svg.element.dispatchEvent(pointer('pointerdown', 400, 100))
    svg.element.dispatchEvent(pointer('pointermove', 500, 200))
    expect(measure.gvBox).not.toEqual(old)
    key('Escape')
    await flushPromises()
    expect(measure.gvBox).toEqual(old)

    // The drag is over: further moves change nothing.
    svg.element.dispatchEvent(pointer('pointermove', 600, 300))
    expect(measure.gvBox).toEqual(old)
  })

  it('moves the box with the select tool', async () => {
    const { measure, svg } = await mountLayer()
    await drag(svg.element, [100, 100], [200, 200])
    const old = { ...measure.gvBox! }
    measure.setGvTool('select')
    await flushPromises()

    const body = wrapper!.find('[data-gv-box]').element
    body.dispatchEvent(pointer('pointerdown', 150, 150))
    svg.element.dispatchEvent(pointer('pointermove', 170, 180))
    svg.element.dispatchEvent(pointer('pointerup', 170, 180))
    await flushPromises()

    expect(measure.gvBox!.w).toBe(old.w)
    expect(measure.gvBox!.h).toBe(old.h)
    expect(measure.gvBox!.x).toBeCloseTo(old.x + 20 * KX, -1)
    expect(measure.gvBox!.y).toBeCloseTo(old.y + 30 * KY, -1)
  })

  it('does nothing on the background with the select tool', async () => {
    const { measure, svg } = await mountLayer()
    measure.setGvTool('select')
    await drag(svg.element, [100, 100], [300, 300])
    expect(measure.gvBox).toBeNull()
  })

  it('resizes with a grip, whichever tool is chosen', async () => {
    const { measure, svg } = await mountLayer()
    await drag(svg.element, [100, 100], [200, 200])
    const old = { ...measure.gvBox! }

    const grip = wrapper!.find('[data-gv-handle="se"]').element
    grip.dispatchEvent(pointer('pointerdown', 200, 200))
    svg.element.dispatchEvent(pointer('pointermove', 240, 230))
    svg.element.dispatchEvent(pointer('pointerup', 240, 230))
    await flushPromises()

    expect(measure.gvBox!.x).toBe(old.x)
    expect(measure.gvBox!.y).toBe(old.y)
    expect(measure.gvBox!.w).toBeCloseTo(old.w + 40 * KX, -1)
    expect(measure.gvBox!.h).toBeCloseTo(old.h + 30 * KY, -1)
  })

  it('never lets a grip turn the box inside out', async () => {
    const { measure, svg } = await mountLayer()
    await drag(svg.element, [100, 100], [200, 200])
    const old = { ...measure.gvBox! }

    const grip = wrapper!.find('[data-gv-handle="e"]').element
    grip.dispatchEvent(pointer('pointerdown', 200, 150))
    svg.element.dispatchEvent(pointer('pointermove', 20, 150))
    await flushPromises()

    expect(measure.gvBox).toEqual({ ...old, w: 1 })
  })

  it('clears the box with Delete and nudges it with the arrow keys', async () => {
    const { measure, svg } = await mountLayer()
    await drag(svg.element, [100, 100], [200, 200])
    const old = { ...measure.gvBox! }

    key('ArrowRight')
    key('ArrowDown', { shiftKey: true })
    key('ArrowLeft')
    key('ArrowUp')
    expect(measure.gvBox).toEqual({ ...old, y: old.y + 9 })

    key('Delete')
    await flushPromises()
    expect(measure.gvBox).toBeNull()
    expect(measure.stats).toBeNull()
    expect(wrapper!.find('[data-gv-box]').exists()).toBe(false)
  })

  it('leaves the keys alone while a field has the focus', async () => {
    const { measure, svg } = await mountLayer()
    await drag(svg.element, [100, 100], [200, 200])
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    expect(measure.gvBox).not.toBeNull()
    input.remove()
  })

  it('shows the numbers of the box as a tooltip', async () => {
    const { svg } = await mountLayer()
    await drag(svg.element, [100, 100], [200, 200])
    const tip = wrapper!.find('[data-gv-box] title').text()
    expect(tip).toContain('Avg 28.60')
    expect(tip).toContain('Std 3.25')
    expect(tip).toContain('Min 9   Max 41')
  })

  it('says why nothing can be measured and draws no box', async () => {
    const { measure, svg } = await mountLayer(
      median({ state: 'missing', image: { url: '', width: 0, height: 0 } }),
    )
    await drag(svg.element, [100, 100], [200, 200])
    expect(measure.gvBox).toBeNull()
    expect(wrapper!.text()).toContain('No Median picture of Light-2')
  })

  it('says where the Median picture was looked for', async () => {
    await mountLayer(
      median({
        state: 'missing',
        image: { url: '', width: 0, height: 0 },
        note: 'no Median picture of Light-2: looked below D:\\PxRepository\\7M99-535',
      }),
    )
    expect(wrapper!.find('[data-picture-note]').text()).toContain('looked below D:\\PxRepository')
  })

  it('shows a failed measurement', async () => {
    const { svg } = await mountLayer(median(), {
      measureGv: async () => {
        throw new Error('TIFF not readable')
      },
    })
    await drag(svg.element, [100, 100], [200, 200])
    expect(wrapper!.text()).toContain('TIFF not readable')
    expect(wrapper!.find('[data-gv-label]').text()).toBe('GV : -')
  })
})
