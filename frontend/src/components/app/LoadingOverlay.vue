<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const DOT_COUNT = 14

// Take the keyboard focus, so that Enter and Space do not reach the rail button that started the job.
const root = ref<HTMLElement | null>(null)
onMounted(() => root.value?.focus({ preventScroll: true }))

const dots = computed(() =>
  Array.from({ length: DOT_COUNT }, (_, i) => ({
    transform: `rotate(${-i * (360 / DOT_COUNT)}deg) translateY(-58px)`,
    opacity: 1 - i * (0.85 / (DOT_COUNT - 1)),
  })),
)
</script>

<template>
  <!-- Fully transparent: it only blocks clicks while a job runs. -->
  <div
    ref="root"
    role="status"
    aria-live="polite"
    aria-busy="true"
    tabindex="-1"
    class="fixed inset-0 z-[60] cursor-wait outline-none"
  >
    <div
      class="absolute top-[calc(50%-11px)] left-1/2 size-[134px] -translate-x-1/2 -translate-y-1/2"
    >
      <div class="busy-ring absolute inset-0">
        <div
          v-for="(dot, i) in dots"
          :key="i"
          class="bg-busy-dot absolute top-1/2 left-1/2 -mt-[8.5px] -ml-[8.5px] size-[17px] rounded-full"
          :style="{ transform: dot.transform, opacity: dot.opacity }"
        />
      </div>

      <span
        class="text-busy-text absolute top-[calc(50%-2px)] left-1/2 -translate-x-1/2 -translate-y-1/2 text-[9.5px] leading-none whitespace-nowrap"
      >
        Please wait...
      </span>
    </div>
  </div>
</template>

<style>
@keyframes busy-spin {
  to {
    transform: rotate(360deg);
  }
}

.busy-ring {
  animation: busy-spin 1.4s steps(14, end) infinite;
}

@media (prefers-reduced-motion: reduce) {
  .busy-ring {
    animation: none;
  }
}
</style>
