import type { App } from 'vue'
import type { Router } from 'vue-router'
import type { ApiClient } from '@/api/client'
import { useAlignRoiStore } from '@/stores/alignRoi'
import { useAppStore } from '@/stores/app'
import { useCalibrationStore } from '@/stores/calibration'
import { useConfigStore } from '@/stores/config'
import { useMeasureStore } from '@/stores/measure'
import { useSettingsStore } from '@/stores/settings'
import { useTeachStore } from '@/stores/teach'
import { useWorkbenchStore } from '@/stores/workbench'
import { startJournal } from './index'
import { observeOperations } from './observe'
import { createRecorder } from './recorder'

/**
 * Starts the journal of this run: what the user does is collected and handed to the backend,
 * which keeps it in the session's file (internal/journal). Call it once, after the app is
 * mounted. What is still waiting is sent when the window is hidden or closed.
 */
export function startOperationJournal(app: App, api: ApiClient, router: Router): void {
  const recorder = createRecorder((ops) => api.recordOps(ops))
  startJournal(recorder)
  const stores = app.runWithContext(() => ({
    app: useAppStore(),
    workbench: useWorkbenchStore(),
    measure: useMeasureStore(),
    teach: useTeachStore(),
    alignRoi: useAlignRoiStore(),
    calibration: useCalibrationStore(),
    settings: useSettingsStore(),
    config: useConfigStore(),
  }))
  observeOperations(recorder, router, stores)
  recorder.record('ui.ready', { w: window.innerWidth, h: window.innerHeight })

  window.addEventListener('pagehide', () => void recorder.flush())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void recorder.flush()
  })
}
