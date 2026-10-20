<script setup lang="ts">
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import type { SpecMode, TeachSection } from '@/stores/teach'
import type { LightId } from '@/stores/workbench'

const props = withDefaults(
  defineProps<{
    section: TeachSection
    mode: SpecMode
    light: LightId
    class?: HTMLAttributes['class']
  }>(),
  { class: undefined },
)

const emit = defineEmits<{
  'update:section': [section: TeachSection]
  'update:mode': [mode: SpecMode]
  'update:light': [light: LightId]
}>()

const sections: { id: TeachSection; label: string; left: number }[] = [
  { id: 'spec', label: 'Specification', left: 0 },
  { id: 'analysis', label: 'Image Analysis', left: 255 },
]

const modes: { id: SpecMode; label: string; left: number; width: number }[] = [
  { id: 'unit', label: 'Unit', left: 4, width: 105 },
  { id: 'dummy', label: 'Dummy', left: 110, width: 107 },
]

const lights: { id: LightId; label: string; left: number; width: number }[] = [
  { id: 1, label: 'Light-1', left: 221, width: 93 },
  { id: 2, label: 'Light-2', left: 316, width: 92 },
  { id: 3, label: 'Light-3', left: 409, width: 91 },
]
</script>

<template>
  <div :class="cn('relative h-[78px] w-[507px]', props.class)">
    <button
      v-for="item in sections"
      :key="item.id"
      type="button"
      role="tab"
      :aria-selected="props.section === item.id"
      :class="
        cn(
          'absolute top-0 flex h-[43px] w-[252px] items-center justify-center border-b-2 border-black/20 text-md text-tab-foreground',
          item.id === 'spec' ? 'bg-tab-spec' : 'bg-tab-analysis',
        )
      "
      :style="{ left: `${item.left}px` }"
      @click="emit('update:section', item.id)"
    >
      {{ item.label }}
    </button>

    <button
      v-for="item in modes"
      :key="item.id"
      type="button"
      role="tab"
      :aria-selected="props.mode === item.id"
      :class="
        cn(
          'absolute top-[52px] flex h-[25px] items-center justify-center border-b-2 border-black/20 text-3xs font-bold text-tab-foreground',
          props.mode === item.id ? 'bg-tab-unit' : 'bg-tab-dummy',
        )
      "
      :style="{ left: `${item.left}px`, width: `${item.width}px` }"
      @click="emit('update:mode', item.id)"
    >
      {{ item.label }}
    </button>

    <button
      v-for="item in lights"
      :key="item.id"
      type="button"
      role="tab"
      :aria-selected="props.light === item.id"
      :class="
        cn(
          'absolute top-[52px] flex h-[25px] items-center justify-center border-b-2 border-black/20 text-3xs font-bold text-tab-foreground',
          props.light === item.id ? 'bg-tab-light-active' : 'bg-tab-light',
        )
      "
      :style="{ left: `${item.left}px`, width: `${item.width}px` }"
      @click="emit('update:light', item.id)"
    >
      {{ item.label }}
    </button>
  </div>
</template>
