import { describe, expect, it } from 'vitest'
import { parseRandomCount, pickRandomCells } from './median'

describe('parseRandomCount', () => {
  it('reads digits and keeps the result inside 1..total', () => {
    expect(parseRandomCount('55', 192)).toBe(55)
    expect(parseRandomCount(' 7 ', 192)).toBe(7)
    expect(parseRandomCount('0', 192)).toBe(1)
    expect(parseRandomCount('999', 192)).toBe(192)
  })

  it('refuses anything that is not a whole number', () => {
    expect(parseRandomCount('', 192)).toBeNull()
    expect(parseRandomCount('5.5', 192)).toBeNull()
    expect(parseRandomCount('-3', 192)).toBeNull()
    expect(parseRandomCount('abc', 192)).toBeNull()
  })
})

describe('pickRandomCells', () => {
  it('returns the requested number of distinct, ascending cells', () => {
    const cells = pickRandomCells(192, 55)
    expect(cells).toHaveLength(55)
    expect(new Set(cells).size).toBe(55)
    expect([...cells].sort((a, b) => a - b)).toEqual(cells)
    expect(cells.every((cell) => cell >= 0 && cell < 192)).toBe(true)
  })

  it('follows the random source', () => {
    expect(pickRandomCells(10, 3, () => 0)).toEqual([0, 1, 2])
    expect(pickRandomCells(10, 3, () => 0.999)).toEqual([0, 1, 9])
  })

  it('takes everything when asked for more than there is, and nothing for zero', () => {
    expect(pickRandomCells(4, 9)).toEqual([0, 1, 2, 3])
    expect(pickRandomCells(4, 0)).toEqual([])
  })
})
