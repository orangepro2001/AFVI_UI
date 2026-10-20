<script setup lang="ts">
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import type { AnalysisRow } from '@/api/types'
import ScrollBar from '@/components/app/ScrollBar.vue'
import type { AnalysisChannel } from '@/stores/teach'
import type { LightId } from '@/stores/workbench'

const props = withDefaults(
  defineProps<{
    light: LightId
    channel: AnalysisChannel
    rows: AnalysisRow[]
    class?: HTMLAttributes['class']
  }>(),
  { class: undefined },
)

const emit = defineEmits<{ 'update:channel': [channel: AnalysisChannel] }>()

const channels: { id: AnalysisChannel; label: string; left: number; width: number }[] = [
  { id: 'red', label: 'Red', left: 0, width: 93 },
  { id: 'green', label: 'Green', left: 94, width: 93 },
  { id: 'blue', label: 'Blue', left: 188, width: 91 },
]
</script>

<template>
  <div
    :class="cn('relative h-full w-[279px] overflow-hidden bg-sheet-row', props.class)"
    :data-light="light"
  >
    <table class="absolute top-[2px] left-0 w-[279px] table-fixed border-collapse text-3xs">
      <thead>
        <tr class="h-[15px] bg-sheet-head text-sheet-muted">
          <th class="w-[38px] font-normal">No.</th>
          <th class="w-[148px] border-l border-white/10 font-normal">Name</th>
          <th class="border-l border-white/10 font-normal">Value</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in props.rows" :key="row.no" class="h-[15px]">
          <td class="text-center">{{ row.no }}</td>
          <td class="border-l border-white/10 pl-1">{{ row.name }}</td>
          <td class="border-l border-white/10 pl-1">{{ row.value }}</td>
        </tr>
      </tbody>
    </table>

    <table class="absolute top-[174px] left-0 w-[279px] table-fixed border-collapse text-3xs">
      <thead>
        <tr class="h-[15px] bg-sheet-head text-sheet-muted">
          <th class="w-[38px] font-normal">No.</th>
          <th class="w-[148px] border-l border-white/10 font-normal">Name</th>
          <th class="border-l border-white/10 font-normal">Value</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in props.rows" :key="row.no" class="h-[15px]">
          <td class="text-center">{{ row.no }}</td>
          <td class="border-l border-white/10 pl-1">{{ row.name }}</td>
          <td class="border-l border-white/10 pl-1">{{ row.value }}</td>
        </tr>
      </tbody>
    </table>

    <div class="absolute top-[343px] left-0 h-6 w-[279px]">
      <button
        v-for="item in channels"
        :key="item.id"
        type="button"
        role="tab"
        :aria-selected="props.channel === item.id"
        :class="
          cn(
            'absolute top-0 flex h-6 items-center justify-center border-b-2 text-3xs font-bold text-tab-foreground',
            item.id === 'red' ? 'bg-tab-channel-red' : 'bg-tab-channel',
            props.channel === item.id ? 'border-foreground/40' : 'border-transparent',
          )
        "
        :style="{ left: `${item.left}px`, width: `${item.width}px` }"
        @click="emit('update:channel', item.id)"
      >
        {{ item.label }}
      </button>
    </div>

    <table class="absolute top-[371px] left-0 w-[279px] table-fixed border-collapse text-3xs">
      <thead>
        <tr class="h-[15px] bg-sheet-head text-sheet-muted">
          <th class="w-[38px] font-normal">No.</th>
          <th class="w-[148px] border-l border-white/10 font-normal">Name</th>
          <th class="w-[60px] border-l border-white/10 font-normal">Value</th>
          <th class="border-l border-white/10 font-normal">Min</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in props.rows" :key="row.no" class="h-[15px]">
          <td class="text-center">{{ row.no }}</td>
          <td class="border-l border-white/10 pl-1">{{ row.name }}</td>
          <td class="border-l border-white/10 pl-1">{{ row.value }}</td>
          <td class="border-l border-white/10 pl-1">{{ row.min ?? '' }}</td>
        </tr>
      </tbody>
    </table>

    <ScrollBar orientation="horizontal" :size="0.78" class="absolute bottom-[4px] left-0 w-full" />
  </div>
</template>
