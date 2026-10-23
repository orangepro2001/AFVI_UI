import { describe, expect, it } from 'vitest'
import {
  clampPoint,
  endLabel,
  formatLength,
  formatPoint,
  keyStep,
  moveEnd,
  moveLine,
  rulerLength,
} from './measure-geometry'

const bounds = { width: 5860, height: 4020 }

describe('measure geometry', () => {
  it('measures the reference ruler: (5086, 2032) to (8590, 3836) is 3941.12px', () => {
    const line = { from: { x: 5086, y: 2032 }, to: { x: 8590, y: 3836 } }
    expect(formatLength(rulerLength(line))).toBe('3941.12px')
    expect(formatPoint(line.from)).toBe('(5086, 2032)')
  })

  it('rounds a point to a pixel and keeps it in the picture', () => {
    expect(clampPoint({ x: 10.6, y: 3.2 }, bounds)).toEqual({ x: 11, y: 3 })
    expect(clampPoint({ x: -5, y: 9999 }, bounds)).toEqual({ x: 0, y: 4020 })
    expect(clampPoint({ x: 6000, y: -0.4 }, bounds)).toEqual({ x: 5860, y: 0 })
  })

  it('has no length for a point', () => {
    expect(formatLength(rulerLength({ from: { x: 4, y: 4 }, to: { x: 4, y: 4 } }))).toBe('0.00px')
  })

  it('moves a line as a whole and stops at the edge without bending it', () => {
    const line = { from: { x: 100, y: 200 }, to: { x: 300, y: 260 } }
    expect(moveLine(line, 50, -20, bounds)).toEqual({
      from: { x: 150, y: 180 },
      to: { x: 350, y: 240 },
    })
    // The left end stops at 0, and the right end goes no further than the left one does.
    expect(moveLine(line, -500, -500, bounds)).toEqual({
      from: { x: 0, y: 0 },
      to: { x: 200, y: 60 },
    })
    expect(moveLine(line, 99999, 99999, bounds)).toEqual({
      from: { x: 5660, y: 3960 },
      to: { x: 5860, y: 4020 },
    })
  })

  it('moves one end and leaves the other', () => {
    const line = { from: { x: 10, y: 10 }, to: { x: 20, y: 20 } }
    expect(moveEnd(line, 'to', { x: 30.4, y: -3 }, bounds)).toEqual({
      from: { x: 10, y: 10 },
      to: { x: 30, y: 0 },
    })
    expect(moveEnd(line, 'from', { x: 1, y: 2 }, bounds).from).toEqual({ x: 1, y: 2 })
  })

  it('writes the coordinates of an end on the side that faces away from the other end', () => {
    const upperLeft = { x: 5086, y: 2032 }
    const lowerRight = { x: 8590, y: 3836 }
    // The reference design: left and above for the first end, right and below for the second.
    expect(endLabel(upperLeft, lowerRight, true)).toEqual({ dx: -1, dy: -4, anchor: 'end' })
    expect(endLabel(lowerRight, upperLeft, false)).toEqual({ dx: 0, dy: 12.5, anchor: 'start' })
    // Drawn the other way round, each end still faces away from the other.
    expect(endLabel(lowerRight, upperLeft, true)).toEqual({ dx: 0, dy: 12.5, anchor: 'start' })
    expect(endLabel(upperLeft, lowerRight, false)).toEqual({ dx: -1, dy: -4, anchor: 'end' })
  })

  it('puts the two ends of a vertical or flat line on different sides', () => {
    const a = { x: 50, y: 10 }
    const b = { x: 50, y: 90 }
    expect(endLabel(a, b, true).anchor).toBe('end')
    expect(endLabel(b, a, false).anchor).toBe('start')
    // The first end goes above, the second below: a flat line is written the way a diagonal one is.
    const c = { x: 10, y: 40 }
    const d = { x: 90, y: 40 }
    expect(endLabel(c, d, true)).toEqual({ dx: -1, dy: -4, anchor: 'end' })
    expect(endLabel(d, c, false)).toEqual({ dx: 0, dy: 12.5, anchor: 'start' })
  })

  it('steps one pixel, ten with shift', () => {
    expect(keyStep(false)).toBe(1)
    expect(keyStep(true)).toBe(10)
  })
})
