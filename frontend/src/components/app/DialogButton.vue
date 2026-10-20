<script setup lang="ts">
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'

/**
 * The 93 x 22 push button of the Windows-style dialogs. `primary` is the default button of the
 * dialog (the lighter frame). Position it with `class`; `disabled` and `@click` fall through.
 */
withDefaults(defineProps<{ primary?: boolean; class?: HTMLAttributes['class'] }>(), {
  primary: false,
  class: undefined,
})
</script>

<template>
  <button
    type="button"
    :class="
      cn(
        'text-2xs h-[22px] w-[93px] border bg-sheet-row text-white outline-none enabled:hover:bg-dialog-button-hover disabled:text-dialog-text-dim',
        primary ? 'border-dialog-line' : 'border-dialog-line-dim',
        $props.class,
      )
    "
  >
    <slot />
  </button>
</template>
