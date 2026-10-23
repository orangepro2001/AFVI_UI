import type { ApiClient } from './client'
import type {
  ActiveModel,
  AlignRoi,
  AlignView,
  GvBox,
  GvStats,
  MedianView,
  ModelEntry,
  NodeAnalysis,
  TeachSnapshot,
} from './types'

/** The calls of the Go side, however they are reached (Wails binding or dev HTTP server). */
export interface InventoryCalls {
  getModels(): Promise<ModelEntry[]>
  getActiveModel(): Promise<ActiveModel>
  selectModel(name: string): Promise<ActiveModel>
  /** What Go knows about the tree: the pictures of the Align / ROI nodes are not part of it. */
  getTeachSpec(): Promise<Pick<TeachSnapshot, 'unit' | 'dummy'>>
  getNodeAnalysis(nodeId: string): Promise<NodeAnalysis>
  getAlignView(): Promise<AlignView>
  saveAlignRois(rois: AlignRoi[]): Promise<AlignRoi[]>
  resetAlignRois(): Promise<AlignRoi[]>
  getMedianView(light: number): Promise<MedianView>
  measureGv(light: number, box: GvBox): Promise<GvStats>
}

type Method =
  | 'getModels'
  | 'getActiveModel'
  | 'selectModel'
  | 'getTeach'
  | 'getNodeAnalysis'
  | 'getAlignView'
  | 'getMedianView'

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * The ApiClient methods the inventory answers. `base` (the mock) supplies what Go does not have
 * (the align pictures) and answers instead when a call fails, e.g. no PxInventory was found; every
 * method warns once on the console when it falls back.
 */
export function createInventoryApi(
  calls: InventoryCalls,
  base: ApiClient,
  warn: (message: string) => void = (m) => console.warn(m),
): Pick<
  ApiClient,
  | 'getModels'
  | 'getActiveModel'
  | 'selectModel'
  | 'getTeach'
  | 'getNodeAnalysis'
  | 'getAlignView'
  | 'saveAlignRois'
  | 'resetAlignRois'
  | 'getMedianView'
  | 'measureGv'
> {
  const warned = new Set<Method>()
  // Where the Median picture on screen came from: a box is measured where its picture is from.
  let medianFromMock = false

  async function call<T>(
    method: Method,
    run: () => Promise<T>,
    fallback: () => Promise<T>,
  ): Promise<T> {
    try {
      return await run()
    } catch (error) {
      if (!warned.has(method)) {
        warned.add(method)
        warn(`inventory.${method} failed, using the mock: ${errorText(error)}`)
      }
      return fallback()
    }
  }

  return {
    getModels: () =>
      call(
        'getModels',
        () => calls.getModels(),
        () => base.getModels(),
      ),

    getActiveModel: () =>
      call(
        'getActiveModel',
        () => calls.getActiveModel(),
        () => base.getActiveModel(),
      ),

    selectModel: (name) =>
      call(
        'selectModel',
        () => calls.selectModel(name),
        () => base.selectModel(name),
      ),

    getTeach: () =>
      call(
        'getTeach',
        async () => {
          const spec = await calls.getTeachSpec()
          const mock = await base.getTeach()
          return { unit: spec.unit, dummy: spec.dummy, alignImages: mock.alignImages }
        },
        () => base.getTeach(),
      ),

    getNodeAnalysis: (nodeId) =>
      call(
        'getNodeAnalysis',
        () => calls.getNodeAnalysis(nodeId),
        () => base.getNodeAnalysis(nodeId),
      ),

    getAlignView: () =>
      call(
        'getAlignView',
        () => calls.getAlignView(),
        () => base.getAlignView(),
      ),

    getMedianView: (light) =>
      call(
        'getMedianView',
        async () => {
          const view = await calls.getMedianView(light)
          medianFromMock = false
          return view
        },
        async () => {
          medianFromMock = true
          return base.getMedianView(light)
        },
      ),

    // Measuring never falls back by itself: numbers of another picture would look right.
    measureGv: (light, box) =>
      medianFromMock ? base.measureGv(light, box) : calls.measureGv(light, box),

    // A save or reset that fails must say so: falling back to the mock would look like it worked.
    saveAlignRois: (rois) => calls.saveAlignRois(rois),
    resetAlignRois: () => calls.resetAlignRois(),
  }
}
