/** What the Median dialog hands over on SAVE. */
export interface MedianSelection {
  /** The ids (1..4) of the checked lights. */
  lights: number[]
  /** The selected cells of the unit map, ascending, numbered row by row from 0. */
  cells: number[]
}

/** `value` as a count of cells: digits only, at least 1, at most `total`; null when it is not a number. */
export function parseRandomCount(value: string, total: number): number | null {
  if (!/^\d+$/.test(value.trim())) return null
  return Math.min(Math.max(Number(value), 1), total)
}

/** `count` distinct cells out of `total`, ascending (a partial Fisher-Yates; `random` is [0, 1)). */
export function pickRandomCells(
  total: number,
  count: number,
  random: () => number = Math.random,
): number[] {
  const cells = Array.from({ length: total }, (_, i) => i)
  const wanted = Math.min(Math.max(count, 0), total)
  for (let i = 0; i < wanted; i++) {
    const j = i + Math.floor(random() * (total - i))
    ;[cells[i], cells[j]] = [cells[j]!, cells[i]!]
  }
  return cells.slice(0, wanted).sort((a, b) => a - b)
}
