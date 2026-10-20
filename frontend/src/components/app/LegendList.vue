<script setup lang="ts">
import { cn } from 'cn'
import type { LegendEntry } from './types'

defineProps<{ items: LegendEntry[] }>()
</script>

<template>
  <ul class="flex items-center text-3xs">
    <li v-for="item in items" :key="item.key" class="flex w-[70px] shrink-0 items-center gap-[5px]">
      <span :class="cn('size-[10px] shrink-0', item.hollow ? 'border-grid border' : item.swatch)" />
      {{ item.label }}
    </li>
  </ul>
</template>
