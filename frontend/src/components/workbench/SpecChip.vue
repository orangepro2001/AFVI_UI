<script setup lang="ts">
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import type { SpecTone } from '@/api/types'

const props = withDefaults(
  defineProps<{
    label: string
    tone: SpecTone
    selected?: boolean
    class?: HTMLAttributes['class']
  }>(),
  { selected: false, class: undefined },
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
  <button
    type="button"
    :aria-pressed="props.selected"
    :class="
      cn(
        'flex h-[18px] cursor-pointer items-center truncate pl-[5px] text-left text-3xs font-bold',
        props.selected ? 'bg-spec-selected text-tab-foreground' : toneClass[props.tone],
        props.class,
      )
    "
  >
    {{ label }}
  </button>
</template>
