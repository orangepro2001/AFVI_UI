<script setup lang="ts">
import { computed } from 'vue'
import type { SystemStats } from '@/api/types'
import MonitorTile from '@/components/app/MonitorTile.vue'
import StatLine from '@/components/app/StatLine.vue'
import RingGauge from '@/components/charts/RingGauge.vue'
import { formatCapacity } from '@/lib/format'

const props = defineProps<{ storage: SystemStats['storage'] }>()

const used = computed(() => props.storage.usedGB / (props.storage.usedGB + props.storage.freeGB))
const summary = computed(() => [
  { label: 'Total', value: formatCapacity(props.storage.totalGB) },
  { label: 'Used', value: formatCapacity(props.storage.usedGB) },
  { label: 'Free', value: formatCapacity(props.storage.freeGB) },
])
</script>

<template>
  <MonitorTile title="Storage">
    <RingGauge class="absolute top-[44px] left-[73px]" :used="used" :label="`[${storage.drive}]`" />
    <p
      class="text-3xs absolute top-[96px] left-0 w-full text-center leading-none text-chart-line/70"
    >
      {{ (used * 100).toFixed(1) }}%
    </p>
    <StatLine class="absolute top-[113px] left-0 w-full" :items="summary" />
  </MonitorTile>
</template>
