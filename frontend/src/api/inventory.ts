import type { ApiClient } from './client'
import type { ActiveModel, ModelEntry, NodeAnalysis, TeachSnapshot } from './types'

/** The five calls of the Go side, however they are reached (Wails binding or dev HTTP server). */
export interface InventoryCalls {
  getModels(): Promise<ModelEntry[]>
  getActiveModel(): Promise<ActiveModel>
  selectModel(name: string): Promise<ActiveModel>
  /** What Go knows about the tree: the pictures of the Align / ROI nodes are not part of it. */
  getTeachSpec(): Promise<Pick<TeachSnapshot, 'unit' | 'dummy'>>
  getNodeAnalysis(nodeId: string): Promise<NodeAnalysis>
}

type Method = 'getModels' | 'getActiveModel' | 'selectModel' | 'getTeach' | 'getNodeAnalysis'

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
  'getModels' | 'getActiveModel' | 'selectModel' | 'getTeach' | 'getNodeAnalysis'
> {
  const warned = new Set<Method>()

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
  }
}
