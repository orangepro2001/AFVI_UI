<script setup lang="ts">
import { computed } from 'vue'
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import type { CellGrid } from '@/api/types'
import { cellMapGeometry } from '@/components/workbench/cell-map'

const props = defineProps<{
  grid: CellGrid
  class?: HTMLAttributes['class']
}>()

const WIDTH = 77
const HEIGHT = 264

const geometry = computed(() => cellMapGeometry(props.grid, WIDTH, HEIGHT))

/** All the lines of the grid as one path. */
const gridPath = computed(() => {
  const { xs, ys } = geometry.value
  const vertical = xs.map((x) => `M ${x} 0 V ${HEIGHT}`)
  const horizontal = ys.map((y) => `M 0 ${y} H ${WIDTH}`)
  return [...vertical, ...horizontal].join(' ')
})
</script>

<template>
  <svg
    :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
    :class="cn('h-[264px] w-[77px] overflow-visible', $props.class)"
    aria-hidden="true"
  >
    <path :d="gridPath" class="stroke-tool-red" stroke-width="1" opacity="0.85" fill="none" />
    <rect
      :x="geometry.view.x"
      :y="geometry.view.y"
      :width="geometry.view.w"
      :height="geometry.view.h"
      class="fill-none stroke-tool-green"
      stroke-width="1.5"
    />
  </svg>
</template>
