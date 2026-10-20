import type { Component } from 'vue'
import {
  Barcode,
  Grip,
  Group,
  Layers,
  LayoutGrid,
  Network,
  QrCode,
  Ruler,
  SlidersHorizontal,
  SquareDashed,
} from '@lucide/vue'
import type { ToolId } from '@/stores/workbench'

export interface ToolDef {
  id: ToolId
  label: string
  /** A lucide icon, or `text` for tools drawn as a word ("GV"). */
  icon?: Component
  text?: string
  disabled?: boolean
}

/** The first group of the toolbar, left to right. */
export const tools: ToolDef[] = [
  { id: 'network', label: 'Network', icon: Network, disabled: true },
  { id: 'ruler', label: 'Ruler', icon: Ruler },
  { id: 'gv', label: 'GV', text: 'GV' },
  { id: 'qr', label: 'QR', icon: QrCode },
  { id: 'layers', label: 'Layers', icon: Layers },
  { id: 'sliders', label: 'Sliders', icon: SlidersHorizontal },
  { id: 'dashed', label: 'Region', icon: SquareDashed },
  { id: 'grip', label: 'Grid', icon: Grip, disabled: true },
  { id: 'barcode', label: 'Barcode', icon: Barcode },
  { id: 'group', label: 'Group', icon: Group },
  { id: 'grid', label: 'Layout', icon: LayoutGrid },
]

/** Centre x of every button of the toolbar (design coordinates), per group; centre y is 138. */
export const toolbarX = {
  tools: [615, 648, 679, 711, 742, 774, 805, 837, 868, 900, 931],
  views: [974, 1006],
  lights: [1048, 1080, 1111],
  channels: [1155, 1187, 1218, 1250],
} as const

/** The toolbar starts at x = 602; buttons are 26px wide: left = centre - 13 - 602. */
export const toolbarLeft = (centreX: number) => centreX - 615
