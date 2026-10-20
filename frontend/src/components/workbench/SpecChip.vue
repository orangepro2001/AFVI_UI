<script setup lang="ts">
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import type { SpecTone } from '@/api/types'

const props = withDefaults(
  defineProps<{
    label: string
    tone: SpecTone
    class?: HTMLAttributes['class']
  }>(),
  { class: undefined },
)

const toneClass: Record<SpecTone, string> = {
  root: 'bg-spec-root text-tab-foreground',
  gold: 'bg-spec-gold text-tab-foreground',
  green: 'bg-spec-green text-white',
  silver: 'bg-spec-silver text-tab-foreground',
  violet: 'bg-spec-violet text-white',
}
</script>

<template>
  <span
    :class="
      cn(
        'flex h-[18px] items-center truncate pl-[5px] text-3xs font-bold',
        toneClass[props.tone],
        props.class,
      )
    "
    >{{ label }}</span
  >
</template>
