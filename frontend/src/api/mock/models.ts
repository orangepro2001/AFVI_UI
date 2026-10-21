import type { ActiveModel, ModelEntry } from '../types'

/** The 12 rows of the reference design, read off the "Choose Model Names" dialog. */
const HEAD: [string, string, string][] = [
  ['2026-05-04 11:28:12', '21csp043-09', '2.0'],
  ['2026-04-22 11:01:46', '21fcs012-05', '2.0'],
  ['2026-04-22 15:28:12', '21fsi004-05', '2.0'],
  ['2026-04-20 15:51:07', '21msp016-30', '2.0'],
  ['2026-10-07 00:54:06', '22csp011-08', '2.0'],
  ['2026-04-13 11:08:32', '22fbo012-07', '2.0'],
  ['2026-04-01 13:34:27', '22fbo174-13', '2.0'],
  ['2026-04-21 13:43:39', '22msp017-20', '2.0'],
  ['2026-03-16 17:01:52', '22msp058-08', '2.0'],
  ['2026-09-28 14:26:50', '22sip015-07', '2.0'],
  ['2026-04-21 15:47:59', '23csp025-07', '2.0'],
  ['2026-04-13 09:55:13', '23fbo004-08', '2.0'],
]

/** The families of the generated rows, in the order that keeps the names sorted. */
const FAMILIES = ['csp', 'fbo', 'fcs', 'fsi', 'msp', 'sip'] as const

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0')
}

/** "2026-MM-DD HH:MM:SS" from a 1-based counter; months 01..10, days 01..28, legal clock times. */
function created(n: number): string {
  const month = ((n - 1) % 10) + 1
  const day = ((n - 1) % 28) + 1
  const hour = (n * 7) % 24
  const minute = (n * 13) % 60
  const second = (n * 29) % 60
  return `2026-${pad(month, 2)}-${pad(day, 2)} ${pad(hour, 2)}:${pad(minute, 2)}:${pad(second, 2)}`
}

/**
 * The models of the "Choose Model Names" dialog: 64 deterministic rows. The first 12 are read off
 * the design; the rest follow a formula and stay after "23fbo004-08" in the sorted order.
 */
export function createModels(): ModelEntry[] {
  const models: ModelEntry[] = []

  for (let i = 0; i < HEAD.length; i++) {
    const [date, name, resolution] = HEAD[i]!
    models.push({ index: pad(i + 1, 2), created: date, name, state: '', resolution })
  }

  // 52 more rows: 26 of family "fbo" (24fbo...) then 26 of "msp" (24msp...), all above the 12th.
  const REST = 52
  const HALF = REST / 2
  for (let i = 0; i < REST; i++) {
    const n = i + 1
    const family = i < HALF ? 'fbo' : 'msp'
    const ordinal = i < HALF ? n : n - HALF
    const name = `24${family}${pad(ordinal, 3)}-${pad(((ordinal * 3) % 90) + 1, 2)}`
    models.push({
      index: pad(HEAD.length + n, 2),
      created: created(n),
      name,
      state: '',
      resolution: '2.0',
    })
  }

  // Guard: the names the dialog shows are sorted and unique.
  const names = models.map((m) => m.name)
  if (!names.every((name, i) => i === 0 || names[i - 1]! < name)) {
    throw new Error('createModels: names are not strictly increasing')
  }

  void FAMILIES
  return models
}

/** The model the mock loads: its base is the name without the trailing `-NN` revision. */
export function createActiveModel(name: string): ActiveModel {
  return {
    name,
    base: name.replace(/-\d{2}$/, ''),
    resolution: '2.0',
    surface: 'Top',
  }
}
