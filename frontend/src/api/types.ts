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

/** The three Align / ROI nodes that own a picture of the strip: Metal, SR and DMG. */
export type AlignKind = 'metal' | 'sr' | 'dmg'

export interface SpecNode {
  id: string
  name: string
  tone: SpecTone
  /** undefined: the node has no checkbox. */
  checked?: boolean
  /**
   * The box of each Light tab (index 0 = Light-1) when the machine keeps one per light; without
   * it `checked` holds for all three lights. `checked` is the value of Light-2.
   */
  lightChecked?: boolean[]
  /** Set on the nodes whose selection puts that align picture into the viewer. */
  align?: AlignKind
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

/** The colour of a row name in the analysis tables (theme tokens --analysis-name-*). */
export type AnalysisTone = 'green' | 'yellow' | 'plain'

/** The Red / Green / Blue tabs above the channel table. */
export type AnalysisChannelId = 'red' | 'green' | 'blue'

/** One row of the analysis tables ("No.", "Name", "Value", and "Min" in the channel table). */
export interface AnalysisRow {
  no: number
  name: string
  /** boolean: shown as a switch; string: the number the way the machine prints it ("-2.000"). */
  value: string | boolean
  /** Only the channel table has this column. */
  min?: string
  /** Colour of the name; plain when omitted. */
  tone?: AnalysisTone
}

/** What the three tables of Image Analysis show for one light tab. */
export interface LightAnalysis {
  /** The first table, under the Light tabs. */
  upper: AnalysisRow[]
  /** The second table. */
  lower: AnalysisRow[]
  /** The third table, one list per Red / Green / Blue tab. */
  channels: Record<AnalysisChannelId, AnalysisRow[]>
}

/** The analysis of one node of the specification tree, by Light tab. */
export type NodeAnalysis = Record<1 | 2 | 3, LightAnalysis>

export interface ImageRef {
  url: string
  width: number
  height: number
}

export interface TeachSnapshot {
  unit: SpecSet
  dummy: SpecSet
  /** The pictures of the Align / ROI nodes. */
  alignImages: Record<AlignKind, ImageRef>
}

// --- Session ---------------------------------------------------------------------------------

export interface UserAccount {
  /** "01" */
  index: string
  name: string
  /** "Master" */
  level: string
  /** "Login" */
  state: string
}

/** Who is signed in, and the accounts the "Log in/out" dialog lists. */
export interface SessionInfo {
  /** The name of the account that is logged in. */
  current: string
  /** "2026-10-20 16:35:23" */
  since: string
  users: UserAccount[]
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

// --- Models ----------------------------------------------------------------------------------

/** The model the UI works with: the folder of INSPECT_SPEC that is loaded. */
export interface ActiveModel {
  /** "6ST2001Q01-00" */
  name: string
  /** The name without the revision: "6ST2001Q01". */
  base: string
  /** "2.0" */
  resolution: string
  surface: 'Top' | 'Bottom'
}

/** The three hosts the application can read its models and inventory from. */
export type MachineId = 'FM1' | 'FM2' | 'BM'

/** The result of checking one folder: it must directly contain PxInventory and PxRepository. */
export interface PathCheck {
  ok: boolean
  /** Why the folder is rejected, e.g. "PxRepository is missing"; empty when ok. */
  message: string
}

/** One host of the Connector dialog. */
export interface ConnectorMachine {
  id: MachineId
  /** The stored folder, empty when none. */
  path: string
  /** `ok`: the folder holds PxInventory and PxRepository; `invalid`: stored but fails the check. */
  status: 'unset' | 'ok' | 'invalid'
  /** The check message when `invalid`, otherwise empty. */
  message: string
}

/** The state of the Connector dialog (the Share button of the rail). */
export interface ConnectorConfig {
  /** Always the three hosts, in the order FM1, FM2, BM. */
  machines: ConnectorMachine[]
  /** The host the application reads from; empty until one is configured. */
  active: MachineId | ''
}

/** What the Connector dialog applies: the folders (empty clears a host) and the host to read. */
export interface ConnectorInput {
  machines: { id: MachineId; path: string }[]
  active: MachineId | ''
}

/** One row of the "Choose Model Names" dialog. */
export interface ModelEntry {
  /** "01" */
  index: string
  /** "2026-05-04 11:28:12" */
  created: string
  /** "21csp043-09" */
  name: string
  /** Empty unless the model is loaded. */
  state: string
  /** "2.0" */
  resolution: string
}

// --- Configuration panel ---------------------------------------------------------------------

/** How a row of the configuration panel is edited. */
export type ConfigKind = 'text' | 'number' | 'toggle' | 'choice'

/** One row of the configuration panel (the Tools button of the rail). */
export interface ConfigEntry {
  /** Unique over all groups: "export.ip". */
  key: string
  label: string
  kind: ConfigKind
  /** A boolean for a toggle, the text of the value for every other kind. */
  value: string | boolean
  /** The choices of a `choice` row. */
  options?: string[]
}

/** A heading of the panel and the rows under it. */
export interface ConfigGroup {
  id: string
  title: string
  entries: ConfigEntry[]
}

// --- Median dialog ---------------------------------------------------------------------------

/** One of the Light check boxes of the Median dialog. */
export interface MedianLight {
  /** 1..4 */
  id: number
  /** "Light1" */
  label: string
  checked: boolean
  /** false: shown dimmed, cannot be chosen (the machine has no such light). */
  enabled: boolean
}

/** What the Median dialog starts from: the lights and the unit map to pick units on. */
export interface MedianSetup {
  lights: MedianLight[]
  /** The unit map has `columns` x `rows` cells, numbered row by row from 0. */
  columns: number
  rows: number
  /** The number in the "Select Random Units" field. */
  randomCount: number
}
