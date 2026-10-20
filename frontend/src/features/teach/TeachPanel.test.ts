import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import { describe, expect, it } from 'vitest'
import { apiKey } from '@/api/client'
import { createMockApi } from '@/api/mock'
import { useTeachStore } from '@/stores/teach'
import TeachPanel from './TeachPanel.vue'

async function mountPanel() {
  const api = createMockApi({ live: false })
  const pinia = createPinia()
  // Stores read the api through inject: create the one this panel needs inside an app that has it.
  const app = createApp({}).provide(apiKey, api)
  app.use(pinia)
  setActivePinia(pinia)
  await app.runWithContext(() => useTeachStore()).load()

  return mount(TeachPanel, {
    global: { plugins: [pinia], provide: { [apiKey as symbol]: api } },
  })
}

describe('TeachPanel', () => {
  it('draws the tabs, the specification tree and the analysis panel', async () => {
    const wrapper = await mountPanel()
    await wrapper.vm.$nextTick()
    const text = wrapper.text()
    expect(text).toContain('Specification')
    expect(text).toContain('Image Analysis')
    expect(text).toContain('Align / ROI')
    expect(text).toContain('L-Pad')
  })

  it('switches the tree to the dummy spec', async () => {
    const wrapper = await mountPanel()
    await wrapper.vm.$nextTick()

    const dummy = wrapper.findAll('button').find((button) => button.text() === 'Dummy')
    expect(dummy).toBeDefined()
    await dummy!.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).not.toContain('Align / ROI')
  })

  it('fills the height of the aside', async () => {
    const wrapper = await mountPanel()
    await wrapper.vm.$nextTick()

    expect(wrapper.classes()).toContain('h-full')
    expect(wrapper.classes()).not.toContain('h-[807px]')

    const specification = wrapper.find('.bg-muted')
    expect(specification.exists()).toBe(true)
    expect(specification.classes()).toContain('bottom-0')
  })

  it('draws at least ten checkboxes in unit mode', async () => {
    const wrapper = await mountPanel()
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('[role="checkbox"]').length).toBeGreaterThanOrEqual(10)
  })
})
