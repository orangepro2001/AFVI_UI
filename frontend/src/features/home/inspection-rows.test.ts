import { describe, expect, it } from 'vitest'
import type { InspectionArea } from '@/api/types'
import { channelKey, inspectionColumns, inspectionRows, nodeKey } from './inspection-rows'

const slots = (...kinds: ('bright' | 'dark' | null)[]) => kinds

const area: InspectionArea = {
  page: 1,
  pageCount: 1,
  lights: [
    { id: 'light1', title: 'Light1 (DMG)', nodes: [] },
    {
      id: 'light2',
      title: 'Light2',
      nodes: [
        {
          name: 'OSP',
          channels: {
            red: slots('bright'),
            green: slots('dark'),
            blue: slots(null),
          },
        },
      ],
    },
    {
      id: 'light3',
      title: 'Light3',
      nodes: [
        { name: 'A', channels: { red: [], green: [], blue: [] } },
        { name: 'B', channels: { red: [], green: [], blue: [] } },
      ],
    },
  ],
}

describe('inspectionColumns', () => {
  const columns = inspectionColumns(area)

  it('has Node, Red, Green, Blue for every light', () => {
    expect(columns.map((c) => c.key)).toEqual([
      'light1.node',
      'light1.red',
      'light1.green',
      'light1.blue',
      'light2.node',
      'light2.red',
      'light2.green',
      'light2.blue',
      'light3.node',
      'light3.red',
      'light3.green',
      'light3.blue',
    ])
  })

  it('groups the four columns of a light under its title', () => {
    expect(columns.slice(0, 4).every((c) => c.group === 'Light1 (DMG)')).toBe(true)
    expect(columns.slice(4, 8).every((c) => c.group === 'Light2')).toBe(true)
  })

  it('marks the DMG light and colours the channel headers', () => {
    expect(columns[0]!.groupClass).toBe('text-group-dmg')
    expect(columns[4]!.groupClass).toBeUndefined()
    expect(columns[1]!.headClass).toBe('text-light-red')
  })
})

describe('inspectionRows', () => {
  it('has as many rows as the light with the most nodes', () => {
    expect(inspectionRows(area)).toHaveLength(2)
  })

  it('puts node n of every light in row n, leaving gaps where a light has none', () => {
    const [first, second] = inspectionRows(area)
    expect(first![nodeKey('light1')]).toBeUndefined()
    expect(first![nodeKey('light2')]).toBe('OSP')
    expect(first![channelKey('light2', 'green')]).toEqual(['dark'])
    expect(first![nodeKey('light3')]).toBe('A')
    expect(second![nodeKey('light2')]).toBeUndefined()
    expect(second![nodeKey('light3')]).toBe('B')
  })

  it('is empty for an area without nodes', () => {
    expect(inspectionRows({ ...area, lights: [{ id: 'l', title: 'L', nodes: [] }] })).toEqual([])
  })
})
