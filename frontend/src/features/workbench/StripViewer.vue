<script setup lang="ts">
import { ref } from 'vue'
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import type { ImageRef } from '@/api/types'

const props = withDefaults(
  defineProps<{
    image: ImageRef | null
    top?: number
    class?: HTMLAttributes['class']
  }>(),
  { top: 15, class: undefined },
)

const emit = defineEmits<{
  pointer: [x: number, y: number]
}>()

const imageEl = ref<HTMLImageElement | null>(null)

// Centred in the viewer, 2px to the left as in the reference design (the viewer is 1056px wide there).
const imageStyle = () => ({
  left: `calc(50% - ${(props.image?.width ?? 0) / 2 + 2}px)`,
  top: `${props.top}px`,
})

function onPointerMove(event: PointerEvent) {
  const el = imageEl.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  if (x < 0 || y < 0 || x > rect.width || y > rect.height) return
  emit('pointer', Math.round(x), Math.round(y))
}
</script>

<template>
  <div
    :class="cn('relative min-w-0 flex-1 overflow-hidden bg-muted', $props.class)"
    @pointermove="onPointerMove"
  >
    <template v-if="image">
      <img
        ref="imageEl"
        :src="image.url"
        :width="image.width"
        :height="image.height"
        class="absolute max-w-none"
        :style="imageStyle()"
        draggable="false"
      />
      <div
        class="absolute"
        :style="{ ...imageStyle(), width: `${image.width}px`, height: `${image.height}px` }"
      >
        <slot name="overlay" />
      </div>
    </template>
    <slot name="tools" />
  </div>
</template>
