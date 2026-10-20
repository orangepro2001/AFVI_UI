<script setup lang="ts">
import { cn } from 'cn'
import { computed, type HTMLAttributes } from 'vue'
import { seriesPoints, toArea } from './geometry'

const props = withDefaults(
  defineProps<{
    values: number[]
    /** Value at the top of the plot. */
    max: number
    /** Plot size in px. */
    width: number
    height: number
    /** Labels of the y axis, top to bottom, one per horizontal grid line. Without labels there are `lines` lines and no axis. */
    ticks?: string[]
    lines?: number
    /** Distance of the vertical grid lines in px. */
    cell: number
    /** Which token fills the series: chart-line (lime), chart-send (yellow) or chart-area (light blue). */
    tone?: 'line' | 'send' | 'area'
    class?: HTMLAttributes['class']
  }>(),
  { ticks: () => [], lines: 5, tone: 'line', class: undefined },
)

// One entry per horizontal grid line, with its y (crisp at 1px). Also places the y axis labels.
const rows = computed(() => {
  const count = props.ticks.length || props.lines
  return Array.from({ length: Math.max(count, 1) }, (_, i) => ({
    y: Math.round((i * (props.height - 1)) / Math.max(count - 1, 1)) + 0.5,
    label: props.ticks[i],
  }))
})

const columns = computed(() => {
  const xs: number[] = []
  for (let k = 1; k * props.cell < props.width; k++) xs.push(Math.round(k * props.cell) + 0.5)
  return xs
})

// The series ends 4px before the right edge of the plot and sits on the last grid line.
const points = computed(() =>
  seriesPoints(props.values, props.max, props.width - 5, props.height - 1),
)
const tones = { line: 'fill-chart-line', send: 'fill-chart-send', area: 'fill-chart-area' }
const area = computed(() => toArea(points.value, props.height - 1))
</script>

<template>
  <div :class="cn('relative', props.class)" :style="{ width: `${width}px`, height: `${height}px` }">
    <svg
      :width="width"
      :height="height"
      :viewBox="`0 0 ${width} ${height}`"
      class="absolute inset-0 overflow-visible"
      shape-rendering="crispEdges"
    >
      <line
        v-for="row in rows"
        :key="`h${row.y}`"
        x1="1"
        :y1="row.y"
        :x2="width"
        :y2="row.y"
        class="stroke-chart-grid"
        stroke-width="1"
      />
      <line
        v-for="x in columns"
        :key="`v${x}`"
        :x1="x"
        y1="0"
        :x2="x"
        :y2="height"
        class="stroke-chart-grid"
        stroke-width="1"
      />
      <polygon
        :points="area"
        transform="translate(1 1)"
        :class="tones[tone]"
        shape-rendering="geometricPrecision"
      />
    </svg>
    <template v-if="ticks.length > 0">
      <span
        v-for="row in rows"
        :key="`t${row.y}`"
        class="text-3xs absolute -left-[37px] -translate-y-1/2 leading-none whitespace-nowrap text-foreground/85"
        :style="{ top: `${row.y - 3}px` }"
      >
        {{ row.label }}
      </span>
    </template>
  </div>
</template>
