import type { OperationRecord } from '@/api/types'

/** A detail of an operation: numbers are rounded to three decimals, booleans are written 1 / 0. */
export type AttrValue = string | number | boolean | null | undefined
export type Attrs = Record<string, AttrValue>

export interface RecorderOptions {
  /** How long a new operation waits for company before the batch is sent. */
  delayMs?: number
  /** The most operations in one call. */
  maxBatch?: number
  /** The most operations kept while the backend does not answer; the oldest go first. */
  maxQueue?: number
  now?: () => number
}

export interface Recorder {
  /** Writes down something that has just happened. */
  record(kind: string, attrs?: Attrs): void
  /**
   * Writes down the last of a run of the same thing: a drag or a held key changes a value many
   * times, and what matters is where it ended. `key` names the run; it is written when nothing
   * more has come for `quietMs`, stamped with the time of the last change.
   */
  settle(key: string, kind: string, attrs?: Attrs, quietMs?: number): void
  /** Sends everything, the runs that are still settling included. */
  flush(): Promise<void>
  /** Stops the timers; what is left is sent by a last flush() the caller awaits. */
  dispose(): void
}

const MAX_VALUE = 200

function text(value: Exclude<AttrValue, null | undefined>): string {
  if (typeof value === 'boolean') return value ? '1' : '0'
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : String(Math.round(value * 1000) / 1000)
  }
  return value.length > MAX_VALUE ? `${value.slice(0, MAX_VALUE)}…` : value
}

/** The details as strings; undefined and null are left out. */
export function stringifyAttrs(attrs: Attrs = {}): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [name, value] of Object.entries(attrs)) {
    if (value !== null && value !== undefined) out[name] = text(value)
  }
  return out
}

interface Settling {
  timer: ReturnType<typeof setTimeout>
  record: OperationRecord
}

/**
 * Collects operations and hands them to `send` in batches: the user's hand is much faster than a
 * journal needs to be, and every call to the backend is a trip through the window's bridge. A
 * batch that cannot be sent goes back to the front of the queue and is tried again later.
 */
export function createRecorder(
  send: (ops: OperationRecord[]) => Promise<void>,
  options: RecorderOptions = {},
): Recorder {
  const { delayMs = 1000, maxBatch = 200, maxQueue = 5000, now = () => Date.now() } = options

  let queue: OperationRecord[] = []
  const settling = new Map<string, Settling>()
  let timer: ReturnType<typeof setTimeout> | undefined
  let sending: Promise<void> | null = null
  let retryMs = delayMs
  let dropped = 0
  let disposed = false

  function schedule(after: number) {
    if (timer !== undefined || disposed) return
    timer = setTimeout(() => {
      timer = undefined
      void drain()
    }, after)
  }

  /** Puts an operation in the queue by the time it happened: a run that settled is stamped when it last changed. */
  function insert(op: OperationRecord) {
    let at = queue.length
    while (at > 0 && queue[at - 1]!.at > op.at) at--
    queue.splice(at, 0, op)
  }

  function enqueue(op: OperationRecord) {
    insert(op)
    if (queue.length > maxQueue) {
      const over = queue.length - maxQueue
      queue = queue.slice(over)
      dropped += over
    }
    schedule(retryMs)
  }

  async function sendAll() {
    while (queue.length > 0) {
      const batch = queue.slice(0, maxBatch)
      queue = queue.slice(batch.length)
      try {
        if (dropped > 0)
          batch.unshift({ at: now(), k: 'journal.dropped', a: { n: String(dropped) } })
        await send(batch)
        if (batch[0]?.k === 'journal.dropped') dropped = 0
        retryMs = delayMs
      } catch {
        // Back to the front, in order; the next try waits longer (up to half a minute).
        queue = [...batch.filter((op) => op.k !== 'journal.dropped'), ...queue]
        retryMs = Math.min(retryMs * 2, 30_000)
        schedule(retryMs)
        return
      }
    }
  }

  /** Sends what is queued, one send at a time: a call that arrives while one is out waits for it. */
  function drain(): Promise<void> {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
    sending = (sending ?? Promise.resolve()).then(sendAll)
    const mine = sending
    void mine.finally(() => {
      if (sending === mine) sending = null
    })
    return mine
  }

  /** Sends everything, the runs that are still settling included: the window is going away. */
  function flush(): Promise<void> {
    for (const [key, run] of settling) {
      clearTimeout(run.timer)
      settling.delete(key)
      insert(run.record)
    }
    return drain()
  }

  return {
    record(kind, attrs) {
      enqueue({ at: now(), k: kind, a: stringifyAttrs(attrs) })
    },

    settle(key, kind, attrs, quietMs = 500) {
      const run = settling.get(key)
      if (run) clearTimeout(run.timer)
      const record = { at: now(), k: kind, a: stringifyAttrs(attrs) }
      settling.set(key, {
        record,
        timer: setTimeout(() => {
          settling.delete(key)
          enqueue(record)
        }, quietMs),
      })
    },

    flush,

    dispose() {
      disposed = true
      if (timer !== undefined) clearTimeout(timer)
      timer = undefined
      for (const run of settling.values()) clearTimeout(run.timer)
    },
  }
}
