<script setup lang="ts">
import { nextTick, onMounted, useTemplateRef, watch } from 'vue'
import type { LogEntry } from '@/api/types'

const props = defineProps<{ entries: LogEntry[] }>()

const scroller = useTemplateRef<HTMLElement>('scroller')
let pinned = true

const toBottom = () => {
  const el = scroller.value
  if (el) el.scrollTop = el.scrollHeight
}

function onScroll(event: Event) {
  const el = event.currentTarget as HTMLElement
  pinned = el.scrollHeight - el.scrollTop - el.clientHeight < 4
}

// Follow the tail, unless the operator scrolled up to read something.
watch(
  () => props.entries.length,
  async () => {
    if (!pinned) return
    await nextTick()
    toBottom()
  },
)
onMounted(toBottom)

const levelClass: Record<LogEntry['level'], string> = {
  info: 'text-log-info',
  notice: 'text-notice',
  select: 'text-light-blue',
  dim: 'text-foreground/35',
}
</script>

<template>
  <div class="bg-card flex flex-col pt-[4px]">
    <div
      ref="scroller"
      class="bg-log min-h-0 flex-1 overflow-y-auto pt-[2px] pb-[4px] pl-[6px] text-2xs leading-[15.8px]"
      data-selectable
      @scroll="onScroll"
    >
      <p
        v-for="(entry, i) in entries"
        :key="i"
        :class="[levelClass[entry.level], 'whitespace-pre']"
      >
        <span>{{ entry.time }}</span>
        <span class="ml-[4px]">{{ entry.text }}</span>
      </p>
    </div>
  </div>
</template>
