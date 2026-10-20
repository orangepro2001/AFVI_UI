import type { SpecNode } from '@/api/types'

export interface SpecRow {
  node: SpecNode
  /** 0: a root or group, 1: an item under it. */
  level: 0 | 1
  /** Top of the chip. */
  y: number
  /** Whether the row has a checkbox. */
  box: boolean
  /** The row of the parent, for the connector. */
  parent?: number
}

export interface SpecLayout {
  rows: SpecRow[]
  /** Connector lines: a vertical at x = 43 from a parent's chip bottom to its last item's middle, and a horizontal to every item. */
  lines: { x1: number; y1: number; x2: number; y2: number }[]
  height: number
}

export const ROW_PITCH = 25.1
export const FIRST_ROW_TOP = 6
export const CHIP_HEIGHT = 18
/** Where the vertical connector of a group runs. */
export const LINE_X = 43

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

/** The top of the i-th row. */
export function rowTop(index: number): number {
  return round1(FIRST_ROW_TOP + ROW_PITCH * index)
}

/**
 * Flattens the tree depth first: every root/group, immediately followed by its items. The layout
 * is independent of the theme; the component adds its own left offsets.
 */
export function layoutSpecTree(nodes: SpecNode[]): SpecLayout {
  const rows: SpecRow[] = []
  const lines: SpecLayout['lines'] = []

  /** Appends a node and its children; returns the index of the node's own row. */
  function walk(node: SpecNode, level: 0 | 1, parent?: number): number {
    const index = rows.length
    const y = rowTop(index)
    rows.push({ node, level, y, box: node.checked !== undefined, parent })

    const children = node.children ?? []
    if (children.length > 0) {
      const childIndexes = children.map((child) => walk(child, 1, index))
      const lastChild = rows[childIndexes[childIndexes.length - 1]]
      lines.push({
        x1: LINE_X,
        y1: y + CHIP_HEIGHT,
        x2: LINE_X,
        y2: round1(lastChild.y + CHIP_HEIGHT / 2),
      })
      for (const childIndex of childIndexes) {
        const child = rows[childIndex]
        lines.push({
          x1: LINE_X,
          y1: round1(child.y + CHIP_HEIGHT / 2),
          x2: child.box ? 57 : 74,
          y2: round1(child.y + CHIP_HEIGHT / 2),
        })
      }
    }

    return index
  }

  for (const node of nodes) walk(node, 0)

  return {
    rows,
    lines,
    height: round1(FIRST_ROW_TOP + ROW_PITCH * rows.length + 6),
  }
}
