import { describe, expect, it } from 'vitest'
import { createConfig } from './config'

describe('createConfig', () => {
  it('lists the seven groups of the design in order', () => {
    expect(createConfig().map((group) => group.title)).toEqual([
      'Language',
      'Export',
      'Backup',
      '3DResult',
      'Strip saving',
      'Data Format',
      'Miscellaneous',
    ])
  })

  it('has 29 entries (36 rows with the headings), with unique keys', () => {
    const entries = createConfig().flatMap((group) => group.entries)
    expect(entries).toHaveLength(29)
    expect(new Set(entries.map((entry) => entry.key)).size).toBe(entries.length)
  })

  it('keeps the values of the design', () => {
    const entries = new Map(
      createConfig()
        .flatMap((group) => group.entries)
        .map((entry) => [entry.key, entry]),
    )
    expect(entries.get('export.directory')?.value).toBe('Pixel\\ResultData\\Data')
    expect(entries.get('misc.alignScale')?.value).toBe('1.0')
    expect(entries.get('result3d.enable')).toMatchObject({ kind: 'toggle', value: false })
  })

  it('lets every choice row offer the value it shows', () => {
    for (const entry of createConfig().flatMap((group) => group.entries)) {
      if (entry.kind === 'choice') expect(entry.options).toContain(entry.value)
    }
  })

  it('hands out a fresh copy each time', () => {
    const first = createConfig()
    first[0]!.entries[0]!.value = 'Korean'
    expect(createConfig()[0]!.entries[0]!.value).toBe('English')
  })
})
