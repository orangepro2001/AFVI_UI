<script setup lang="ts">
import SettingsPanel from '@/features/settings/SettingsPanel.vue'
import WorkbenchLayout from '@/layouts/WorkbenchLayout.vue'
</script>

<template>
  <WorkbenchLayout>
    <template #aside><SettingsPanel /></template>
  </WorkbenchLayout>
</template>
