<script setup lang="ts">
import { computed } from 'vue'
import { ringSegmentPath } from './geometry'

const props = defineProps<{
  /** 0..1 */
  used: number
  /** Text inside the ring, e.g. "[D:]". */
  label?: string
}>()

const CX = 50
const CY = 50
const OUTER = 50
const INNER = 29

const split = computed(() => 180 - Math.min(Math.max(props.used, 0), 1) * 180)
const usedPath = computed(() => ringSegmentPath(CX, CY, OUTER, INNER, 180, split.value))
const restPath = computed(() => ringSegmentPath(CX, CY, OUTER, INNER, split.value, 0))
</script>

<template>
  <svg viewBox="0 0 100 50" class="h-[50px] w-[100px]" role="img" :aria-label="label">
    <path v-if="used > 0" :d="usedPath" class="fill-gauge-used" />
    <path v-if="used < 1" :d="restPath" class="fill-gauge-rest" />
    <text
      x="50"
      y="19.5"
      text-anchor="middle"
      dominant-baseline="central"
      class="fill-foreground text-3xs"
    >
      {{ label }}
    </text>
  </svg>
</template>
