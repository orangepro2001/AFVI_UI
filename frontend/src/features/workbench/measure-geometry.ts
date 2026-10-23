import type { Bounds, Point } from '@/features/teach/roi-geometry'

/** The line of the ruler, both ends in pixels of the Median picture (whole numbers). */
export interface RulerLine {
  from: Point
  to: Point
}

export type RulerEnd = 'from' | 'to'

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high)

/** The point rounded to a whole pixel and kept inside the picture. */
export function clampPoint(point: Point, bounds: Bounds): Point {
  return {
    x: Math.round(clamp(point.x, 0, bounds.width)),
    y: Math.round(clamp(point.y, 0, bounds.height)),
  }
}

/** The distance between the two ends, in pixels of the picture. */
export function rulerLength(line: RulerLine): number {
  return Math.hypot(line.to.x - line.from.x, line.to.y - line.from.y)
}

/** "3941.12px", the way the ruler labels its middle. */
export function formatLength(length: number): string {
  return `${length.toFixed(2)}px`
}

/** "(5086, 2032)", the way the ruler labels an end. */
export function formatPoint(point: Point): string {
  return `(${point.x}, ${point.y})`
}

/** The line moved by (dx, dy); it keeps its shape and stops where one end reaches the picture's edge. */
export function moveLine(line: RulerLine, dx: number, dy: number, bounds: Bounds): RulerLine {
  const left = Math.min(line.from.x, line.to.x)
  const right = Math.max(line.from.x, line.to.x)
  const top = Math.min(line.from.y, line.to.y)
  const bottom = Math.max(line.from.y, line.to.y)
  const mx = Math.round(clamp(dx, -left, bounds.width - right))
  const my = Math.round(clamp(dy, -top, bounds.height - bottom))
  return {
    from: { x: line.from.x + mx, y: line.from.y + my },
    to: { x: line.to.x + mx, y: line.to.y + my },
  }
}

/** The line with one end moved to `point` (rounded, kept inside the picture). */
export function moveEnd(line: RulerLine, end: RulerEnd, point: Point, bounds: Bounds): RulerLine {
  return { ...line, [end]: clampPoint(point, bounds) }
}

/** Where the text of an end sits, relative to the end, in picture pixels of the display. */
export interface EndLabel {
  dx: number
  dy: number
  anchor: 'start' | 'end'
}

/**
 * The coordinates of an end are written on the side of the end that faces away from the other end:
 * left and above for the upper-left end, right and below for the lower-right one, as in the
 * reference design. Two ends in a column get the left and the right side.
 */
export function endLabel(point: Point, other: Point, isFrom: boolean): EndLabel {
  const left = point.x === other.x ? isFrom : point.x < other.x
  const above = point.y === other.y ? isFrom : point.y < other.y
  return {
    dx: left ? -1 : 0,
    dy: above ? -4 : 12.5,
    anchor: left ? 'end' : 'start',
  }
}

/** The pixel of an arrow key: one picture pixel, ten with Shift. */
export function keyStep(shift: boolean): number {
  return shift ? 10 : 1
}
