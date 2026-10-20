<script setup lang="ts">
import AppDialog from '@/components/app/AppDialog.vue'
import DialogButton from '@/components/app/DialogButton.vue'

const open = defineModel<boolean>('open', { required: true })
</script>

<template>
  <AppDialog v-model:open="open" title="Load grab images">
    <!-- The list is empty for now: the reference shows no entries and nothing else inside. -->
    <div
      role="listbox"
      aria-label="Grab image sets"
      class="absolute top-[6px] left-[6px] h-[223px] w-[424px] bg-muted"
    />

    <!-- Nothing can be loaded yet; enable this once the backend provides the grab image list. -->
    <DialogButton class="absolute top-[243px] left-[239px]" disabled>Load</DialogButton>
    <DialogButton primary class="absolute top-[243px] left-[338px]" @click="open = false">
      Cancel
    </DialogButton>
  </AppDialog>
</template>
