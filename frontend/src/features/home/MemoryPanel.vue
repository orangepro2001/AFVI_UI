<script setup lang="ts">
import { computed } from 'vue'
import type { SystemStats } from '@/api/types'
import MonitorTile from '@/components/app/MonitorTile.vue'
import StatLine from '@/components/app/StatLine.vue'
import LineChart from '@/components/charts/LineChart.vue'

const props = defineProps<{ memory: SystemStats['memory'] }>()

const ticks = ['640 GB', '480 GB', '320 GB', '160 GB', '0 GB']
const summary = computed(() => [
  { label: 'Total', value: `${props.memory.totalGB.toFixed(2)}GB` },
  { label: 'Used', value: `${props.memory.usedGB.toFixed(2)}GB` },
  { label: 'Free', value: `${props.memory.freeGB.toFixed(2)}GB` },
])
</script>

<template>
  <MonitorTile title="Memory" class="h-[146px]">
    <span class="text-3xs absolute top-[6px] right-[13px] leading-none text-label/70"
      >[ System ]</span
    >
    <LineChart
      class="absolute top-[42px] left-[51px]"
      :values="memory.history"
      :max="640"
      :width="431"
      :height="66"
      :ticks="ticks"
      :cell="21.5"
      tone="area"
    />
    <StatLine
      class="absolute top-[119px] left-0 w-full"
      :items="summary"
      value-class="text-label/90"
    />
  </MonitorTile>
</template>
