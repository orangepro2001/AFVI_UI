<script setup lang="ts">
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import type { StatItem } from './types'

withDefaults(defineProps<{ items: StatItem[]; valueClass?: HTMLAttributes['class'] }>(), {
  valueClass: 'text-chart-line/80',
})
</script>

<template>
  <p class="text-3xs flex justify-center gap-[11px] leading-none whitespace-nowrap">
    <span v-for="item in items" :key="item.label">
      <span class="text-foreground/85">{{ item.label }}:</span>
      <span :class="cn('ml-[1px]', valueClass)">{{ item.value }}</span>
    </span>
  </p>
</template>
