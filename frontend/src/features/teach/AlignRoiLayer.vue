<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useAlignRoiStore } from '@/stores/alignRoi'
import { HANDLES, MIN_ROI, moveRect, rectFromDrag, resizeRect } from './roi-geometry'
import type { Handle, Point, Rect } from './roi-geometry'

const store = useAlignRoiStore()
const svg = ref<SVGSVGElement | null>(null)

type Drag =
  | { kind: 'draw'; from: Point; to: Point }
  | { kind: 'move'; id: string; origin: Rect; start: Point; rect: Rect }
  | { kind: 'resize'; id: string; handle: Handle; origin: Rect; start: Point; rect: Rect }

const drag = ref<Drag | null>(null)

const view = computed(() => store.view)
const size = computed(() => view.value?.size ?? { width: 1, height: 1 })
const kx = computed(() => (view.value?.image.width ?? 1) / size.value.width)
const ky = computed(() => (view.value?.image.height ?? 1) / size.value.height)

/** The boxes as they are drawn now: the one under a move or resize drag follows the pointer. */
const boxes = computed(() =>
  store.rois.map((roi) => {
    const d = drag.value
    const rect: Rect =
      d && (d.kind === 'move' || d.kind === 'resize') && d.id === roi.id
        ? d.rect
        : { x: roi.x, y: roi.y, w: roi.w, h: roi.h }
    return { id: roi.id, rect, selected: roi.id === store.selectedId }
  }),
)

const draft = computed<Rect | null>(() => {
  const d = drag.value
  if (!d || d.kind !== 'draw') return null
  return rectFromDrag(d.from, d.to, size.value)
})

const selectedBox = computed(() => boxes.value.find((box) => box.selected) ?? null)

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

function picturePoint(event: PointerEvent): Point {
  const el = svg.value
  if (!el) return { x: 0, y: 0 }
  const box = el.getBoundingClientRect()
  return {
    x: ((event.clientX - box.left) / box.width) * size.value.width,
    y: ((event.clientY - box.top) / box.height) * size.value.height,
  }
}

function capture(event: PointerEvent) {
  svg.value?.setPointerCapture?.(event.pointerId)
}

function onBackgroundDown(event: PointerEvent) {
  if (event.button !== 0) return
  if (store.tool === 'rect') {
    const point = picturePoint(event)
    drag.value = { kind: 'draw', from: point, to: point }
    capture(event)
  } else {
    store.select(null)
  }
}

function onBoxDown(event: PointerEvent, id: string) {
  if (event.button !== 0) return
  // Drawing starts anywhere, also on top of an existing box: the event goes on to the svg.
  if (store.tool === 'rect') return
  event.stopPropagation()
  const roi = store.rois.find((candidate) => candidate.id === id)
  if (!roi) return
  store.select(id)
  const origin = { x: roi.x, y: roi.y, w: roi.w, h: roi.h }
  drag.value = { kind: 'move', id, origin, start: picturePoint(event), rect: origin }
  capture(event)
}

function onHandleDown(event: PointerEvent, handle: Handle) {
  if (event.button !== 0 || store.tool !== 'select') return
  event.stopPropagation()
  const roi = store.selected
  if (!roi) return
  const origin = { x: roi.x, y: roi.y, w: roi.w, h: roi.h }
  drag.value = {
    kind: 'resize',
    id: roi.id,
    handle,
    origin,
    start: picturePoint(event),
    rect: origin,
  }
  capture(event)
}

function onMove(event: PointerEvent) {
  const d = drag.value
  if (!d) return
  const point = picturePoint(event)
  if (d.kind === 'draw') {
    d.to = point
  } else if (d.kind === 'move') {
    d.rect = moveRect(d.origin, point.x - d.start.x, point.y - d.start.y, size.value)
  } else {
    d.rect = resizeRect(d.origin, d.handle, point.x - d.start.x, point.y - d.start.y, size.value)
  }
}

