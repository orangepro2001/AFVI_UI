<script setup lang="ts">
import { ref } from 'vue'
import { GLYPH_VIEW_BOX, toolGlyphs } from './tool-glyphs'
import type { ToolGlyph } from './tool-glyphs'

type Variant = 'draw' | 'roi'

interface ToolItem {
  glyph: ToolGlyph
  label: string
}

interface ToolRow {
  /** Button top, in px relative to the viewer's top-left corner. */
  top: number
  left: ToolItem
  right?: ToolItem
}

const props = defineProps<{ variant: Variant }>()

// Labels are placeholders: the design gives no names for the tools.
const rows: ToolRow[] = [
  { top: 5, left: { glyph: 'select', label: 'Select' } },
  {
    top: 68,
    left: { glyph: 'rect', label: 'Rectangle' },
    right: { glyph: 'rectOffset', label: 'Rectangle with offset' },
  },
  {
    top: 105,
    left: { glyph: 'circle', label: 'Circle' },
    right: { glyph: 'circleOffset', label: 'Circle with offset' },
  },
  {
    top: 142,
    left: { glyph: 'blob', label: 'Free shape' },
    right: { glyph: 'blobOffset', label: 'Free shape with offset' },
  },
  {
    top: 206,
    left: { glyph: 'dashedRect', label: 'Rectangle mask' },
    right: { glyph: 'dashedRectPair', label: 'Rectangle mask pair' },
  },
  {
    top: 243,
    left: { glyph: 'dashedCircle', label: 'Circle mask' },
    right: { glyph: 'dashedCirclePair', label: 'Circle mask pair' },
  },
  {
    top: 280,
    left: { glyph: 'dashedBlob', label: 'Free mask' },
    right: { glyph: 'dashedBlobPair', label: 'Free mask pair' },
  },
  {
    top: 343,
    left: { glyph: 'pipette', label: 'Pipette' },
    right: { glyph: 'pencil', label: 'Pencil' },
  },
  {
    top: 406,
    left: { glyph: 'traces', label: 'Traces' },
    right: { glyph: 'chip', label: 'Chip' },
  },
  { top: 470, left: { glyph: 'crosshair', label: 'Center' } },
  {
    top: 527,
    left: { glyph: 'trash', label: 'Delete' },
    right: { glyph: 'save', label: 'Save' },
  },
]

// The two variants only differ in which tools are usable and in the selected-tone rule.
const ENABLED: Record<Variant, readonly ToolGlyph[]> = {
  draw: ['select', 'rect', 'trash'],
  roi: ['select', 'rect', 'trash', 'save'],
}

// trash and save are actions: they fire but never stay selected.
const ACTION: readonly ToolGlyph[] = ['trash', 'save']

/** The 20 buttons. The column is a 78px darker strip at the viewer's right edge; x counts from its left. */
const buttons = rows.flatMap((row) => [
  { ...row.left, x: 6, y: row.top },
  ...(row.right ? [{ ...row.right, x: 43, y: row.top }] : []),
])

const selected = ref<ToolGlyph>('rect')

function isEnabled(glyph: ToolGlyph) {
  return ENABLED[props.variant].includes(glyph)
}

function isSelected(glyph: ToolGlyph) {
  if (ACTION.includes(glyph)) return false
  return isEnabled(glyph) && selected.value === glyph
}

// The roi variant's selected button has no distinct colour, so it matches an ordinary
// enabled button.
function buttonClass(glyph: ToolGlyph) {
  if (!isEnabled(glyph)) return 'border-tool-disabled text-tool-disabled'
  if (isSelected(glyph) && props.variant === 'draw') return 'border-tool-active text-tool-active'
  return 'border-tool-border text-tool-icon'
}

function pick(glyph: ToolGlyph) {
  if (!isEnabled(glyph) || ACTION.includes(glyph)) return
  selected.value = glyph
}
</script>

<template>
  <div class="absolute inset-y-0 right-0 w-[78px] bg-card">
    <button
      v-for="item in buttons"
      :key="item.glyph"
      type="button"
      :aria-label="item.label"
      :title="item.label"
      :aria-pressed="isSelected(item.glyph)"
      :disabled="!isEnabled(item.glyph)"
      :class="['absolute size-[30px] rounded-[8px] border-2 bg-card', buttonClass(item.glyph)]"
      :style="{ left: `${item.x}px`, top: `${item.y}px` }"
      @click="pick(item.glyph)"
    >
      <svg
        :viewBox="GLYPH_VIEW_BOX"
        aria-hidden="true"
        class="pointer-events-none absolute -top-[2px] -left-[2px] size-[30px]"
      >
        <path :d="toolGlyphs[item.glyph]" fill="currentColor" fill-rule="evenodd" />
      </svg>
    </button>
  </div>
</template>
