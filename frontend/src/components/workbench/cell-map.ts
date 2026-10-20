import type { CellGrid } from '@/api/types'

export interface CellMapGeometry {
  width: number
  height: number
  /** x of the vertical lines / y of the horizontal ones. */
  xs: number[]
  ys: number[]
  /** The part the viewer shows, in px. */
  view: { x: number; y: number; w: number; h: number }
}

/** Where the grid lines and the viewer rectangle go inside a cell map of the given size. */
export function cellMapGeometry(grid: CellGrid, width: number, height: number): CellMapGeometry {
  const cellW = width / grid.columns
  const cellH = height / grid.rows
  const xs = Array.from({ length: grid.columns + 1 }, (_, i) => i * cellW)
  const ys = Array.from({ length: grid.rows + 1 }, (_, i) => i * cellH)
  const view = {
    x: grid.view.column * cellW,
    y: grid.view.row * cellH,
    w: grid.view.columns * cellW,
    h: grid.view.rows * cellH,
  }
  return { width, height, xs, ys, view }
}
