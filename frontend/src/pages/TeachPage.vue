<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import type { ImageRef } from '@/api/types'
import WorkbenchLayout from '@/layouts/WorkbenchLayout.vue'
import TeachPanel from '@/features/teach/TeachPanel.vue'
import ViewerOverlay from '@/features/workbench/ViewerOverlay.vue'
import ViewerTools from '@/features/workbench/ViewerTools.vue'
import { useTeachStore } from '@/stores/teach'
import { useWorkbenchStore } from '@/stores/workbench'

const teach = useTeachStore()
const workbench = useWorkbenchStore()
const mode = computed(() => teach.viewerMode)

// The viewer follows the selected node; the toolbar's tools wait until nothing is selected again.
watch(
  mode,
  (value) => {
    workbench.toolsLocked = value !== 'strip'
    workbench.pointerSeen = false
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  workbench.toolsLocked = false
  workbench.pointerSeen = false
})

// undefined: the strip; null: an empty viewer; an ImageRef: the picture of the selected node.
const viewerImage = computed<ImageRef | null | undefined>(() => {
  if (mode.value === 'strip') return undefined
  if (mode.value === 'align') return teach.alignImage
  return null
})

const imageTop = computed(() => (mode.value === 'align' ? 13 : undefined))

const readoutVariant = computed<'full' | 'xy' | 'none'>(() => {
  if (mode.value === 'strip') return 'full'
  if (mode.value === 'align') return 'xy'
  return 'none'
})

const showTools = computed(
  () => mode.value === 'align' || (mode.value === 'strip' && workbench.tool === 'gv'),
)
</script>

<template>
  <WorkbenchLayout :image="viewerImage" :image-top="imageTop" :readout="readoutVariant">
    <template #overlay>
      <ViewerOverlay :tool="mode === 'strip' ? workbench.tool : null" />
    </template>
    <template #tools>
      <ViewerTools v-if="showTools" :variant="mode === 'align' ? 'roi' : 'draw'" />
    </template>
    <template #aside><TeachPanel /></template>
  </WorkbenchLayout>
</template>
