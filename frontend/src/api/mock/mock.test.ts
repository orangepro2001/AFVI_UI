import { afterEach, describe, expect, it, vi } from 'vitest'
import { HISTORY_LENGTH, createRandom } from './data'
import { createMockApi } from './index'

afterEach(() => {
  vi.useRealTimers()
})

describe('createRandom', () => {
  it('draws the same numbers for the same seed', () => {
    const a = createRandom(7)
    const b = createRandom(7)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('stays in [0, 1)', () => {
    const next = createRandom(3)
    for (let i = 0; i < 1000; i++) {
      const n = next()
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThan(1)
    }
  })
})

describe('mock api', () => {
  it('answers a home snapshot with every history at full length', async () => {
    const api = createMockApi({ live: false })
    const { stats, strips, components } = await api.getHomeSnapshot()

    expect(stats.cpu.history).toHaveLength(HISTORY_LENGTH)
    expect(stats.memory.history).toHaveLength(HISTORY_LENGTH)
    stats.networks.forEach((nic) => expect(nic.history).toHaveLength(HISTORY_LENGTH))
    expect(strips.length).toBeGreaterThan(0)
    expect(components.length).toBeGreaterThan(0)
  })

  it('is deterministic for a seed', async () => {
    const a = await createMockApi({ live: false, seed: 5 }).getHomeSnapshot()
    const b = await createMockApi({ live: false, seed: 5 }).getHomeSnapshot()
    expect(a).toEqual(b)
  })

  it('hands out copies', async () => {
    const api = createMockApi({ live: false })
    const first = await api.getHomeSnapshot()
    first.model = 'changed'
    first.strips[0]!.stripNo = 99
    const second = await api.getHomeSnapshot()
    expect(second.model).toBe('TEST1020')
    expect(second.strips[0]!.stripNo).toBe(1)
  })

  it('pushes stats every interval and stops after unsubscribe', () => {
    vi.useFakeTimers()
    const api = createMockApi({ intervalMs: 1000 })
    const seen: number[] = []
    const off = api.onSystemStats((stats) => seen.push(stats.cpu.history.length))

    vi.advanceTimersByTime(3000)
    expect(seen).toEqual([HISTORY_LENGTH, HISTORY_LENGTH, HISTORY_LENGTH])

    off()
    vi.advanceTimersByTime(3000)
    expect(seen).toHaveLength(3)
  })

  it('keeps the numbers in range while it runs', () => {
    vi.useFakeTimers()
    const api = createMockApi({ intervalMs: 1000, seed: 11 })
    const cpu: number[] = []
    const free: number[] = []
    api.onSystemStats((stats) => {
      cpu.push(stats.cpu.usage)
      free.push(stats.memory.freeGB)
    })
    vi.advanceTimersByTime(200_000)
    expect(Math.min(...cpu)).toBeGreaterThanOrEqual(1)
    expect(Math.max(...cpu)).toBeLessThanOrEqual(100)
    expect(Math.min(...free)).toBeGreaterThan(0)
  })

  it('emits log lines', () => {
    vi.useFakeTimers()
    const api = createMockApi({ intervalMs: 1000 })
    const lines: string[] = []
    api.onLog((entry) => lines.push(entry.text))
    vi.advanceTimersByTime(6000)
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('KeepAlive')
  })
})
