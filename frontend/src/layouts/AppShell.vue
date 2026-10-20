<script setup lang="ts">
import { TooltipProvider } from '@/components/ui/tooltip'
import { useApi } from '@/api'
import LoginDialog from '@/features/session/LoginDialog.vue'
import { useAppStore } from '@/stores/app'
import AppHeader from './AppHeader.vue'
import AppNav from './AppNav.vue'
import { railTools } from './navigation'
import SideRail from './SideRail.vue'

const api = useApi()
const app = useAppStore()

function onRailSelect(id: string) {
  if (id === 'user') {
    app.loginOpen = true
    return
  }
  // Other rail tools have no action yet; keep the rail click a no-op for now.
}
</script>

<template>
  <TooltipProvider :delay-duration="300">
    <div class="flex h-full flex-col pr-[3px]">
      <AppHeader />
      <AppNav />
      <div class="flex min-h-0 flex-1 gap-gap">
        <SideRail :tools="railTools" @select="onRailSelect" @fullscreen="api.toggleFullscreen()" />
        <main class="min-w-0 flex-1 pt-[4px] pb-[4px]">
          <RouterView />
        </main>
      </div>
      <LoginDialog v-model:open="app.loginOpen" />
    </div>
  </TooltipProvider>
</template>
