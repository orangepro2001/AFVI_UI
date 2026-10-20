import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiKey } from '@/api/client'
import { createMockApi } from '@/api/mock'
import { useAppStore } from '@/stores/app'
import AppShell from './AppShell.vue'

// happy-dom may lack ResizeObserver, which the rail and the header observe.
if (!('ResizeObserver' in globalThis)) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
}

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/teach', component: { template: '<div />' } },
    ],
  })
}

async function mountShell(path = '/') {
  const api = createMockApi({ live: false })
  const pinia = createPinia()
  // Stores read the api through inject: create the ones AppShell needs inside an app that has it.
  const app = createApp({}).provide(apiKey, api)
  app.use(pinia)
  setActivePinia(pinia)

  const router = createTestRouter()
  await router.push(path)
  await router.isReady()

  const wrapper = mount(AppShell, {
    global: {
      plugins: [pinia, router],
      provide: { [apiKey as symbol]: api },
      stubs: {
        AppHeader: { template: '<header />' },
        AppNav: { template: '<nav />' },
      },
    },
    attachTo: document.body,
  })
  await flushPromises()
  await wrapper.vm.$nextTick()
  return { wrapper, app }
}

function railButton(label: string): HTMLButtonElement {
  const button = document.body.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
  if (!button) throw new Error(`rail button "${label}" not found`)
  return button
}

describe('AppShell', () => {
  let cleanup: (() => void) | undefined

  beforeEach(() => {
    if (!('ResizeObserver' in globalThis)) {
      class ResizeObserverStub {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
      vi.stubGlobal('ResizeObserver', ResizeObserverStub)
    }
  })

  afterEach(() => {
    cleanup?.()
    cleanup = undefined
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  async function setup(path = '/') {
    const mounted = await mountShell(path)
    cleanup = () => mounted.wrapper.unmount()
    return mounted
  }

  it('opens the model dialog from the rail', async () => {
    const { wrapper, app } = await setup()
    railButton('Model').click()
    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(app.runWithContext(() => useAppStore()).modelOpen).toBe(true)
    expect(document.body.textContent).toContain('Choose Model Names')
  })

  it('opens the grab dialog from the rail', async () => {
    const { wrapper, app } = await setup()
    railButton('Images').click()
    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(app.runWithContext(() => useAppStore()).grabOpen).toBe(true)
    expect(document.body.textContent).toContain('Load grab images')
  })

  it('opens the generate dialog from the rail', async () => {
    const { wrapper, app } = await setup()
    railButton('Nodes').click()
    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(app.runWithContext(() => useAppStore()).generateOpen).toBe(true)
    expect(document.body.textContent).toContain('Generate Option')
  })

  it('opens the login dialog from the rail', async () => {
    const { wrapper, app } = await setup()
    railButton('User').click()
    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(app.runWithContext(() => useAppStore()).loginOpen).toBe(true)
    expect(document.body.textContent).toContain('Log in/out')
  })

  it('shows the overlay on Layout and hides it after 3000ms', async () => {
    const { wrapper, app } = await setup()
    vi.useFakeTimers()

    railButton('Layout').click()
    await wrapper.vm.$nextTick()

    expect(app.runWithContext(() => useAppStore()).busy).toBe(true)
    expect(document.body.querySelector('[role="status"]')).not.toBeNull()
    expect(document.body.textContent).toContain('Please wait...')

    await wrapper.vm.$nextTick()
    vi.advanceTimersByTime(3000)
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(document.body.querySelector('[role="status"]')).toBeNull()
  })

  it('opens the model dialog on the / route', async () => {
    const { wrapper, app } = await setup('/')
    railButton('Model').click()
    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(app.runWithContext(() => useAppStore()).modelOpen).toBe(true)
    expect(document.body.textContent).toContain('Choose Model Names')
  })

  it('opens the model dialog on the /teach route', async () => {
    const { wrapper, app } = await setup('/teach')
    railButton('Model').click()
    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(app.runWithContext(() => useAppStore()).modelOpen).toBe(true)
    expect(document.body.textContent).toContain('Choose Model Names')
  })

  it('does nothing for the Information button', async () => {
    const { wrapper, app } = await setup()
    railButton('Information').click()
    await wrapper.vm.$nextTick()
    await flushPromises()

    const store = app.runWithContext(() => useAppStore())
    expect(store.loginOpen).toBe(false)
    expect(store.modelOpen).toBe(false)
    expect(store.grabOpen).toBe(false)
    expect(store.generateOpen).toBe(false)
    expect(store.busy).toBe(false)
  })

  it('does nothing for the Share button', async () => {
    const { wrapper, app } = await setup()
    railButton('Share').click()
    await wrapper.vm.$nextTick()
    await flushPromises()

    const store = app.runWithContext(() => useAppStore())
    expect(store.loginOpen).toBe(false)
    expect(store.modelOpen).toBe(false)
    expect(store.grabOpen).toBe(false)
    expect(store.generateOpen).toBe(false)
    expect(store.busy).toBe(false)
  })

  it('ignores the rail while the machine is busy', async () => {
    const { wrapper, app } = await setup()
    vi.useFakeTimers()

    app.runWithContext(() => useAppStore()).runBusy(3000)
    await wrapper.vm.$nextTick()

    railButton('Model').click()
    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(app.runWithContext(() => useAppStore()).modelOpen).toBe(false)
    expect(document.body.textContent).not.toContain('Choose Model Names')

    vi.advanceTimersByTime(3000)
    await flushPromises()
  })
})
