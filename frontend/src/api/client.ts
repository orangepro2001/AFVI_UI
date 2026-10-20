import type { InjectionKey } from 'vue'
import { inject } from 'vue'
import type {
  AppInfo,
  CalibrationSnapshot,
  DefectRow,
  HomeSnapshot,
  LogEntry,
  ModelEntry,
  NodeAnalysis,
  SessionInfo,
  SettingsSnapshot,
  SystemStats,
  TeachSnapshot,
  Unsubscribe,
  WorkbenchSnapshot,
} from './types'

/**
 * Everything the UI asks of the backend. Add a method here first, use it in the page, and let the
 * mock (api/mock) answer; the Go side (api/wails.ts) takes over method by method.
 */
export interface ApiClient {
  getAppInfo(): Promise<AppInfo>
  getHomeSnapshot(): Promise<HomeSnapshot>
  /** The strip, thumbnail, cell grid and read-outs of the workbench pages. */
  getWorkbench(): Promise<WorkbenchSnapshot>
  /** The specification trees (Unit and Dummy) of the TEACH page. */
  getTeach(): Promise<TeachSnapshot>
  /** The three Image Analysis tables of one node of the specification tree. */
  getNodeAnalysis(nodeId: string): Promise<NodeAnalysis>
  /** The signed-in user and the accounts of the "Log in/out" dialog. */
  getSession(): Promise<SessionInfo>
  /** The models of the "Choose Model Names" dialog. */
  getModels(): Promise<ModelEntry[]>
  /** The defects of the strip on the REVIEW page (empty until an inspection has run). */
  getDefects(): Promise<DefectRow[]>
  /** The light strip picture and the 20 channels of the CALIBRATE page. */
  getCalibration(): Promise<CalibrationSnapshot>
  /** The mask generation, inspection light and alignment settings of the SETTINGS page. */
  getSettings(): Promise<SettingsSnapshot>
  /** Pushed about once a second. */
  onSystemStats(listener: (stats: SystemStats) => void): Unsubscribe
  onLog(listener: (entry: LogEntry) => void): Unsubscribe
  /** The window goes full screen, or back. */
  toggleFullscreen(): Promise<void>
}

export const apiKey: InjectionKey<ApiClient> = Symbol('afvi-api')

export function useApi(): ApiClient {
  const api = inject(apiKey)
  if (!api) throw new Error('ApiClient is not provided: app.provide(apiKey, createApi())')
  return api
}
