<script setup lang="ts">
import { cn } from 'cn'
import { computed, ref, watch, type HTMLAttributes } from 'vue'
import type { AnalysisRow } from '@/api/types'
import ScrollBar from '@/components/app/ScrollBar.vue'
import ToggleSwitch from '@/components/app/ToggleSwitch.vue'
import type { AnalysisChannel, AnalysisTableId, AnalysisTables } from '@/stores/teach'
import type { LightId } from '@/stores/workbench'

const props = withDefaults(
  defineProps<{
    light: LightId
    channel: AnalysisChannel
    tables: AnalysisTables
    class?: HTMLAttributes['class']
  }>(),
  { class: undefined },
)

const emit = defineEmits<{
  'update:channel': [channel: AnalysisChannel]
  toggle: [table: AnalysisTableId, no: number]
}>()

const channels: { id: AnalysisChannel; label: string; left: number; width: number }[] = [
  { id: 'red', label: 'Red', left: 0, width: 93 },
  { id: 'green', label: 'Green', left: 94, width: 93 },
  { id: 'blue', label: 'Blue', left: 188, width: 91 },
]

/** Row pitch of the reference (a Qt table scaled to the screen). */
const ROW = 15.82
/** Top of the header of each table, relative to the panel (design y 197, 368 and 566). */
const HEAD_TOP = { upper: 0, lower: 171, channel: 369 } as const
/** A header is 17px of background and a 2px lighter line under it. */
const HEAD_HEIGHT = 19

const tableIds: AnalysisTableId[] = ['upper', 'lower', 'channel']

const bodies = computed<{ id: AnalysisTableId; rows: AnalysisRow[] }[]>(() => [
  { id: 'upper', rows: props.tables.upper },
  { id: 'lower', rows: props.tables.lower },
  { id: 'channel', rows: props.tables.channel },
])

/** The rows start right under the header. */
function bodyTop(id: AnalysisTableId) {
  return `${HEAD_TOP[id] + HEAD_HEIGHT}px`
}

/** The box that scrolls the rows of the channel table; the horizontal ScrollBar takes the bottom. */
const channelBody = ref<HTMLElement | null>(null)

watch(
  () => props.tables.channel,
  () => {
    if (channelBody.value) channelBody.value.scrollTop = 0
  },
)

function rowTop(index: number) {
  return `${index * ROW}px`
}

function rowStyle(index: number) {
  return { top: rowTop(index), height: `${ROW}px`, lineHeight: `${ROW}px` }
}

function nameClass(row: AnalysisRow) {
  switch (row.tone) {
    case 'green':
      return 'text-analysis-green'
    case 'yellow':
      return 'text-analysis-yellow'
    default:
      return 'text-analysis-plain'
  }
}

function valueClass(id: AnalysisTableId) {
  switch (id) {
    case 'upper':
      return 'justify-center text-center'
    case 'lower':
      return 'text-right pr-[3px]'
    default:
      return 'pl-1'
  }
}
</script>

<template>
  <div
    :class="cn('relative h-full w-[279px] overflow-hidden bg-sheet-row', props.class)"
    :data-light="light"
  >
    <div
      v-for="id in tableIds"
      :key="`head-${id}`"
      :data-head="id"
      class="absolute left-0 flex w-[279px] border-b-2 border-b-white/5 bg-sheet-head bg-clip-padding text-3xs leading-[17px] text-sheet-muted"
      :style="{ top: `${HEAD_TOP[id]}px`, height: `${HEAD_HEIGHT}px` }"
    >
      <div class="w-[38px] shrink-0 text-center">No.</div>
      <div class="w-[148px] shrink-0 border-l border-white/10 text-center">Name</div>
      <div class="w-[74px] shrink-0 border-l border-white/10 text-center">Value</div>
      <div
        class="w-[19px] shrink-0 overflow-hidden border-l border-white/10 pl-1 whitespace-nowrap"
      >
        {{ id === 'channel' ? 'Min' : '' }}
      </div>
    </div>

    <!-- Red / Green / Blue: 24px tabs, then a 2px line in the colour of the channel and a dark hairline -->
    <div class="absolute top-[342px] left-0 h-[27px] w-[279px]">
      <button
        v-for="item in channels"
        :key="item.id"
        type="button"
        role="tab"
        :aria-selected="props.channel === item.id"
        :class="
          cn(
            'absolute top-0 flex h-6 items-center justify-center text-3xs font-bold text-tab-foreground',
            item.id === 'red' ? 'bg-tab-channel-red' : 'bg-tab-channel',
          )
        "
        :style="{ left: `${item.left}px`, width: `${item.width}px` }"
        @click="emit('update:channel', item.id)"
      >
        {{ item.label }}
      </button>
      <div class="absolute top-6 left-0 h-[2px] w-full bg-tab-channel-red" />
      <div class="absolute top-[26px] left-0 h-px w-full bg-grid" />
    </div>

    <div
      v-for="table in bodies"
      :key="table.id"
      :ref="
        (el) => {
          if (table.id === 'channel') channelBody = el as HTMLElement | null
        }
      "
      :data-table="table.id"
      :class="
        table.id === 'channel'
          ? 'absolute left-0 w-[279px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          : 'absolute left-0 w-[279px]'
      "
      :style="
        table.id === 'channel'
          ? { top: bodyTop(table.id), bottom: '20px' }
          : { top: bodyTop(table.id) }
      "
    >
      <div
        :class="table.id === 'channel' ? 'relative w-[279px]' : 'contents'"
        :style="table.id === 'channel' ? { height: `${table.rows.length * ROW}px` } : undefined"
      >
        <div
          v-for="(row, index) in table.rows"
          :key="row.no"
          :data-row="row.no"
          class="absolute left-0 flex w-[279px] items-center text-3xs"
          :style="rowStyle(index)"
        >
          <div class="w-[38px] shrink-0 text-center text-analysis-no">{{ row.no }}</div>
          <div class="w-[148px] shrink-0 truncate pl-1" :class="nameClass(row)">
            {{ row.name }}
          </div>
          <div class="flex w-[74px] shrink-0 items-center" :class="valueClass(table.id)">
            <ToggleSwitch
              v-if="typeof row.value === 'boolean'"
              variant="table"
              :model-value="row.value"
              @update:model-value="emit('toggle', table.id, row.no)"
            />
            <span v-else class="w-full truncate text-analysis-value">{{ row.value }}</span>
          </div>
          <div class="w-[19px] shrink-0 pl-1 text-analysis-value">
            <template v-if="table.id === 'channel'">{{ row.min ?? '' }}</template>
          </div>
        </div>
      </div>
    </div>

    <ScrollBar orientation="horizontal" :size="0.78" class="absolute bottom-[4px] left-0 w-full" />
  </div>
</template>
