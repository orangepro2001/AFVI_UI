import type { InventoryCalls } from './inventory'
import type { ActiveModel, ModelEntry, NodeAnalysis, TeachSnapshot } from './types'

type TeachSpec = Pick<TeachSnapshot, 'unit' | 'dummy'>

function trimBase(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '')
}

async function readError(response: Response): Promise<Error> {
  try {
    const body = (await response.json()) as { error?: unknown }
    if (typeof body.error === 'string' && body.error !== '') return new Error(body.error)
  } catch {
    // Not JSON: fall back to the status text below.
  }
  return new Error(`HTTP ${response.status}`)
}

/** InventoryCalls over the dev server of scripts/devapi.go: GET <base>/api/<Method>. */
export function createHttpCalls(
  baseUrl: string,
  fetchFn: typeof fetch = (...args) => fetch(...args),
): InventoryCalls {
  const root = trimBase(baseUrl)

  async function get<T>(path: string): Promise<T> {
    const response = await fetchFn(`${root}${path}`)
    if (!response.ok) throw await readError(response)
    return (await response.json()) as T
  }

  return {
    getModels: () => get<ModelEntry[]>('/api/GetModels'),
    getActiveModel: () => get<ActiveModel>('/api/GetActiveModel'),
    selectModel: (name) => get<ActiveModel>(`/api/SelectModel?name=${encodeURIComponent(name)}`),
    getTeachSpec: () => get<TeachSpec>('/api/GetTeachSpec'),
    getNodeAnalysis: (nodeId) =>
      get<NodeAnalysis>(`/api/GetNodeAnalysis?id=${encodeURIComponent(nodeId)}`),
  }
}
