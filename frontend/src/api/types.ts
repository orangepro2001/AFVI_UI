/**
 * The data the UI works with. Frontend-first: these types are the contract the Go side
 * implements later (docs/FRONTEND.md, "API layer"). Pages and components depend on these types and
 * on ApiClient, never on Wails or on mock data.
 */

export interface AppInfo {
  version: string
  platform: string
}

// --- Work status: a strip's progress through the stations -----------------------------------

export type WorkState = 'none' | 'work' | 'error' | 'complete'

export const stations = [
  'grab',
  'ga',
  'align',
  'transfer',
  'prepare',
  'inspect',
  'dmg',
  'defect',
] as const
export type Station = (typeof stations)[number]

export interface StripStatus {
  stripNo: number
  /** One entry per step of the station; the grid draws one block per entry. */
  stations: Record<Station, WorkState[]>
  defectCount: number | null
  totalCount: number | null
  mergeCount: number | null
  final: string | null
}

// --- Inspection area -------------------------------------------------------------------------

export const inspectionKinds = [
  'bright',
  'dark',
  'chain',
  'skeleton',
  'barcode',
  'srShift',
] as const
export type InspectionKind = (typeof inspectionKinds)[number]

export const channels = ['red', 'green', 'blue'] as const
export type Channel = (typeof channels)[number]

export interface InspectionNode {
  name: string
  /** One slot per inspection step; null is a step that is not used. */
  channels: Record<Channel, (InspectionKind | null)[]>
}

export interface LightInspection {
  id: string
  title: string
  nodes: InspectionNode[]
}

export interface InspectionArea {
  lights: LightInspection[]
  page: number
  pageCount: number
}

// --- Machine ---------------------------------------------------------------------------------

export interface ProductInfo {
  product: string
  camera: string
  resolution: string
  surface: string
}

export interface ComponentInfo {
  name: string
  mode: string
  ip: string
  port: number
  online: boolean
}

export interface NetworkStats {
  ip: string
  /** Scale of the chart, in Kb (the label above the plot). */
  maxKb: number
  /** Current send rate, in Kbps; 0 is shown as "0.00 bps". */
  sendKbps: number
  /** Oldest first, each 0..maxKb. */
  history: number[]
}

export interface SystemStats {
  cpu: { usage: number; history: number[] }
  memory: { totalGB: number; usedGB: number; freeGB: number; history: number[] }
  networks: NetworkStats[]
  storage: { drive: string; totalGB: number; usedGB: number; freeGB: number }
}

/** notice: yellow; dim: greyed out; select: blue, the line the operator picked. */
export type LogLevel = 'info' | 'notice' | 'dim' | 'select'

export interface LogEntry {
  /** "2026-10-20 17:22:45" */
  time: string
  text: string
  level: LogLevel
}

export interface HomeSnapshot {
  model: string
  lot: string
  dmg: { metal: boolean; sr: boolean }
  product: ProductInfo
  components: ComponentInfo[]
  strips: StripStatus[]
  inspection: InspectionArea
  stats: SystemStats
  logs: LogEntry[]
}

export type Unsubscribe = () => void

// --- Workbench: the left side of TEACH, REVIEW, CALIBRATE and SETTINGS ------------------------

/** The three boxes at the left of the workbench toolbar. */
export interface WorkbenchHeader {
  model: string
  lot: string
  strip: string
}

/** What the bar under the viewer shows about the pixel under the pointer. */
export interface Readout {
  cell: number
  strip: { x: number; y: number }
  /** Size of the whole strip image in pixels. */
  wh: { w: number; h: number }
  xy: { x: number; y: number }
  rgb: [number, number, number]
  avgGv: number
  stdGv: number
}

/** The cells of the strip (the red grid under the thumbnail) and the part the viewer shows. */
export interface CellGrid {
  columns: number
  rows: number
  view: { column: number; row: number; columns: number; rows: number }
}

export interface WorkbenchSnapshot {
  header: WorkbenchHeader
  /** The strip image in the viewer. */
  image: { url: string; width: number; height: number }
  /** The overview of the whole strip at the top left. */
  thumbnail: { url: string; width: number; height: number }
  cells: CellGrid
  readout: Readout
}

// --- Specification tree of TEACH ------------------------------------------------------------

/** The colour family of a chip in the specification tree (theme tokens --spec-*). */
export type SpecTone = 'root' | 'gold' | 'green' | 'silver' | 'violet'

export interface SpecNode {
  id: string
  name: string
  tone: SpecTone
  /** undefined: the node has no checkbox. */
  checked?: boolean
  children?: SpecNode[]
}

export interface AlignLine {
  light: number
  channel: string
}

export interface SpecSet {
  globalAlign: AlignLine[]
  srAlign: AlignLine[]
  overlay: { mk: boolean; ac: boolean; ic: boolean; sk: boolean }
  tree: SpecNode[]
}

/** One row of the analysis tables ("No.", "Name", "Value", and "Min" in the channel table). */
export interface AnalysisRow {
  no: number
  name: string
  value: string
  min?: string
}

export interface TeachSnapshot {
  unit: SpecSet
  dummy: SpecSet
}

// --- REVIEW, CALIBRATE, SETTINGS -------------------------------------------------------------

export interface DefectRow {
  image: string
  mergeId: string
  ch: string
  code: string
  size: number
  avr: number
}

export type LightColor = 'White' | 'Blue' | 'Green' | 'Red'

export interface CalibrationChannel {
  channel: number
  /** 0..1000, the position of the slider. */
  brightness: number
  value: number
  /** Degrees. */
  angle: number
  color: LightColor
  on: boolean
}

export interface CalibrationSnapshot {
  /** The picture of the light strip at the top of the panel. */
  lightImage: { url: string; width: number; height: number }
  enabled: boolean
  pageIndex: number
  channels: CalibrationChannel[]
}

export interface MaskSettings {
  enabled: boolean
  /** 0..1 */
  morphic: number
  /** 0..1 */
  sensitivity: number
  light: string
  channel: string
}

export interface LightOption {
  light: number
  /** false: shown dimmed, cannot be chosen (the machine has no such light). */
  available: boolean
}

export interface SettingsSnapshot {
  metal: MaskSettings
  sr: MaskSettings
  /** Which lights take part in the inspection. */
  inspectionLights: (LightOption & { enabled: boolean })[]
  /** The light that aligns the whole strip. */
  globalAlignLight: number
  globalAlignOptions: LightOption[]
}
