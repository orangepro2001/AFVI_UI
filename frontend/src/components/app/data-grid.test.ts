import { describe, expect, it } from 'vitest'
import { bodyRowCount, groupHeaders } from './data-grid'

describe('groupHeaders', () => {
  it('is null when no column has a group', () => {
    expect(groupHeaders([{ key: 'a' }, { key: 'b' }])).toBeNull()
  })

  it('spans consecutive columns of the same group', () => {
    expect(
      groupHeaders([
        { key: 'a', group: 'Light1', groupClass: 'x' },
        { key: 'b', group: 'Light1' },
        { key: 'c', group: 'Light2' },
        { key: 'd', group: 'Light2' },
        { key: 'e', group: 'Light2' },
      ]),
    ).toEqual([
      { label: 'Light1', span: 2, class: 'x' },
      { label: 'Light2', span: 3, class: undefined },
    ])
  })

  it('does not merge columns without a group', () => {
    expect(groupHeaders([{ key: 'a' }, { key: 'b' }, { key: 'c', group: 'G' }])).toEqual([
      { label: '', span: 1, class: undefined },
      { label: '', span: 1, class: undefined },
      { label: 'G', span: 1, class: undefined },
    ])
  })
})

describe('bodyRowCount', () => {
  const base = { rows: 0, minRows: 0, fillHeight: 0, headHeight: 24, rowHeight: 20 }

  it('is the data when there is more than the minimum', () => {
    expect(bodyRowCount({ ...base, rows: 8, minRows: 5 })).toBe(8)
  })

  it('pads to the minimum', () => {
    expect(bodyRowCount({ ...base, rows: 1, minRows: 5 })).toBe(5)
  })

  it('pads to fill the height (header excluded, partial rows dropped)', () => {
    expect(bodyRowCount({ ...base, rows: 1, fillHeight: 24 + 20 * 7 + 13 })).toBe(7)
  })

  it('never drops data, whatever the height', () => {
    expect(bodyRowCount({ ...base, rows: 30, fillHeight: 100 })).toBe(30)
  })
})
