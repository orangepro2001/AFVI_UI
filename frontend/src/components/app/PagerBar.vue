<script setup lang="ts">
import { ChevronsLeft, ChevronsRight } from '@lucide/vue'

const props = defineProps<{ pageCount: number }>()
const page = defineModel<number>({ required: true })

const go = (delta: number) => {
  page.value = Math.min(Math.max(page.value + delta, 1), props.pageCount)
}
</script>

<template>
  <div class="flex items-center justify-center">
    <button
      type="button"
      class="hover:bg-accent text-foreground/30 flex h-[22px] w-[28px] items-center justify-center border border-white/10"
      :disabled="page <= 1"
      aria-label="Previous page"
      @click="go(-1)"
    >
      <ChevronsLeft class="size-4 stroke-[1.5]" />
    </button>
    <span class="w-[93px] text-center text-2xs font-semibold">{{ page }}/{{ pageCount }}</span>
    <button
      type="button"
      class="hover:bg-accent text-foreground/30 flex h-[22px] w-[28px] items-center justify-center border border-white/10"
      :disabled="page >= pageCount"
      aria-label="Next page"
      @click="go(1)"
    >
      <ChevronsRight class="size-4 stroke-[1.5]" />
    </button>
  </div>
</template>
