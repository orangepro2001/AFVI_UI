<script setup lang="ts">
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Accessible name and tooltip. */
    label: string
    selected?: boolean
    disabled?: boolean
    /** The colour of the button when it is selected (or outlined). */
    tone?: 'active' | 'yellow' | 'red' | 'green' | 'blue'
    /** Channels keep their colour border even when they are not selected. */
    outline?: boolean
    class?: HTMLAttributes['class']
  }>(),
  { selected: false, disabled: false, tone: 'active', outline: false, class: undefined },
)

const border: Record<NonNullable<typeof props.tone>, string> = {
  active: 'border-tool-active',
  yellow: 'border-tool-yellow',
  red: 'border-tool-red',
  green: 'border-tool-green',
  blue: 'border-tool-blue',
}

const icon: Record<NonNullable<typeof props.tone>, string> = {
  active: 'text-tool-active',
  yellow: 'text-tool-yellow',
  red: 'text-tool-red',
  green: 'text-tool-green',
  blue: 'text-tool-blue',
}

function borderClass() {
  if (props.disabled) return 'border-tool-disabled'
  if (props.selected) return border[props.tone]
  if (props.outline) return border[props.tone]
  return 'border-tool-border'
}

function iconClass() {
  if (props.disabled) return 'text-tool-disabled'
  if (props.selected) return icon[props.tone]
  return 'text-tool-icon'
}
</script>

<template>
  <button
    type="button"
    :disabled="disabled"
    :aria-pressed="selected"
    :aria-label="label"
    :title="label"
    :class="
      cn(
        'absolute top-[7px] flex size-[26px] items-center justify-center rounded-[6px] border-2 bg-card',
        borderClass(),
        props.class,
      )
    "
  >
    <span :class="cn('flex items-center justify-center', iconClass())">
      <slot />
    </span>
  </button>
</template>
