import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { apiKey, type ApiClient } from '@/api/client'
import { createMockApi } from '@/api/mock'
import { useMeasureStore } from '@/stores/measure'
import { useWorkbenchStore } from '@/stores/workbench'
import type { GvBox, ImageRef, MedianView } from '@/api/types'
import WorkbenchLayout from './WorkbenchLayout.vue'

async function mountLayout(
  props: Record<string, unknown> = {},
  api: ApiClient = createMockApi({ live: false }),
) {
  const pinia = createPinia()
  // Stores read the api through inject: create the one this page needs inside an app that has it.
  const app = createApp({}).provide(apiKey, api)
  app.use(pinia)
  setActivePinia(pinia)
  await app.runWithContext(() => useWorkbenchStore()).load()

  return mount(WorkbenchLayout, {
    props,
    global: { plugins: [pinia], provide: { [apiKey as symbol]: api } },
    slots: { aside: '<p id="aside">x</p>' },
  })
}

const picture: ImageRef = { url: 'align-image.png', width: 781, height: 536 }

describe('WorkbenchLayout', () => {
  it('draws the aside slot', async () => {
    const wrapper = await mountLayout()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('#aside').exists()).toBe(true)
  })

  it('draws at least 20 toolbar buttons', async () => {
    const wrapper = await mountLayout()
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('button').length).toBeGreaterThanOrEqual(20)
  })

  it('shows the header and the readout labels', async () => {
    const wrapper = await mountLayout()
    await wrapper.vm.$nextTick()
    const text = wrapper.text()
    expect(text).toContain('TEST1020-00')
    expect(text).toContain('CELL :')
    expect(text).toContain('Std. GV :')
  })

  it('draws no image when image is null', async () => {
    const wrapper = await mountLayout({ image: null })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('img.max-w-none').exists()).toBe(false)
  })

  it('draws the given image with its src', async () => {
    const wrapper = await mountLayout({ image: picture })
    await wrapper.vm.$nextTick()
    const image = wrapper.find('img.max-w-none')
    expect(image.exists()).toBe(true)
    expect(image.attributes('src')).toBe('align-image.png')
  })

  it('hides the full readout when readout is none', async () => {
    const wrapper = await mountLayout({ readout: 'none' })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('Avg. GV')
  })

  it('shows only XY and RGB once the pointer has been seen', async () => {
    const wrapper = await mountLayout({ readout: 'xy' })
    const store = useWorkbenchStore()
    store.pointerSeen = false
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('XY :')

    store.pointerSeen = true
    await wrapper.vm.$nextTick()
    const text = wrapper.text()
    expect(text).toContain('XY :')
    expect(text).toContain('RGB :')
    expect(text).not.toContain('CELL :')
  })
})

const medianPicture: MedianView = {
  light: 2,
  image: { url: 'median.png', width: 781, height: 536 },
  size: { width: 5860, height: 4020 },
  state: 'ok',
  file: 'Median_0_1_1.tif',
  lights: [1, 2, 3],
}

async function mountWithMedian(props: Record<string, unknown> = {}, view = medianPicture) {
  const api: ApiClient = {
    ...createMockApi({ live: false }),
    getMedianView: async () => view,
    measureGv: vi.fn(async (_light: number, box: GvBox) => ({
      box,
      pixels: box.w * box.h,
      mean: 40,
      std: 1.5,
      min: 30,
      max: 50,
      saturatedHigh: 0,
      saturatedLow: 0,
    })),
  }
  const wrapper = await mountLayout(props, api)
  await flushPromises()
  return { wrapper, api }
}

describe('WorkbenchLayout: the Median picture and the measuring tools', () => {
  it('shows the Median picture of the light in the strip viewer', async () => {
    const { wrapper } = await mountWithMedian()
    expect(wrapper.find('img.max-w-none').attributes('src')).toBe('median.png')
    expect(wrapper.text()).toContain('5860,')
  })

  it('shows the design picture when the model has no Median picture', async () => {
    const { wrapper } = await mountWithMedian(
      {},
      { ...medianPicture, state: 'missing', image: { url: '', width: 0, height: 0 } },
    )
    expect(wrapper.find('img.max-w-none').attributes('src')).not.toBe('median.png')
  })

  it('draws no measuring layer while no tool is selected', async () => {
    const { wrapper } = await mountWithMedian()
    expect(wrapper.find('[data-gv-layer]').exists()).toBe(false)
    expect(wrapper.find('[data-ruler-layer]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Delete"]').exists()).toBe(false)
  })

  it('draws the ruler layer, and no tool column, for the Ruler tool', async () => {
    const { wrapper } = await mountWithMedian()
    useWorkbenchStore().tool = 'ruler'
    await flushPromises()
    expect(wrapper.find('[data-ruler-layer]').exists()).toBe(true)
    expect(wrapper.find('[data-gv-layer]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Delete"]').exists()).toBe(false)
  })

  it('draws the GV layer and the tool column for the GV tool, wired to the measure store', async () => {
    const { wrapper } = await mountWithMedian()
    const measure = useMeasureStore()
    useWorkbenchStore().tool = 'gv'
    await flushPromises()

    expect(wrapper.find('[data-gv-layer]').exists()).toBe(true)
    const rect = wrapper.find('[aria-label="Rectangle"]')
    expect(rect.attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('[aria-label="Delete"]').attributes('disabled')).toBeDefined()

    await wrapper.find('[aria-label="Select"]').trigger('click')
    expect(measure.gvTool).toBe('select')
    expect(wrapper.find('[aria-label="Select"]').attributes('aria-pressed')).toBe('true')

    measure.setGvBox({ x: 100, y: 100, w: 400, h: 300 })
    await flushPromises()
    expect(wrapper.find('[data-gv-label]').text()).toBe('GV : 40')
    expect(wrapper.text()).toContain('Avg. GV :')
    const trash = wrapper.find('[aria-label="Delete"]')
    expect(trash.attributes('disabled')).toBeUndefined()

    await trash.trigger('click')
    await flushPromises()
    expect(measure.gvBox).toBeNull()
    expect(wrapper.find('[data-gv-box]').exists()).toBe(false)
  })

  it('draws no measuring layer over a picture of a page (an Align picture)', async () => {
    const { wrapper } = await mountWithMedian({ image: picture })
    useWorkbenchStore().tool = 'gv'
    await flushPromises()
    expect(wrapper.find('[data-gv-layer]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Delete"]').exists()).toBe(false)
  })

  it('shows the Avg. and Std. GV of the box in the read-out bar', async () => {
    const { wrapper } = await mountWithMedian()
    const measure = useMeasureStore()
    measure.setGvBox({ x: 0, y: 0, w: 100, h: 100 })
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('Avg. GV :40')
    expect(text).toContain('Std. GV :1.50')
  })
})
