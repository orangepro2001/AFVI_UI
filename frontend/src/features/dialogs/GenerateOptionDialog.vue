<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import PlainDialog from '@/components/app/PlainDialog.vue'
import { canGenerate, defaultGenerateOptions, type GenerateOptions } from './generate-options'

const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ confirm: [options: GenerateOptions] }>()

const options = ref<GenerateOptions>(defaultGenerateOptions())
const lastLight = ref<1 | 2 | 3>(2)

watch(open, (isOpen) => {
  if (isOpen) {
    options.value = defaultGenerateOptions()
    lastLight.value = 2
  }
})

const allChecked = computed(() => options.value.light === 'all')

function isLight(value: 1 | 2 | 3): boolean {
  return options.value.light === value
}

// lastLight always holds the radio that was picked last, so All can hand the choice back to it.
function toggleAll() {
  options.value.light = options.value.light === 'all' ? lastLight.value : 'all'
}

function selectLight(value: 1 | 2 | 3) {
  options.value.light = value
  lastLight.value = value
}

function toggleMt() {
  options.value.mt = !options.value.mt
}

function toggleSr() {
  options.value.sr = !options.value.sr
}

const okDisabled = computed(() => !canGenerate(options.value))

function confirm() {
  emit('confirm', { ...options.value })
  open.value = false
}

function cancel() {
  open.value = false
}
</script>

<template>
  <PlainDialog v-model:open="open" title="Generate Option">
    <p
      class="text-2xs text-plain-text absolute top-[67px] left-[22px] w-[215px] -translate-y-1/2 overflow-hidden whitespace-nowrap"
    >
      - Are you sure you want to run CamGenerate?
    </p>
    <p
      class="text-2xs text-plain-text absolute top-[103px] left-[22px] -translate-y-1/2 whitespace-nowrap"
    >
      - Select the option below to run
    </p>

    <div
      class="border-plain-line absolute top-[138px] left-[17px] h-[43px] w-[219px] rounded-[4px] border"
    />
    <span
      class="text-2xs text-plain-text bg-plain-body absolute top-[138px] left-[23px] -translate-y-1/2 px-[3px]"
    >
      Light
    </span>

    <button
      type="button"
      role="checkbox"
      :aria-checked="allChecked"
      class="absolute top-[157px] left-[32px] flex items-center"
      aria-label="All"
      @click="toggleAll"
    >
      <span
        class="border-plain-close flex size-[11px] items-center justify-center border bg-transparent"
      >
        <svg
          v-if="allChecked"
          viewBox="0 0 11 11"
          class="stroke-plain-text size-[11px]"
          fill="none"
          stroke-width="1.5"
        >
          <path d="M2 5.5 4.5 8 9 3" />
        </svg>
      </span>
      <span class="text-2xs text-plain-text ml-[3px]">All</span>
    </button>

    <div role="radiogroup" aria-label="Light" class="absolute top-0 left-0">
      <button
        type="button"
        role="radio"
        :aria-checked="isLight(1)"
        class="absolute top-[157px] left-[83px] flex items-center"
        aria-label="1"
        @click="selectLight(1)"
      >
        <span
          class="border-plain-close flex size-[11px] items-center justify-center rounded-full border"
        >
          <span v-if="isLight(1)" class="bg-plain-text size-[5px] rounded-full" />
        </span>
        <span class="text-2xs text-plain-text ml-[1px]">#1</span>
      </button>
      <button
        type="button"
        role="radio"
        :aria-checked="isLight(2)"
        class="absolute top-[157px] left-[138px] flex items-center"
        aria-label="2"
        @click="selectLight(2)"
      >
        <span
          class="border-plain-close flex size-[11px] items-center justify-center rounded-full border"
        >
          <span v-if="isLight(2)" class="bg-plain-text size-[5px] rounded-full" />
        </span>
        <span class="text-2xs text-plain-text ml-[2px]">#2</span>
      </button>
      <button
        type="button"
        role="radio"
        :aria-checked="isLight(3)"
        class="absolute top-[157px] left-[192px] flex items-center"
        aria-label="3"
        @click="selectLight(3)"
      >
        <span
          class="border-plain-close flex size-[11px] items-center justify-center rounded-full border"
        >
          <span v-if="isLight(3)" class="bg-plain-text size-[5px] rounded-full" />
        </span>
        <span class="text-2xs text-plain-text ml-[2px]">#3</span>
      </button>
    </div>

    <div
      class="border-plain-line absolute top-[198px] left-[17px] h-[44px] w-[219px] rounded-[4px] border"
    />
    <span
      class="text-2xs text-plain-text bg-plain-body absolute top-[198px] left-[23px] -translate-y-1/2 px-[3px]"
    >
      Area
    </span>

    <button
      type="button"
      role="checkbox"
      :aria-checked="options.mt"
      class="absolute top-[218px] left-[32px] flex items-center"
      aria-label="MT"
      @click="toggleMt"
    >
      <span
        class="border-plain-close flex size-[11px] items-center justify-center border bg-transparent"
      >
        <svg
          v-if="options.mt"
          viewBox="0 0 11 11"
          class="stroke-plain-text size-[11px]"
          fill="none"
          stroke-width="1.5"
        >
          <path d="M2 5.5 4.5 8 9 3" />
        </svg>
      </span>
      <span class="text-2xs text-plain-text ml-[3px]">MT</span>
    </button>

    <button
      type="button"
      role="checkbox"
      :aria-checked="options.sr"
      class="absolute top-[220px] left-[188px] flex items-center"
      aria-label="SR"
      @click="toggleSr"
    >
      <span
        class="border-plain-close flex size-[11px] items-center justify-center border bg-transparent"
      >
        <svg
          v-if="options.sr"
          viewBox="0 0 11 11"
          class="stroke-plain-text size-[11px]"
          fill="none"
          stroke-width="1.5"
        >
          <path d="M2 5.5 4.5 8 9 3" />
        </svg>
      </span>
      <span class="text-2xs text-plain-text ml-[2px]">SR</span>
    </button>

    <button
      type="button"
      class="border-plain-line bg-sheet-row text-2xs text-plain-text absolute top-[263px] left-[17px] h-[21px] w-[70px] border"
      :class="okDisabled ? 'text-dialog-text-dim' : ''"
      :disabled="okDisabled"
      @click="confirm"
    >
      OK
    </button>
    <button
      type="button"
      class="border-dialog-line-dim bg-sheet-row text-2xs text-plain-text absolute top-[263px] left-[166px] h-[21px] w-[70px] border"
      @click="cancel"
    >
      Cancel
    </button>
  </PlainDialog>
</template>
