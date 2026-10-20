<script setup lang="ts">
import { reactive } from 'vue'
import MonitorTile from '@/components/app/MonitorTile.vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

const emit = defineEmits<{ clear: [kinds: string[]] }>()

const kinds = [
  { id: 'result', label: 'ResultData' },
  { id: 'mask', label: 'MaskImage' },
  { id: 'overlay', label: 'OverlayImage' },
]
const selected = reactive<Record<string, boolean>>({ result: false, mask: false, overlay: false })

const clear = () =>
  emit(
    'clear',
    kinds.filter((k) => selected[k.id]).map((k) => k.id),
  )
</script>

<template>
  <MonitorTile title="Data Manager">
    <div
      v-for="(kind, index) in kinds"
      :key="kind.id"
      class="absolute left-[15px] flex h-[11px] items-center gap-[3px]"
      :class="index === 0 ? 'top-[41px]' : index === 1 ? 'top-[65px]' : 'top-[89px]'"
    >
      <Checkbox
        :id="`dm-${kind.id}`"
        v-model="selected[kind.id]"
        class="size-[11px] rounded-[1px] border-foreground/40 bg-transparent"
      />
      <Label :for="`dm-${kind.id}`" class="text-2xs font-normal text-foreground">{{
        kind.label
      }}</Label>
    </div>
    <Button
      variant="secondary"
      class="absolute top-[113px] left-[4px] h-[22px] w-[239px] rounded-none border border-sheet-head bg-sheet-row text-2xs font-normal text-foreground/85 hover:bg-sheet-head"
      @click="clear"
    >
      Clear
    </Button>
  </MonitorTile>
</template>
