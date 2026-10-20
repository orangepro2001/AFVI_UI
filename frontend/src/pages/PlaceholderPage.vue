<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <div class="bg-card text-muted-foreground flex size-full items-center justify-center text-md">
    {{ title }}: waiting for the design
  </div>
</template>