function onUp() {
  const d = drag.value
  drag.value = null
  if (!d) return
  if (d.kind === 'draw') {
    const rect = rectFromDrag(d.from, d.to, size.value)
    if (rect.w >= MIN_ROI && rect.h >= MIN_ROI) {
      store.add(rect)
      store.setTool('select')
    }
  } else {
    store.update(d.id, d.rect)
  }
}

function onCancel() {
  drag.value = null
}

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

function onKeydown(event: KeyboardEvent) {
  if (isTyping(event.target)) return
  const mod = event.ctrlKey || event.metaKey
  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (store.selectedId === null) return
    event.preventDefault()
    drag.value = null
    store.removeSelected()
  } else if (event.key === 'Escape') {
    if (drag.value) drag.value = null
    else store.select(null)
  } else if (mod && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    drag.value = null
    store.undo()
  } else if (mod && event.key.toLowerCase() === 's') {
    event.preventDefault()
    void store.save()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

/** The id label sits above the box, or inside it at the top of the picture. */
function labelY(rect: Rect) {
  const y = rect.y * ky.value
  return y < 12 ? y + 11 : y - 3
}
</script>

<template>
  <div v-if="view" class="absolute inset-0">
    <svg
      ref="svg"
      :width="view.image.width"
      :height="view.image.height"
      :class="['absolute inset-0 touch-none', store.tool === 'rect' ? 'cursor-crosshair' : '']"
      @pointerdown="onBackgroundDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onCancel"
    >
      <g v-for="box in boxes" :key="box.id">
        <rect
          :x="box.rect.x * kx"
          :y="box.rect.y * ky"
          :width="box.rect.w * kx"
          :height="box.rect.h * ky"
          stroke-width="1.5"
          :class="[
            box.selected
              ? 'fill-overlay-line/10 stroke-overlay-line'
              : 'fill-spec-gold/10 stroke-spec-gold',
            store.tool === 'select' ? 'cursor-move' : '',
          ]"
          :data-roi="box.id"
          @pointerdown="onBoxDown($event, box.id)"
        />
        <text
          :x="box.rect.x * kx + 2"
          :y="labelY(box.rect)"
          class="text-2xs pointer-events-none fill-overlay-text"
        >
          {{ box.id }}
        </text>
      </g>

      <rect
        v-if="draft"
        :x="draft.x * kx"
        :y="draft.y * ky"
        :width="draft.w * kx"
        :height="draft.h * ky"
        stroke-width="1.5"
        stroke-dasharray="4 3"
        class="pointer-events-none fill-none stroke-overlay-line"
      />

      <template v-if="selectedBox && store.tool === 'select'">
        <circle
          v-for="grip in HANDLES"
          :key="grip.handle"
          :cx="(selectedBox.rect.x + selectedBox.rect.w * grip.fx) * kx"
          :cy="(selectedBox.rect.y + selectedBox.rect.h * grip.fy) * ky"
          r="4"
          stroke-width="1"
          :class="['fill-overlay-handle stroke-white/60', handleCursor[grip.handle]]"
          :data-handle="grip.handle"
          @pointerdown="onHandleDown($event, grip.handle)"
        />
      </template>
    </svg>

    <div
      v-if="view.state === 'missing' || view.state === 'unreadable'"
      class="pointer-events-none absolute inset-x-0 top-[45%] px-4 text-center text-xs text-sheet-muted"
    >
      <p>
        {{
          view.state === 'missing'
            ? 'No Metal / SR picture found'
            : 'Metal / SR picture could not be read'
        }}
      </p>
      <!-- Where it was looked for, or why it failed: the folder names let the user check the share. -->
      <p v-if="view.note" class="text-2xs mt-1 break-all" data-picture-note>{{ view.note }}</p>
    </div>
    <p
      v-else-if="view.state === 'partial'"
      class="pointer-events-none absolute bottom-1 left-2 text-xs text-sheet-muted"
    >
      Only one picture layer found
    </p>
    <p
      v-if="store.error"
      class="pointer-events-none absolute inset-x-0 bottom-1 text-center text-xs text-work-error"
    >
      {{ store.error }}
    </p>
  </div>
</template>
