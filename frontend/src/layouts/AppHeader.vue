<script setup lang="ts">
import { computed } from 'vue'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useClock } from '@/composables/useClock'
import { formatClock, formatDateTime, formatDateWithWeekday } from '@/lib/format'
import { useAppStore } from '@/stores/app'
import { headerTools } from './navigation'

const app = useAppStore()
const now = useClock()

const clock = computed(() => formatClock(now.value))
const date = computed(() => formatDateWithWeekday(now.value))
const since = computed(() => formatDateTime(app.user.since))
</script>

<template>
  <header class="bg-header relative flex h-header shrink-0 items-center pr-[15px] pl-[10px]">
    <div>
      <h1 class="text-title text-[17px] leading-[22px] font-light">
        Pixel Vision Inspection System - Master
      </h1>
      <p class="text-subtle mt-[4px] text-3xs leading-[13px]">
        Provide high quality and high speed inspection machines
      </p>
    </div>

    <div
      class="text-foreground/90 absolute left-1/2 -translate-x-1/2 text-center text-3xs leading-[12px]"
    >
      <p>{{ clock }}</p>
      <p>{{ date }}</p>
    </div>

    <div class="ml-auto flex items-center gap-[70px]">
      <div class="text-subtle text-center text-3xs leading-[14px]">
        <p>{{ app.user.name }}</p>
        <p>{{ since }}</p>
      </div>
      <div class="flex items-center gap-[25px]">
        <Tooltip v-for="tool in headerTools" :key="tool.id">
          <TooltipTrigger as-child>
            <button
              type="button"
              class="text-icon-accent hover:text-foreground"
              :aria-label="tool.label"
            >
              <component :is="tool.icon" class="size-6" :stroke-width="1.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{{ tool.label }}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  </header>
</template>
