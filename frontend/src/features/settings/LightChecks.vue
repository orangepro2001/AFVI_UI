<script setup lang="ts">
import { Check } from '@lucide/vue'
import { cn } from 'cn'
import { computed, type HTMLAttributes } from 'vue'

/** The Inspection Light checkboxes and the Global Align Light radios of the settings page. */
const props = withDefaults(
  defineProps<{
    title: string
    mode: 'check' | 'radio'
    items: { light: number; available: boolean; selected: boolean }[]
    class?: HTMLAttributes['class']
  }>(),
  { class: undefined },
)

const emit = defineEmits<{ select: [light: number] }>()

const rootClass = computed(() => cn('relative h-[40px] w-full', props.class))

const lefts = [95, 210, 325, 440]

function itemClass(item: { available: boolean }) {
  return cn(
    'absolute top-[22.5px] flex items-center leading-4',
    item.available ? 'text-foreground' : 'text-foreground/35',
  )
}

function boxClass(item: { available: boolean; selected: boolean }, mode: 'check' | 'radio') {
  return cn(
    'flex size-[11px] shrink-0 items-center justify-center',
    mode === 'check' ? 'border' : 'rounded-full border',
    !item.available
      ? 'border-foreground/35'
      : mode === 'check' || item.selected
        ? 'border-foreground/60'
        : 'border-foreground/40',
  )
}
</script>

<template>
  <div :class="rootClass">
    <div
      class="absolute top-0 left-[9px] flex items-center gap-1 text-3xs leading-4 text-foreground"
    >
      <span class="inline-block size-1 rounded-full bg-white" />
      <span>{{ props.title }}</span>
    </div>

    <button
      v-for="(item, index) in props.items"
      :key="item.light"
      type="button"
      :role="props.mode === 'check' ? 'checkbox' : 'radio'"
      :aria-checked="item.selected"
      :aria-label="`Light${item.light}`"
      :disabled="!item.available"
      :class="itemClass(item)"
      :style="{ left: `${lefts[index]}px` }"
      @click="emit('select', item.light)"
    >
      <span :class="boxClass(item, props.mode)">
        <template v-if="props.mode === 'check'">
          <Check v-if="item.selected" class="size-[9px] text-foreground" />
        </template>
        <template v-else>
          <span v-if="item.selected" class="size-[5px] rounded-full bg-foreground" />
        </template>
      </span>
      <span class="ml-[2.5px] text-2xs">{{ `Light${item.light}` }}</span>
    </button>
  </div>
</template>
