<script setup lang="ts">
import { cn } from 'cn'
import { computed, ref, type HTMLAttributes } from 'vue'

/** The 0..1 slider of the defect mask rows of the settings page. */
const props = withDefaults(
  defineProps<{
    modelValue: number
    label: string
    class?: HTMLAttributes['class']
  }>(),
  { class: undefined },
)

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const TRACK_WIDTH = 380

const root = ref<HTMLElement | null>(null)
const hit = ref<HTMLElement | null>(null)

const rootClass = computed(() =>
  cn('relative h-[7px] w-[380px] touch-none rounded-[4px]', props.class),
)

const knobLeft = computed(() => `${clamp(props.modelValue) * TRACK_WIDTH}px`)
const leftWidth = computed(() => `${clamp(props.modelValue) * TRACK_WIDTH}px`)
const rightLeft = computed(() => `${clamp(props.modelValue) * TRACK_WIDTH}px`)

function clamp(value: number): number {
  return Math.min(Math.max(Math.round(value * 100) / 100, 0), 1)
}

function commit(value: number) {
  emit('update:modelValue', clamp(value))
}

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0) return
  hit.value?.setPointerCapture?.(event.pointerId)
  onPointerMove(event)
}

function onPointerMove(event: PointerEvent) {
  if (event.buttons === 0 && event.type === 'pointermove') return
  const rect = root.value?.getBoundingClientRect()
  if (!rect || rect.width === 0) return
  commit((event.clientX - rect.left) / rect.width)
}

function onKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowLeft':
    case 'ArrowDown':
      event.preventDefault()
      commit(props.modelValue - 0.01)
      break
    case 'ArrowRight':
    case 'ArrowUp':
      event.preventDefault()
      commit(props.modelValue + 0.01)
      break
    case 'Home':
      event.preventDefault()
      commit(0)
      break
    case 'End':
      event.preventDefault()
      commit(1)
      break
  }
}
</script>

<template>
  <div
    ref="root"
    :class="rootClass"
    role="slider"
    tabindex="0"
    :aria-label="props.label"
    aria-valuemin="0"
    aria-valuemax="1"
    :aria-valuenow="props.modelValue"
    @keydown="onKeydown"
  >
    <div class="absolute inset-y-0 left-0 w-full overflow-hidden rounded-[4px]">
      <div
        class="absolute inset-y-0 left-0 rounded-l-[4px] bg-mask-low"
        :style="{ width: leftWidth }"
      />
      <div
        class="absolute inset-y-0 rounded-r-[4px] bg-mask-high"
        :style="{ left: rightLeft, right: '0' }"
      />
    </div>
    <div
      class="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 box-border rounded-full border-2 border-white bg-mask-thumb"
      :style="{ left: knobLeft }"
    />
    <div
      class="absolute -translate-x-1/2 text-3xs leading-4 text-white"
      :style="{ left: knobLeft, top: '-20.5px' }"
    >
      {{ props.modelValue.toFixed(2) }}
    </div>
    <div class="absolute left-0 text-3xs leading-4 text-mask-thumb" :style="{ top: '10.5px' }">
      0.00
    </div>
    <div class="absolute right-0 text-3xs leading-4 text-mask-thumb" :style="{ top: '10.5px' }">
      1.00
    </div>
    <div
      ref="hit"
      class="absolute inset-x-0 -inset-y-[8px]"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
    />
  </div>
</template>
