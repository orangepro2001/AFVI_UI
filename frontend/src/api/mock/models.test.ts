import { describe, expect, it } from 'vitest'
import { createMockApi } from './index'
import { createActiveModel, createModels } from './models'

describe('createModels', () => {
  it('returns 64 models', () => {
    expect(createModels()).toHaveLength(64)
  })

  it('numbers the models 01..64', () => {
    const models = createModels()
    models.forEach((model, i) => {
      expect(model.index).toBe(String(i + 1).padStart(2, '0'))
    })
  })

  it('sorts the names strictly and uniquely', () => {
    const names = createModels().map((m) => m.name)
    for (let i = 1; i < names.length; i++) {
      expect(names[i - 1]! < names[i]!).toBe(true)
    }
    expect(new Set(names).size).toBe(names.length)
  })

  it('starts with the 12 rows of the design', () => {
    const expected = [
      ['01', '2026-05-04 11:28:12', '21csp043-09'],
      ['02', '2026-04-22 11:01:46', '21fcs012-05'],
      ['03', '2026-04-22 15:28:12', '21fsi004-05'],
      ['04', '2026-04-20 15:51:07', '21msp016-30'],
      ['05', '2026-10-07 00:54:06', '22csp011-08'],
      ['06', '2026-04-13 11:08:32', '22fbo012-07'],
      ['07', '2026-04-01 13:34:27', '22fbo174-13'],
      ['08', '2026-04-21 13:43:39', '22msp017-20'],
      ['09', '2026-03-16 17:01:52', '22msp058-08'],
      ['10', '2026-09-28 14:26:50', '22sip015-07'],
      ['11', '2026-04-21 15:47:59', '23csp025-07'],
      ['12', '2026-04-13 09:55:13', '23fbo004-08'],
    ]
    const models = createModels().slice(0, 12)
    expect(models.map((m) => [m.index, m.created, m.name])).toEqual(expected)
    models.forEach((m) => {
      expect(m.state).toBe('')
      expect(m.resolution).toBe('2.0')
    })
  })

  it('writes legal creation times', () => {
    const pattern = /^2026-\d\d-\d\d \d\d:\d\d:\d\d$/
    for (const model of createModels()) {
      expect(model.created).toMatch(pattern)
      const month = Number(model.created.slice(5, 7))
      const day = Number(model.created.slice(8, 10))
      const hour = Number(model.created.slice(11, 13))
      const minute = Number(model.created.slice(14, 16))
      const second = Number(model.created.slice(17, 19))
      expect(month).toBeGreaterThanOrEqual(1)
      expect(month).toBeLessThanOrEqual(10)
      expect(day).toBeGreaterThanOrEqual(1)
      expect(day).toBeLessThanOrEqual(28)
      expect(hour).toBeLessThanOrEqual(23)
      expect(minute).toBeLessThanOrEqual(59)
      expect(second).toBeLessThanOrEqual(59)
    }
  })

  it('returns a new array with equal contents each time', () => {
    const a = createModels()
    const b = createModels()
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })
})

describe('createActiveModel', () => {
  it('removes the trailing revision from the base', () => {
    const model = createActiveModel('TEST1020-00')
    expect(model.name).toBe('TEST1020-00')
    expect(model.base).toBe('TEST1020')
    expect(model.resolution).toBe('2.0')
    expect(model.surface).toBe('Top')
  })

  it('keeps a name without a revision as the base', () => {
    expect(createActiveModel('ABC').base).toBe('ABC')
  })
})

describe('createMockApi active model', () => {
  it('selects a model and reports it back', async () => {
    const api = createMockApi({ live: false })
    const before = await api.getActiveModel()
    expect(before.name).toBe('TEST1020-00')

    const selected = await api.selectModel('21csp043-09')
    expect(selected.name).toBe('21csp043-09')
    expect(selected.base).toBe('21csp043')

    const after = await api.getActiveModel()
    expect(after.name).toBe('21csp043-09')
    expect(after.base).toBe('21csp043')
  })
})
