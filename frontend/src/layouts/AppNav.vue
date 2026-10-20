<script setup lang="ts">
import { cn } from 'cn'
import { pageTabs } from '@/router/routes'
import StatusButton from './StatusButton.vue'
</script>

<template>
  <nav class="flex h-nav shrink-0 gap-[3px]" aria-label="Pages">
    <div class="flex min-w-0 flex-1 gap-[3px]">
      <RouterLink
        v-for="tab in pageTabs"
        :key="tab.name"
        v-slot="{ href, navigate, isExactActive }"
        :to="tab.to"
        custom
      >
        <a
          :href="href"
          :aria-current="isExactActive ? 'page' : undefined"
          :class="
            cn(
              'flex flex-1 items-center justify-center text-md uppercase',
              isExactActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-nav text-foreground hover:bg-accent',
            )
          "
          @click="navigate"
        >
          {{ tab.label }}
        </a>
      </RouterLink>
    </div>
    <StatusButton />
  </nav>
</template>
