<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { HANDLES, moveRect, rectFromDrag, resizeRect } from '@/features/teach/roi-geometry'
import type { Handle, Point, Rect } from '@/features/teach/roi-geometry'
import { useMeasureStore } from '@/stores/measure'
import { useWorkbenchStore } from '@/stores/workbench'
import { keyStep } from './measure-geometry'

const store = useMeasureStore()
const workbench = useWorkbenchStore()
const svg = ref<SVGSVGElement | null>(null)

/** A drag has to span this many screen pixels in both directions to count as a box (not a click). */
const MIN_DRAW_PX = 3
/** The smallest box a grip can leave, in pixels of the picture. */
const MIN_BOX = 1

type Drag =
  | { kind: 'draw'; from: Point; before: Rect | null }
  | { kind: 'move'; origin: Rect; start: Point }
  | { kind: 'resize'; handle: Handle; origin: Rect; start: Point }

const drag = ref<Drag | null>(null)

const image = computed(() => workbench.frame?.image ?? { url: '', width: 1, height: 1 })
const size = computed(() => workbench.frame?.size ?? { width: 1, height: 1 })
/** Screen pixels of the shown picture per pixel of the picture it stands for. */
const kx = computed(() => image.value.width / size.value.width)
const ky = computed(() => image.value.height / size.value.height)

const box = computed(() => (store.canMeasure ? store.gvBox : null))

const label = computed(() => `GV : ${store.stats ? Math.round(store.stats.mean) : '-'}`)
const labelWidth = computed(() => Math.max(38, label.value.length * 5.5 + 3.5))

const tooltip = computed(() => {
  const s = store.stats
  if (!s) return ''
  const { x, y, w, h } = s.box
  return [
    `Avg ${s.mean.toFixed(2)}   Std ${s.std.toFixed(2)}`,
    `Min ${s.min}   Max ${s.max}`,
    `${s.pixels} px: (${x}, ${y}) ${w} x ${h}`,
  ].join('\n')
})

const notice = computed(() => {
  if (store.canMeasure) return null
  const view = workbench.median
  if (view?.state === 'unreadable') return view.note || 'The Median picture could not be read'
  return `No Median picture of Light-${workbench.light}`
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
  if (event.button !== 0 || !store.canMeasure || store.gvTool !== 'rect') return
  drag.value = {
    kind: 'draw',
    from: picturePoint(event),
    before: store.gvBox ? { ...store.gvBox } : null,
  }
  capture(event)
}

function onBoxDown(event: PointerEvent) {
  // The rect tool draws anywhere, also on top of the box: the event goes on to the svg.
  if (event.button !== 0 || store.gvTool !== 'select' || !store.gvBox) return
  event.stopPropagation()
  drag.value = { kind: 'move', origin: { ...store.gvBox }, start: picturePoint(event) }
  capture(event)
}

function onHandleDown(event: PointerEvent, handle: Handle) {
  if (event.button !== 0 || !store.gvBox) return
  event.stopPropagation()
  drag.value = { kind: 'resize', handle, origin: { ...store.gvBox }, start: picturePoint(event) }
  capture(event)
}

function onMove(event: PointerEvent) {
  const d = drag.value
  if (!d) return
  const point = picturePoint(event)
  if (d.kind === 'draw') {
    const rect = rectFromDrag(d.from, point, size.value)
    if (rect.w * kx.value >= MIN_DRAW_PX && rect.h * ky.value >= MIN_DRAW_PX) store.setGvBox(rect)
  } else if (d.kind === 'move') {
    store.setGvBox(moveRect(d.origin, point.x - d.start.x, point.y - d.start.y, size.value))
  } else {
    store.setGvBox(
      resizeRect(d.origin, d.handle, point.x - d.start.x, point.y - d.start.y, size.value, MIN_BOX),
    )
  }
}

function onUp() {
  drag.value = null
}

/** Puts the box back to what it was before the drag. */
function cancelDrag() {
  const d = drag.value
  drag.value = null
  if (!d) return
  store.setGvBox(d.kind === 'draw' ? d.before : d.origin)
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
  const current = store.gvBox
  if (event.key === 'Escape') {
    cancelDrag()
  } else if (!current || !store.canMeasure) {
    return
  } else if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    drag.value = null
    store.setGvBox(null)
  } else if (event.key in ARROWS) {
    event.preventDefault()
    const step = keyStep(event.shiftKey)
    const arrow = ARROWS[event.key]
    store.setGvBox(moveRect(current, arrow.x * step, arrow.y * step, size.value))
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

const handleCursor: Record<Handle, string> = {
  nw: 'cursor-nwse-resize',
  se: 'cursor-nwse-resize',
  ne: 'cursor-nesw-resize',
  sw: 'cursor-nesw-resize',
  n: 'cursor-ns-resize',
  s: 'cursor-ns-resize',
  e: 'cursor-ew-resize',
  w: 'cursor-ew-resize',
}
</script>

<template>
  <div class="absolute inset-0">
    <svg
      ref="svg"
      :width="image.width"
      :height="image.height"
      :class="[
        'absolute inset-0 touch-none overflow-visible',
        store.canMeasure && store.gvTool === 'rect' ? 'cursor-crosshair' : '',
      ]"
      data-gv-layer
      @pointerdown="onBackgroundDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="cancelDrag"
    >
      <template v-if="box">
        <rect
          :x="box.x * kx"
          :y="box.y * ky"
          :width="box.w * kx"
          :height="box.h * ky"
          stroke-width="2"
          :class="[
            'fill-transparent stroke-overlay-line',
            store.gvTool === 'select' ? 'cursor-move' : '',
          ]"
          data-gv-box
          @pointerdown="onBoxDown"
        >
          <title v-if="tooltip">{{ tooltip }}</title>
        </rect>
        <rect
          :x="(box.x + box.w / 2) * kx - labelWidth / 2"
          :y="(box.y + box.h / 2) * ky - 7"
          :width="labelWidth"
          height="14"
          class="pointer-events-none fill-black/60"
        />
        <text
          :x="(box.x + box.w / 2) * kx"
          :y="(box.y + box.h / 2) * ky"
          class="text-2xs pointer-events-none fill-overlay-text"
          text-anchor="middle"
          dominant-baseline="central"
          data-gv-label
        >
          {{ label }}
        </text>
        <g v-for="grip in HANDLES" :key="grip.handle">
          <circle
            :cx="(box.x + box.w * grip.fx) * kx"
            :cy="(box.y + box.h * grip.fy) * ky"
            r="4"
            stroke-width="1"
            class="pointer-events-none fill-overlay-handle stroke-white/60"
          />
          <circle
            :cx="(box.x + box.w * grip.fx) * kx"
            :cy="(box.y + box.h * grip.fy) * ky"
            r="9"
            :class="['fill-transparent', handleCursor[grip.handle]]"
            :data-gv-handle="grip.handle"
            @pointerdown="onHandleDown($event, grip.handle)"
          />
        </g>
      </template>
    </svg>

    <p
      v-if="notice"
      class="pointer-events-none absolute inset-x-0 top-[45%] text-center text-xs text-sheet-muted"
    >
      {{ notice }}
    </p>
    <p
      v-else-if="store.error"
      class="pointer-events-none absolute inset-x-0 bottom-1 text-center text-xs text-work-error"
    >
      {{ store.error }}
    </p>
  </div>
</template>
