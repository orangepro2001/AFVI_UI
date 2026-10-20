<script setup lang="ts">
import type { Station, StripStatus, WorkState } from '@/api/types'
import { stations } from '@/api/types'
import AppPanel from '@/components/app/AppPanel.vue'
import DataGrid from '@/components/app/DataGrid.vue'
import LegendList from '@/components/app/LegendList.vue'
import StatusBlocks from '@/components/app/StatusBlocks.vue'
import type { GridColumn, LegendEntry } from '@/components/app/types'
import { workStateClass, workStateLabel } from '@/lib/presentation'

defineProps<{ strips: StripStatus[] }>()

const legend: LegendEntry[] = (['none', 'work', 'error', 'complete'] as WorkState[]).map(
  (state) => ({
    key: state,
    label: workStateLabel[state],
    swatch: workStateClass[state],
    hollow: state === 'none',
  }),
)

const columns: GridColumn[] = [
  { key: 'stripNo', label: 'StripNo', width: '65px' },
  { key: 'grab', label: 'Grab', width: '75px' },
  { key: 'ga', label: 'GA', width: '46px' },
  { key: 'align', label: 'Align', width: '74px' },
  { key: 'transfer', label: 'Transfer', width: '75px' },
  { key: 'prepare', label: 'Prepare', width: '65px' },
  { key: 'inspect', label: 'Inspect', width: '65px' },
  { key: 'dmg', label: 'DMG', width: '46px' },
  { key: 'defect', label: 'Defect', width: '84px' },
  { key: 'defectCount', label: 'Defect Count', width: '195px' },
  { key: 'totalCount', label: 'Total Count', width: '84px' },
  { key: 'mergeCount', label: 'Merge Count', width: '84px' },
  { key: 'final', label: 'Final' },
]

/** Width of one block per station: the design draws some stations as one long bar. */
const blockWidth: Record<Station, number> = {
  grab: 12,
  ga: 18,
  align: 12,
  transfer: 12,
  prepare: 37,
  inspect: 34,
  dmg: 18,
  defect: 10,
}
</script>

<template>
  <AppPanel title="WorkStatus" class="h-[173px] shrink-0 gap-[17px] pt-[8px]">
    <template #header>
      <LegendList :items="legend" class="absolute top-[20px] right-[12px]" />
    </template>
    <DataGrid :columns="columns" :rows="strips" :min-rows="5" :head-height="23" :row-height="19">
      <template #cell-stripNo="{ value }">
        <span class="text-2xs text-value">{{ value }}</span>
      </template>
      <template v-for="station in stations" :key="station" #[`cell-${station}`]="{ row }">
        <StatusBlocks :states="row.stations[station]" :block-width="blockWidth[station]" />
      </template>
    </DataGrid>
  </AppPanel>
</template>
