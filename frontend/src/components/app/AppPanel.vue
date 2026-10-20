<script lang="ts">
import { cva, type VariantProps } from 'class-variance-authority'

export const panelVariants = cva('bg-card relative flex min-h-0 min-w-0 flex-col', {
  variants: {
    // section: a block of the page (title 15px, generous padding); widget: a monitoring tile.
    variant: {
      section: 'gap-[10px] px-[14px] pt-[8px] pb-[14px]',
      widget: 'gap-[6px] p-[8px]',
    },
  },
  defaultVariants: { variant: 'section' },
})

export const panelTitleVariants = cva('shrink-0 leading-none', {
  variants: {
    variant: {
      section: 'text-[14.7px] font-bold',
      widget: 'text-2xs',
    },
  },
  defaultVariants: { variant: 'section' },
})

export type PanelVariants = VariantProps<typeof panelVariants>
</script>

<script setup lang="ts">
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'

const props = defineProps<{
  title?: string
  variant?: PanelVariants['variant']
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <section :class="cn(panelVariants({ variant: props.variant }), props.class)">
    <header v-if="title || $slots.header" class="flex shrink-0 items-start justify-between">
      <h2 :class="panelTitleVariants({ variant: props.variant })">{{ title }}</h2>
      <slot name="header" />
    </header>
    <div class="min-h-0 flex-1">
      <slot />
    </div>
  </section>
</template>
