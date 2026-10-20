<script setup lang="ts">
import { TooltipProvider } from '@/components/ui/tooltip'
import { useApi } from '@/api'
import AppHeader from './AppHeader.vue'
import AppNav from './AppNav.vue'
import { railTools } from './navigation'
import SideRail from './SideRail.vue'

const api = useApi()
</script>

<template>
  <TooltipProvider :delay-duration="300">
    <div class="flex h-full flex-col pr-[3px]">
      <AppHeader />
      <AppNav />
      <div class="flex min-h-0 flex-1 gap-gap">
        <SideRail :tools="railTools" @fullscreen="api.toggleFullscreen()" />
        <main class="min-w-0 flex-1 pt-[4px] pb-[4px]">
          <RouterView />
        </main>
      </div>
    </div>
  </TooltipProvider>
</template>
