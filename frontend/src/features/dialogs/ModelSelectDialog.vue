<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { ModelEntry } from '@/api/types'
import { useApi } from '@/api'
import AppDialog from '@/components/app/AppDialog.vue'
import DialogButton from '@/components/app/DialogButton.vue'
import ScrollBar from '@/components/app/ScrollBar.vue'

const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ apply: [model: ModelEntry] }>()

const api = useApi()

const models = ref<ModelEntry[]>([])
const selected = ref<string | null>(null)

// Guards against a slow, earlier load overwriting the state of a later open.
let loadSeq = 0

const ROW_HEIGHT = 15.82

const listEl = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const scrollHeight = ref(0)
const clientHeight = ref(0)

const thumbSize = computed(() => {
  if (scrollHeight.value <= 0) return 1
  return clamp(clientHeight.value / scrollHeight.value)
})

const thumbStart = computed(() => {
  if (scrollHeight.value <= 0) return 0
  return clamp(scrollTop.value / scrollHeight.value)
})

function clamp(value: number): number {
  return Math.min(Math.max(value, 0), 1)
}

function updateScroll() {
  const el = listEl.value
  if (!el) return
  scrollTop.value = el.scrollTop
  scrollHeight.value = el.scrollHeight
  clientHeight.value = el.clientHeight
}

function step(direction: -1 | 1) {
  const el = listEl.value
  if (!el) return
  el.scrollTop += direction * 3 * ROW_HEIGHT
  updateScroll()
}

async function load() {
  const seq = ++loadSeq
  selected.value = null
  try {
    const result = await api.getModels()
    if (seq !== loadSeq) return
    models.value = result
  } catch {
    if (seq !== loadSeq) return
    models.value = []
  }
  await nextTick()
  if (seq !== loadSeq) return
  const el = listEl.value
  if (el) el.scrollTop = 0
  updateScroll()
}

watch(open, (isOpen) => {
  if (isOpen) {
    void load()
  } else {
    // Invalidate any request still in flight when the dialog closes.
    loadSeq++
  }
})

function rowClass(model: ModelEntry): string {
  return selected.value === model.index ? 'bg-dialog-border/45' : ''
}

function select(model: ModelEntry) {
  selected.value = model.index
}

function choose(model: ModelEntry) {
  select(model)
  apply()
}

const activeDescendant = computed(() => {
  if (selected.value === null) return undefined
  return `model-row-${selected.value}`
})

function rowId(model: ModelEntry): string {
  return `model-row-${model.index}`
}

function moveSelection(target: number) {
  const list = models.value
  if (list.length === 0) return
  const index = Math.min(Math.max(target, 0), list.length - 1)
  const model = list[index]
  if (!model) return
  selected.value = model.index
  const el = listEl.value
  el?.querySelector<HTMLElement>(`#${rowId(model)}`)?.scrollIntoView?.({ block: 'nearest' })
}

function currentIndex(): number {
  if (selected.value === null) return -1
  return models.value.findIndex((m) => m.index === selected.value)
}

function onKeydown(event: KeyboardEvent) {
  const list = models.value
  switch (event.key) {
    case 'ArrowDown': {
      event.preventDefault()
      if (list.length === 0) return
      const index = currentIndex()
      moveSelection(index < 0 ? 0 : index + 1)
      break
    }
    case 'ArrowUp': {
      event.preventDefault()
      if (list.length === 0) return
      const index = currentIndex()
      moveSelection(index < 0 ? list.length - 1 : index - 1)
      break
    }
    case 'Home': {
      event.preventDefault()
      moveSelection(0)
      break
    }
    case 'End': {
      event.preventDefault()
      moveSelection(list.length - 1)
      break
    }
    case 'Enter': {
      event.preventDefault()
      if (selected.value === null) return
      apply()
      break
    }
  }
}

function apply() {
  if (!open.value) return
  const model = models.value.find((m) => m.index === selected.value)
  if (!model) return
  emit('apply', model)
  open.value = false
}
</script>

<template>
  <AppDialog v-model:open="open" title="Choose Model Names">
    <!-- List panel: origin (6, 6), 424 x 225 -->
    <div class="absolute top-[6px] left-[6px] h-[225px] w-[424px] overflow-hidden">
      <!-- Title bar -->
      <div class="bg-sheet-head absolute top-0 left-0 h-[18px] w-full">
        <p class="text-2xs text-foreground absolute top-1/2 left-[5px] -translate-y-1/2">
          Product - Model
        </p>
      </div>
      <!-- Rule under the title bar -->
      <div class="bg-dialog-list-rule absolute top-[18px] left-0 h-[2px] w-full" />

      <!-- Header row: 408 wide, 5 columns of 56/111/112/36/93 -->
      <div class="bg-sheet-head absolute top-[20px] left-0 flex h-[17px] w-[408px]">
        <div class="text-2xs text-foreground flex w-[56px] items-center justify-end pr-[4px]">
          Index
        </div>
        <div
          class="text-2xs text-foreground flex w-[111px] items-center justify-end border-l border-dialog-list-rule pr-[4px]"
        >
          Creation Date/Time
        </div>
        <div
          class="text-2xs text-foreground flex w-[112px] items-center justify-end border-l border-dialog-list-rule pr-[4px]"
        >
          Name
        </div>
        <div
          class="text-2xs text-foreground flex w-[36px] items-center justify-center border-l border-dialog-list-rule"
        >
          State
        </div>
        <div
          class="text-2xs text-foreground flex w-[93px] items-center justify-center border-l border-dialog-list-rule"
        >
          Resolution
        </div>
      </div>

      <!-- Data area: top 38, 408 x 187, native scrollbar hidden -->
      <div
        ref="listEl"
        role="listbox"
        tabindex="0"
        :aria-activedescendant="activeDescendant"
        class="bg-dialog-list-body absolute top-[38px] left-0 h-[187px] w-[408px] overflow-y-auto outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        @scroll="updateScroll"
        @keydown="onKeydown"
      >
        <div
          v-for="model in models"
          :key="model.index"
          :id="rowId(model)"
          role="option"
          :aria-selected="selected === model.index"
          :class="['flex cursor-default', rowClass(model)]"
          :style="{ height: '15.82px', lineHeight: '15.82px' }"
          @click="select(model)"
          @dblclick="choose(model)"
        >
          <div class="text-2xs text-foreground/90 w-[56px] pr-[4px] text-right">
            {{ model.index }}
          </div>
          <div class="text-2xs text-foreground/90 w-[111px] pr-[4px] text-right">
            {{ model.created }}
          </div>
          <div class="text-2xs text-foreground/90 w-[112px] pr-[4px] text-right">
            {{ model.name }}
          </div>
          <div class="text-2xs text-foreground/90 w-[36px] text-center">
            {{ model.state }}
          </div>
          <div class="text-2xs text-foreground/90 w-[93px] text-center">
            {{ model.resolution }}
          </div>
        </div>
      </div>

      <!-- Scroll bar at the right edge of the panel -->
      <ScrollBar
        orientation="vertical"
        class="absolute top-0 right-0 h-full w-[15px] bg-dialog-scroll-track"
        :start="thumbStart"
        :size="thumbSize"
        @step="step"
      />
    </div>

    <DialogButton class="absolute top-[243px] left-[239px]" :disabled="!selected" @click="apply">
      Apply
    </DialogButton>
    <DialogButton primary class="absolute top-[243px] left-[338px]" @click="open = false">
      Cancel
    </DialogButton>
  </AppDialog>
</template>
