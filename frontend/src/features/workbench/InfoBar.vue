<script setup lang="ts">
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import type { WorkbenchHeader } from '@/api/types'

defineProps<{
  header: WorkbenchHeader
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div :class="cn('relative h-[45px] w-[540px] shrink-0 bg-card', $props.class)">
    <!-- MODEL -->
    <span class="absolute top-[5px] left-[3px] h-[35px] w-[3px] bg-ready" />
    <span class="text-3xs absolute top-[9px] left-[12px] leading-none text-ready">MODEL :</span>
    <span class="absolute top-[20px] left-[12px] text-[17px] leading-none font-light text-ready">
      {{ header.model }}
    </span>

    <!-- LOT -->
    <span class="absolute top-[5px] left-[215px] h-[35px] w-[3px] bg-ready" />
    <span class="text-3xs absolute top-[9px] left-[224px] leading-none text-ready">LOT :</span>
    <span class="absolute top-[25px] left-[224px] text-[13px] leading-none font-bold text-ready">
      {{ header.lot }}
    </span>

    <!-- STRIP -->
    <span class="absolute top-[5px] left-[390px] h-[35px] w-[3px] bg-ready" />
    <span class="text-3xs absolute top-[9px] left-[399px] leading-none text-ready">STRIP :</span>
    <span class="absolute top-[25px] left-[399px] text-[13px] leading-none font-bold text-ready">
      {{ header.strip }}
    </span>
  </div>
</template>
