import { describe, expect, it, vi } from 'vitest'
import type { GrayPixels } from '@/lib/gray'
import { createMockMeasure, grayStats } from './measure'

/** An 8 x 4 picture: columns 0..3 are 10, columns 4..7 are 200. */
function halves(): GrayPixels {
  const data = new Uint8Array(8 * 4)
  for (let y = 0; y < 4; y++) for (let x = 0; x < 8; x++) data[y * 8 + x] = x < 4 ? 10 : 200
  return { data, width: 8, height: 4 }
}

describe('grayStats', () => {
  it('measures a box like the Go side does', () => {
    const whole = grayStats(halves(), { x: 0, y: 0, w: 8, h: 4 })
    expect(whole).toEqual({
      box: { x: 0, y: 0, w: 8, h: 4 },
      pixels: 32,
      mean: 105,
      std: 95,
      min: 10,
      max: 200,
      saturatedHigh: 0,
      saturatedLow: 0,
    })
  })

  it('rounds the box outwards, clamps it and keeps one pixel at least', () => {
    expect(grayStats(halves(), { x: 1.4, y: 0.5, w: 2.2, h: 1.1 }).box).toEqual({
      x: 1,
      y: 0,
      w: 3,
      h: 2,
    })
    expect(grayStats(halves(), { x: -10, y: -10, w: 14, h: 12 }).box).toEqual({
      x: 0,
      y: 0,
      w: 4,
      h: 2,
    })
    expect(grayStats(halves(), { x: 99, y: 99, w: 5, h: 5 }).box).toEqual({
      x: 7,
      y: 3,
      w: 1,
      h: 1,
    })
    expect(grayStats(halves(), { x: 3, y: 1, w: 0, h: 0 }).pixels).toBe(1)
  })

  it('counts the saturated pixels', () => {
    const stats = grayStats(
      { data: new Uint8Array([0, 0, 255, 128, 255, 255]), width: 3, height: 2 },
      { x: 0, y: 0, w: 3, h: 2 },
    )
    expect(stats.saturatedLow).toBe(2)
    expect(stats.saturatedHigh).toBe(3)
    expect(stats.std).toBeGreaterThan(0)
  })

  it('has no spread in a flat area', () => {
    const flat = { data: new Uint8Array(100).fill(255), width: 10, height: 10 }
    expect(grayStats(flat, { x: 0, y: 0, w: 10, h: 10 }).std).toBe(0)
  })
})

describe('createMockMeasure', () => {
  it('shows the picture of the design for every light, at the size of the strip', async () => {
    const mock = createMockMeasure(async () => null)
    const view = await mock.getMedianView(3)
    expect(view).toMatchObject({
      light: 3,
      state: 'ok',
      size: { width: 16384, height: 12080 },
      lights: [1, 2, 3],
    })
    expect(view.image.width).toBe(726)
  })

  it('measures the pixels of that picture, scaling the box from the strip down to it', async () => {
    const load = vi.fn(async () => halves())
    const mock = createMockMeasure(load)
    // The sample is 8 x 4 for a 16384 x 12080 strip: the left half of the strip is 10, the right 200.
    const left = await mock.measureGv(1, { x: 0, y: 0, w: 8192, h: 12080 })
    expect(left.mean).toBe(10)
    expect(left.box).toEqual({ x: 0, y: 0, w: 8192, h: 12080 })
    const right = await mock.measureGv(2, { x: 8192, y: 0, w: 8192, h: 6040 })
    expect(right.mean).toBe(200)
    // The picture is loaded once.
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('fails where the picture cannot be read, as a backend without one would', async () => {
    const mock = createMockMeasure(async () => null)
    await expect(mock.measureGv(1, { x: 0, y: 0, w: 10, h: 10 })).rejects.toThrow(
      'The mock picture cannot be read here',
    )
  })
})
