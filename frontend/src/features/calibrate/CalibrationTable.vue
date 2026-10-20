<script setup lang="ts">
import { cn } from 'cn'
import { computed, ref, type HTMLAttributes } from 'vue'
import type { CalibrationChannel } from '@/api/types'
import ToggleSwitch from '@/components/app/ToggleSwitch.vue'

const props = withDefaults(
  defineProps<{
    channels: CalibrationChannel[]
    class?: HTMLAttributes['class']
  }>(),
  { class: undefined },
)

const emit = defineEmits<{
  'update:on': [channel: number, on: boolean]
  'update:brightness': [channel: number, brightness: number]
}>()

const BRIGHTNESS_MAX = 1000
const TRACK_WIDTH = 198

const columns = [
  { label: 'Channel', width: 55 },
  { label: 'Brigtness', width: 214 },
  { label: 'Value', width: 47 },
  { label: 'Angle', width: 46 },
  { label: 'Color', width: 46 },
  { label: 'ON/OFF', width: 65 },
  { label: '', width: 23 },
] as const

const rootClass = computed(() => cn('relative h-[483px] w-full bg-card', props.class))

const tracks = ref<Record<number, HTMLElement | null>>({})

function setTrack(channel: number, el: unknown) {
  tracks.value[channel] = (el as HTMLElement | null) ?? null
}

function fillWidth(brightness: number) {
  return `${(Math.min(Math.max(brightness, 0), BRIGHTNESS_MAX) / BRIGHTNESS_MAX) * TRACK_WIDTH}px`
}

function commit(channel: number, value: number) {
  const next = Math.min(Math.max(Math.round(value), 0), BRIGHTNESS_MAX)
  emit('update:brightness', channel, next)
}

function onPointerDown(channel: number, event: PointerEvent) {
  if (event.button !== 0) return
  const el = tracks.value[channel]
  if (!el) return
  el.setPointerCapture?.(event.pointerId)
  onPointerMove(channel, event)
}

function onPointerMove(channel: number, event: PointerEvent) {
  const el = tracks.value[channel]
  if (!el) return
  if (event.buttons === 0 && event.type === 'pointermove') return
  const rect = el.getBoundingClientRect()
  const ratio = rect.width === 0 ? 0 : (event.clientX - rect.left) / rect.width
  commit(channel, ratio * BRIGHTNESS_MAX)
}

function onKeydown(channel: number, brightness: number, event: KeyboardEvent) {
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    commit(channel, brightness + 10)
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    commit(channel, brightness - 10)
  }
}

function rowTop(index: number) {
  return `${41.5 + 15.8 * index}px`
}

function textClass(on: boolean) {
  return cn('text-3xs leading-4', on ? 'text-foreground' : 'text-foreground/35')
}
</script>

<template>
  <div :class="rootClass">
    <div
      class="absolute top-[1px] left-[4px] flex h-[19px] w-[496px] items-center gap-1 bg-sheet-head pl-[5px] text-3xs text-foreground"
    >
      <span class="inline-block size-1 rounded-full bg-white" />
      <span>Calibration - Light</span>
    </div>

    <div
      class="absolute top-[20px] left-[4px] flex h-[19px] w-[496px] border-t border-white/10 bg-sheet-head text-3xs text-foreground/90"
    >
      <div
        v-for="(column, index) in columns"
        :key="column.label"
        :class="
          cn('flex h-full items-center justify-center', index > 0 && 'border-l border-white/20')
        "
        :style="{ width: `${column.width}px` }"
      >
        {{ column.label }}
      </div>
    </div>

    <div class="absolute top-[41px] left-[4px] h-[418px] w-[496px] bg-sheet-row" />

    <div
      v-for="(channel, index) in props.channels"
      :key="channel.channel"
      class="absolute left-[4px] h-[16px] w-[496px]"
      :style="{ top: rowTop(index) }"
    >
      <div
        class="absolute top-0 left-0 w-[55px] text-center text-3xs leading-4"
        :class="textClass(channel.on)"
      >
        {{ channel.channel }}
      </div>

      <div
        :ref="(el) => setTrack(channel.channel, el)"
        role="slider"
        tabindex="0"
        :aria-label="`Brightness ${channel.channel}`"
        :aria-valuemin="0"
        :aria-valuemax="BRIGHTNESS_MAX"
        :aria-valuenow="channel.brightness"
        class="absolute top-0 left-[61px] h-[16px] w-[204px] touch-none"
        @pointerdown="onPointerDown(channel.channel, $event)"
        @pointermove="onPointerMove(channel.channel, $event)"
        @keydown="onKeydown(channel.channel, channel.brightness, $event)"
      >
        <div class="absolute top-[6.5px] left-0 h-[3px] w-[204px] bg-slider-track">
          <div
            :class="cn('h-[3px]', channel.on ? 'bg-primary' : 'bg-secondary')"
            :style="{ width: fillWidth(channel.brightness) }"
          />
        </div>
      </div>

      <div
        class="absolute top-0 left-[269px] w-[47px] pr-[4px] text-right"
        :class="textClass(channel.on)"
      >
        {{ channel.value }}
      </div>
      <div
        class="absolute top-0 left-[316px] w-[46px] pr-[2px] text-right"
        :class="textClass(channel.on)"
      >
        {{ `${channel.angle}°` }}
      </div>
      <div
        class="absolute top-0 left-[362px] w-[46px] pr-[2px] text-right"
        :class="textClass(channel.on)"
      >
        {{ channel.color }}
      </div>

      <ToggleSwitch
        variant="small"
        :model-value="channel.on"
        :label="`Channel ${channel.channel} power`"
        class="absolute top-[2.5px] left-[429px]"
        @update:model-value="emit('update:on', channel.channel, $event)"
      />
    </div>
  </div>
</template>
