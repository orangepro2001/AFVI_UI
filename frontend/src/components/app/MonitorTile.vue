<script setup lang="ts">
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'

const props = defineProps<{
  /** Caption at the top left; omit for tiles that draw their own. */
  title?: string
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <section
    :class="
      cn(
        'relative shrink-0 overflow-hidden bg-card',
        'after:pointer-events-none after:absolute after:inset-0 after:border after:border-white/[0.07]',
        props.class,
      )
    "
  >
    <h2 v-if="title" class="text-3xs absolute top-[6px] left-[14px] leading-none text-foreground">
      {{ title }}
    </h2>
    <slot />
  </section>
</template>
