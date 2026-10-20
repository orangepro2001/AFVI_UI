import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import { describe, expect, it } from 'vitest'
import { apiKey } from '@/api/client'
import { createMockApi } from '@/api/mock'
import { useCalibrationStore } from '@/stores/calibration'
import CalibratePanel from './CalibratePanel.vue'

async function mountPanel() {
  const api = createMockApi({ live: false })
  const pinia = createPinia()
  const app = createApp({}).provide(apiKey, api)
  app.use(pinia)
  setActivePinia(pinia)
  const store = await app.runWithContext(async () => {
    const calibration = useCalibrationStore()
    await calibration.load()
    return calibration
  })

  const wrapper = mount(CalibratePanel, {
    global: { plugins: [pinia], provide: { [apiKey as symbol]: api } },
  })
  return { wrapper, store }
}

describe('CalibratePanel', () => {
  it('draws the twenty channels and the buttons', async () => {
    const { wrapper } = await mountPanel()
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('[role="slider"]').length).toBe(20)
    const text = wrapper.text()
    expect(text).toContain('Calibration - Light')
    expect(text).toContain('Page Index :')
    expect(text).toContain('Auto')
    expect(text).toContain('Reload')
    expect(text).toContain('Save')
    const auto = wrapper.findAll('button').find((button) => button.text() === 'Auto')
    expect(auto).toBeDefined()
    expect(auto!.attributes('disabled')).toBeDefined()
  })

  it('sticks the buttons to the bottom', async () => {
    const { wrapper } = await mountPanel()
    await wrapper.vm.$nextTick()

    for (const label of ['Auto', 'Reload', 'Save']) {
      const button = wrapper.findAll('button').find((item) => item.text() === label)
      expect(button).toBeDefined()
      expect(button!.classes()).toContain('bottom-[3px]')
      expect(button!.classes()).not.toContain('top-[782px]')
    }
  })

  it('flips a channel through its switch', async () => {
    const { wrapper, store } = await mountPanel()
    await wrapper.vm.$nextTick()
    const before = store.channels[3]!.on
    const switches = wrapper.findAll('[role="switch"]')
    // The first switch is the big power switch.
    await switches[4]!.trigger('click')
    expect(store.channels[3]!.on).toBe(!before)
  })
})
