<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { X } from '@lucide/vue'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { cn } from 'cn'

defineOptions({ inheritAttrs: false })

const open = defineModel<boolean>('open', { required: true })

defineProps<{ title: string; class?: HTMLAttributes['class'] }>()
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50" />
      <DialogContent
        :class="
          cn(
            'bg-plain-body fixed top-[calc(50%-11px)] left-1/2 z-50 h-[302px] w-[253px] -translate-x-1/2 -translate-y-1/2 outline-none',
            $props.class,
          )
        "
        @interact-outside.prevent
      >
        <DialogDescription class="sr-only">{{ title }}</DialogDescription>

        <div class="bg-plain-title absolute top-0 left-0 h-[29px] w-full">
          <DialogTitle
            class="text-3xs text-plain-title-text absolute top-[18px] left-[11px] -translate-y-1/2"
          >
            {{ title }}
          </DialogTitle>
          <DialogClose
            class="text-plain-close absolute top-[11px] left-[236px] -translate-x-1/2 -translate-y-1/2 outline-none"
            aria-label="Close"
          >
            <X class="size-[11px]" :stroke-width="1.5" />
          </DialogClose>
        </div>

        <slot />
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
