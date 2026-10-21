import { describe, expect, it } from 'vitest'
import { createConfig } from '@/api/mock/config'
import { buildConfigRows, type ConfigView } from './config-rows'

const view = (patch: Partial<ConfigView> = {}): ConfigView => ({
  query: '',
  collapsed: new Set(),
  sorted: false,
  ...patch,
})

const labels = (rows: ReturnType<typeof buildConfigRows>) =>
  rows.map((row) => (row.type === 'group' ? `# ${row.title}` : row.entry.label))

describe('buildConfigRows', () => {
  it('lists every heading with its rows: 36 lines for the design', () => {
    const rows = buildConfigRows(createConfig(), view())
    expect(rows).toHaveLength(36)
    expect(labels(rows).slice(0, 5)).toEqual([
      '# Language',
      'Code',
      '# Export',
      'IP Address',
      'Directory',
    ])
  })

  it('hides the rows of a folded group but keeps its heading', () => {
    const rows = buildConfigRows(createConfig(), view({ collapsed: new Set(['misc']) }))
    expect(rows).toHaveLength(36 - 14)
    expect(rows.at(-1)).toMatchObject({ type: 'group', id: 'misc', collapsed: true })
  })

  it('filters by name or value, ignoring case, and drops groups without a hit', () => {
    const rows = buildConfigRows(createConfig(), view({ query: ' ip addr ' }))
    expect(labels(rows)).toEqual([
      '# Export',
      'IP Address',
      '# Backup',
      'IP Address',
      '# 3DResult',
      'IP Address',
    ])

    expect(labels(buildConfigRows(createConfig(), view({ query: 'fftw' })))).toEqual([
      '# Miscellaneous',
      'Align Method',
    ])
  })

  it('shows all rows of a group whose heading matches, and ignores folding while searching', () => {
    const rows = buildConfigRows(
      createConfig(),
      view({ query: 'backup', collapsed: new Set(['backup']) }),
    )
    expect(labels(rows)).toEqual(['# Backup', 'IP Address', 'Directory'])
  })

  it('returns nothing when nothing matches', () => {
    expect(buildConfigRows(createConfig(), view({ query: 'zzz' }))).toEqual([])
  })

  it('sorts without headings in the A-Z view', () => {
    const rows = buildConfigRows(createConfig(), view({ sorted: true }))
    expect(rows).toHaveLength(29)
    expect(rows.every((row) => row.type === 'entry')).toBe(true)
    const names = labels(rows)
    expect(names.slice(0, 3)).toEqual(['3D Enable', 'Align Method', 'Align Minimum Score'])
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  })
})
