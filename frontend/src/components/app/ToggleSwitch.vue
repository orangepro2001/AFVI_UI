<script setup lang="ts">
import { cn } from 'cn'
import { computed, type HTMLAttributes } from 'vue'

/**
 * The pill switches of the original application. Four sizes: `big` is the ON/OFF switch of the
 * calibration page, `small` the one in every row of its table, `mask` the one next to a defect mask
 * heading of the settings page, `table` the one in every row of the Image Analysis tables.
 */
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    variant?: 'big' | 'small' | 'mask' | 'table'
    disabled?: boolean
    label?: string
    class?: HTMLAttributes['class']
  }>(),
  { variant: 'small', disabled: false, label: undefined, class: undefined },
)

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const frame = computed(() => {
  const on = props.modelValue
  switch (props.variant) {
    case 'big':
      return cn(
        'h-[19px] w-[44px] bg-linear-to-b from-white/20 via-transparent to-black/35',
        on ? 'bg-switch-on' : 'bg-secondary',
      )
    case 'mask':
      return cn('h-3 w-8', on ? 'bg-primary' : 'bg-foreground/90')
    case 'table':
      return cn('h-[14px] w-[31px]', on ? 'bg-primary' : 'bg-switch-off')
    default:
      return cn('h-[11px] w-7', on ? 'bg-primary' : 'bg-slider-track/60')
  }
})

const knob = computed(() => {
  const on = props.modelValue
  switch (props.variant) {
    case 'big':
      return cn('top-[1.5px] size-4 bg-slider-track', on ? 'right-[1.5px]' : 'left-[1.5px]')
    case 'mask':
      return cn('top-[-0.5px] size-[13px] bg-foreground', on ? 'right-0' : 'left-0')
    case 'table':
      return cn('top-[3px] size-2', on ? 'right-[4px] bg-white' : 'left-[4px] bg-switch-off-knob')
    default:
      return cn(
        'top-[1.5px] size-2',
        on ? 'right-[1.5px] bg-white' : 'left-[1.5px] bg-muted-foreground',
      )
  }
})
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="label"
    :disabled="disabled"
    :class="
      cn('relative inline-block shrink-0 rounded-full disabled:opacity-50', frame, props.class)
    "
    @click="emit('update:modelValue', !modelValue)"
  >
    <span
      v-if="variant === 'big'"
      :class="
        cn(
          'absolute top-0 text-[11px] leading-[19px] font-bold text-white',
          modelValue ? 'left-[7px]' : 'right-[7px]',
        )
      "
    >
      {{ modelValue ? 'ON' : 'OFF' }}
    </span>
    <span :class="cn('absolute rounded-full', knob)" />
  </button>
</template>
