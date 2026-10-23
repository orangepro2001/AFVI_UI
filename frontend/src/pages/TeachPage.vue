<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import type { ImageRef } from '@/api/types'
import WorkbenchLayout from '@/layouts/WorkbenchLayout.vue'
import AlignRoiLayer from '@/features/teach/AlignRoiLayer.vue'
import TeachPanel from '@/features/teach/TeachPanel.vue'
import ViewerTools from '@/features/workbench/ViewerTools.vue'
import { useAlignRoiStore } from '@/stores/alignRoi'
import { useTeachStore } from '@/stores/teach'
import { useWorkbenchStore } from '@/stores/workbench'

const teach = useTeachStore()
const workbench = useWorkbenchStore()
const alignRoi = useAlignRoiStore()
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

/** The Metal node shows the composed picture with editable ROI boxes; SR and DMG stay static. */
const roiEditing = computed(() => mode.value === 'align' && teach.selectedNode?.align === 'metal')

watch(
  roiEditing,
  (editing) => {
    if (editing) void alignRoi.ensureLoaded().catch(() => undefined)
  },
  { immediate: true },
)

function onToolAction(action: 'trash' | 'save') {
  if (action === 'trash') alignRoi.removeSelected()
  else void alignRoi.save()
}

// undefined: the strip; null: an empty viewer; an ImageRef: the picture of the selected node.
const viewerImage = computed<ImageRef | null | undefined>(() => {
  if (mode.value === 'strip') return undefined
  if (roiEditing.value && alignRoi.view) return alignRoi.view.image
  if (mode.value === 'align') return teach.alignImage
  return null
})

const imageTop = computed(() => (mode.value === 'align' ? 13 : undefined))

const readoutVariant = computed<'full' | 'xy' | 'none'>(() => {
  if (mode.value === 'strip') return 'full'
  if (mode.value === 'align') return 'xy'
  return 'none'
})
</script>

<template>
  <WorkbenchLayout :image="viewerImage" :image-top="imageTop" :readout="readoutVariant">
    <template #overlay>
      <AlignRoiLayer v-if="roiEditing" />
    </template>
    <template #tools>
      <ViewerTools
        v-if="mode === 'align'"
        variant="roi"
        :live="roiEditing"
        :tool="alignRoi.tool"
        :can-trash="alignRoi.selectedId !== null"
        :can-save="alignRoi.dirty && !alignRoi.saving"
        @update:tool="alignRoi.setTool"
        @action="onToolAction"
      />
    </template>
    <template #aside><TeachPanel /></template>
  </WorkbenchLayout>
</template>
