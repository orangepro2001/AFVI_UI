<script setup lang="ts">
import WorkbenchLayout from '@/layouts/WorkbenchLayout.vue'
import TeachPanel from '@/features/teach/TeachPanel.vue'
import ViewerOverlay from '@/features/workbench/ViewerOverlay.vue'
import ViewerTools from '@/features/workbench/ViewerTools.vue'
import { useWorkbenchStore } from '@/stores/workbench'

const workbench = useWorkbenchStore()
</script>

<template>
  <WorkbenchLayout>
    <template #overlay><ViewerOverlay :tool="workbench.tool" /></template>
    <template #tools><ViewerTools /></template>
    <template #aside><TeachPanel /></template>
  </WorkbenchLayout>
</template>
