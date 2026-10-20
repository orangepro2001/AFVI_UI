<script setup lang="ts">
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import type { Readout } from '@/api/types'

withDefaults(
  defineProps<{
    readout: Readout
    variant?: 'full' | 'xy'
    class?: HTMLAttributes['class']
  }>(),
  { variant: 'full', class: undefined },
)
</script>

<template>
  <div :class="cn('text-3xs relative h-[35px] shrink-0 bg-card tabular-nums', $props.class)">
    <template v-if="variant === 'full'">
      <span class="absolute top-[16px] left-[6px] leading-none font-bold text-foreground"
        >CELL :</span
      >
      <span class="absolute top-[16px] left-[50px] leading-none text-foreground/85">{{
        readout.cell
      }}</span>

      <span class="absolute top-[16px] left-[468px] leading-none font-bold text-foreground"
        >STRIP :</span
      >
      <span class="absolute top-[16px] left-[513px] leading-none text-foreground/85"
        >{{ readout.strip.x }},</span
      >
      <span class="absolute top-[16px] left-[552px] leading-none text-foreground/85">{{
        readout.strip.y
      }}</span>

      <span class="absolute top-[16px] left-[617px] leading-none font-bold text-foreground"
        >WH :</span
      >
      <span class="absolute top-[16px] left-[648px] leading-none text-foreground/85"
        >{{ readout.wh.w }},</span
      >
      <span class="absolute top-[16px] left-[688px] leading-none text-foreground/85">{{
        readout.wh.h
      }}</span>
    </template>

    <span class="absolute top-[16px] left-[751px] leading-none font-bold text-foreground"
      >XY :</span
    >
    <span class="absolute top-[16px] left-[786px] leading-none text-foreground/85"
      >{{ readout.xy.x }},</span
    >
    <span class="absolute top-[16px] left-[824px] leading-none text-foreground/85">{{
      readout.xy.y
    }}</span>

    <span class="absolute top-[16px] left-[879px] leading-none font-bold text-foreground"
      >RGB :</span
    >
    <span class="absolute top-[16px] left-[912px] leading-none text-foreground/85"
      >{{ readout.rgb[0] }},</span
    >
    <span class="absolute top-[16px] left-[930px] leading-none text-foreground/85"
      >{{ readout.rgb[1] }},</span
    >
    <span class="absolute top-[16px] left-[950px] leading-none text-foreground/85">{{
      readout.rgb[2]
    }}</span>

    <template v-if="variant === 'full'">
      <span class="absolute top-[16px] left-[1023px] leading-none font-bold text-foreground"
        >Avg. GV :</span
      >
      <span class="absolute top-[16px] left-[1088px] leading-none text-foreground/85">{{
        readout.avgGv
      }}</span>

      <span class="absolute top-[16px] left-[1128px] leading-none font-bold text-foreground"
        >Std. GV :</span
      >
      <span class="absolute top-[16px] right-[7px] leading-none text-foreground/85">{{
        readout.stdGv.toFixed(2)
      }}</span>
    </template>
  </div>
</template>
