import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import { describe, expect, it } from 'vitest'
import { apiKey } from '@/api/client'
import { createMockApi } from '@/api/mock'
import ToolButtons from './ToolButtons.vue'

function mountToolButtons() {
  const api = createMockApi({ live: false })
  const pinia = createPinia()
  // Stores read the api through inject: create the app context that provides it.
  const app = createApp({}).provide(apiKey, api)
  app.use(pinia)
  setActivePinia(pinia)

  return mount(ToolButtons, {
    global: { plugins: [pinia], provide: { [apiKey as symbol]: api } },
  })
}

describe('ToolButtons', () => {
  it('anchors the 661px icon group to the right', () => {
    const wrapper = mountToolButtons()
    const groups = wrapper.findAll('div').filter((div) => {
      const classes = div.classes()
      return classes.includes('ml-auto') && classes.includes('w-[661px]')
    })
    expect(groups.length).toBeGreaterThanOrEqual(1)
  })

  it('places the first tool at the left of the group', () => {
    const wrapper = mountToolButtons()
    const network = wrapper.find('[aria-label="Network"]')
    expect(network.exists()).toBe(true)
    expect(network.attributes('style')).toContain('left: 0px')
  })

  it('places the last channel at the right of the group', () => {
    const wrapper = mountToolButtons()
    const yellow = wrapper.find('[aria-label="Yellow channel"]')
    expect(yellow.exists()).toBe(true)
    expect(yellow.attributes('style')).toContain('left: 635px')
  })
})
