import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiKey, type ApiClient } from '@/api/client'
import { createMockApi } from '@/api/mock'
import type { OperationRecord } from '@/api/types'
import { useWorkbenchStore } from '@/stores/workbench'
import { record, startJournal } from './index'
import { startOperationJournal } from './start'

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  startJournal(null)
  vi.useRealTimers()
})

describe('startOperationJournal', () => {
  it('hands what the user does to the backend in batches', async () => {
    const sent: OperationRecord[][] = []
    const api: ApiClient = {
      ...createMockApi({ live: false }),
      recordOps: async (ops) => void sent.push(ops),
    }
    const app = createApp({}).provide(apiKey, api)
    const pinia = createPinia()
    app.use(pinia)
    setActivePinia(pinia)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: ['/', '/teach'].map((path) => ({ path, component: { render: () => null } })),
    })
    await router.push('/')

    startOperationJournal(app, api, router)
    app.runWithContext(() => {
      useWorkbenchStore().light = 3
    })
    await router.push('/teach')
    record('median.save', { n: 2 })
    expect(sent).toEqual([])

    await vi.advanceTimersByTimeAsync(1000)
    const kinds = sent.flat().map((op) => op.k)
    expect(kinds).toEqual(
      ['ui.ready', 'nav', 'median.save', 'light'].sort(
        (a, b) => kinds.indexOf(a) - kinds.indexOf(b),
      ),
    )
    expect(new Set(kinds)).toEqual(new Set(['ui.ready', 'nav', 'median.save', 'light']))
    expect(sent.flat().find((op) => op.k === 'light')?.a).toEqual({ n: '3' })
    expect(sent.flat().find((op) => op.k === 'nav')?.a).toEqual({ page: '/teach' })
  })

  it('records nothing before it is started', () => {
    startJournal(null)
    expect(() => record('anything')).not.toThrow()
  })
})
