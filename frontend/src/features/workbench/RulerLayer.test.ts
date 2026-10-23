import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it } from 'vitest'
import { apiKey } from '@/api/client'
import { createMockApi } from '@/api/mock'
import { useMeasureStore } from '@/stores/measure'
import { useWorkbenchStore } from '@/stores/workbench'
import RulerLayer from './RulerLayer.vue'

// The picture is 781 x 536 on screen and 5860 x 4020 pixels in the TIFF.
const KX = 5860 / 781
const KY = 4020 / 536
const px = (x: number) => Math.round(x * KX)
const py = (y: number) => Math.round(y * KY)

let wrapper: ReturnType<typeof mount> | undefined

async function mountLayer(state: 'ok' | 'missing' = 'ok') {
  const api = {
    ...createMockApi({ live: false }),
    getMedianView: async (light: number) => ({
      light,
      image: { url: 'median.png', width: 781, height: 536 },
      size: { width: 5860, height: 4020 },
      state,
      lights: [1, 2, 3],
    }),
  }
  const pinia = createPinia()
  setActivePinia(pinia)
  wrapper = mount(RulerLayer, {
    global: { plugins: [pinia], provide: { [apiKey as symbol]: api } },
  })
  const workbench = useWorkbenchStore()
  const measure = useMeasureStore()
  await workbench.load()
  await flushPromises()
  const svg = wrapper.find('svg').element as SVGSVGElement
  // happy-dom has no layout: the svg is the shown picture at the page origin.
  const width = Number(svg.getAttribute('width'))
  const height = Number(svg.getAttribute('height'))
  svg.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width, height, right: width, bottom: height }) as DOMRect
  svg.setPointerCapture = () => undefined
  return { measure, svg: wrapper.find('svg') }
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

