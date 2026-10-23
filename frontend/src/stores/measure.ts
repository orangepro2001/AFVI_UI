import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useApi } from '@/api'
import type { GvStats } from '@/api/types'
import { clampPoint } from '@/features/workbench/measure-geometry'
import type { RulerEnd, RulerLine } from '@/features/workbench/measure-geometry'
import type { Rect } from '@/features/teach/roi-geometry'
import { useAppStore } from './app'
import { useWorkbenchStore } from './workbench'

/** The two tools of the GV tool column: move and resize the box, or draw a new one. */
export type GvTool = 'select' | 'rect'

const sameRect = (a: Rect, b: Rect) => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high)

/**
 * What the Ruler and GV tools of the toolbar have put on the picture. Both live in pixels of the
 * Median picture (the size the read-out bar calls WH), so they stay where they are when the picture
 * is shown at another size; they are dropped when another model or host is loaded.
 *
 * GV: a box on the picture; the backend measures the gray values of that box on the full-size TIFF
 * and the numbers go to the label of the box and to the Avg. GV / Std. GV of the read-out bar.
 */
export const useMeasureStore = defineStore('measure', () => {
  const api = useApi()
  const app = useAppStore()
  const workbench = useWorkbenchStore()

  const gvTool = ref<GvTool>('rect')
  const gvBox = ref<Rect | null>(null)
  /** The measurement of `gvBox`, null while there is none (no box, not measured yet, or it failed). */
  const stats = ref<GvStats | null>(null)
  const measuring = ref(false)
  /** The last failed measurement, in words. */
  const error = ref<string | null>(null)

  const ruler = ref<RulerLine | null>(null)
  /** The end the arrow keys move: the one that was drawn or grabbed last. */
  const rulerEnd = ref<RulerEnd>('to')

  /** GV can only be measured on a Median picture of the repository. */
  const canMeasure = computed(() => workbench.frame?.real === true)

  /** The box and light of a measurement; null while there is nothing to measure. */
  function wanted() {
    const view = workbench.median
    if (!gvBox.value || view?.state !== 'ok') return null
    return { box: { ...gvBox.value }, light: view.light }
  }

  let running = false
  let dirty = false

  /**
   * One measurement at a time, newest box wins: while a request is out, moving the box only marks
   * the result as outdated and the loop asks again for the box as it is by then.
   */
  async function measureLoop() {
    running = true
    try {
      do {
        dirty = false
        const sent = wanted()
        if (!sent) {
          stats.value = null
          break
        }
        measuring.value = true
        const current = () => {
          const now = wanted()
          return now !== null && now.light === sent.light && sameRect(now.box, sent.box)
        }
        try {
          const result = await api.measureGv(sent.light, sent.box)
          if (current()) {
            stats.value = result
            error.value = null
          }
        } catch (failure) {
          if (current()) {
            stats.value = null
            error.value = failure instanceof Error ? failure.message : String(failure)
          }
        }
      } while (dirty)
    } finally {
      running = false
      measuring.value = false
    }
  }

  function requestMeasure() {
    dirty = true
    if (!running) void measureLoop()
  }

  /** Puts the GV box (pixels of the picture) down, or takes it away with null, and measures it. */
  function setGvBox(box: Rect | null) {
    gvBox.value = box ? { ...box } : null
    if (!box) {
      stats.value = null
      error.value = null
    }
    requestMeasure()
  }

  function setGvTool(tool: GvTool) {
    gvTool.value = tool
  }

  function setRuler(line: RulerLine | null, end: RulerEnd = 'to') {
    ruler.value = line ? { from: { ...line.from }, to: { ...line.to } } : null
    rulerEnd.value = end
  }

  /** Drops everything that was measured. */
  function reset() {
    gvBox.value = null
    stats.value = null
    error.value = null
    ruler.value = null
    requestMeasure()
  }

  // The read-out bar shows the numbers of the box.
  watch(stats, (next) =>
    workbench.setReadout(
      next ? { avgGv: Math.round(next.mean), stdGv: next.std } : { avgGv: 0, stdGv: 0 },
    ),
  )

  // Another light is another picture: the same box is measured on it.
  watch(
    () => workbench.median,
    () => {
      if (gvBox.value) requestMeasure()
    },
  )

  // A picture of another size: what was put on the old one is pulled back inside the new one.
  watch(
    () => workbench.frame?.size,
    (size) => {
      if (!size) return
      const bounds = { width: size.width, height: size.height }
      const box = gvBox.value
      if (box) {
        const x = clamp(box.x, 0, bounds.width - 1)
        const y = clamp(box.y, 0, bounds.height - 1)
        const next = {
          x,
          y,
          w: Math.min(box.w, bounds.width - x),
          h: Math.min(box.h, bounds.height - y),
        }
        if (!sameRect(next, box)) setGvBox(next)
      }
      const line = ruler.value
      if (line) {
        const from = clampPoint(line.from, bounds)
        const to = clampPoint(line.to, bounds)
        if (
          from.x !== line.from.x ||
          from.y !== line.from.y ||
          to.x !== line.to.x ||
          to.y !== line.to.y
        )
          setRuler({ from, to }, rulerEnd.value)
      }
    },
  )

  // Another model or host has other pictures.
  watch(
    () => [app.model?.name, app.inventoryEpoch] as const,
    (now, before) => {
      if (now[0] !== before[0] || now[1] !== before[1]) reset()
    },
  )

  return {
    gvTool,
    gvBox,
    stats,
    measuring,
    error,
    ruler,
    rulerEnd,
    canMeasure,
    setGvBox,
    setGvTool,
    setRuler,
    reset,
  }
})
