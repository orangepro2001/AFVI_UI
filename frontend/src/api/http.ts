import type { ConnectorCalls } from './connector'
import type { InventoryCalls } from './inventory'
import type {
  ActiveModel,
  AlignRoi,
  AlignView,
  ConnectorConfig,
  GvStats,
  MedianView,
  ModelEntry,
  NodeAnalysis,
  PathCheck,
  TeachSnapshot,
} from './types'

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

/**
 * InventoryCalls and ConnectorCalls over the dev server of scripts/devapi.go:
 * GET <base>/api/<Method>, POST for SaveConnector.
 */
export function createHttpCalls(
  baseUrl: string,
  fetchFn: typeof fetch = (...args) => fetch(...args),
): InventoryCalls & ConnectorCalls {
  const root = trimBase(baseUrl)

  async function send<T>(input: string, init?: RequestInit): Promise<T> {
    const response = await fetchFn(`${root}${input}`, init)
    if (!response.ok) throw await readError(response)
    return (await response.json()) as T
  }

  function get<T>(path: string): Promise<T> {
    return send<T>(path)
  }

  function post<T>(path: string, body: unknown): Promise<T> {
    return send<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  return {
    getModels: () => get<ModelEntry[]>('/api/GetModels'),
    getActiveModel: () => get<ActiveModel>('/api/GetActiveModel'),
    selectModel: (name) => get<ActiveModel>(`/api/SelectModel?name=${encodeURIComponent(name)}`),
    getTeachSpec: () => get<TeachSpec>('/api/GetTeachSpec'),
    getNodeAnalysis: (nodeId) =>
      get<NodeAnalysis>(`/api/GetNodeAnalysis?id=${encodeURIComponent(nodeId)}`),
    getAlignView: () => get<AlignView>('/api/GetAlignView'),
    saveAlignRois: (rois) => post<AlignRoi[]>('/api/SaveAlignRois', rois),
    resetAlignRois: () => post<AlignRoi[]>('/api/ResetAlignRois', {}),
    getMedianView: (light) => get<MedianView>(`/api/GetMedianView?light=${light}`),
    measureGv: (light, box) => post<GvStats>('/api/MeasureGv', { light, ...box }),
    getConnector: () => get<ConnectorConfig>('/api/GetConnector'),
    checkMachinePath: (path) =>
      get<PathCheck>(`/api/CheckMachinePath?path=${encodeURIComponent(path)}`),
    saveConnector: (input) => post<ConnectorConfig>('/api/SaveConnector', input),
    pickFolder: (startDir) => get<string>(`/api/PickFolder?dir=${encodeURIComponent(startDir)}`),
  }
}
