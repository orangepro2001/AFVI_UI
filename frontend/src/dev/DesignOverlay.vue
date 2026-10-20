<script setup lang="ts">
import { computed, ref } from 'vue'

/**
 * Dev only. Lays a design image over the running UI at 1:1, so that every pixel of difference
 * can be seen: blend "difference" turns what matches black. Opened with a URL such as
 *   http://localhost:5173/?design=reference/home.png&blend=difference#/
 * (design/ is served at /__design by tools/vite-plugin-design-assets.ts).
 */
const props = defineProps<{
  /** Image path below design/. */
  image: string
  opacity?: number
  /** How far the capture is off the design frame: the image moves up/left by these pixels. */
  dx?: number
  dy?: number
  blend?: 'normal' | 'difference'
  /** false: no control panel (clean screenshots). */
  controls?: boolean
}>()

const opacity = ref(props.opacity ?? 0.5)
const blend = ref<'normal' | 'difference'>(props.blend ?? 'normal')
const dx = ref(-(props.dx ?? 0))
const dy = ref(-(props.dy ?? 0))
const visible = ref(true)

const imageStyle = computed(() => ({
  opacity: opacity.value,
  mixBlendMode: blend.value,
  transform: `translate(${dx.value}px, ${dy.value}px)`,
}))
</script>

<template>
  <img
    v-if="visible"
    :src="`/__design/${image}`"
    :style="imageStyle"
    class="pointer-events-none fixed top-0 left-0 z-[9998] max-w-none"
    alt=""
  />
  <form
    v-if="controls !== false"
    class="bg-popover text-popover-foreground border-border fixed right-3 bottom-3 z-[9999] flex flex-col gap-2 border p-3 text-2xs"
    @submit.prevent
  >
    <label class="flex items-center gap-2">
      Opacity
      <input v-model.number="opacity" type="range" min="0" max="1" step="0.05" />
      {{ opacity.toFixed(2) }}
    </label>
    <label class="flex items-center gap-2">
      Blend
      <select v-model="blend" class="bg-input px-1">
        <option value="normal">normal</option>
        <option value="difference">difference</option>
      </select>
    </label>
    <label class="flex items-center gap-2">
      Offset
      <input v-model.number="dx" type="number" class="bg-input w-12 px-1" aria-label="x" />
      <input v-model.number="dy" type="number" class="bg-input w-12 px-1" aria-label="y" />
    </label>
    <button type="button" class="bg-secondary px-2 py-1" @click="visible = !visible">
      {{ visible ? 'Hide' : 'Show' }} design
    </button>
  </form>
</template>
