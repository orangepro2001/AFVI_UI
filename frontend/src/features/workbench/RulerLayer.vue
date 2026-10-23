<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Point } from '@/features/teach/roi-geometry'
import { useMeasureStore } from '@/stores/measure'
import { useWorkbenchStore } from '@/stores/workbench'
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
import type { RulerEnd, RulerLine } from './measure-geometry'

const store = useMeasureStore()
const workbench = useWorkbenchStore()
const svg = ref<SVGSVGElement | null>(null)

/** A line shorter than this many screen pixels is a click, which takes the ruler away. */
const MIN_DRAW_PX = 3

type Drag =
  | { kind: 'draw'; start: Point; before: RulerLine | null }
  | { kind: 'end'; end: RulerEnd; origin: RulerLine }
  | { kind: 'line'; start: Point; origin: RulerLine }

const drag = ref<Drag | null>(null)

const image = computed(() => workbench.frame?.image ?? { url: '', width: 1, height: 1 })
const size = computed(() => workbench.frame?.size ?? { width: 1, height: 1 })
/** Screen pixels of the shown picture per pixel of the picture it stands for. */
const kx = computed(() => image.value.width / size.value.width)
const ky = computed(() => image.value.height / size.value.height)

const line = computed(() => store.ruler)

/** Everything the template draws, in screen pixels of the shown picture. */
const drawn = computed(() => {
  const l = line.value
  if (!l) return null
  const from = { x: l.from.x * kx.value, y: l.from.y * ky.value }
  const to = { x: l.to.x * kx.value, y: l.to.y * ky.value }
  return {
    from,
    to,
    fromLabel: { text: formatPoint(l.from), ...endLabel(l.from, l.to, true) },
    toLabel: { text: formatPoint(l.to), ...endLabel(l.to, l.from, false) },
    middle: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 },
    length: formatLength(rulerLength(l)),
  }
})

function picturePoint(event: PointerEvent): Point {
  const el = svg.value
  if (!el) return { x: 0, y: 0 }
  const rect = el.getBoundingClientRect()
  return {
    x: ((event.clientX - rect.left) / rect.width) * size.value.width,
    y: ((event.clientY - rect.top) / rect.height) * size.value.height,
  }
}

function capture(event: PointerEvent) {
  svg.value?.setPointerCapture?.(event.pointerId)
}

function onBackgroundDown(event: PointerEvent) {
  if (event.button !== 0) return
  const start = clampPoint(picturePoint(event), size.value)
  drag.value = { kind: 'draw', start, before: line.value }
  store.setRuler({ from: start, to: start }, 'to')
  capture(event)
}

function onEndDown(event: PointerEvent, end: RulerEnd) {
  if (event.button !== 0 || !line.value) return
  event.stopPropagation()
  drag.value = { kind: 'end', end, origin: line.value }
  store.setRuler(line.value, end)
  capture(event)
}

function onLineDown(event: PointerEvent) {
  if (event.button !== 0 || !line.value) return
  event.stopPropagation()
  drag.value = { kind: 'line', start: picturePoint(event), origin: line.value }
  capture(event)
}

function onMove(event: PointerEvent) {
  const d = drag.value
  if (!d) return
  const point = picturePoint(event)
  if (d.kind === 'draw') {
    store.setRuler({ from: d.start, to: clampPoint(point, size.value) }, 'to')
  } else if (d.kind === 'end') {
    store.setRuler(moveEnd(d.origin, d.end, point, size.value), d.end)
  } else {
    const moved = moveLine(d.origin, point.x - d.start.x, point.y - d.start.y, size.value)
    store.setRuler(moved, store.rulerEnd)
  }
}

function onUp() {
  const d = drag.value
  drag.value = null
  if (d?.kind !== 'draw' || !line.value) return
  const l = line.value
  const dx = (l.to.x - l.from.x) * kx.value
  const dy = (l.to.y - l.from.y) * ky.value
  if (Math.hypot(dx, dy) < MIN_DRAW_PX) store.setRuler(null)
}

/** Puts the ruler back to what it was before the drag. */
function cancelDrag() {
  const d = drag.value
  drag.value = null
  if (!d) return
  store.setRuler(d.kind === 'draw' ? d.before : d.origin, store.rulerEnd)
}

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

const ARROWS: Record<string, Point> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
}

function onKeydown(event: KeyboardEvent) {
  if (isTyping(event.target) || event.ctrlKey || event.metaKey || event.altKey) return
  const current = line.value
  if (event.key === 'Escape') {
    cancelDrag()
  } else if (!current) {
    return
  } else if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    drag.value = null
    store.setRuler(null)
  } else if (event.key in ARROWS) {
    event.preventDefault()
    const step = keyStep(event.shiftKey)
    const arrow = ARROWS[event.key]
    const end = store.rulerEnd
    const point = current[end]
    store.setRuler(
      moveEnd(
        current,
        end,
        { x: point.x + arrow.x * step, y: point.y + arrow.y * step },
        size.value,
      ),
      end,
    )
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <svg
    ref="svg"
    :width="image.width"
    :height="image.height"
    class="absolute inset-0 cursor-crosshair touch-none overflow-visible"
    data-ruler-layer
    @pointerdown="onBackgroundDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="cancelDrag"
  >
    <template v-if="drawn">
      <line
        :x1="drawn.from.x"
        :y1="drawn.from.y"
        :x2="drawn.to.x"
        :y2="drawn.to.y"
        class="pointer-events-none stroke-overlay-line"
        stroke-width="2"
      />
      <line
        :x1="drawn.from.x"
        :y1="drawn.from.y"
        :x2="drawn.to.x"
        :y2="drawn.to.y"
        class="cursor-move stroke-transparent"
        stroke-width="12"
        data-ruler-line
        @pointerdown="onLineDown"
      />
      <g v-for="end in ['from', 'to'] as const" :key="end">
        <circle
          :cx="drawn[end].x"
          :cy="drawn[end].y"
          r="4"
          stroke-width="1"
          class="pointer-events-none fill-overlay-handle stroke-white/60"
        />
        <circle
          :cx="drawn[end].x"
          :cy="drawn[end].y"
          r="9"
          class="cursor-pointer fill-transparent"
          :data-ruler-end="end"
          @pointerdown="onEndDown($event, end)"
        />
      </g>
      <text
        :x="drawn.from.x + drawn.fromLabel.dx"
        :y="drawn.from.y + drawn.fromLabel.dy"
        :text-anchor="drawn.fromLabel.anchor"
        class="text-2xs pointer-events-none fill-overlay-text"
        data-ruler-from
      >
        {{ drawn.fromLabel.text }}
      </text>
      <text
        :x="drawn.to.x + drawn.toLabel.dx"
        :y="drawn.to.y + drawn.toLabel.dy"
        :text-anchor="drawn.toLabel.anchor"
        class="text-2xs pointer-events-none fill-overlay-text"
        data-ruler-to
      >
        {{ drawn.toLabel.text }}
      </text>
      <text
        :x="drawn.middle.x + 3"
        :y="drawn.middle.y - 3"
        class="text-2xs pointer-events-none fill-overlay-measure"
        data-ruler-length
      >
        {{ drawn.length }}
      </text>
    </template>
  </svg>
</template>
