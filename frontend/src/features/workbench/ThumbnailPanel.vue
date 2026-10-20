<script setup lang="ts">
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import type { WorkbenchSnapshot } from '@/api/types'

defineProps<{
  thumbnail: WorkbenchSnapshot['thumbnail']
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div :class="cn('relative h-[280px] w-[143px] shrink-0 bg-muted', $props.class)">
    <img
      :src="thumbnail.url"
      alt="Strip overview"
      class="absolute top-[4px] left-[6px] h-[272px] w-[89px] object-fill"
      draggable="false"
    />
  </div>
</template>
