<script setup lang="ts">
import { cn } from 'cn'
import { Check } from '@lucide/vue'
import type { HTMLAttributes } from 'vue'
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  useTemplateRef,
  watch,
} from 'vue'
import type { SpecNode } from '@/api/types'
import ScrollBar from '@/components/app/ScrollBar.vue'
import SpecChip from '@/components/workbench/SpecChip.vue'
import { CHIP_HEIGHT, layoutSpecTree } from '@/features/teach/spec-layout'

const props = withDefaults(
  defineProps<{
    nodes: SpecNode[]
    checked: Record<string, boolean>
    selectedId: string | null
    class?: HTMLAttributes['class']
  }>(),
  { class: undefined },
)

const emit = defineEmits<{ toggle: [id: string]; select: [id: string] }>()

const layout = computed(() => layoutSpecTree(props.nodes))

/** Lines are drawn on half pixels so that 1px stays crisp. */
const drawnLines = computed(() =>
  layout.value.lines.map((line) => ({
    x1: Math.round(line.x1) + 0.5,
    y1: Math.round(line.y1) + 0.5,
    x2: Math.round(line.x2) + 0.5,
    y2: Math.round(line.y2) + 0.5,
  })),
)

// The browser scrolls the tree; the bar next to it only mirrors where it is.
const scroller = useTemplateRef<HTMLElement>('scroller')
const scroll = reactive({ top: 0, view: 0, content: 0 })

function measure() {
  const el = scroller.value
  if (!el) return
  scroll.top = el.scrollTop
  scroll.view = el.clientHeight
  scroll.content = el.scrollHeight
}

// A resized window changes the viewport, not the content: watch the viewport too.
let observer: ResizeObserver | undefined
onMounted(() => {
  measure()
  if (scroller.value && typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(measure)
    observer.observe(scroller.value)
  }
})
onBeforeUnmount(() => observer?.disconnect())
watch(
  () => layout.value.height,
  () => void nextTick(measure),
)

const thumb = computed(() => {
  const { top, view, content } = scroll
  if (view <= 0 || content <= view) return { start: 0, size: 1 }
  const size = view / content
  return { start: (top / (content - view)) * (1 - size), size }
})

const ROW_STEP = 25

function step(direction: -1 | 1) {
  scroller.value?.scrollBy({ top: direction * ROW_STEP })
}
</script>

<template>
  <div :class="cn('relative h-full bg-muted', props.class)">
    <div
      ref="scroller"
      data-spec-scroller
      class="h-full overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      @scroll="measure"
    >
      <div class="relative w-[200px]" :style="{ height: `${layout.height}px` }">
        <svg
          class="absolute inset-0 overflow-visible"
          :width="200"
          :height="layout.height"
          shape-rendering="crispEdges"
        >
          <line
            v-for="(line, index) in drawnLines"
            :key="index"
            :x1="line.x1"
            :y1="line.y1"
            :x2="line.x2"
            :y2="line.y2"
            class="stroke-spec-line"
            stroke-width="1"
          />
        </svg>

        <template v-for="(row, index) in layout.rows" :key="row.node.id">
          <button
            v-if="row.box"
            type="button"
            role="checkbox"
            :aria-checked="!!props.checked[row.node.id]"
            :aria-label="row.node.name"
            :class="
              cn(
                'absolute flex size-3 items-center justify-center border border-white',
                row.level === 0 ? 'left-[11px]' : 'left-[57px]',
              )
            "
            :style="{ top: `${row.y + 3.5}px` }"
            @click="emit('toggle', row.node.id)"
          >
            <Check v-if="props.checked[row.node.id]" class="size-[10px] text-white" />
          </button>

          <SpecChip
            :label="row.node.name"
            :tone="row.node.tone"
            :selected="props.selectedId === row.node.id"
            :class="
              cn('absolute', row.level === 0 ? 'left-[29px] w-[92px]' : 'left-[75px] w-[93px]')
            "
            :style="{ top: `${row.y}px`, height: `${CHIP_HEIGHT}px` }"
            :data-row="index"
            @click="emit('select', row.node.id)"
          />
        </template>
      </div>
    </div>
    <ScrollBar
      v-if="thumb.size < 1"
      class="absolute -top-[3px] right-0 bottom-0"
      :start="thumb.start"
      :size="thumb.size"
      @step="step"
    />
  </div>
</template>
