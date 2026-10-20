<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore, type MachineStatus } from '@/stores/app'

const app = useAppStore()

// One entry per machine status; the colours are tokens. Add a status here when the design has one.
const looks: Record<MachineStatus, { label: string; class: string }> = {
  ready: { label: 'Ready', class: 'bg-ready text-ready-foreground' },
}
const look = computed(() => looks[app.status])
</script>

<template>
  <button
    type="button"
    :class="[
      'flex w-aside shrink-0 items-center justify-center text-[17px] font-light',
      look.class,
    ]"
  >
    {{ look.label }}
  </button>
</template>
