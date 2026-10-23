import { readGray } from '@/lib/gray'
import type { GrayPixels } from '@/lib/gray'
import type { ApiClient } from '../client'
import type { GvBox, GvStats } from '../types'
import { createWorkbenchSnapshot } from './workbench'

/** `[pos, pos + size)` rounded outwards to whole pixels inside `[0, limit)`, at least one pixel. */
function span(pos: number, size: number, limit: number): [number, number] {
  const from = Math.floor(Math.min(Math.max(pos, 0), limit - 1))
  const to = Math.ceil(Math.min(Math.max(pos + size, from + 1), limit))
  return [from, to]
}

/**
 * The statistics of `box` in `pixels`, the way the Go side measures the Median TIFF (population
 * standard deviation, box rounded outwards and clamped).
 */
export function grayStats(pixels: GrayPixels, box: GvBox): GvStats {
  const [x0, x1] = span(box.x, box.w, pixels.width)
  const [y0, y1] = span(box.y, box.h, pixels.height)
  let sum = 0
  let sumSq = 0
  let min = 255
  let max = 0
  let high = 0
  let low = 0
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const v = pixels.data[y * pixels.width + x]
      sum += v
      sumSq += v * v
      if (v < min) min = v
      if (v > max) max = v
      if (v === 255) high++
      if (v === 0) low++
    }
  }
  const count = (x1 - x0) * (y1 - y0)
  const mean = sum / count
  return {
    box: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 },
    pixels: count,
    mean,
    std: Math.sqrt(Math.max(0, sumSq / count - mean * mean)),
    min,
    max,
    saturatedHigh: high,
    saturatedLow: low,
  }
}

/**
 * The Median picture calls of the browser: the picture of the reference design stands in for the
 * Median TIFF of every light, at the size the design's read-out bar gives for the strip. Measuring
 * reads that picture's pixels, so the numbers follow what is on screen; where a canvas is missing
 * (tests) it fails, as a backend without a picture would.
 */
export function createMockMeasure(
  load: (url: string) => Promise<GrayPixels | null> = readGray,
): Pick<ApiClient, 'getMedianView' | 'measureGv'> {
  const base = createWorkbenchSnapshot()
  const size = { width: base.readout.wh.w, height: base.readout.wh.h }
  let pixels: Promise<GrayPixels | null> | undefined

  return {
    async getMedianView(light) {
      return {
        light,
        image: { ...base.image },
        size: { ...size },
        state: 'ok',
        file: 'strip-image.png',
        lights: [1, 2, 3],
      }
    },

    async measureGv(_light, box) {
      pixels ??= load(base.image.url)
      const gray = await pixels
      if (!gray) throw new Error('The mock picture cannot be read here')
      // The box is in pixels of the (large) strip; the sample picture is smaller.
      const kx = gray.width / size.width
      const ky = gray.height / size.height
      const sampled = grayStats(gray, {
        x: box.x * kx,
        y: box.y * ky,
        w: box.w * kx,
        h: box.h * ky,
      })
      return {
        ...sampled,
        box: {
          x: Math.round(sampled.box.x / kx),
          y: Math.round(sampled.box.y / ky),
          w: Math.round(sampled.box.w / kx),
          h: Math.round(sampled.box.h / ky),
        },
      }
    },
  }
}
