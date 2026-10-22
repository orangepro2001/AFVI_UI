import type { ApiClient } from './client'
import { createConnectorApi } from './connector'
import { createInventoryApi } from './inventory'
import type {
  ActiveModel,
  AlignRoi,
  AlignView,
  ConnectorConfig,
  ModelEntry,
  NodeAnalysis,
  PathCheck,
  TeachSnapshot,
} from './types'
import {
  CheckMachinePath,
  GetActiveModel,
  GetAlignView,
  GetAppInfo,
  GetConnector,
  GetModels,
  GetNodeAnalysis,
  GetTeachSpec,
  PickFolder,
  ResetAlignRois,
  SaveAlignRois,
  SaveConnector,
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
 * The methods the Go side implements today: getAppInfo, toggleFullscreen, the inventory calls
 * (getModels, getActiveModel, selectModel, getTeach, getNodeAnalysis, getAlignView, saveAlignRois,
 * resetAlignRois) and the four Connector calls
 * (getConnector, checkMachinePath, saveConnector, pickFolder). Everything else stays with the mock
 * until Go has it (createApi merges the two), so this list is the honest state of the backend.
 *
 * To move a method over: add the exported method to App (app.go), run scripts/bindings.sh, and
 * call the generated function here.
 *
 * The generated classes are wider than our unions (ModelEntry.tone is a string, SpecNode.align
 * too, connector.SaveInput has other fields); Wails returns plain JSON objects and accepts plain
 * JSON on the way in, so the results and the SaveInput argument are cast to the target types.
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
        getAlignView: () => GetAlignView() as unknown as Promise<AlignView>,
        saveAlignRois: (rois) =>
          SaveAlignRois(rois as Parameters<typeof SaveAlignRois>[0]) as unknown as Promise<
            AlignRoi[]
          >,
        resetAlignRois: () => ResetAlignRois() as unknown as Promise<AlignRoi[]>,
      },
      base,
    ),
    ...createConnectorApi({
      getConnector: () => GetConnector() as unknown as Promise<ConnectorConfig>,
      checkMachinePath: (path) => CheckMachinePath(path) as unknown as Promise<PathCheck>,
      saveConnector: (input) =>
        SaveConnector(
          input as unknown as Parameters<typeof SaveConnector>[0],
        ) as unknown as Promise<ConnectorConfig>,
      pickFolder: (startDir) => PickFolder(startDir) as unknown as Promise<string>,
    }),
    // Window control is the Wails runtime, not a Go method of ours.
    toggleFullscreen: async () => {
      if (await WindowIsFullscreen()) WindowUnfullscreen()
      else WindowFullscreen()
    },
  }
}
