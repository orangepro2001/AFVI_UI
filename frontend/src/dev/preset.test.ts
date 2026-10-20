import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiKey } from '@/api/client'
import { createMockApi } from '@/api/mock'
import { useAppStore } from '@/stores/app'
import { applyPreset } from './preset'

function withApp() {
  const api = createMockApi({ live: false })
  const pinia = createPinia()
  // Stores read the api through inject: create the one under test inside an app that has it.
  const app = createApp({}).provide(apiKey, api)
  app.use(pinia)
  setActivePinia(pinia)
  return app
}

function readStore(app: ReturnType<typeof createApp>) {
  return app.runWithContext(() => useAppStore())
}

function preset(params: Record<string, string>, app: ReturnType<typeof createApp>) {
  applyPreset(new URLSearchParams(params), app)
}

describe('applyPreset dialogs', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens only the model dialog for ?dialog=model', () => {
    const app = withApp()
    preset({ dialog: 'model' }, app)
    const store = readStore(app)
    expect(store.modelOpen).toBe(true)
    expect(store.grabOpen).toBe(false)
    expect(store.generateOpen).toBe(false)
    expect(store.loginOpen).toBe(false)
  })

  it('opens only the grab dialog for ?dialog=grab', () => {
    const app = withApp()
    preset({ dialog: 'grab' }, app)
    const store = readStore(app)
    expect(store.grabOpen).toBe(true)
    expect(store.modelOpen).toBe(false)
    expect(store.generateOpen).toBe(false)
    expect(store.loginOpen).toBe(false)
  })

  it('opens only the generate dialog for ?dialog=generate', () => {
    const app = withApp()
    preset({ dialog: 'generate' }, app)
    const store = readStore(app)
    expect(store.generateOpen).toBe(true)
    expect(store.modelOpen).toBe(false)
    expect(store.grabOpen).toBe(false)
    expect(store.loginOpen).toBe(false)
  })

  it('opens only the login dialog for ?dialog=login', () => {
    const app = withApp()
    preset({ dialog: 'login' }, app)
    const store = readStore(app)
    expect(store.loginOpen).toBe(true)
    expect(store.modelOpen).toBe(false)
    expect(store.grabOpen).toBe(false)
    expect(store.generateOpen).toBe(false)
  })

  it('turns on the overlay for ?busy=1 and keeps it on', () => {
    vi.useFakeTimers()
    const app = withApp()
    preset({ busy: '1' }, app)
    const store = readStore(app)
    expect(store.busy).toBe(true)

    vi.advanceTimersByTime(10000)
    expect(store.busy).toBe(true)
  })

  it('leaves every flag off without parameters', () => {
    const app = withApp()
    preset({}, app)
    const store = readStore(app)
    expect(store.loginOpen).toBe(false)
    expect(store.modelOpen).toBe(false)
    expect(store.grabOpen).toBe(false)
    expect(store.generateOpen).toBe(false)
    expect(store.busy).toBe(false)
  })

  it('opens nothing for an unknown dialog value', () => {
    const app = withApp()
    preset({ dialog: 'unknown' }, app)
    const store = readStore(app)
    expect(store.loginOpen).toBe(false)
    expect(store.modelOpen).toBe(false)
    expect(store.grabOpen).toBe(false)
    expect(store.generateOpen).toBe(false)
    expect(store.busy).toBe(false)
  })
})
