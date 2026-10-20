import type { GridColumn } from './types'

export interface GroupHeader {
  label: string
  span: number
  class?: string
}

/** Header cells above consecutive columns of the same group; a column without a group is a gap. */
export function groupHeaders(columns: GridColumn[]): GroupHeader[] | null {
  if (!columns.some((c) => c.group)) return null
  const headers: GroupHeader[] = []
  for (const column of columns) {
    const label = column.group ?? ''
    const last = headers[headers.length - 1]
    if (last && last.label === label && label !== '') last.span += 1
    else headers.push({ label, span: 1, class: column.groupClass })
  }
  return headers
}

/** How many body rows are drawn: the data, or enough to fill `height` (the rest are blank). */
export function bodyRowCount(opts: {
  rows: number
  minRows: number
  fillHeight: number
  headHeight: number
  rowHeight: number
}): number {
  const fit =
    opts.fillHeight > 0 ? Math.floor((opts.fillHeight - opts.headHeight) / opts.rowHeight) : 0
  return Math.max(opts.rows, opts.minRows, fit)
}