describe('RulerLayer', () => {
  it('draws nothing until a line is drawn', async () => {
    await mountLayer()
    expect(wrapper!.find('line').exists()).toBe(false)
    expect(wrapper!.find('[data-ruler-length]').exists()).toBe(false)
  })

  it('draws a line, names its ends in pixels of the picture and measures it', async () => {
    const { measure, svg } = await mountLayer()

    await drag(svg.element, [100, 80], [400, 300])

    const from = { x: px(100), y: py(80) }
    const to = { x: px(400), y: py(300) }
    expect(measure.ruler).toEqual({ from, to })
    expect(wrapper!.find('[data-ruler-from]').text()).toBe(`(${from.x}, ${from.y})`)
    expect(wrapper!.find('[data-ruler-to]').text()).toBe(`(${to.x}, ${to.y})`)
    const length = Math.hypot(to.x - from.x, to.y - from.y)
    expect(wrapper!.find('[data-ruler-length]').text()).toBe(`${length.toFixed(2)}px`)
  })

  it('puts the line, the ends and the texts where the reference design has them', async () => {
    const { svg } = await mountLayer()
    await drag(svg.element, [100, 80], [400, 300])

    const line = wrapper!.find('line')
    expect(Number(line.attributes('x1'))).toBeCloseTo(px(100) / KX, 5)
    expect(Number(line.attributes('y2'))).toBeCloseTo(py(300) / KY, 5)

    const from = wrapper!.find('[data-ruler-from]')
    expect(from.attributes('text-anchor')).toBe('end')
    expect(Number(from.attributes('x'))).toBeCloseTo(px(100) / KX - 1, 5)
    expect(Number(from.attributes('y'))).toBeCloseTo(py(80) / KY - 4, 5)

    const to = wrapper!.find('[data-ruler-to]')
    expect(to.attributes('text-anchor')).toBe('start')
    expect(Number(to.attributes('x'))).toBeCloseTo(px(400) / KX, 5)
    expect(Number(to.attributes('y'))).toBeCloseTo(py(300) / KY + 12.5, 5)

    const length = wrapper!.find('[data-ruler-length]')
    expect(Number(length.attributes('x'))).toBeCloseTo((px(100) / KX + px(400) / KX) / 2 + 3, 5)
    expect(Number(length.attributes('y'))).toBeCloseTo((py(80) / KY + py(300) / KY) / 2 - 3, 5)
    expect(length.classes()).toContain('fill-overlay-measure')
  })

  it('writes each end on the side facing away when drawn right to left', async () => {
    const { svg } = await mountLayer()
    await drag(svg.element, [400, 300], [100, 80])
    // The first end is now the lower-right one.
    expect(wrapper!.find('[data-ruler-from]').attributes('text-anchor')).toBe('start')
    expect(wrapper!.find('[data-ruler-to]').attributes('text-anchor')).toBe('end')
  })

  it('draws a new line over the old one', async () => {
    const { measure, svg } = await mountLayer()
    await drag(svg.element, [100, 80], [400, 300])
    await drag(svg.element, [200, 200], [300, 100])
    expect(measure.ruler!.from).toEqual({ x: px(200), y: py(200) })
    expect(wrapper!.findAll('line[data-ruler-line]')).toHaveLength(1)
  })

  it('takes the ruler away with a click on the picture', async () => {
    const { measure, svg } = await mountLayer()
    await drag(svg.element, [100, 80], [400, 300])
    await drag(svg.element, [500, 400], [501, 400])
    expect(measure.ruler).toBeNull()
    expect(wrapper!.find('[data-ruler-length]').exists()).toBe(false)
  })

  it('moves one end by its grip and leaves the other', async () => {
    const { measure, svg } = await mountLayer()
    await drag(svg.element, [100, 80], [400, 300])
    const first = { ...measure.ruler!.from }

    const grip = wrapper!.find('[data-ruler-end="to"]').element
    grip.dispatchEvent(pointer('pointerdown', 400, 300))
    svg.element.dispatchEvent(pointer('pointermove', 450, 350))
    svg.element.dispatchEvent(pointer('pointerup', 450, 350))
    await flushPromises()

    expect(measure.ruler!.from).toEqual(first)
    expect(measure.ruler!.to).toEqual({ x: px(450), y: py(350) })
    expect(measure.rulerEnd).toBe('to')
  })

  it('remembers the first end as the one to nudge after it was grabbed', async () => {
    const { measure, svg } = await mountLayer()
    await drag(svg.element, [100, 80], [400, 300])
    const grip = wrapper!.find('[data-ruler-end="from"]').element
    grip.dispatchEvent(pointer('pointerdown', 100, 80))
    svg.element.dispatchEvent(pointer('pointerup', 100, 80))
    await flushPromises()
    expect(measure.rulerEnd).toBe('from')

    const before = { ...measure.ruler!.from }
    key('ArrowRight')
    key('ArrowDown', { shiftKey: true })
    expect(measure.ruler!.from).toEqual({ x: before.x + 1, y: before.y + 10 })
  })

  it('moves the whole line by its body, keeping its length', async () => {
    const { measure, svg } = await mountLayer()
    await drag(svg.element, [100, 80], [400, 300])
    const before = measure.ruler!

    const body = wrapper!.find('[data-ruler-line]').element
    body.dispatchEvent(pointer('pointerdown', 250, 190))
    svg.element.dispatchEvent(pointer('pointermove', 270, 210))
    svg.element.dispatchEvent(pointer('pointerup', 270, 210))
    await flushPromises()

    const after = measure.ruler!
    expect(after.to.x - after.from.x).toBe(before.to.x - before.from.x)
    expect(after.to.y - after.from.y).toBe(before.to.y - before.from.y)
    expect(after.from.x).toBeCloseTo(before.from.x + 20 * KX, -1)
    expect(after.from.y).toBeCloseTo(before.from.y + 20 * KY, -1)
  })

  it('holds the line inside the picture when it is dragged out', async () => {
    const { measure, svg } = await mountLayer()
    await drag(svg.element, [100, 80], [400, 300])
    const width = measure.ruler!.to.x - measure.ruler!.from.x

    const body = wrapper!.find('[data-ruler-line]').element
    body.dispatchEvent(pointer('pointerdown', 250, 190))
    svg.element.dispatchEvent(pointer('pointermove', 5000, 190))
    await flushPromises()

    expect(measure.ruler!.to.x).toBe(5860)
    expect(measure.ruler!.from.x).toBe(5860 - width)
  })

  it('stops the ends at the edge of the picture', async () => {
    const { measure, svg } = await mountLayer()
    await drag(svg.element, [100, 80], [900, 700])
    expect(measure.ruler!.to).toEqual({ x: 5860, y: 4020 })
  })

  it('goes back to the old line when Escape cancels a drag', async () => {
    const { measure, svg } = await mountLayer()
    await drag(svg.element, [100, 80], [400, 300])
    const old = measure.ruler!

    svg.element.dispatchEvent(pointer('pointerdown', 500, 400))
    svg.element.dispatchEvent(pointer('pointermove', 600, 450))
    expect(measure.ruler).not.toEqual(old)
    key('Escape')
    expect(measure.ruler).toEqual(old)
  })

  it('moves the drawn end with the arrow keys and clears the line with Delete', async () => {
    const { measure, svg } = await mountLayer()
    await drag(svg.element, [100, 80], [400, 300])
    const end = { ...measure.ruler!.to }

    key('ArrowLeft')
    key('ArrowLeft', { shiftKey: true })
    key('ArrowUp')
    expect(measure.ruler!.to).toEqual({ x: end.x - 11, y: end.y - 1 })

    key('Backspace')
    expect(measure.ruler).toBeNull()
    // Without a line the keys do nothing.
    key('ArrowLeft')
    expect(measure.ruler).toBeNull()
  })

  it('works on the design picture too, where it is measured in the pixels of the strip', async () => {
    const { measure, svg } = await mountLayer('missing')
    // The design's strip is 726 x 534 on screen and 16384 x 12080 pixels.
    await drag(svg.element, [100, 80], [726, 534])
    expect(measure.ruler).toEqual({
      from: { x: Math.round((100 * 16384) / 726), y: Math.round((80 * 12080) / 534) },
      to: { x: 16384, y: 12080 },
    })
    expect(wrapper!.find('[data-ruler-length]').exists()).toBe(true)
  })
})
