import { describe, expect, it } from 'vitest'
import { MIN_ROI, moveRect, nextRoiId, rectFromDrag, resizeRect } from './roi-geometry'

const bounds = { width: 1000, height: 800 }

describe('rectFromDrag', () => {
  it('orders the corners', () => {
    expect(rectFromDrag({ x: 300, y: 200 }, { x: 100, y: 50 }, bounds)).toEqual({
      x: 100,
      y: 50,
      w: 200,
      h: 150,
    })
  })

  it('keeps the rectangle inside the picture', () => {
    expect(rectFromDrag({ x: 900, y: 700 }, { x: 1200, y: 900 }, bounds)).toEqual({
      x: 900,
      y: 700,
      w: 100,
      h: 100,
    })
    expect(rectFromDrag({ x: -50, y: -20 }, { x: 40, y: 30 }, bounds)).toEqual({
      x: 0,
      y: 0,
      w: 40,
      h: 30,
    })
  })
})

describe('moveRect', () => {
  const rect = { x: 100, y: 100, w: 200, h: 100 }

  it('shifts the rectangle', () => {
    expect(moveRect(rect, 30, -20, bounds)).toEqual({ x: 130, y: 80, w: 200, h: 100 })
  })

  it('stops at every edge without changing the size', () => {
    expect(moveRect(rect, -500, -500, bounds)).toEqual({ x: 0, y: 0, w: 200, h: 100 })
    expect(moveRect(rect, 5000, 5000, bounds)).toEqual({ x: 800, y: 700, w: 200, h: 100 })
  })
})

describe('resizeRect', () => {
  const rect = { x: 100, y: 100, w: 200, h: 100 }

  it('moves one edge for a side grip', () => {
    expect(resizeRect(rect, 'e', 50, 999, bounds)).toEqual({ x: 100, y: 100, w: 250, h: 100 })
    expect(resizeRect(rect, 'n', 999, -40, bounds)).toEqual({ x: 100, y: 60, w: 200, h: 140 })
  })

  it('moves two edges for a corner grip', () => {
    expect(resizeRect(rect, 'nw', -20, -30, bounds)).toEqual({ x: 80, y: 70, w: 220, h: 130 })
    expect(resizeRect(rect, 'se', 10, 10, bounds)).toEqual({ x: 100, y: 100, w: 210, h: 110 })
  })

  it('never goes below the minimum and keeps the opposite edge', () => {
    expect(resizeRect(rect, 'e', -900, 0, bounds)).toEqual({ x: 100, y: 100, w: MIN_ROI, h: 100 })
    expect(resizeRect(rect, 'w', 900, 0, bounds)).toEqual({
      x: 300 - MIN_ROI,
      y: 100,
      w: MIN_ROI,
      h: 100,
    })
  })

  it('stops at the picture edge', () => {
    expect(resizeRect(rect, 'se', 5000, 5000, bounds)).toEqual({ x: 100, y: 100, w: 900, h: 700 })
    expect(resizeRect(rect, 'nw', -5000, -5000, bounds)).toEqual({ x: 0, y: 0, w: 300, h: 200 })
  })
})

describe('nextRoiId', () => {
  it('takes the first free number', () => {
    expect(nextRoiId([])).toBe('R1')
    const rois = ['R1', 'P4', 'R3'].map((id) => ({ id, x: 0, y: 0, w: 10, h: 10 }))
    expect(nextRoiId(rois)).toBe('R2')
  })
})
