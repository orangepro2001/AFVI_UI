<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import { cn } from 'cn'
import { computed, type HTMLAttributes } from 'vue'
import MaskSlider from '@/components/app/MaskSlider.vue'
import ToggleSwitch from '@/components/app/ToggleSwitch.vue'
import { useSettingsStore, type MaskKind } from '@/stores/settings'

/** One "Defect Mask Generation" block of the settings page. */
const props = withDefaults(
  defineProps<{
    kind: MaskKind
    title: string
    class?: HTMLAttributes['class']
  }>(),
  { class: undefined },
)

const store = useSettingsStore()

const mask = computed(() => (props.kind === 'metal' ? store.metal : store.sr))

const rootClass = computed(() => cn('relative h-[190px] w-full', props.class))

const lightClass = computed(() =>
  cn(
    'size-full appearance-none bg-transparent pl-[5px] text-3xs',
    mask.value?.enabled ? 'text-foreground' : 'text-foreground/35',
  ),
)

const boxClass = computed(() =>
  cn(
    'absolute top-[169px] h-[18px] w-[92px] border bg-sheet-row',
    mask.value?.enabled ? 'border-grid' : 'border-grid/50',
  ),
)

const labelClass = computed(() =>
  cn(
    'absolute top-[170px] text-2xs leading-4',
    mask.value?.enabled ? 'text-foreground' : 'text-foreground/35',
  ),
)

const lights = ['1', '2', '3', '4']
const channels = ['Gray', 'Red', 'Green', 'Blue']

function onLight(event: Event) {
  store.setMaskLight(props.kind, (event.target as HTMLSelectElement).value)
}

function onChannel(event: Event) {
  store.setMaskChannel(props.kind, (event.target as HTMLSelectElement).value)
}
</script>

<template>
  <div v-if="mask" :class="rootClass">
    <div
      class="absolute top-[20px] left-[9px] flex items-center gap-1 text-3xs leading-4 text-foreground"
    >
      <span class="inline-block size-1 rounded-full bg-white" />
      <span>{{ props.title }}</span>
    </div>

    <ToggleSwitch
      variant="mask"
      :model-value="mask.enabled"
      :label="`${props.title} switch`"
      class="absolute top-[22px] left-[202px]"
      @update:model-value="store.setMaskEnabled(props.kind, $event)"
    />

    <span class="absolute top-[57px] left-[17px] text-2xs leading-4 text-foreground">Morphic</span>
    <MaskSlider
      :model-value="mask.morphic"
      label="Morphic"
      class="absolute top-[61.5px] left-[98px]"
      @update:model-value="store.setMorphic(props.kind, $event)"
    />

    <span class="absolute top-[113px] left-[17px] text-2xs leading-4 text-foreground"
      >Sensitivity</span
    >
    <MaskSlider
      :model-value="mask.sensitivity"
      label="Sensitivity"
      class="absolute top-[117.5px] left-[98px]"
      @update:model-value="store.setSensitivity(props.kind, $event)"
    />

    <span :class="cn(labelClass, 'right-[307px]')">Light</span>
    <span :class="cn(labelClass, 'right-[128px]')">Channel</span>

    <div :class="cn(boxClass, 'left-[208px]')">
      <select
        aria-label="Light"
        :class="lightClass"
        :value="mask.light"
        :disabled="!mask.enabled"
        @change="onLight"
      >
        <option v-for="light in lights" :key="light" :value="light">{{ light }}</option>
      </select>
      <ChevronDown
        class="pointer-events-none absolute top-1/2 right-[3px] size-[10px] -translate-y-1/2"
        :class="mask.enabled ? 'text-foreground' : 'text-foreground/35'"
      />
    </div>

    <div :class="cn(boxClass, 'left-[388px]')">
      <select
        aria-label="Channel"
        :class="lightClass"
        :value="mask.channel"
        :disabled="!mask.enabled"
        @change="onChannel"
      >
        <option v-for="channel in channels" :key="channel" :value="channel">{{ channel }}</option>
      </select>
      <ChevronDown
        class="pointer-events-none absolute top-1/2 right-[3px] size-[10px] -translate-y-1/2"
        :class="mask.enabled ? 'text-foreground' : 'text-foreground/35'"
      />
    </div>
  </div>
</template>
