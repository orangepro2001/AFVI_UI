<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import AppShell from '@/layouts/AppShell.vue'
import { useAppStore } from '@/stores/app'
import { useMachineStore } from '@/stores/machine'

const app = useAppStore()
const machine = useMachineStore()

onMounted(() => {
  void app.load()
  void machine.start()
})
onUnmounted(() => machine.stop())
</script>

<template>
  <AppShell />
</template>
