<script setup lang="ts">
import { ref } from 'vue'
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import type { ImageRef } from '@/api/types'
import { grayOfImage } from '@/lib/gray'
import type { GrayPixels } from '@/lib/gray'

const props = withDefaults(
  defineProps<{
    image: ImageRef | null
    top?: number
    /** The picture is gray and its values are the read-out: the pointer event carries the value under it. */
    sample?: boolean
    class?: HTMLAttributes['class']
  }>(),
  { top: 15, sample: false, class: undefined },
)

const emit = defineEmits<{
  /** (x, y) in pixels of the shown picture; `gray` only when `sample` is set and the picture can be read. */
  pointer: [x: number, y: number, gray?: number]
}>()

const imageEl = ref<HTMLImageElement | null>(null)

// Centred in the viewer, 2px to the left as in the reference design (the viewer is 1056px wide there).
const imageStyle = () => ({
  left: `calc(50% - ${(props.image?.width ?? 0) / 2 + 2}px)`,
  top: `${props.top}px`,
})

// The gray values of the shown picture, read the first time the pointer needs one.
let sampled: { url: string; pixels: GrayPixels | null } | null = null

function grayAt(el: HTMLImageElement, fx: number, fy: number): number | undefined {
  if (!props.sample || !props.image) return undefined
  if (sampled?.url !== props.image.url || (sampled.pixels === null && el.complete)) {
    sampled = { url: props.image.url, pixels: grayOfImage(el) }
  }
  const pixels = sampled.pixels
  if (!pixels) return undefined
  const px = Math.min(pixels.width - 1, Math.floor(fx * pixels.width))
  const py = Math.min(pixels.height - 1, Math.floor(fy * pixels.height))
  return pixels.data[py * pixels.width + px]
}

function onPointerMove(event: PointerEvent) {
  const el = imageEl.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  if (x < 0 || y < 0 || x > rect.width || y > rect.height) return
  emit('pointer', Math.round(x), Math.round(y), grayAt(el, x / rect.width, y / rect.height))
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
