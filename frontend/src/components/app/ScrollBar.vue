<script setup lang="ts">
import { cn } from 'cn'
import { computed, type HTMLAttributes } from 'vue'

/**
 * The square-headed scroll bar of the original application: a track with an arrow button at each
 * end and a dark thumb. It only draws; the owner scrolls and passes where the thumb sits.
 */
const props = withDefaults(
  defineProps<{
    orientation?: 'vertical' | 'horizontal'
    /** Where the thumb starts, as a fraction (0..1) of the track between the buttons. */
    start?: number
    /** How long the thumb is, as a fraction (0..1) of that track. */
    size?: number
    class?: HTMLAttributes['class']
  }>(),
  { orientation: 'vertical', start: 0, size: 1, class: undefined },
)

const emit = defineEmits<{ step: [direction: -1 | 1] }>()

const vertical = computed(() => props.orientation === 'vertical')

const arrows = {
  vertical: {
    back: '0,4 3.5,0 7,4',
    forward: '0,0 7,0 3.5,4',
    box: { width: 7, height: 4 },
  },
  horizontal: {
    back: '4,0 4,7 0,3.5',
    forward: '0,0 0,7 4,3.5',
    box: { width: 4, height: 7 },
  },
}

const glyph = computed(() => arrows[props.orientation])

const thumbStyle = computed(() => {
  const start = `${Math.min(Math.max(props.start, 0), 1) * 100}%`
  const size = `${Math.min(Math.max(props.size, 0), 1) * 100}%`
  return vertical.value ? { top: start, height: size } : { left: start, width: size }
})
</script>

<template>
  <div
    :class="cn('flex shrink-0 bg-input', vertical ? 'w-4 flex-col' : 'h-4 flex-row', props.class)"
    :data-orientation="orientation"
  >
    <button
      type="button"
      tabindex="-1"
      aria-label="Scroll back"
      class="flex size-4 shrink-0 items-center justify-center"
      @click="emit('step', -1)"
    >
      <svg :width="glyph.box.width" :height="glyph.box.height" class="fill-tool-icon">
        <polygon :points="glyph.back" />
      </svg>
    </button>
    <div :class="cn('relative flex-1', vertical ? 'my-px' : 'mx-px')">
      <div
        :class="cn('absolute bg-sheet-row', vertical ? 'left-1 w-[7px]' : 'top-1 h-[7px]')"
        :style="thumbStyle"
      />
    </div>
    <button
      type="button"
      tabindex="-1"
      aria-label="Scroll forward"
      class="flex size-4 shrink-0 items-center justify-center"
      @click="emit('step', 1)"
    >
      <svg :width="glyph.box.width" :height="glyph.box.height" class="fill-tool-icon">
        <polygon :points="glyph.forward" />
      </svg>
    </button>
  </div>
</template>
