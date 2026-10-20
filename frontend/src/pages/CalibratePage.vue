<script setup lang="ts">
import CalibratePanel from '@/features/calibrate/CalibratePanel.vue'
import WorkbenchLayout from '@/layouts/WorkbenchLayout.vue'
</script>

<template>
  <WorkbenchLayout>
    <template #aside><CalibratePanel /></template>
  </WorkbenchLayout>
</template>
