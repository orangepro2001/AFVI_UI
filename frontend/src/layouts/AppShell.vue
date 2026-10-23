<script setup lang="ts">
import { TooltipProvider } from '@/components/ui/tooltip'
import { useApi } from '@/api'
import type { ModelEntry } from '@/api/types'
import type { GenerateOptions } from '@/features/dialogs/generate-options'
import type { MedianSelection } from '@/features/dialogs/median'
import { record } from '@/journal'
import LoadingOverlay from '@/components/app/LoadingOverlay.vue'
import ConfigPanel from '@/features/dialogs/ConfigPanel.vue'
import ConnectorDialog from '@/features/dialogs/ConnectorDialog.vue'
import GenerateOptionDialog from '@/features/dialogs/GenerateOptionDialog.vue'
import LoadGrabDialog from '@/features/dialogs/LoadGrabDialog.vue'
import MedianDialog from '@/features/dialogs/MedianDialog.vue'
import ModelSelectDialog from '@/features/dialogs/ModelSelectDialog.vue'
import LoginDialog from '@/features/session/LoginDialog.vue'
import { useAppStore } from '@/stores/app'
import AppHeader from './AppHeader.vue'
import AppNav from './AppNav.vue'
import { railTools } from './navigation'
import SideRail from './SideRail.vue'

const api = useApi()
const app = useAppStore()

// How long the mock machine takes for the Align button before it reports ready again.
const ALIGN_MS = 3000

// The rail works on every page: its dialogs and the loading overlay are window-level, so they are
// mounted here, next to the router view, and driven by the app store.
function onRailSelect(id: string) {
  // While the machine is busy the rail does nothing (a key press can still reach a rail button).
  if (app.busy) return
  record('rail', { id })
  switch (id) {
    case 'user':
      app.loginOpen = true
      break
    case 'share':
      app.connectorOpen = true
      break
    case 'model':
      app.modelOpen = true
      break
    case 'images':
      app.grabOpen = true
      break
    case 'nodes':
      app.generateOpen = true
      break
    case 'layout':
      app.runBusy(ALIGN_MS)
      break
    case 'layers':
      app.medianOpen = true
      break
    case 'tools':
      app.configOpen = true
      break
    // The other rail tools have no action yet.
  }
}

function onFullscreen() {
  record('fullscreen')
  void api.toggleFullscreen()
}

// Nothing consumes the choices of these two dialogs yet; the journal keeps them.
function onMedianSave(selection: MedianSelection) {
  record('median.save', {
    lights: selection.lights.join(','),
    n: selection.cells.length,
    cells: selection.cells.join(','),
  })
}

function onGenerate(options: GenerateOptions) {
  record('generate.confirm', { light: options.light, mt: options.mt, sr: options.sr })
}

// The dialog closes itself; loading the model makes the MODEL boxes and TEACH follow it.
function onModelApply(entry: ModelEntry) {
  void app.selectModel(entry.name)
}
</script>

<template>
  <TooltipProvider :delay-duration="300">
    <div class="flex h-full flex-col pr-[3px]">
      <AppHeader />
      <AppNav />
      <div class="flex min-h-0 flex-1 gap-gap">
        <SideRail :tools="railTools" @select="onRailSelect" @fullscreen="onFullscreen" />
        <main class="min-w-0 flex-1 pt-[4px] pb-[4px]">
          <RouterView />
        </main>
      </div>
      <LoginDialog v-model:open="app.loginOpen" />
      <ModelSelectDialog v-model:open="app.modelOpen" @apply="onModelApply" />
      <ConnectorDialog v-model:open="app.connectorOpen" @applied="app.reloadInventory()" />
      <LoadGrabDialog v-model:open="app.grabOpen" />
      <GenerateOptionDialog v-model:open="app.generateOpen" @confirm="onGenerate" />
      <MedianDialog v-model:open="app.medianOpen" @save="onMedianSave" />
      <ConfigPanel v-model:open="app.configOpen" />
      <LoadingOverlay v-if="app.busy" />
    </div>
  </TooltipProvider>
</template>
