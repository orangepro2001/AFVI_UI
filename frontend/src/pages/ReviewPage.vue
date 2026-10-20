<script setup lang="ts">
import ReviewPanel from '@/features/review/ReviewPanel.vue'
import WorkbenchLayout from '@/layouts/WorkbenchLayout.vue'
</script>

<template>
  <WorkbenchLayout>
    <template #aside><ReviewPanel /></template>
  </WorkbenchLayout>
</template>
