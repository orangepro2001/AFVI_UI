export interface GridColumn {
  /** Key of the row field the cell shows (and the name of its `cell-<key>` slot). */
  key: string
  label?: string
  /** CSS width, e.g. "80px". Columns without one share the rest. */
  width?: string
  align?: 'left' | 'center' | 'right'
  /** Columns with the same consecutive group get one spanning header above them. */
  group?: string
  /** Class of the group header; read from the first column of the group. */
  groupClass?: string
  headClass?: string
  cellClass?: string
}

export interface LegendEntry {
  key: string
  label: string
  /** Background class of the swatch (a colour token). */
  swatch: string
  /** An outline instead of a fill, for "none". */
  hollow?: boolean
}

export interface StatItem {
  label: string
  value: string
}
