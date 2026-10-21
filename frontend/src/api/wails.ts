import type { ApiClient } from './client'
import { createInventoryApi } from './inventory'
import type { ActiveModel, ModelEntry, NodeAnalysis, TeachSnapshot } from './types'
import {
  GetActiveModel,
  GetAppInfo,
  GetModels,
  GetNodeAnalysis,
  GetTeachSpec,
  SelectModel,
} from '../../wailsjs/go/main/App'
import {
  WindowFullscreen,
  WindowIsFullscreen,
  WindowUnfullscreen,
} from '../../wailsjs/runtime/runtime'

/** The part of the inventory snapshot that Go answers (the align pictures come from the mock). */
type TeachSpec = Pick<TeachSnapshot, 'unit' | 'dummy'>

/**
 * The methods the Go side implements today: getAppInfo, toggleFullscreen, and the inventory calls
 * (getModels, getActiveModel, selectModel, getTeach, getNodeAnalysis). Everything else stays with
 * the mock until Go has it (createApi merges the two), so this list is the honest state of the
 * backend.
 *
 * To move a method over: add the exported method to App (app.go), run scripts/bindings.sh, and
 * call the generated function here.
 *
 * The generated classes are wider than our unions (ModelEntry.tone is a string, SpecNode.align
 * too); Wails returns plain JSON objects, so the results are cast to the target types.
 */
export function createWailsApi(base: ApiClient): Partial<ApiClient> {
  return {
    getAppInfo: () => GetAppInfo(),
    ...createInventoryApi(
      {
        getModels: () => GetModels() as unknown as Promise<ModelEntry[]>,
        getActiveModel: () => GetActiveModel() as unknown as Promise<ActiveModel>,
        selectModel: (name) => SelectModel(name) as unknown as Promise<ActiveModel>,
        getTeachSpec: () => GetTeachSpec() as unknown as Promise<TeachSpec>,
        getNodeAnalysis: (nodeId) => GetNodeAnalysis(nodeId) as unknown as Promise<NodeAnalysis>,
      },
      base,
    ),
    // Window control is the Wails runtime, not a Go method of ours.
    toggleFullscreen: async () => {
      if (await WindowIsFullscreen()) WindowUnfullscreen()
      else WindowFullscreen()
    },
  }
}
