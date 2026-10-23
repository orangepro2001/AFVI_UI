import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { OperationRecord } from '@/api/types'
import { createRecorder, stringifyAttrs } from './recorder'

let clock = 1_000_000
const now = () => clock

function sink() {
  const calls: OperationRecord[][] = []
  const send = vi.fn(async (ops: OperationRecord[]) => {
    calls.push(ops)
  })
  return { calls, send, all: () => calls.flat() }
}

beforeEach(() => {
  vi.useFakeTimers()
  clock = 1_000_000
})
afterEach(() => vi.useRealTimers())

describe('stringifyAttrs', () => {
  it('writes numbers, booleans and words as short strings and leaves out what is not there', () => {
    expect(
      stringifyAttrs({
        n: 3,
        f: 31.03456,
        big: 5860,
        on: true,
        off: false,
        w: 'teach',
        no: null,
        un: undefined,
      }),
    ).toEqual({ n: '3', f: '31.035', big: '5860', on: '1', off: '0', w: 'teach' })
    expect(stringifyAttrs()).toEqual({})
  })

  it('cuts a long word', () => {
    const out = stringifyAttrs({ v: 'x'.repeat(500) }).v
    expect(out).toHaveLength(201)
    expect(out.endsWith('…')).toBe(true)
  })
})

