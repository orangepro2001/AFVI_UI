<script setup lang="ts">
import { ref } from 'vue'
import type { Component } from 'vue'
import {
  Brush,
  Circle,
  CircleDashed,
  Columns3,
  Grid2x2Check,
  Hexagon,
  Lasso,
  MousePointer2,
  Pencil,
  Pipette,
  Rows3,
  Save,
  Spline,
  Square,
  SquareDashed,
  SquareDashedMousePointer,
  Trash2,
} from '@lucide/vue'

type ToolKey =
  | 'select'
  | 'rectFill'
  | 'rectGray'
  | 'circleFill'
  | 'circleBrush'
  | 'lassoCircle'
  | 'lassoPoly'
  | 'dashedRect'
  | 'dashedPick'
  | 'dashedCircle'
  | 'hexagon'
  | 'lasso'
  | 'spline'
  | 'pipette'
  | 'pencil'
  | 'rows'
  | 'columns'
  | 'gridCheck'
  | 'trash'
  | 'save'

interface ToolItem {
  id: ToolKey
  label: string
  icon: Component
}

interface ToolRow {
  /** Centre y, relative to the viewer's top-left corner. */
  y: number
  items: ToolItem[]
}

// Button centres relative to the tool column, which sticks to the viewer's right edge (73px wide).
// In the reference the viewer is 1059px wide and the right column ends 1.5px short of its edge.
const LEFT = 17
const RIGHT = 55

const rows: ToolRow[] = [
  { y: 23, items: [{ id: 'select', label: 'Select', icon: MousePointer2 }] },
  {
    y: 86,
    items: [
      { id: 'rectFill', label: 'Rectangle', icon: Square },
      { id: 'rectGray', label: 'Rectangle (outline)', icon: Square },
    ],
  },
  {
    y: 123,
    items: [
      { id: 'circleFill', label: 'Circle', icon: Circle },
      { id: 'circleBrush', label: 'Circle brush', icon: Brush },
    ],
  },
  {
    y: 160,
    items: [
      { id: 'lassoCircle', label: 'Circle lasso', icon: CircleDashed },
      { id: 'lassoPoly', label: 'Polygon lasso', icon: Hexagon },
    ],
  },
  {
    y: 223,
    items: [
      { id: 'dashedRect', label: 'Dashed rectangle', icon: SquareDashed },
      { id: 'dashedPick', label: 'Dashed pick', icon: SquareDashedMousePointer },
    ],
  },
  {
    y: 260,
    items: [
      { id: 'dashedCircle', label: 'Dashed circle', icon: CircleDashed },
      { id: 'hexagon', label: 'Hexagon', icon: Hexagon },
    ],
  },
  {
    y: 297,
    items: [
      { id: 'lasso', label: 'Lasso', icon: Lasso },
      { id: 'spline', label: 'Spline', icon: Spline },
    ],
  },
  {
    y: 361,
    items: [
      { id: 'pipette', label: 'Pipette', icon: Pipette },
      { id: 'pencil', label: 'Pencil', icon: Pencil },
    ],
  },
  {
    y: 424,
    items: [
      { id: 'rows', label: 'Rows', icon: Rows3 },
      { id: 'columns', label: 'Columns', icon: Columns3 },
    ],
  },
  { y: 487, items: [{ id: 'gridCheck', label: 'Grid', icon: Grid2x2Check }] },
  {
    y: 545,
    items: [
      { id: 'trash', label: 'Delete', icon: Trash2 },
      { id: 'save', label: 'Save', icon: Save },
    ],
  },
]

const enabled: ToolKey[] = ['select', 'rectFill', 'trash']
const selected = ref<ToolKey>('rectFill')

function isEnabled(id: ToolKey) {
  return enabled.includes(id)
}

function isSelected(id: ToolKey) {
  return id !== 'trash' && selected.value === id
}

function buttonClass(id: ToolKey) {
  if (!isEnabled(id)) return 'border-tool-disabled text-tool-disabled'
  if (isSelected(id)) return 'border-tool-active text-tool-active'
  return 'border-tool-border text-tool-icon'
}

function pick(id: ToolKey) {
  if (!isEnabled(id) || id === 'trash') return
  selected.value = id
}
</script>

<template>
  <div class="absolute inset-y-0 right-0 w-[73px]">
    <template v-for="row in rows" :key="row.y">
      <button
        v-for="(item, index) in row.items"
        :key="item.id"
        type="button"
        :aria-label="item.label"
        :aria-pressed="isSelected(item.id)"
        :disabled="!isEnabled(item.id)"
        :class="[
          'absolute flex size-[33px] items-center justify-center rounded-[8px] border-2 bg-muted',
          buttonClass(item.id),
        ]"
        :style="{ left: `${(index === 0 ? LEFT : RIGHT) - 16.5}px`, top: `${row.y - 16.5}px` }"
        @click="pick(item.id)"
      >
        <component :is="item.icon" class="size-[17px]" />
      </button>
    </template>
  </div>
</template>
