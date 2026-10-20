import { describe, expect, it } from 'vitest'
import type { SpecNode } from '@/api/types'
import { layoutSpecTree } from '@/features/teach/spec-layout'

const tree: SpecNode[] = [
  {
    id: 'a',
    name: 'A',
    tone: 'root',
    children: [
      { id: 'a1', name: 'A1', tone: 'gold' },
      { id: 'a2', name: 'A2', tone: 'gold', checked: false },
    ],
  },
  {
    id: 'b',
    name: 'B',
    tone: 'green',
    checked: false,
    children: [{ id: 'b1', name: 'B1', tone: 'green', checked: false }],
  },
]

describe('layoutSpecTree', () => {
  const layout = layoutSpecTree(tree)

  it('makes one row per node, depth first', () => {
    expect(layout.rows).toHaveLength(5)
    expect(layout.rows.map((row) => row.node.id)).toEqual(['a', 'a1', 'a2', 'b', 'b1'])
  })

  it('places the rows on the pitch', () => {
    expect(layout.rows[0].y).toBe(6)
    expect(layout.rows[1].y).toBe(31.1)
    expect(layout.rows[2].y).toBe(56.2)
    expect(layout.rows[3].y).toBeCloseTo(81.3, 5)
    expect(layout.rows[4].y).toBeCloseTo(106.4, 5)
  })

  it('marks which rows have a checkbox', () => {
    expect(layout.rows.map((row) => row.box)).toEqual([false, false, true, true, true])
    expect(layout.rows.map((row) => row.level)).toEqual([0, 1, 1, 0, 1])
  })

  it('connects the group to its items', () => {
    const vertical = layout.lines[0]
    expect(vertical.x1).toBe(43)
    expect(vertical.x2).toBe(43)
    expect(vertical.y1).toBe(24)
    expect(vertical.y2).toBe(layout.rows[2].y + 9)

    const toFirst = layout.lines[1]
    expect(toFirst.y1).toBe(layout.rows[1].y + 9)
    expect(toFirst.y2).toBe(layout.rows[1].y + 9)
  })

  it('stops the horizontal line at the checkbox or at the chip', () => {
    expect(layout.lines[1].x2).toBe(74)
    expect(layout.lines[2].x2).toBe(57)
  })

  it('sizes the container for every row', () => {
    expect(layout.height).toBeCloseTo(6 + 25.1 * 5 + 6, 5)
  })
})
