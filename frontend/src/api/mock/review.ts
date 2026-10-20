import type { DefectRow } from '../types'

/** The REVIEW table of the reference design is empty: no inspection has run on the strip yet. */
export function createDefects(): DefectRow[] {
  return []
}
