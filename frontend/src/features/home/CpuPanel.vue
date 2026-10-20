<script setup lang="ts">
import { computed } from 'vue'
import type { SystemStats } from '@/api/types'
import MonitorTile from '@/components/app/MonitorTile.vue'
import StatLine from '@/components/app/StatLine.vue'
import LineChart from '@/components/charts/LineChart.vue'

const props = defineProps<{ cpu: SystemStats['cpu'] }>()

const ticks = ['100 %', '75 %', '50 %', '25 %', '0 %']
const usage = computed(() => [{ label: 'Usage', value: `${props.cpu.usage.toFixed(2)}%` }])
</script>

<template>
  <MonitorTile title="CPU" class="h-[146px]">
    <span class="text-3xs absolute top-[6px] right-[13px] leading-none text-chart-line/65"
      >[ System ]</span
    >
    <LineChart
      class="absolute top-[42px] left-[51px]"
      :values="cpu.history"
      :max="100"
      :width="431"
      :height="66"
      :ticks="ticks"
      :cell="21.5"
    />
    <StatLine class="absolute top-[120px] left-0 w-full" :items="usage" />
  </MonitorTile>
</template>
