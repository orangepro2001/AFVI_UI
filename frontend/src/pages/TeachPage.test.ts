import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiKey } from '@/api/client'
import { createMockApi } from '@/api/mock'
import { useTeachStore } from '@/stores/teach'
import { useWorkbenchStore } from '@/stores/workbench'
import TeachPage from './TeachPage.vue'

// happy-dom may lack ResizeObserver, which parts of the page observe.
if (!('ResizeObserver' in globalThis)) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
}

async function mountPage() {
  const api = createMockApi({ live: false })
  const pinia = createPinia()
  // Stores read the api through inject: create the ones this page needs inside an app that has it.
  const app = createApp({}).provide(apiKey, api)
  app.use(pinia)
  setActivePinia(pinia)
  await app.runWithContext(() => useWorkbenchStore()).load()
  await app.runWithContext(() => useTeachStore()).load()

  const wrapper = mount(TeachPage, {
    global: { plugins: [pinia], provide: { [apiKey as symbol]: api } },
  })
  await flushPromises()
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('TeachPage', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    if (!('ResizeObserver' in globalThis)) {
      class ResizeObserverStub {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
      vi.stubGlobal('ResizeObserver', ResizeObserverStub)
    }
  })

  it('draws no tool column while no tool is selected', async () => {
    const wrapper = await mountPage()
    expect(wrapper.find('[aria-label="Select"]').exists()).toBe(false)
  })

  it('draws the draw variant once the GV tool is picked', async () => {
    const wrapper = await mountPage()
    const workbench = useWorkbenchStore()
    workbench.tool = 'gv'
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[aria-label="Select"]').exists()).toBe(true)
    const rect = wrapper.find('[aria-label="Rectangle"]')
    expect(rect.exists()).toBe(true)
    expect(rect.classes()).toContain('border-tool-active')
  })

  it('shows the align picture, the roi tools and locks the toolbar', async () => {
    const wrapper = await mountPage()
    const teach = useTeachStore()
    const workbench = useWorkbenchStore()

    teach.select('u-metal')
    await flushPromises()
    await wrapper.vm.$nextTick()

    const image = wrapper.find('img.max-w-none')
    expect(image.exists()).toBe(true)
    expect(image.attributes('src')).toBe(teach.alignImage?.url)

    expect(wrapper.find('[aria-label="Select"]').exists()).toBe(true)
    const rect = wrapper.find('[aria-label="Rectangle"]')
    expect(rect.classes()).toContain('border-tool-border')
    expect(wrapper.find('[aria-label="Ruler"]').attributes('disabled')).toBeDefined()
    expect(workbench.toolsLocked).toBe(true)
  })

  it('shows an empty viewer for a node without a picture', async () => {
    const wrapper = await mountPage()
    const teach = useTeachStore()

    teach.select('u-etc-user-mask')
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('img.max-w-none').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Select"]').exists()).toBe(false)
  })

  it('unlocks the toolbar on unmount', async () => {
    const wrapper = await mountPage()
    const teach = useTeachStore()
    const workbench = useWorkbenchStore()

    teach.select('u-metal')
    await flushPromises()
    await wrapper.vm.$nextTick()
    expect(workbench.toolsLocked).toBe(true)

    wrapper.unmount()
    expect(workbench.toolsLocked).toBe(false)
  })
})
