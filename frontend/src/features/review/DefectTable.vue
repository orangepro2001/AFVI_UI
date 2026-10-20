<script setup lang="ts">
import { cn } from 'cn'
import { computed, type HTMLAttributes } from 'vue'
import type { DefectRow } from '@/api/types'

const props = withDefaults(
  defineProps<{
    rows: DefectRow[]
    class?: HTMLAttributes['class']
  }>(),
  { class: undefined },
)

const columns = [
  { label: 'Image', width: 45 },
  { label: 'Merge ID', width: 56 },
  { label: 'CH', width: 47 },
  { label: 'Code', width: 204 },
  { label: 'Size', width: 65 },
  { label: 'Avr', width: 56 },
]

type Align = 'center' | 'left' | 'right'

const bodyAlign: Align[] = ['center', 'center', 'center', 'left', 'right', 'right']

function cellClass(index: number, align: Align) {
  return cn(
    index > 0 && 'border-l border-white/10',
    align === 'center' && 'text-center',
    align === 'left' && 'pl-1 text-left',
    align === 'right' && 'pr-1 text-right',
  )
}

const rootClass = computed(() => cn('relative h-full w-full bg-card', props.class))
</script>

<template>
  <div :class="rootClass">
    <div
      class="absolute top-[3px] left-[4px] flex h-[20px] w-[496px] items-center gap-1 bg-sheet-head pl-[6px] text-3xs text-foreground"
    >
      <span class="inline-block size-1 rounded-full bg-white" />
      <span>Inspection - Defect</span>
    </div>

    <div
      class="absolute top-[23px] left-[4px] flex h-[20px] w-[496px] border-t border-grid bg-sheet-head text-3xs text-foreground/90"
    >
      <div
        v-for="(column, index) in columns"
        :key="column.label"
        :class="
          cn('flex h-full items-center justify-center', index > 0 && 'border-l border-white/20')
        "
        :style="{ width: `${column.width}px` }"
      >
        {{ column.label }}
      </div>
    </div>

    <div class="absolute top-[43px] left-[4px] h-[438px] w-[496px] bg-sheet-row" />
    <div class="absolute top-[486px] bottom-[3px] left-[4px] w-[496px] bg-muted" />

    <div class="absolute top-[43px] left-[4px] w-[473px]">
      <div
        v-for="(row, rowIndex) in props.rows"
        :key="rowIndex"
        class="flex h-[16px] border-b border-white/10 text-3xs text-foreground"
      >
        <div :class="cellClass(0, bodyAlign[0]!)" :style="{ width: `${columns[0]!.width}px` }">
          {{ row.image }}
        </div>
        <div :class="cellClass(1, bodyAlign[1]!)" :style="{ width: `${columns[1]!.width}px` }">
          {{ row.mergeId }}
        </div>
        <div :class="cellClass(2, bodyAlign[2]!)" :style="{ width: `${columns[2]!.width}px` }">
          {{ row.ch }}
        </div>
        <div :class="cellClass(3, bodyAlign[3]!)" :style="{ width: `${columns[3]!.width}px` }">
          {{ row.code }}
        </div>
        <div :class="cellClass(4, bodyAlign[4]!)" :style="{ width: `${columns[4]!.width}px` }">
          {{ String(row.size) }}
        </div>
        <div :class="cellClass(5, bodyAlign[5]!)" :style="{ width: `${columns[5]!.width}px` }">
          {{ String(row.avr) }}
        </div>
      </div>
    </div>
  </div>
</template>
