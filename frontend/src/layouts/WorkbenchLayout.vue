<script setup lang="ts">
import { onMounted } from 'vue'
import LogConsole from '@/components/app/LogConsole.vue'
import CellMap from '@/components/workbench/CellMap.vue'
import InfoBar from '@/features/workbench/InfoBar.vue'
import ReadoutBar from '@/features/workbench/ReadoutBar.vue'
import StripViewer from '@/features/workbench/StripViewer.vue'
import ThumbnailPanel from '@/features/workbench/ThumbnailPanel.vue'
import ToolButtons from '@/features/workbench/ToolButtons.vue'
import type { ImageRef } from '@/api/types'
import { useMachineStore } from '@/stores/machine'
import { useWorkbenchStore } from '@/stores/workbench'

const props = withDefaults(
  defineProps<{
    image?: ImageRef | null
    imageTop?: number
    readout?: 'full' | 'xy' | 'none'
  }>(),
  { image: undefined, imageTop: 15, readout: 'full' },
)

const store = useWorkbenchStore()
const machine = useMachineStore()

function pointAt(x: number, y: number) {
  store.pointAt(x, y, props.image ?? undefined)
}

onMounted(() => void store.load())
</script>

<template>
  <div v-if="store.snapshot && store.readout" class="flex size-full gap-gap">
    <div class="flex min-w-0 flex-1 flex-col">
      <div class="flex h-[45px] shrink-0">
        <InfoBar :header="store.snapshot.header" />
        <ToolButtons />
      </div>
      <div class="flex min-h-0 flex-1 gap-[3px] bg-card">
        <div class="flex w-[143px] shrink-0 flex-col gap-[3px]">
          <ThumbnailPanel :thumbnail="store.snapshot.thumbnail" />
          <div class="relative h-[280px] shrink-0 bg-muted">
            <CellMap class="absolute top-[8px] left-[15px]" :grid="store.snapshot.cells" />
          </div>
        </div>
        <StripViewer
          :image="props.image === undefined ? store.snapshot.image : props.image"
          :top="props.imageTop"
          @pointer="pointAt"
        >
          <template #overlay><slot name="overlay" /></template>
          <template #tools><slot name="tools" /></template>
        </StripViewer>
      </div>
      <ReadoutBar v-if="props.readout === 'full'" :readout="store.readout" />
      <ReadoutBar
        v-else-if="props.readout === 'xy' && store.pointerSeen"
        :readout="store.readout"
        variant="xy"
      />
      <div v-else class="h-[35px] shrink-0 bg-card" />
      <LogConsole :entries="machine.logs" class="mt-[4px] h-[157px] shrink-0" />
    </div>
    <aside class="w-aside shrink-0"><slot name="aside" /></aside>
  </div>
</template>
