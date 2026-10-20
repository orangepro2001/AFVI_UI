<script setup lang="ts">
import type { WorkState } from '@/api/types'
import { workStateClass } from '@/lib/presentation'

withDefaults(defineProps<{ states: WorkState[]; blockWidth?: number }>(), { blockWidth: 12 })
</script>

<template>
  <div class="flex items-center justify-center gap-[5px]">
    <span
      v-for="(state, i) in states"
      :key="i"
      :class="['h-[10px]', workStateClass[state]]"
      :style="{ width: `${blockWidth}px` }"
    />
  </div>
</template>
