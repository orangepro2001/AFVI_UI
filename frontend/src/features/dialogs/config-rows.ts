import type { ConfigEntry, ConfigGroup } from '@/api/types'

/** One line of the property list: a heading or a value row. */
export type ConfigRow =
  | { type: 'group'; id: string; title: string; collapsed: boolean }
  | { type: 'entry'; entry: ConfigEntry }

export interface ConfigView {
  /** The search field: rows (and headings) that contain it, ignoring case. */
  query: string
  /** The ids of the folded groups. */
  collapsed: ReadonlySet<string>
  /** true: no headings, every row sorted by its name (the A-Z button). */
  sorted: boolean
}

function matches(entry: ConfigEntry, query: string): boolean {
  if (query === '') return true
  const value = typeof entry.value === 'string' ? entry.value : ''
  return entry.label.toLowerCase().includes(query) || value.toLowerCase().includes(query)
}

/**
 * The lines the panel lists, top to bottom. A search shows every group that has a hit (with its
 * hits only, or all its rows when the heading itself matches) and ignores folding.
 */
export function buildConfigRows(groups: ConfigGroup[], view: ConfigView): ConfigRow[] {
  const query = view.query.trim().toLowerCase()

  if (view.sorted) {
    return groups
      .flatMap((group) => group.entries)
      .filter((entry) => matches(entry, query))
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((entry) => ({ type: 'entry', entry }))
  }

  const rows: ConfigRow[] = []
  for (const group of groups) {
    const titleHit = query !== '' && group.title.toLowerCase().includes(query)
    const entries = titleHit ? group.entries : group.entries.filter((e) => matches(e, query))
    if (query !== '' && entries.length === 0) continue

    const collapsed = query === '' && view.collapsed.has(group.id)
    rows.push({ type: 'group', id: group.id, title: group.title, collapsed })
    if (!collapsed) rows.push(...entries.map((entry): ConfigRow => ({ type: 'entry', entry })))
  }
  return rows
}
