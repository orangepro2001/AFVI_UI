<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { X } from '@lucide/vue'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import type { MedianLight } from '@/api/types'
import { useApi } from '@/api'
import PlainCheckbox from '@/components/app/PlainCheckbox.vue'
import { parseRandomCount, pickRandomCells, type MedianSelection } from './median'

const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ save: [selection: MedianSelection] }>()

const api = useApi()

// The unit map is a grid of 1px lines inside this box (design pixels).
const MAP_WIDTH = 145
const MAP_HEIGHT = 506
// Left edge of the four Light check boxes.
const LIGHT_LEFT = [7, 68, 128, 189]

const lights = ref<MedianLight[]>([])
const columns = ref(0)
const rows = ref(0)
const selected = ref<boolean[]>([])
const random = ref(false)
const randomText = ref('')

// Guards against a slow, earlier load overwriting the state of a later open.
let loadSeq = 0

const cellCount = computed(() => columns.value * rows.value)
const cellWidth = computed(() => (columns.value ? MAP_WIDTH / columns.value : 0))
const cellHeight = computed(() => (rows.value ? MAP_HEIGHT / rows.value : 0))

const gridPath = computed(() => {
  const lines: string[] = []
  for (let i = 0; i <= columns.value; i++) {
    lines.push(`M ${0.5 + i * cellWidth.value} 0 V ${MAP_HEIGHT + 1}`)
  }
  for (let j = 0; j <= rows.value; j++) {
    lines.push(`M 0 ${0.5 + j * cellHeight.value} H ${MAP_WIDTH + 1}`)
  }
  return lines.join(' ')
})

const cells = computed(() =>
  Array.from({ length: cellCount.value }, (_, index) => ({
    index,
    x: 0.5 + (index % columns.value) * cellWidth.value,
    y: 0.5 + Math.floor(index / columns.value) * cellHeight.value,
  })),
)

async function load() {
  const seq = ++loadSeq
  random.value = false
  try {
    const setup = await api.getMedianSetup()
    if (seq !== loadSeq) return
    lights.value = setup.lights
    columns.value = setup.columns
    rows.value = setup.rows
    selected.value = new Array<boolean>(setup.columns * setup.rows).fill(false)
    randomText.value = String(setup.randomCount)
  } catch {
    if (seq !== loadSeq) return
    lights.value = []
    columns.value = 0
    rows.value = 0
    selected.value = []
  }
}

watch(
  open,
  (isOpen) => {
    if (isOpen) {
      void load()
    } else {
      // Invalidate any request still in flight when the dialog closes.
      loadSeq++
    }
  },
  { immediate: true },
)

function toggleCell(index: number) {
  selected.value[index] = !selected.value[index]
}

function selectAll() {
  selected.value = selected.value.map(() => true)
}

function clearAll() {
  selected.value = selected.value.map(() => false)
}

// "Select Random Units" replaces the selection with that many cells picked at random.
function pickRandom() {
  const count = parseRandomCount(randomText.value, cellCount.value)
  if (count === null) return
  randomText.value = String(count)
  const picked = new Set(pickRandomCells(cellCount.value, count))
  selected.value = selected.value.map((_, index) => picked.has(index))
}

watch(random, (on) => {
  if (on) pickRandom()
})

function onRandomInput(event: Event) {
  const field = event.target as HTMLInputElement
  randomText.value = field.value.replace(/\D/g, '')
  field.value = randomText.value
}

function save() {
  emit('save', {
    lights: lights.value.filter((light) => light.enabled && light.checked).map((light) => light.id),
    cells: selected.value.flatMap((on, index) => (on ? [index] : [])),
  })
  open.value = false
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50" />
      <DialogContent
        class="border-plain-frame bg-plain-body fixed top-[calc(50%-12.5px)] left-1/2 z-50 h-[594px] w-[480px] -translate-x-1/2 -translate-y-1/2 border outline-none"
        @interact-outside.prevent
      >
        <DialogDescription class="sr-only">Median</DialogDescription>

        <div class="bg-plain-title absolute top-0 left-0 h-[28px] w-full">
          <DialogTitle
            class="text-3xs text-plain-text absolute top-[17px] left-[10px] -translate-y-1/2"
          >
            Median
          </DialogTitle>
          <DialogClose
            class="text-plain-text absolute top-[10px] left-[462px] -translate-x-1/2 -translate-y-1/2 outline-none"
            aria-label="Close"
          >
            <X class="size-[9px]" :stroke-width="2.75" />
          </DialogClose>
        </div>

        <PlainCheckbox
          v-for="(light, i) in lights"
          :key="light.id"
          v-model="light.checked"
          :label="light.label"
          :disabled="!light.enabled"
          class="absolute top-[34px] h-[11px]"
          :style="{ left: `${LIGHT_LEFT[i]}px` }"
        />

        <div class="bg-muted absolute top-[56px] left-[7px] h-[530px] w-[246px]">
          <svg
            :viewBox="`0 0 ${MAP_WIDTH + 1} ${MAP_HEIGHT + 1}`"
            :width="MAP_WIDTH + 1"
            :height="MAP_HEIGHT + 1"
            class="absolute top-[11px] left-[20px]"
            role="group"
            aria-label="Units"
          >
            <rect
              v-for="cell in cells"
              :key="cell.index"
              :data-cell="cell.index"
              :x="cell.x"
              :y="cell.y"
              :width="cellWidth"
              :height="cellHeight"
              role="checkbox"
              :aria-checked="selected[cell.index]"
              :aria-label="`Unit ${cell.index + 1}`"
              :class="selected[cell.index] ? 'fill-median-grid/40' : 'fill-transparent'"
              @click="toggleCell(cell.index)"
            />
            <path :d="gridPath" class="stroke-median-grid pointer-events-none" fill="none" />
          </svg>
        </div>

        <button
          type="button"
          class="border-dialog-line-dim bg-sheet-row text-2xs text-plain-text hover:bg-dialog-button-hover absolute top-[56px] left-[257px] h-[37px] w-[105px] border outline-none"
          @click="clearAll"
        >
          Clear All
        </button>
        <button
          type="button"
          class="border-dialog-line bg-sheet-row text-2xs text-plain-text hover:bg-dialog-button-hover absolute top-[56px] left-[366px] h-[37px] w-[106px] border outline-none"
          @click="selectAll"
        >
          Select All
        </button>

        <PlainCheckbox
          v-model="random"
          label="Select Random Units :"
          class="absolute top-[107px] left-[258px] h-[11px]"
        />
        <input
          :value="randomText"
          :disabled="!random"
          inputmode="numeric"
          aria-label="Random units"
          class="border-plain-field-line bg-dialog-field text-2xs text-plain-text disabled:text-dialog-text-dim disabled:bg-secondary absolute top-[102px] left-[399px] h-[19px] w-[56px] border px-[3px] outline-none"
          @input="onRandomInput"
          @change="pickRandom"
        />

        <button
          type="button"
          class="border-dialog-line-dim bg-sheet-row text-2xs text-plain-text hover:bg-dialog-button-hover absolute top-[548px] left-[257px] h-[38px] w-[215px] border outline-none"
          @click="save"
        >
          SAVE
        </button>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
