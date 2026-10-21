<script setup lang="ts">
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'

/**
 * The 11 x 11 check box of the plain (native Windows) dialogs with its label to the right. A
 * disabled one is dimmed. Position it with `class`.
 */
defineProps<{ label: string; disabled?: boolean; class?: HTMLAttributes['class'] }>()

const model = defineModel<boolean>({ required: true })
</script>

<template>
  <button
    type="button"
    role="checkbox"
    :aria-checked="model"
    :disabled="disabled"
    :class="
      cn(
        'group text-2xs text-plain-text disabled:text-dialog-text-dim flex items-center outline-none',
        $props.class,
      )
    "
    @click="model = !model"
  >
    <span
      class="border-plain-box flex size-[11px] shrink-0 items-center justify-center border group-disabled:opacity-60"
    >
      <svg
        v-if="model"
        viewBox="0 0 11 11"
        class="stroke-plain-close size-[11px]"
        fill="none"
        stroke-width="2"
      >
        <path d="M2 5.5 4.5 8 9 3" />
      </svg>
    </span>
    <span class="ml-[3px] whitespace-nowrap">{{ label }}</span>
  </button>
</template>
