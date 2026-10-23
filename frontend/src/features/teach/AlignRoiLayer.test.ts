import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { apiKey } from '@/api/client'
import { createMockApi } from '@/api/mock'
import { useAlignRoiStore } from '@/stores/alignRoi'
import AlignRoiLayer from './AlignRoiLayer.vue'

let wrapper: ReturnType<typeof mount> | undefined

async function mountLayer() {
  const api = createMockApi({ live: false })
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useAlignRoiStoreWith(api, pinia)
  await store.load()
  wrapper = mount(AlignRoiLayer, {
    global: { plugins: [pinia], provide: { [apiKey as symbol]: api } },
  })
  const svg = wrapper.find('svg').element as SVGSVGElement
  // jsdom has no layout: the svg is the 781 x 536 picture at the page origin.
  svg.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 781, height: 536, right: 781, bottom: 536 }) as DOMRect
  svg.setPointerCapture = () => undefined
  return { store, svg: wrapper.find('svg') }
}

function useAlignRoiStoreWith(
  api: ReturnType<typeof createMockApi>,
  pinia: ReturnType<typeof createPinia>,
) {
  const app = { provide: { [apiKey as symbol]: api } }
  return mount(
    { template: '<div />', setup: () => ({ store: useAlignRoiStore(pinia) }) },
    { global: app },
  ).vm.store as ReturnType<typeof useAlignRoiStore>
}

function pointer(type: string, x: number, y: number) {
  return new PointerEvent(type, { clientX: x, clientY: y, button: 0, bubbles: true })
}

beforeEach(() => {
  wrapper = undefined
})
afterEach(() => wrapper?.unmount())

describe('AlignRoiLayer', () => {
  it('draws the six boxes', async () => {
    await mountLayer()
    expect(wrapper!.findAll('rect[data-roi]')).toHaveLength(6)
  })

  it('says where it looked when there is no picture', async () => {
    const { store } = await mountLayer()
    expect(wrapper!.find('[data-picture-note]').exists()).toBe(false)

    store.view = {
      ...store.view!,
      state: 'missing',
      note: 'no Metal.tif or SR.tif: looked below D:\\PxRepository\\7M99-535',
    }
    await flushPromises()
    expect(wrapper!.text()).toContain('No Metal / SR picture found')
    expect(wrapper!.find('[data-picture-note]').text()).toContain('looked below D:\\PxRepository')
  })

  it('selects a box by a click and shows eight grips', async () => {
    const { store } = await mountLayer()
    await wrapper!.find('rect[data-roi="P4"]').trigger('pointerdown', { button: 0 })
    expect(store.selectedId).toBe('P4')
    await flushPromises()
    expect(wrapper!.findAll('circle[data-handle]')).toHaveLength(8)
  })

  it('draws a new box with the rect tool and goes back to select', async () => {
    const { store, svg } = await mountLayer()
    store.setTool('rect')
    svg.element.dispatchEvent(pointer('pointerdown', 100, 100))
    svg.element.dispatchEvent(pointer('pointermove', 200, 160))
    svg.element.dispatchEvent(pointer('pointerup', 200, 160))
    expect(store.rois).toHaveLength(7)
    expect(store.selectedId).toBe('R1')
    expect(store.tool).toBe('select')
  })

  it('ignores a drag smaller than the minimum', async () => {
    const { store, svg } = await mountLayer()
    store.setTool('rect')
    svg.element.dispatchEvent(pointer('pointerdown', 100, 100))
    svg.element.dispatchEvent(pointer('pointerup', 100, 100))
    expect(store.rois).toHaveLength(6)
  })

  it('moves a box with one history step', async () => {
    const { store, svg } = await mountLayer()
    const before = store.rois.find((roi) => roi.id === 'P8')!
    const box = wrapper!.find('rect[data-roi="P8"]').element
    box.dispatchEvent(pointer('pointerdown', 150, 250))
    svg.element.dispatchEvent(pointer('pointermove', 170, 260))
    svg.element.dispatchEvent(pointer('pointerup', 170, 260))
    const after = store.rois.find((roi) => roi.id === 'P8')!
    expect(after.x).toBeGreaterThan(before.x)
    expect(after.y).toBeGreaterThan(before.y)
    store.undo()
    expect(store.rois.find((roi) => roi.id === 'P8')).toEqual(before)
  })

  it('deletes the selected box with Delete and undoes with Ctrl+Z', async () => {
    const { store } = await mountLayer()
    store.select('P4')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }))
    expect(store.rois).toHaveLength(5)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))
    expect(store.rois).toHaveLength(6)
  })

  it('says so when there is no picture', async () => {
    const { store } = await mountLayer()
    store.view!.state = 'missing'
    await flushPromises()
    expect(wrapper!.text()).toContain('No Metal / SR picture found')
  })
})
