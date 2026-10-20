import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import { describe, expect, it } from 'vitest'
import { apiKey } from '@/api/client'
import { createMockApi } from '@/api/mock'
import { useReviewStore } from '@/stores/review'
import ReviewPanel from './ReviewPanel.vue'

async function mountPanel() {
  const api = createMockApi({ live: false })
  const pinia = createPinia()
  const app = createApp({}).provide(apiKey, api)
  app.use(pinia)
  setActivePinia(pinia)
  await app.runWithContext(() => useReviewStore()).load()

  return mount(ReviewPanel, {
    global: { plugins: [pinia], provide: { [apiKey as symbol]: api } },
  })
}

describe('ReviewPanel', () => {
  it('draws the defect table of the reference design', async () => {
    const wrapper = await mountPanel()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Inspection - Defect')
  })

  it('stretches the lower block to the bottom', async () => {
    const wrapper = await mountPanel()
    await wrapper.vm.$nextTick()

    const block = wrapper
      .findAll('div')
      .find(
        (element) =>
          element.classes().includes('bg-muted') && element.classes().includes('bottom-[3px]'),
      )
    expect(block).toBeDefined()
  })
})
