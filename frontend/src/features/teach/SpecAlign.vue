<script setup lang="ts">
import { cn } from 'cn'
import { Check } from '@lucide/vue'
import type { HTMLAttributes } from 'vue'
import type { SpecSet } from '@/api/types'

const props = withDefaults(
  defineProps<{
    spec: SpecSet
    class?: HTMLAttributes['class']
  }>(),
  { class: undefined },
)

const emit = defineEmits<{ 'toggle-overlay': [key: 'mk' | 'ac' | 'ic' | 'sk'] }>()

const overlays: { key: 'mk' | 'ac' | 'ic' | 'sk'; label: string; left: number }[] = [
  { key: 'mk', label: 'MK', left: 15 },
  { key: 'ac', label: 'A_C', left: 65 },
  { key: 'ic', label: 'I_C', left: 113 },
  { key: 'sk', label: 'SK', left: 161 },
]
</script>

<template>
  <div :class="cn('relative h-[152px] bg-muted', props.class)">
    <div
      class="absolute top-[3px] left-0 h-[15px] w-[194px] bg-sheet-line pl-[6px] text-3xs leading-[15px] font-bold text-white"
    >
      Global Align :
    </div>

    <div
      v-for="(line, index) in props.spec.globalAlign"
      :key="`global-${index}`"
      class="absolute left-0 h-4 w-full text-3xs leading-4 whitespace-nowrap"
      :style="{ top: `${19 + 16 * index}px` }"
    >
      <span class="absolute left-[15px] text-sheet-muted">Light :</span>
      <span class="absolute left-[62px] text-foreground/85">{{ line.light }}</span>
      <span class="absolute left-[90px] text-sheet-muted">Channel :</span>
      <span class="absolute left-[157px] text-foreground/85">{{ line.channel }}</span>
    </div>

    <div
      class="absolute top-[68px] left-0 h-[15px] w-[194px] bg-sheet-line pl-[6px] text-3xs leading-[15px] font-bold text-white"
    >
      SR Align :
    </div>

    <div
      v-if="props.spec.srAlign[0]"
      class="absolute left-0 h-4 w-full text-3xs leading-4 whitespace-nowrap"
      :style="{ top: '83px' }"
    >
      <span class="absolute left-[15px] text-sheet-muted">Light :</span>
      <span class="absolute left-[62px] text-foreground/85">{{ props.spec.srAlign[0].light }}</span>
      <span class="absolute left-[90px] text-sheet-muted">Channel :</span>
      <span class="absolute left-[157px] text-foreground/85">
        {{ props.spec.srAlign[0].channel }}
      </span>
    </div>

    <div class="absolute left-[27px] top-[112px] text-3xs font-bold text-white">Overlay</div>

    <div class="absolute top-[131px] left-0 h-4 text-3xs leading-4">
      <button
        v-for="item in overlays"
        :key="item.key"
        type="button"
        role="checkbox"
        :aria-checked="props.spec.overlay[item.key]"
        :aria-label="item.label"
        class="absolute top-0 flex items-center"
        :style="{ left: `${item.left}px` }"
        @click="emit('toggle-overlay', item.key)"
      >
        <span
          :class="cn('flex size-[11px] items-center justify-center border border-tool-disabled')"
        >
          <Check v-if="props.spec.overlay[item.key]" class="size-[9px] text-subtle" />
        </span>
        <span class="ml-1 text-3xs text-subtle">{{ item.label }}</span>
      </button>
    </div>
  </div>
</template>
