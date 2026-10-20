<script setup lang="ts">
import { cn } from 'cn'
import { computed, type HTMLAttributes } from 'vue'

const props = withDefaults(
  defineProps<{
    image: { url: string; width: number; height: number }
    class?: HTMLAttributes['class']
  }>(),
  { class: undefined },
)

const rootClass = computed(() => cn('relative bg-muted', props.class))
</script>

<template>
  <div :class="rootClass">
    <div class="absolute top-[74px] left-[12px] box-content border border-white">
      <img
        :src="props.image.url"
        :width="props.image.width"
        :height="props.image.height"
        alt="Light strip"
        class="block"
        draggable="false"
      />
    </div>
  </div>
</template>
