<script setup lang="ts">
import type { InspectionKind } from '@/api/types'
import { inspectionKindClass } from '@/lib/presentation'

defineProps<{ segments: (InspectionKind | null)[] }>()
</script>

<template>
  <div class="flex items-center justify-center gap-[3px]">
    <span
      v-for="(segment, i) in segments"
      :key="i"
      :class="['h-[7px] w-[9px]', segment ? inspectionKindClass[segment] : 'border-grid border']"
    />
  </div>
</template>
