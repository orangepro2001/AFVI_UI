import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import { describe, expect, it } from 'vitest'
import { apiKey } from '@/api/client'
import { createMockApi } from '@/api/mock'
import { useWorkbenchStore } from '@/stores/workbench'
import WorkbenchLayout from './WorkbenchLayout.vue'

async function mountLayout() {
  const api = createMockApi({ live: false })
  const pinia = createPinia()
  // Stores read the api through inject: create the one this page needs inside an app that has it.
  const app = createApp({}).provide(apiKey, api)
  app.use(pinia)
  setActivePinia(pinia)
  await app.runWithContext(() => useWorkbenchStore()).load()

  return mount(WorkbenchLayout, {
    global: { plugins: [pinia], provide: { [apiKey as symbol]: api } },
    slots: { aside: '<p id="aside">x</p>' },
  })
}

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
})
