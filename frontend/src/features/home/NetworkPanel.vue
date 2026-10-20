<script setup lang="ts">
import { computed } from 'vue'
import type { NetworkStats } from '@/api/types'
import MonitorTile from '@/components/app/MonitorTile.vue'
import StatLine from '@/components/app/StatLine.vue'
import LineChart from '@/components/charts/LineChart.vue'
import { formatBitRate } from '@/lib/format'

const props = defineProps<{ network: NetworkStats }>()

const send = computed(() => [{ label: 'Send', value: formatBitRate(props.network.sendKbps) }])
</script>

<template>
  <MonitorTile title="Network">
    <span
      class="text-3xs absolute top-[6px] left-0 w-[232px] text-right leading-none text-chart-send/80"
      >{{ network.ip }}</span
    >
    <span class="text-3xs absolute top-[34px] left-[14px] leading-none text-foreground/85"
      >{{ network.maxKb }} Kb</span
    >
    <LineChart
      class="absolute top-[42px] left-[51px]"
      :values="network.history"
      :max="network.maxKb"
      :width="180"
      :height="66"
      :cell="9"
      tone="send"
    />
    <StatLine
      class="absolute top-[120px] left-0 w-full"
      :items="send"
      value-class="text-chart-send/80"
    />
  </MonitorTile>
</template>
