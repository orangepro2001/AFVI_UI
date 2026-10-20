import { describe, expect, it } from 'vitest'
import type { CellGrid } from '@/api/types'
import { cellMapGeometry } from '@/components/workbench/cell-map'

const grid: CellGrid = {
  columns: 6,
  rows: 28,
  view: { column: 2, row: 7, columns: 3, rows: 3 },
}

describe('cellMapGeometry', () => {
  const g = cellMapGeometry(grid, 77, 264)

  it('draws one more line than there are cells', () => {
    expect(g.xs).toHaveLength(7)
    expect(g.ys).toHaveLength(29)
    expect(g.xs.at(-1)).toBeCloseTo(77)
    expect(g.ys.at(-1)).toBeCloseTo(264)
  })

  it('places the view rectangle', () => {
    expect(g.view.x).toBeCloseTo(25.67, 2)
    expect(g.view.w).toBeCloseTo(38.5, 5)
    expect(g.view.y).toBeCloseTo(66.0, 5)
    expect(g.view.h).toBeCloseTo(28.29, 2)
  })

  it('keeps the size it was given', () => {
    expect(g.width).toBe(77)
    expect(g.height).toBe(264)
  })
})
