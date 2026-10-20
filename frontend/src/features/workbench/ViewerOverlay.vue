<script lang="ts">
import type { ToolId } from '@/stores/workbench'

export interface RoiExample {
  x: number
  y: number
  w: number
  h: number
  gv: number
}

export interface RulerExample {
  from: { x: number; y: number }
  to: { x: number; y: number }
  labelFrom: string
  labelTo: string
  distance: string
}

export const exampleRoi: RoiExample = { x: 220.3, y: 113, w: 152.4, h: 98.5, gv: 29 }

export const exampleRuler: RulerExample = {
  from: { x: 225, y: 89 },
  to: { x: 380.5, y: 168.5 },
  labelFrom: '(5086, 2032)',
  labelTo: '(8590, 3836)',
  distance: '3941.12px',
}
</script>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    tool: ToolId | null
    roi?: RoiExample
    ruler?: RulerExample
  }>(),
  { roi: () => exampleRoi, ruler: () => exampleRuler },
)

const roiHandles = computed(() => {
  const { x, y, w, h } = props.roi
  return [
    { x, y },
    { x: x + w, y },
    { x, y: y + h },
    { x: x + w, y: y + h },
    { x: x + w / 2, y },
    { x: x + w / 2, y: y + h },
    { x, y: y + h / 2 },
    { x: x + w, y: y + h / 2 },
  ]
})

const rulerMiddle = computed(() => ({
  x: (props.ruler.from.x + props.ruler.to.x) / 2,
  y: (props.ruler.from.y + props.ruler.to.y) / 2,
}))
</script>

<template>
  <svg
    class="pointer-events-none absolute inset-0 size-full overflow-visible"
    width="726"
    height="534"
  >
    <template v-if="props.tool === 'gv'">
      <rect
        :x="props.roi.x"
        :y="props.roi.y"
        :width="props.roi.w"
        :height="props.roi.h"
        class="fill-none stroke-overlay-line"
        stroke-width="2"
      />
      <circle
        v-for="(handle, index) in roiHandles"
        :key="`roi-handle-${index}`"
        :cx="handle.x"
        :cy="handle.y"
        r="4"
        class="fill-overlay-handle stroke-white/60"
        stroke-width="1"
      />
      <rect
        :x="props.roi.x + props.roi.w / 2 - 19"
        :y="props.roi.y + props.roi.h / 2 - 7"
        width="38"
        height="14"
        class="fill-black/60"
      />
      <text
        :x="props.roi.x + props.roi.w / 2"
        :y="props.roi.y + props.roi.h / 2"
        class="text-2xs fill-overlay-text"
        text-anchor="middle"
        dominant-baseline="central"
      >
        GV : {{ props.roi.gv }}
      </text>
    </template>

    <template v-if="props.tool === 'ruler'">
      <line
        :x1="props.ruler.from.x"
        :y1="props.ruler.from.y"
        :x2="props.ruler.to.x"
        :y2="props.ruler.to.y"
        class="stroke-overlay-line"
        stroke-width="2"
      />
      <circle
        :cx="props.ruler.from.x"
        :cy="props.ruler.from.y"
        r="4"
        class="fill-overlay-handle stroke-white/60"
        stroke-width="1"
      />
      <circle
        :cx="props.ruler.to.x"
        :cy="props.ruler.to.y"
        r="4"
        class="fill-overlay-handle stroke-white/60"
        stroke-width="1"
      />
      <text
        :x="props.ruler.from.x - 1"
        :y="props.ruler.from.y - 4"
        class="text-2xs fill-overlay-text"
        text-anchor="end"
      >
        {{ props.ruler.labelFrom }}
      </text>
      <text :x="props.ruler.to.x" :y="props.ruler.to.y + 12.5" class="text-2xs fill-overlay-text">
        {{ props.ruler.labelTo }}
      </text>
      <text :x="rulerMiddle.x + 3" :y="rulerMiddle.y - 3" class="text-2xs fill-overlay-measure">
        {{ props.ruler.distance }}
      </text>
    </template>
  </svg>
</template>
