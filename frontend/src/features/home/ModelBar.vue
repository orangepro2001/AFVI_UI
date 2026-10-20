<script setup lang="ts">
import { cn } from 'cn'

defineProps<{
  model: string
  lot: string
  dmg: { metal: boolean; sr: boolean }
}>()
</script>

<template>
  <div
    class="bg-card flex h-[33px] shrink-0 items-center pl-[14px] pr-[36px] text-[17px] leading-none"
  >
    <p class="font-semibold">
      <span class="text-label">MODEL :</span>
      <span class="text-value ml-[6px]">{{ model }}</span>
    </p>
    <p class="ml-[137px] font-semibold">
      <span class="text-label">LOT :</span>
      <span class="text-value ml-[6px]">{{ lot }}</span>
    </p>
    <div class="ml-auto flex items-center text-[12.7px]">
      <span class="font-bold text-white">DMG :</span>
      <span
        class="ml-[23px] flex items-center gap-[7px]"
        :class="dmg.metal ? 'text-positive' : 'text-foreground/65'"
      >
        <i :class="cn('size-[13px] rounded-full', dmg.metal ? 'bg-positive' : 'bg-work-none')" />
        Metal
      </span>
      <span
        class="ml-[26px] flex items-center gap-[8px]"
        :class="dmg.sr ? 'text-positive/70' : 'text-muted-foreground'"
      >
        <i :class="cn('size-[13px] rounded-full', dmg.sr ? 'bg-positive' : 'bg-work-none')" />
        SR
      </span>
    </div>
  </div>
</template>
