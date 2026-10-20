<script setup lang="ts">
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import type { ProductInfo } from '@/api/types'

const props = defineProps<{
  product: ProductInfo
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <section
    :class="
      cn(
        'relative h-[66px] shrink-0 overflow-hidden bg-sheet-row',
        'after:pointer-events-none after:absolute after:inset-0 after:border after:border-white/[0.07]',
        props.class,
      )
    "
  >
    <div class="absolute inset-x-0 top-[1px] h-[39px] bg-sheet-head" />
    <h2 class="text-3xs absolute top-[6px] left-[6px] leading-none text-foreground">
      ● Inspection - Product
    </h2>
    <div class="absolute top-[20px] left-0 h-px w-[474px] bg-white/10" />
    <table
      class="text-3xs absolute top-[21px] left-0 w-[474px] table-fixed border-collapse text-center"
    >
      <colgroup>
        <col class="w-[120px]" />
        <col class="w-[121px]" />
        <col class="w-[121px]" />
        <col class="w-[112px]" />
      </colgroup>
      <thead>
        <tr class="h-[19px]">
          <th class="p-0 font-normal text-foreground/85">Product</th>
          <th class="border-l border-white/10 p-0 font-normal text-foreground/85">Camera</th>
          <th class="border-l border-white/10 p-0 font-normal text-foreground/85">Resolution</th>
          <th class="border-r border-l border-white/10 p-0 font-normal text-foreground/85">
            Surface
          </th>
        </tr>
      </thead>
      <tbody>
        <tr class="h-[17px]">
          <td class="p-0 text-foreground">{{ product.product }}</td>
          <td class="p-0 text-foreground">{{ product.camera }}</td>
          <td class="p-0 text-foreground">{{ product.resolution }}</td>
          <td class="p-0 text-foreground">{{ product.surface }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
