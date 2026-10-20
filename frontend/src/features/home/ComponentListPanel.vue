<script setup lang="ts">
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import type { ComponentInfo } from '@/api/types'

const props = defineProps<{
  components: ComponentInfo[]
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <section
    :class="
      cn(
        'relative h-[142px] shrink-0 overflow-hidden bg-sheet-row',
        'after:pointer-events-none after:absolute after:inset-0 after:border after:border-white/[0.07]',
        props.class,
      )
    "
  >
    <div class="absolute inset-x-0 top-[2px] h-[38px] bg-sheet-head" />
    <h2 class="text-3xs absolute top-[6px] left-[6px] leading-none text-foreground">
      ● Inspection - Component
    </h2>
    <div class="absolute top-[20px] left-0 h-px w-full bg-white/10" />
    <table
      class="text-3xs absolute top-[21px] left-0 w-[497px] table-fixed border-collapse text-center"
    >
      <colgroup>
        <col class="w-[120px]" />
        <col class="w-[94px]" />
        <col class="w-[134px]" />
        <col class="w-[66px]" />
        <col class="w-[83px]" />
      </colgroup>
      <thead>
        <tr class="h-[19px]">
          <th class="p-0 font-normal text-foreground/85">Component</th>
          <th class="border-l border-white/10 p-0 font-normal text-foreground/85">Mode</th>
          <th class="border-l border-white/10 p-0 font-normal text-foreground/85">IP Address</th>
          <th class="border-l border-white/10 p-0 font-normal text-foreground/85">Port</th>
          <th class="border-l border-white/10 p-0 font-normal text-foreground/85">Network</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in components" :key="row.name" class="h-[16px]">
          <td class="p-0 text-sheet-muted">{{ row.name }}</td>
          <td class="p-0 text-foreground/90">{{ row.mode }}</td>
          <td class="p-0 text-sheet-muted">{{ row.ip }}</td>
          <td class="p-0 text-sheet-muted">{{ row.port }}</td>
          <td class="p-0">
            <span
              class="inline-block h-[4px] w-[10px] align-middle"
              :class="row.online ? 'bg-positive' : 'bg-destructive'"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
