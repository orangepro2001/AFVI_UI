<script setup lang="ts">
import { computed, ref } from 'vue'
import type { InspectionArea, InspectionKind } from '@/api/types'
import { channels, inspectionKinds } from '@/api/types'
import AppPanel from '@/components/app/AppPanel.vue'
import DataGrid from '@/components/app/DataGrid.vue'
import LegendList from '@/components/app/LegendList.vue'
import PagerBar from '@/components/app/PagerBar.vue'
import SegmentBar from '@/components/app/SegmentBar.vue'
import type { LegendEntry } from '@/components/app/types'
import { inspectionKindClass, inspectionKindLabel } from '@/lib/presentation'
import { channelKey, inspectionColumns, inspectionRows, nodeKey } from './inspection-rows'

const props = defineProps<{ area: InspectionArea }>()

const page = ref(props.area.page)

const legend: LegendEntry[] = inspectionKinds.map((kind) => ({
  key: kind,
  label: inspectionKindLabel[kind],
  swatch: inspectionKindClass[kind],
}))

const columns = computed(() => inspectionColumns(props.area))
const nodeSlots = computed(() => props.area.lights.map((light) => nodeKey(light.id)))
const channelSlots = computed(() =>
  props.area.lights.flatMap((light) => channels.map((channel) => channelKey(light.id, channel))),
)
const rows = computed(() => inspectionRows(props.area))
</script>

<template>
  <AppPanel title="Inspection Area" class="gap-[17px] pt-[11px]">
    <template #header>
      <LegendList :items="legend" class="absolute top-[23px] right-[12px]" />
    </template>
    <div class="h-[344px] shrink-0">
      <DataGrid :columns="columns" :rows="rows" fill :row-height="15" :head-height="23">
        <template v-for="key in nodeSlots" :key="key" #[`cell-${key}`]="{ value }">
          <span class="text-3xs text-positive/70">{{ value }}</span>
        </template>
        <template v-for="key in channelSlots" :key="key" #[`cell-${key}`]="{ value }">
          <SegmentBar :segments="value as (InspectionKind | null)[]" />
        </template>
      </DataGrid>
    </div>
    <PagerBar v-model="page" :page-count="area.pageCount" class="absolute inset-x-0 bottom-[8px]" />
  </AppPanel>
</template>
