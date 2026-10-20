<script setup lang="ts">
import { cn } from 'cn'
import { computed, type HTMLAttributes } from 'vue'

/** The bottom block of the settings page. */
const props = withDefaults(defineProps<{ class?: HTMLAttributes['class'] }>(), { class: undefined })

const rootClass = computed(() => cn('relative h-[60px] w-full', props.class))
</script>

<template>
  <div :class="rootClass">
    <div
      class="absolute top-0 left-[9px] flex items-center gap-1 text-3xs leading-4 text-foreground"
    >
      <span class="inline-block size-1 rounded-full bg-white" />
      <span>Specification - Management</span>
    </div>

    <button
      type="button"
      class="absolute top-[35px] left-[15px] h-[18px] w-[155px] border border-grid bg-sheet-row text-3xs text-foreground"
    >
      Update Default Insp Spec
    </button>
    <button
      type="button"
      class="absolute top-[35px] left-[177px] h-[18px] w-[156px] border border-grid bg-sheet-row text-3xs text-foreground"
    >
      Update Default Light Spec
    </button>
    <button
      type="button"
      class="absolute top-[35px] left-[340px] h-[18px] w-[152px] bg-secondary text-3xs text-foreground"
    >
      Revison
    </button>
  </div>
</template>
