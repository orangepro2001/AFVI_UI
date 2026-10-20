<script setup lang="ts" generic="T extends object">
import { useElementSize } from '@vueuse/core'
import { cn } from 'cn'
import { computed, useTemplateRef, type HTMLAttributes } from 'vue'
import { bodyRowCount, groupHeaders } from './data-grid'
import type { GridColumn } from './types'

const props = withDefaults(
  defineProps<{
    columns: GridColumn[]
    rows: T[]
    /** Blank rows are added up to this many, so an empty grid still looks like a grid. */
    minRows?: number
    /** Blank rows are added until the grid fills the height of its parent. */
    fill?: boolean
    class?: HTMLAttributes['class']
    /** Added to every header cell. */
    headClass?: HTMLAttributes['class']
    /** false: only the header has lines (the monitoring tiles). */
    bordered?: boolean
    rowHeight?: number
    headHeight?: number
  }>(),
  {
    minRows: 0,
    fill: false,
    bordered: true,
    rowHeight: 19,
    headHeight: 20,
    class: undefined,
    headClass: undefined,
  },
)

defineSlots<{
  [slot: `cell-${string}`]: (props: { row: T; value: unknown; index: number }) => unknown
}>()

const wrapper = useTemplateRef<HTMLElement>('wrapper')
const { height } = useElementSize(wrapper)

const groups = computed(() => groupHeaders(props.columns))
const headerHeight = computed(() => props.headHeight * (groups.value ? 2 : 1))
const rowCount = computed(() =>
  bodyRowCount({
    rows: props.rows.length,
    minRows: props.minRows,
    fillHeight: props.fill ? height.value : 0,
    headHeight: headerHeight.value,
    rowHeight: props.rowHeight,
  }),
)
const blankRows = computed(() => Math.max(0, rowCount.value - props.rows.length))

const cellBorder = computed(() => (props.bordered ? 'border-grid border' : ''))
const align = { left: 'text-left', center: 'text-center', right: 'text-right' } as const
const valueOf = (row: T, key: string): unknown => (row as Record<string, unknown>)[key]
</script>

<template>
  <div ref="wrapper" :class="cn('min-h-0', fill && 'h-full overflow-hidden', props.class)">
    <table class="w-full table-fixed border-collapse leading-none">
      <colgroup>
        <col v-for="column in columns" :key="column.key" :style="{ width: column.width }" />
      </colgroup>
      <thead class="bg-grid-head text-2xs font-bold text-white">
        <tr v-if="groups" :style="{ height: `${headHeight}px` }">
          <th
            v-for="(group, i) in groups"
            :key="i"
            :colspan="group.span"
            :class="cn('border-grid border p-0 font-bold', props.headClass, group.class)"
          >
            {{ group.label }}
          </th>
        </tr>
        <tr :style="{ height: `${headHeight}px` }">
          <th
            v-for="column in columns"
            :key="column.key"
            :class="cn('border-grid border p-0 font-bold', props.headClass, column.headClass)"
          >
            {{ column.label }}
          </th>
        </tr>
      </thead>
      <tbody class="bg-grid-row">
        <tr v-for="(row, index) in rows" :key="index" :style="{ height: `${rowHeight}px` }">
          <td
            v-for="column in columns"
            :key="column.key"
            :class="cn(cellBorder, 'p-0', align[column.align ?? 'center'], column.cellClass)"
          >
            <slot
              :name="`cell-${column.key}`"
              :row="row"
              :value="valueOf(row, column.key)"
              :index="index"
            >
              {{ valueOf(row, column.key) }}
            </slot>
          </td>
        </tr>
        <tr v-for="n in blankRows" :key="`blank-${n}`" :style="{ height: `${rowHeight}px` }">
          <td v-for="column in columns" :key="column.key" :class="cn(cellBorder, 'p-0')" />
        </tr>
      </tbody>
    </table>
  </div>
</template>
