import type { AlignRoi } from '@/api/types'

/** A rectangle in picture pixels. */
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface Point {
  x: number
  y: number
}

export interface Bounds {
  width: number
  height: number
}

/** The eight grips of a selected ROI: where its edge sits on each axis (0 start, 0.5 middle, 1 end). */
export type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export const HANDLES: readonly { handle: Handle; fx: 0 | 0.5 | 1; fy: 0 | 0.5 | 1 }[] = [
  { handle: 'nw', fx: 0, fy: 0 },
  { handle: 'n', fx: 0.5, fy: 0 },
  { handle: 'ne', fx: 1, fy: 0 },
  { handle: 'e', fx: 1, fy: 0.5 },
  { handle: 'se', fx: 1, fy: 1 },
  { handle: 's', fx: 0.5, fy: 1 },
  { handle: 'sw', fx: 0, fy: 1 },
  { handle: 'w', fx: 0, fy: 0.5 },
]

/** The smallest ROI, in picture pixels (the Go side refuses anything smaller). */
export const MIN_ROI = 8

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high)

/** The rectangle spanned by two corners, kept inside the picture. */
export function rectFromDrag(from: Point, to: Point, bounds: Bounds): Rect {
  const left = clamp(Math.min(from.x, to.x), 0, bounds.width)
  const right = clamp(Math.max(from.x, to.x), 0, bounds.width)
  const top = clamp(Math.min(from.y, to.y), 0, bounds.height)
  const bottom = clamp(Math.max(from.y, to.y), 0, bounds.height)
  return {
    x: Math.round(left),
    y: Math.round(top),
    w: Math.round(right) - Math.round(left),
    h: Math.round(bottom) - Math.round(top),
  }
}

/** The rectangle moved by (dx, dy); it stops at the picture's edge and keeps its size. */
export function moveRect(rect: Rect, dx: number, dy: number, bounds: Bounds): Rect {
  return {
    x: Math.round(clamp(rect.x + dx, 0, Math.max(0, bounds.width - rect.w))),
    y: Math.round(clamp(rect.y + dy, 0, Math.max(0, bounds.height - rect.h))),
    w: rect.w,
    h: rect.h,
  }
}

/**
 * The rectangle with the grip `handle` moved by (dx, dy). The edge stops at the picture's edge,
 * and the rectangle never gets smaller than `min` (the opposite edge stays where it is).
 */
export function resizeRect(
  rect: Rect,
  handle: Handle,
  dx: number,
  dy: number,
  bounds: Bounds,
  min: number = MIN_ROI,
): Rect {
  let left = rect.x
  let top = rect.y
  let right = rect.x + rect.w
  let bottom = rect.y + rect.h
  if (handle.includes('w')) left = clamp(left + dx, 0, right - min)
  if (handle.includes('e')) right = clamp(right + dx, left + min, bounds.width)
  if (handle.includes('n')) top = clamp(top + dy, 0, bottom - min)
  if (handle.includes('s')) bottom = clamp(bottom + dy, top + min, bounds.height)
  return {
    x: Math.round(left),
    y: Math.round(top),
    w: Math.round(right) - Math.round(left),
    h: Math.round(bottom) - Math.round(top),
  }
}

/** The first "R<n>" that no ROI of the list uses. */
export function nextRoiId(rois: readonly AlignRoi[]): string {
  const used = new Set(rois.map((roi) => roi.id))
  for (let n = 1; ; n++) if (!used.has(`R${n}`)) return `R${n}`
}
