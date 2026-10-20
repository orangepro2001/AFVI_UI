<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import { cn } from 'cn'
import { computed, type HTMLAttributes } from 'vue'
import ToggleSwitch from '@/components/app/ToggleSwitch.vue'

const props = withDefaults(
  defineProps<{
    enabled: boolean
    pageIndex: number
    pageCount?: number
    class?: HTMLAttributes['class']
  }>(),
  { pageCount: 3, class: undefined },
)

const emit = defineEmits<{
  'update:enabled': [enabled: boolean]
  'update:pageIndex': [pageIndex: number]
}>()

const rootClass = computed(() => cn('relative bg-card', props.class))

const pages = computed(() => Array.from({ length: props.pageCount }, (_, index) => index + 1))

function onChange(event: Event) {
  const target = event.target as HTMLSelectElement
  emit('update:pageIndex', Number(target.value))
}
</script>

<template>
  <div :class="rootClass">
    <ToggleSwitch
      variant="big"
      :model-value="props.enabled"
      label="Power"
      class="absolute top-[8px] left-[5px]"
      @update:model-value="emit('update:enabled', $event)"
    />
    <span class="absolute top-[7px] right-[107px] text-2xs leading-4 text-foreground">
      Page Index :
    </span>
    <div
      class="absolute top-[7px] left-[456px] h-[18px] w-[45px] border border-grid bg-sheet-row text-2xs text-foreground"
    >
      <select
        aria-label="Page Index"
        class="size-full appearance-none bg-transparent pl-1 text-2xs text-foreground"
        :value="props.pageIndex"
        @change="onChange"
      >
        <option v-for="page in pages" :key="page" :value="page">{{ page }}</option>
      </select>
      <ChevronDown
        class="pointer-events-none absolute top-1/2 right-[3px] size-[10px] -translate-y-1/2 text-foreground"
      />
    </div>
  </div>
</template>
