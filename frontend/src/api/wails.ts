import type { ApiClient } from './client'
import { GetAppInfo } from '../../wailsjs/go/main/App'
import {
  WindowFullscreen,
  WindowIsFullscreen,
  WindowUnfullscreen,
} from '../../wailsjs/runtime/runtime'

/**
 * The methods the Go side implements today. Everything else stays with the mock until Go has it
 * (createApi merges the two), so this list is the honest state of the backend.
 *
 * To move a method over: add the exported method to App (app.go), run scripts/bindings.sh, and
 * call the generated function here.
 */
export function createWailsApi(): Partial<ApiClient> {
  return {
    getAppInfo: () => GetAppInfo(),
    // Window control is the Wails runtime, not a Go method of ours.
    toggleFullscreen: async () => {
      if (await WindowIsFullscreen()) WindowUnfullscreen()
      else WindowFullscreen()
    },
  }
}
