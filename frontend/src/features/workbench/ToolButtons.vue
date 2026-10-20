<script setup lang="ts">
import { cn } from 'cn'
import { Lightbulb } from '@lucide/vue'
import type { HTMLAttributes } from 'vue'
import ToolButton from '@/components/workbench/ToolButton.vue'
import { toolbarLeft, toolbarX, tools } from '@/features/workbench/tools'
import { useWorkbenchStore, type ChannelId, type LightId } from '@/stores/workbench'

defineProps<{ class?: HTMLAttributes['class'] }>()

const store = useWorkbenchStore()

const lights: LightId[] = [1, 2, 3]

interface ChannelDef {
  id: ChannelId
  label: string
  border: string
  dot: string
}

const channels: ChannelDef[] = [
  { id: 'red', label: 'Red channel', border: 'border-tool-red', dot: 'bg-tool-red' },
  { id: 'green', label: 'Green channel', border: 'border-tool-green', dot: 'bg-tool-green' },
  { id: 'blue', label: 'Blue channel', border: 'border-tool-blue', dot: 'bg-tool-blue' },
  { id: 'yellow', label: 'Yellow channel', border: 'border-tool-yellow', dot: 'bg-tool-yellow' },
]
</script>

<template>
  <div :class="cn('relative flex h-[45px] min-w-0 flex-1 bg-card', $props.class)">
    <!-- The group is 661px wide (x 602..1263 in the reference) and sticks to the right of its slot, 4px short of the edge. -->
    <!-- A window wider than the reference moves the group with that edge; a narrower one lets it overflow to the right. -->
    <div class="relative mr-[4px] ml-auto h-full w-[661px] shrink-0">
      <!-- A: tools -->
      <ToolButton
        v-for="(def, i) in tools"
        :key="def.id"
        :label="def.label"
        :selected="store.tool === def.id"
        :disabled="def.disabled"
        :style="{ left: `${toolbarLeft(toolbarX.tools[i])}px` }"
        @click="store.toggleTool(def.id)"
      >
        <component :is="def.icon" v-if="def.icon" class="size-4" />
        <span v-else class="text-[11px] font-bold">{{ def.text }}</span>
      </ToolButton>

      <!-- B: views -->
      <ToolButton
        label="Skewed view"
        :selected="store.view === 'skew'"
        :style="{ left: `${toolbarLeft(toolbarX.views[0])}px` }"
        @click="store.view = 'skew'"
      >
        <svg viewBox="0 0 18 12" class="h-3 w-[18px]">
          <path
            d="M4 1 H17 L14 11 H1 Z"
            class="fill-none stroke-current"
            stroke-width="1.5"
            stroke-linejoin="round"
          />
        </svg>
      </ToolButton>
      <ToolButton
        label="Rectangular view"
        :selected="store.view === 'rect'"
        :style="{ left: `${toolbarLeft(toolbarX.views[1])}px` }"
        @click="store.view = 'rect'"
      >
        <svg viewBox="0 0 18 12" class="h-3 w-[18px]">
          <rect
            x="1"
            y="1"
            width="16"
            height="10"
            rx="1"
            :class="
              store.view === 'rect'
                ? 'fill-tool-active stroke-tool-active'
                : 'fill-none stroke-current'
            "
            stroke-width="1.5"
          />
        </svg>
      </ToolButton>

      <!-- C: lights -->
      <ToolButton
        v-for="(n, i) in lights"
        :key="n"
        :label="`Light ${n}`"
        :selected="store.light === n"
        tone="yellow"
        :style="{ left: `${toolbarLeft(toolbarX.lights[i])}px` }"
        @click="store.light = n"
      >
        <Lightbulb :class="cn('size-4', store.light === n && 'fill-tool-yellow')" />
      </ToolButton>

      <!-- D: channels -->
      <ToolButton
        v-for="(ch, i) in channels"
        :key="ch.id"
        :label="ch.label"
        :selected="store.channel === ch.id"
        :tone="ch.id"
        outline
        :style="{ left: `${toolbarLeft(toolbarX.channels[i])}px` }"
        @click="store.channel = ch.id"
      >
        <span v-if="store.channel === ch.id" :class="cn('size-3 rounded-full', ch.dot)" />
        <span v-else class="size-3" />
      </ToolButton>
    </div>
  </div>
</template>
