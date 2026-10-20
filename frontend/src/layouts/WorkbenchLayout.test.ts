import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import { describe, expect, it } from 'vitest'
import { apiKey } from '@/api/client'
import { createMockApi } from '@/api/mock'
import { useWorkbenchStore } from '@/stores/workbench'
import type { ImageRef } from '@/api/types'
import WorkbenchLayout from './WorkbenchLayout.vue'

async function mountLayout(props: Record<string, unknown> = {}) {
  const api = createMockApi({ live: false })
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