describe('createRecorder', () => {
  it('sends what happened together, once things have been quiet for a moment', async () => {
    const { calls, send } = sink()
    const recorder = createRecorder(send, { now })
    recorder.record('nav', { page: '/teach' })
    clock += 40
    recorder.record('tool', { name: 'gv' })
    expect(send).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1000)
    expect(calls).toEqual([
      [
        { at: 1_000_000, k: 'nav', a: { page: '/teach' } },
        { at: 1_000_040, k: 'tool', a: { name: 'gv' } },
      ],
    ])
    recorder.dispose()
  })

  it('splits a long queue into batches of at most maxBatch, in order', async () => {
    const { calls, send } = sink()
    const recorder = createRecorder(send, { now, maxBatch: 3 })
    for (let i = 0; i < 7; i++) recorder.record('n', { i })
    await recorder.flush()
    expect(calls.map((batch) => batch.map((op) => op.a.i))).toEqual([
      ['0', '1', '2'],
      ['3', '4', '5'],
      ['6'],
    ])
    recorder.dispose()
  })

  it('writes only the last of a run that settles, stamped when the run ended', async () => {
    const { calls, send } = sink()
    const recorder = createRecorder(send, { now })
    for (let i = 1; i <= 5; i++) {
      clock += 20
      recorder.settle('gv', 'gv', { w: i * 100 })
      await vi.advanceTimersByTimeAsync(20)
    }
    expect(send).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(500)
    await vi.advanceTimersByTimeAsync(1000)

    expect(calls.flat()).toEqual([{ at: 1_000_100, k: 'gv', a: { w: '500' } }])
    recorder.dispose()
  })

  it('does not let the periodic send hurry a run that is still changing', async () => {
    const { calls, send } = sink()
    const recorder = createRecorder(send, { now })
    recorder.record('tool', { name: 'gv' }) // the batch is due after a second
    for (let i = 1; i <= 12; i++) {
      await vi.advanceTimersByTimeAsync(100)
      clock += 100
      recorder.settle('gv', 'gv', { w: i * 10 })
    }
    // The first second is over: the tool was sent, the box (still being dragged) was not.
    expect(calls.flat().map((op) => op.k)).toEqual(['tool'])

    await vi.advanceTimersByTimeAsync(500)
    await vi.advanceTimersByTimeAsync(1000)
    expect(calls.flat().map((op) => `${op.k}:${op.a.w ?? ''}`)).toEqual(['tool:', 'gv:120'])
    recorder.dispose()
  })

  it('sends in the order things happened: a run that settled goes in at its last change', async () => {
    const { all, send } = sink()
    const recorder = createRecorder(send, { now })
    clock += 10
    recorder.settle('gv', 'gv', { w: 1 }, 300)
    clock += 100
    recorder.record('light', { n: 3 })
    clock += 100
    recorder.record('light', { n: 1 })
    await vi.advanceTimersByTimeAsync(300) // the run has settled behind the two lights now
    await recorder.flush()
    expect(all().map((op) => op.k)).toEqual(['gv', 'light', 'light'])
    expect(all().map((op) => op.at)).toEqual([1_000_010, 1_000_110, 1_000_210])
    recorder.dispose()
  })

  it('keeps separate runs apart', async () => {
    const { send, all } = sink()
    const recorder = createRecorder(send, { now })
    recorder.settle('a', 'cal.brightness', { channel: 1, value: 10 })
    recorder.settle('b', 'cal.brightness', { channel: 2, value: 20 })
    recorder.settle('a', 'cal.brightness', { channel: 1, value: 15 })
    await recorder.flush()
    expect(all().map((op) => `${op.a.channel}:${op.a.value}`)).toEqual(['2:20', '1:15'].sort())
    recorder.dispose()
  })

  it('sends the runs that are still settling when asked to flush', async () => {
    const { all, send } = sink()
    const recorder = createRecorder(send, { now })
    recorder.settle('ruler', 'ruler', { len: 12.5 })
    await recorder.flush()
    expect(all()).toEqual([{ at: 1_000_000, k: 'ruler', a: { len: '12.5' } }])
    // Nothing is sent twice.
    await vi.advanceTimersByTimeAsync(5000)
    expect(send).toHaveBeenCalledTimes(1)
    recorder.dispose()
  })

  it('tries again, in order and later each time, when the backend does not answer', async () => {
    const delivered: OperationRecord[][] = []
    let up = false
    const send = vi.fn(async (ops: OperationRecord[]) => {
      if (!up) throw new Error('bridge not ready')
      delivered.push(ops)
    })
    const recorder = createRecorder(send, { now })
    recorder.record('a')
    recorder.record('b')
    await vi.advanceTimersByTimeAsync(1000)
    expect(send).toHaveBeenCalledTimes(1)

    recorder.record('c')
    await vi.advanceTimersByTimeAsync(1000)
    expect(send).toHaveBeenCalledTimes(1) // the retry waits twice as long now
    await vi.advanceTimersByTimeAsync(1000)
    expect(send).toHaveBeenCalledTimes(2)

    up = true
    await vi.advanceTimersByTimeAsync(4000)
    expect(delivered.flat().map((op) => op.k)).toEqual(['a', 'b', 'c'])
    recorder.dispose()
  })

  it('drops the oldest operations when the backend stays away, and says how many', async () => {
    const delivered: OperationRecord[] = []
    let up = false
    const send = async (ops: OperationRecord[]) => {
      if (!up) throw new Error('down')
      delivered.push(...ops)
    }
    const recorder = createRecorder(send, { now, maxQueue: 3 })
    for (let i = 0; i < 5; i++) recorder.record('n', { i })
    await recorder.flush()
    up = true
    await recorder.flush()

    expect(delivered.map((op) => `${op.k}${op.a.i ?? op.a.n}`)).toEqual([
      'journal.dropped2',
      'n2',
      'n3',
      'n4',
    ])
    // Said once.
    recorder.record('n', { i: 5 })
    await recorder.flush()
    expect(delivered.filter((op) => op.k === 'journal.dropped')).toHaveLength(1)
    recorder.dispose()
  })

  it('does not run two sends at once', async () => {
    let open = 0
    let most = 0
    const send = async () => {
      most = Math.max(most, ++open)
      await new Promise((resolve) => setTimeout(resolve, 50))
      open--
    }
    const recorder = createRecorder(send, { now, maxBatch: 1 })
    recorder.record('a')
    recorder.record('b')
    const first = recorder.flush()
    recorder.record('c')
    const second = recorder.flush()
    await vi.advanceTimersByTimeAsync(500)
    await Promise.all([first, second])
    expect(most).toBe(1)
    recorder.dispose()
  })

  it('does not schedule anything after dispose', async () => {
    const { send } = sink()
    const recorder = createRecorder(send, { now })
    recorder.dispose()
    recorder.record('late')
    await vi.advanceTimersByTimeAsync(5000)
    expect(send).not.toHaveBeenCalled()
    await recorder.flush()
    expect(send).toHaveBeenCalledTimes(1)
  })
})
