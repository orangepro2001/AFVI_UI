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

// Generic Win32-style dialog shell: a title bar, a close button and a fixed body.
defineOptions({ inheritAttrs: false })

const open = defineModel<boolean>('open', { required: true })

defineProps<{ title: string; class?: HTMLAttributes['class'] }>()

// Focus goes to the first field marked data-autofocus (else reka's default: the first tabbable).
function focusField(event: Event) {
  const field = (event.target as HTMLElement | null)?.querySelector<HTMLElement>('[data-autofocus]')
  if (!field) return
  event.preventDefault()
  field.focus()
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="bg-dialog-veil/40 fixed inset-0 z-50" />
      <DialogContent
        :class="[
          'border-dialog-border bg-card fixed top-1/2 left-1/2 z-50 h-[292px] w-[440px] -translate-x-1/2 -translate-y-1/2 border-2 outline-none',
          $props.class,
        ]"
        @open-auto-focus="focusField"
      >
        <!-- reka needs a description; the design has none, so keep it for screen readers only. -->
        <DialogDescription class="sr-only">{{ title }}</DialogDescription>

        <div class="bg-dialog-title relative flex h-[18px] items-center pl-[8px]">
          <DialogTitle class="text-2xs leading-[18px] text-white">{{ title }}</DialogTitle>
          <DialogClose
            class="text-foreground/85 absolute top-0 right-0 flex h-[18px] w-[22px] items-center justify-center outline-none"
            aria-label="Close"
          >
            <X class="size-[11px]" :stroke-width="2" />
          </DialogClose>
        </div>

        <!-- The 292px body minus 2x2px border and the 18px title bar. Children position absolutely. -->
        <div class="relative h-[270px]">
          <slot />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
