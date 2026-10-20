import { describe, expect, it } from 'vitest'
import { ringSegmentPath, seriesPoints, toArea, toPolyline } from './geometry'

describe('seriesPoints', () => {
  it('spreads x over 0..100 and flips y (top is max)', () => {
    expect(seriesPoints([0, 50, 100], 100)).toEqual([
      [0, 100],
      [50, 50],
      [100, 0],
    ])
  })

  it('clamps values outside 0..max', () => {
    expect(seriesPoints([-5, 500], 100)).toEqual([
      [0, 100],
      [100, 0],
    ])
  })

  it('is empty without data or scale', () => {
    expect(seriesPoints([], 100)).toEqual([])
    expect(seriesPoints([1, 2], 0)).toEqual([])
  })

  it('puts a single value at the left edge', () => {
    expect(seriesPoints([100], 100)).toEqual([[0, 0]])
  })

  it('fills a box of the given size', () => {
    expect(seriesPoints([0, 50, 100], 100, 180, 64)).toEqual([
      [0, 64],
      [90, 32],
      [180, 0],
    ])
  })
})

describe('polyline and area', () => {
  const points: [number, number][] = [
    [0, 80],
    [100, 20],
  ]

  it('writes SVG points', () => {
    expect(toPolyline(points)).toBe('0,80 100,20')
  })

  it('closes the area down to the baseline', () => {
    expect(toArea(points)).toBe('0,100 0,80 100,20 100,100')
    expect(toArea([])).toBe('')
  })

  it('closes the area down to the given baseline', () => {
    expect(toArea(points, 64)).toBe('0,64 0,80 100,20 100,64')
  })
})

describe('ringSegmentPath', () => {
  it('draws the whole upper half ring from the left end to the right end', () => {
    expect(ringSegmentPath(60, 56, 50, 34, 180, 0)).toBe(
      'M 10 56 A 50 50 0 0 1 110 56 L 94 56 A 34 34 0 0 0 26 56 Z',
    )
  })

  it('ends a quarter turn up at 90 degrees', () => {
    expect(ringSegmentPath(60, 56, 50, 34, 180, 90)).toBe(
      'M 10 56 A 50 50 0 0 1 60 6 L 60 22 A 34 34 0 0 0 26 56 Z',
    )
  })
})
