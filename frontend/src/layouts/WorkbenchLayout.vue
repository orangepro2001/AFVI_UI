<script setup lang="ts">
import { computed, onMounted } from 'vue'
import LogConsole from '@/components/app/LogConsole.vue'
import CellMap from '@/components/workbench/CellMap.vue'
import InfoBar from '@/features/workbench/InfoBar.vue'
import ReadoutBar from '@/features/workbench/ReadoutBar.vue'
import GvLayer from '@/features/workbench/GvLayer.vue'
import RulerLayer from '@/features/workbench/RulerLayer.vue'
import StripViewer from '@/features/workbench/StripViewer.vue'
import ThumbnailPanel from '@/features/workbench/ThumbnailPanel.vue'
import ToolButtons from '@/features/workbench/ToolButtons.vue'
import ViewerTools from '@/features/workbench/ViewerTools.vue'
import type { ImageRef } from '@/api/types'
import { useAppStore } from '@/stores/app'
import { useMachineStore } from '@/stores/machine'
import { useMeasureStore } from '@/stores/measure'
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
const app = useAppStore()
const measure = useMeasureStore()

/** The viewer shows the strip (the Median picture of the light) and not a picture of the page. */
const isStrip = computed(() => props.image === undefined)

const shownImage = computed(() =>
  props.image === undefined ? (store.frame?.image ?? null) : props.image,
)

/** The MODEL box shows the loaded model; the snapshot is the fallback before it arrives. */
const header = computed(() => {
  const snapshot = store.snapshot
  if (!snapshot) return null
  return { ...snapshot.header, model: app.model?.name ?? snapshot.header.model }
})

function pointAt(x: number, y: number, gray?: number) {
  store.pointAt(x, y, props.image ?? undefined, gray)
}

function onGvAction(action: 'trash' | 'save') {
  if (action === 'trash') measure.setGvBox(null)
}

onMounted(() => void store.load())
</script>

<template>
  <div v-if="store.snapshot && store.readout && header" class="flex size-full gap-gap">
    <div class="flex min-w-0 flex-1 flex-col">
      <div class="flex h-[45px] shrink-0">
        <InfoBar :header="header" />
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
          :image="shownImage"
          :top="props.imageTop"
          :sample="isStrip && store.frame?.real === true"
          @pointer="pointAt"
        >
          <template #overlay>
            <slot name="overlay" />
            <template v-if="isStrip">
              <GvLayer v-if="store.tool === 'gv'" />
              <RulerLayer v-else-if="store.tool === 'ruler'" />
            </template>
          </template>
          <template #tools>
            <slot name="tools" />
            <ViewerTools
              v-if="isStrip && store.tool === 'gv'"
              variant="draw"
              live
              :tool="measure.gvTool"
              :can-trash="measure.canMeasure && measure.gvBox !== null"
              @update:tool="measure.setGvTool"
              @action="onGvAction"
            />
          </template>
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
