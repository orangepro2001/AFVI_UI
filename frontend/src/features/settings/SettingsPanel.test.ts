import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import { describe, expect, it } from 'vitest'
import { apiKey } from '@/api/client'
import { createMockApi } from '@/api/mock'
import { useSettingsStore } from '@/stores/settings'
import SettingsPanel from './SettingsPanel.vue'

async function mountPanel() {
  const api = createMockApi({ live: false })
  const pinia = createPinia()
  const app = createApp({}).provide(apiKey, api)
  app.use(pinia)
  setActivePinia(pinia)
  const store = await app.runWithContext(async () => {
    const settings = useSettingsStore()
    await settings.load()
    return settings
  })

  const wrapper = mount(SettingsPanel, {
    global: { plugins: [pinia], provide: { [apiKey as symbol]: api } },
  })
  await wrapper.vm.$nextTick()
  return { wrapper, store }
}

describe('SettingsPanel', () => {
  it('draws the blocks', async () => {
    const { wrapper } = await mountPanel()
    const text = wrapper.text()
    expect(text).toContain('Defect Mask Generation (Metal)')
    expect(text).toContain('Defect Mask Generation (SR)')
    expect(text).toContain('Inspcetion Light')
    expect(text).toContain('Global Align Light')
    expect(text).toContain('Specification - Management')
    expect(text).toContain('Revison')
    expect(wrapper.findAll('[role="switch"]').length).toBe(2)
    expect(wrapper.findAll('[role="slider"]').length).toBe(4)
  })

  it('disables the metal dropdowns only', async () => {
    const { wrapper } = await mountPanel()
    const lights = wrapper.findAll('select[aria-label="Light"]')
    const channels = wrapper.findAll('select[aria-label="Channel"]')
    expect(lights.length).toBe(2)
    expect(channels.length).toBe(2)
    expect(lights[0]!.attributes('disabled')).toBeDefined()
    expect(channels[0]!.attributes('disabled')).toBeDefined()
    expect(lights[1]!.attributes('disabled')).toBeUndefined()
    expect(channels[1]!.attributes('disabled')).toBeUndefined()
  })

  it('ticks an inspection light', async () => {
    const { wrapper, store } = await mountPanel()
    const light1 = wrapper.findAll('[role="checkbox"]')[0]!
    expect(light1.attributes('aria-checked')).toBe('false')
    await light1.trigger('click')
    expect(store.inspectionLights[0]!.enabled).toBe(true)
  })

  it('keeps the unavailable light disabled', async () => {
    const { wrapper } = await mountPanel()
    const light4 = wrapper.findAll('[role="checkbox"]')[3]!
    expect(light4.attributes('disabled')).toBeDefined()
  })

  it('picks the global align light', async () => {
    const { wrapper, store } = await mountPanel()
    const radios = wrapper.findAll('[role="radio"]')
    await radios[2]!.trigger('click')
    expect(store.globalAlignLight).toBe(3)
  })
})
