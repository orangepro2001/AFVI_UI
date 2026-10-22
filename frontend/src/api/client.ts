import type { InjectionKey } from 'vue'
import { inject } from 'vue'
import type {
  ActiveModel,
  AlignRoi,
  AlignView,
  AppInfo,
  CalibrationSnapshot,
  ConfigGroup,
  ConnectorConfig,
  ConnectorInput,
  DefectRow,
  HomeSnapshot,
  LogEntry,
  MedianSetup,
  ModelEntry,
  NodeAnalysis,
  PathCheck,
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
  /**
   * The composed Metal / SR picture of the loaded model with its align ROIs: the user's own list
   * when one was saved, else the machine's.
   */
  getAlignView(): Promise<AlignView>
  /**
   * Saves the whole ROI list of the loaded model. It goes to the user's own file, never into the
   * machine's data; resolves to the list as saved (clamped into the picture).
   */
  saveAlignRois(rois: AlignRoi[]): Promise<AlignRoi[]>
  /** Drops the user's list: the machine's own ROIs are back. */
  resetAlignRois(): Promise<AlignRoi[]>
  /** The signed-in user and the accounts of the "Log in/out" dialog. */
  getSession(): Promise<SessionInfo>
  /** The models of the "Choose Model Names" dialog. */
  getModels(): Promise<ModelEntry[]>
  /** The loaded model (its name is the MODEL box of the workbench pages). */
  getActiveModel(): Promise<ActiveModel>
  /** Loads another model; the specification tree and tables of TEACH follow it. */
  selectModel(name: string): Promise<ActiveModel>
  /** The three hosts and which one the application reads (the Share button of the rail). */
  getConnector(): Promise<ConnectorConfig>
  /** Checks one folder: it must directly contain PxInventory and PxRepository. */
  checkMachinePath(path: string): Promise<PathCheck>
  /**
   * Applies the folders and the host to read; rejects when a folder fails the check. Afterwards
   * every model and inventory call answers from the chosen host.
   */
  saveConnector(input: ConnectorInput): Promise<ConnectorConfig>
  /** Opens the folder picker of the window at `startDir`; resolves to "" when cancelled. */
  pickFolder(startDir: string): Promise<string>
  /** The defects of the strip on the REVIEW page (empty until an inspection has run). */
  getDefects(): Promise<DefectRow[]>
  /** The light strip picture and the 20 channels of the CALIBRATE page. */
  getCalibration(): Promise<CalibrationSnapshot>
  /** The mask generation, inspection light and alignment settings of the SETTINGS page. */
  getSettings(): Promise<SettingsSnapshot>
  /** The groups and rows of the configuration panel (the Tools button of the rail). */
  getConfig(): Promise<ConfigGroup[]>
  /** The lights and the unit map of the Median dialog. */
  getMedianSetup(): Promise<MedianSetup>
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
