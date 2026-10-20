<script setup lang="ts">
import { Maximize } from '@lucide/vue'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ToolItem } from './navigation'

defineProps<{ tools: ToolItem[] }>()
defineEmits<{ select: [id: string]; fullscreen: [] }>()
</script>

<template>
  <aside class="bg-rail flex w-rail shrink-0 flex-col items-center pt-[6px] pb-[5px]">
    <Tooltip v-for="tool in tools" :key="tool.id">
      <TooltipTrigger as-child>
        <button
          type="button"
          class="text-foreground/85 hover:bg-accent flex h-[52px] w-full items-center justify-center"
          :aria-label="tool.label"
          @click="$emit('select', tool.id)"
        >
          <component :is="tool.icon" class="size-[30px]" :stroke-width="1.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{{ tool.label }}</TooltipContent>
    </Tooltip>

    <button
      type="button"
      class="text-foreground/85 hover:bg-accent mt-auto flex h-[52px] w-full items-center justify-center"
      aria-label="Full screen"
      @click="$emit('fullscreen')"
    >
      <Maximize class="size-[30px]" :stroke-width="1.5" />
    </button>
  </aside>
</template>
