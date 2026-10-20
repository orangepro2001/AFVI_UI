import type {
  ComponentInfo,
  HomeSnapshot,
  InspectionArea,
  LogEntry,
  StripStatus,
  SystemStats,
} from '../types'

/** Points drawn by a chart (one per second of history). */
export const HISTORY_LENGTH = 60

/** Small seeded generator: the same seed always draws the same charts (stable screenshots). */
export function createRandom(seed: number): () => number {
  let state = seed | 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

const components: ComponentInfo[] = [
  { name: 'Inspector-1', mode: 'MIU', ip: '192.168.200.10', port: 2000, online: true },
  { name: 'Inspector-2', mode: 'IPU', ip: '192.168.200.11', port: 2000, online: true },
  { name: 'Inspector-3', mode: 'IPU', ip: '192.168.200.12', port: 2000, online: true },
  { name: 'Inspector-4', mode: 'IPU', ip: '192.168.200.13', port: 2000, online: true },
  { name: 'Inspector-5', mode: 'IPU', ip: '192.168.200.14', port: 2000, online: true },
  { name: 'PxInference-1', mode: 'DMG-MT', ip: '192.168.200.31', port: 4000, online: true },
]

const strips: StripStatus[] = [
  {
    stripNo: 1,
    stations: {
      grab: ['work', 'work', 'complete'],
      ga: ['complete'],
      align: ['complete', 'complete', 'complete'],
      transfer: ['none', 'complete', 'complete'],
      prepare: ['complete'],
      inspect: ['none'],
      dmg: ['none'],
      defect: ['none', 'none', 'none'],
    },
    defectCount: null,
    totalCount: null,
    mergeCount: null,
    final: null,
  },
]

const inspection: InspectionArea = {
  page: 1,
  pageCount: 1,
  lights: [
    { id: 'light1', title: 'Light1 (DMG)', nodes: [] },
    {
      id: 'light2',
      title: 'Light2',
      nodes: [
        {
          name: 'OSP / L-Pad',
          channels: {
            red: ['bright', 'dark', null, null, null, null],
            green: ['bright', 'dark', null, null, null, null],
            blue: ['bright', 'dark', null, null, null, null],
          },
        },
      ],
    },
    {
      id: 'light3',
      title: 'Light3',
      nodes: [
        {
          name: 'NonMetal / Pattern1',
          channels: {
            red: ['bright', 'dark', null, null, null, null],
            green: ['bright', 'dark', null, null, null, null],
            blue: ['bright', 'dark', null, null, null, null],
          },
        },
        {
          name: 'NonMetal / Space1',
          channels: {
            red: ['bright', 'dark', null, null, null, null],
            green: ['bright', 'dark', null, null, null, null],
            blue: ['bright', 'dark', null, null, null, null],
          },
        },
      ],
    },
  ],
}

const logs: LogEntry[] = [
  {
    time: '2026-10-20 17:23:38',
    level: 'notice',
    text: '[Module:I-Transfer] Image transfer complete[Strip:1, Count:66]',
  },
  {
    time: '2026-10-20 17:23:38',
    level: 'notice',
    text: '[MainFrame] CommandLocalTransferEnd.  Strip: 1  strPacket: \\\\192.168.200.10\\PxTemporary^1^TEST3^1^0^0^1',
  },
  { time: '2026-10-20 19:54:06', level: 'info', text: 'KeepAlive  IP:192.168.200.14, PORT2000' },
  { time: '2026-10-20 19:54:07', level: 'info', text: 'KeepAlive  IP:192.168.200.11, PORT2000' },
  { time: '2026-10-20 19:54:07', level: 'info', text: 'KeepAlive  IP:192.168.200.12, PORT2000' },
  { time: '2026-10-20 19:54:07', level: 'info', text: 'KeepAlive  IP:192.168.200.13, PORT2000' },
  { time: '2026-10-20 22:54:06', level: 'select', text: 'KeepAlive  IP:192.168.200.14, PORT2000' },
  { time: '2026-10-20 22:54:07', level: 'info', text: 'KeepAlive  IP:192.168.200.11, PORT2000' },
  { time: '2026-10-20 22:54:07', level: 'info', text: 'KeepAlive  IP:192.168.200.12, PORT2000' },
  { time: '2026-10-20 22:54:08', level: 'info', text: 'KeepAlive  IP:192.168.200.13, PORT2000' },
]

/** A quiet series with a few shaped points: `peaks` maps an index to a fraction (0..1) of `scale`. */
function shapedSeries(
  scale: number,
  floor: number,
  peaks: Record<number, number>,
  random: () => number,
): number[] {
  return Array.from(
    { length: HISTORY_LENGTH },
    (_, i) => (peaks[i] ?? floor * (0.7 + random() * 0.6)) * scale,
  )
}

/** The chart series: a quiet baseline, ending with the value the panel shows. */
export function seedStats(random: () => number): SystemStats {
  const cpuHistory = shapedSeries(
    100,
    0.011,
    { 46: 0.04, 47: 0.11, 48: 0.04, 54: 0.04, 55: 0.11, 56: 0.04, 59: 0.0123 },
    random,
  )

  const memoryUsed = 207.93
  const memoryHistory = Array.from({ length: HISTORY_LENGTH }, () => memoryUsed + random() * 0.4)

  const network = (ip: string, maxKb: number, sendKbps: number, history: number[]) => ({
    ip,
    maxKb,
    sendKbps,
    history,
  })

  return {
    cpu: { usage: 1.23, history: cpuHistory },
    memory: { totalGB: 639.41, usedGB: memoryUsed, freeGB: 431.49, history: memoryHistory },
    networks: [
      network(
        '192.168.200.10',
        69,
        4.57,
        shapedSeries(
          69,
          0.03,
          {
            45: 0.1,
            46: 0.25,
            47: 0.67,
            48: 0.3,
            49: 0.12,
            50: 0.08,
            51: 0.04,
            52: 0.03,
            53: 0.15,
            54: 0.06,
            55: 0.12,
            56: 0.1,
            57: 0.12,
            58: 0.1,
            59: 0.13,
          },
          random,
        ),
      ),
      network(
        '192.168.200.20',
        86,
        0,
        shapedSeries(
          86,
          0.01,
          { 46: 0.2, 47: 0.67, 48: 0.25, 49: 0.18, 50: 0.1, 51: 0.06, 52: 0.04, 53: 0.02 },
          random,
        ),
      ),
    ],
    storage: { drive: 'D:', totalGB: 1362, usedGB: 451, freeGB: 911 },
  }
}

export function createHomeSnapshot(random: () => number): HomeSnapshot {
  return {
    model: 'TEST1020',
    lot: 'TEST3',
    dmg: { metal: false, sr: true },
    product: { product: 'STRIP', camera: 'LineScan', resolution: '2.0', surface: 'TOP' },
    // Copies: a consumer that mutates its snapshot must not change the next one.
    components: structuredClone(components),
    strips: structuredClone(strips),
    inspection: structuredClone(inspection),
    stats: seedStats(random),
    logs: structuredClone(logs),
  }
}
