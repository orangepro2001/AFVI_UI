import { describe, expect, it, vi } from 'vitest'
import { devApiUrl } from './index'
import type { InventoryCalls } from './inventory'
import { createInventoryApi } from './inventory'
import { createMockApi } from './mock'
import type { ActiveModel, NodeAnalysis, TeachSnapshot } from './types'

const MODEL: ActiveModel = {
  name: 'TEST1020-00',
  base: 'TEST1020',
  resolution: '2.0',
  surface: 'Top',
}

function emptySpecSet(): TeachSnapshot['unit'] {
  return {
    globalAlign: [],
    srAlign: [],
    overlay: { mk: true, ac: false, ic: false, sk: false },
    tree: [],
  }
}

function teachSpec(): Pick<TeachSnapshot, 'unit' | 'dummy'> {
  return { unit: emptySpecSet(), dummy: emptySpecSet() }
}

function emptyAnalysis(): NodeAnalysis {
  const empty = { upper: [], lower: [], channels: { red: [], green: [], blue: [] } }
  return { 1: empty, 2: empty, 3: empty }
}

function failingCalls(overrides: Partial<InventoryCalls> = {}): InventoryCalls {
  const fail = () => Promise.reject(new Error('no PxInventory'))
  return {
    getModels: fail,
    getActiveModel: fail,
    selectModel: fail,
    getTeachSpec: fail,
    getNodeAnalysis: fail,
    ...overrides,
  }
}

describe('createInventoryApi', () => {
  it('passes the calls through on success', async () => {
    const base = createMockApi({ live: false })
    const calls: InventoryCalls = {
      getModels: vi.fn(async () => [
        {
          index: '01',
          created: '2026-05-04 11:28:12',
          name: '21csp043-09',
          state: '',
          resolution: '2.0',
        },
      ]),
      getActiveModel: vi.fn(async () => MODEL),
      selectModel: vi.fn(async () => MODEL),
      getTeachSpec: vi.fn(async () => teachSpec()),
      getNodeAnalysis: vi.fn(async () => emptyAnalysis()),
    }
    const warn = vi.fn()
    const api = createInventoryApi(calls, base, warn)

    expect((await api.getModels())[0]?.name).toBe('21csp043-09')
    expect(await api.getActiveModel()).toEqual(MODEL)
    expect((await api.selectModel('TEST1020-00')).name).toBe('TEST1020-00')

    const teach = await api.getTeach()
    expect(teach.alignImages).toEqual((await base.getTeach()).alignImages)
    expect(teach.unit.tree).toEqual([])

    expect(await api.getNodeAnalysis('u-p1')).toEqual(emptyAnalysis())
    expect(warn).not.toHaveBeenCalled()
  })

  it('falls back to the base and warns once per method', async () => {
    const base = createMockApi({ live: false })
    const warn = vi.fn()
    const api = createInventoryApi(failingCalls(), base, warn)

    expect(await api.getModels()).toEqual(await base.getModels())
    expect(await api.getActiveModel()).toEqual(await base.getActiveModel())
    expect((await api.selectModel('TEST1020-00')).name).toBe('TEST1020-00')
    expect((await api.getTeach()).unit.tree).toEqual((await base.getTeach()).unit.tree)
    await api.getNodeAnalysis('u-p1')

    // A second failure on the same method does not warn again.
    await api.getModels()

    expect(warn).toHaveBeenCalledTimes(5)
    const methods = ['getModels', 'getActiveModel', 'selectModel', 'getTeach', 'getNodeAnalysis']
    for (const method of methods) {
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(`inventory.${method} failed, using the mock: no PxInventory`),
      )
    }
  })

  it('handles a string rejection', async () => {
    const base = createMockApi({ live: false })
    const warn = vi.fn()
    const calls = failingCalls({ selectModel: () => Promise.reject('boom') })
    const api = createInventoryApi(calls, base, warn)

    expect((await api.selectModel('21csp043-09')).name).toBe('21csp043-09')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('boom'))
  })
})

describe('devApiUrl', () => {
  it('is null outside a dev build', () => {
    expect(devApiUrl('?api=http://x', false)).toBeNull()
  })

  it('is null without the parameter', () => {
    expect(devApiUrl('?freeze', true)).toBeNull()
    expect(devApiUrl('?api=', true)).toBeNull()
  })

  it('returns the address in a dev build', () => {
    expect(devApiUrl('?freeze&api=http://x', true)).toBe('http://x')
  })
})
