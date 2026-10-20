/**
 * Points of a series in a 0..width by 0..height box (y down), for an SVG polyline stretched over
 * the plot. The defaults keep the old 0..100 box.
 */
export function seriesPoints(
  values: number[],
  max: number,
  width = 100,
  height = 100,
): [number, number][] {
  if (values.length === 0 || max <= 0) return []
  const lastIndex = Math.max(values.length - 1, 1)
  return values.map((value, i) => {
    const ratio = Math.min(Math.max(value / max, 0), 1)
    return [round((i / lastIndex) * width), round(height - ratio * height)]
  })
}

export const toPolyline = (points: [number, number][]): string =>
  points.map(([x, y]) => `${x},${y}`).join(' ')

/** The same series closed down to the baseline, for a filled area. */
export function toArea(points: [number, number][], baseline = 100): string {
  if (points.length === 0) return ''
  const first = points[0]!
  const last = points[points.length - 1]!
  return toPolyline([[first[0], baseline], ...points, [last[0], baseline]])
}

const round = (n: number) => Math.round(n * 100) / 100

/**
 * One piece of a half-ring gauge. Angles run over the top: 180 is the left end, 0 the right end.
 * `from` > `to`, both in degrees.
 */
export function ringSegmentPath(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  from: number,
  to: number,
): string {
  const point = (r: number, deg: number) => {
    const rad = (deg * Math.PI) / 180
    return `${round(cx + r * Math.cos(rad))} ${round(cy - r * Math.sin(rad))}`
  }
  const large = from - to > 180 ? 1 : 0
  return [
    `M ${point(outer, from)}`,
    `A ${outer} ${outer} 0 ${large} 1 ${point(outer, to)}`,
    `L ${point(inner, to)}`,
    `A ${inner} ${inner} 0 ${large} 0 ${point(inner, from)}`,
    'Z',
  ].join(' ')
}
