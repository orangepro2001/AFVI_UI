import {
  Aperture,
  Box,
  ChartNoAxesGantt,
  CircleUserRound,
  Contrast,
  FileSearch,
  Images,
  Info,
  Layers,
  Network,
  Save,
  Scan,
  Server,
  Share2,
  UserRound,
  Waypoints,
  Wrench,
} from '@lucide/vue'
import type { Component } from 'vue'

export interface ToolItem {
  id: string
  /** Tooltip and accessible name. */
  label: string
  icon: Component
}

/*
 * Icons are lucide look-alikes of the reference design, and the labels are placeholders until the
 * design names the functions. Replace an icon with an SVG under assets/icons when the design
 * needs an exact drawing.
 */

/** The icon rail at the left edge. */
export const railTools: ToolItem[] = [
  { id: 'information', label: 'Information', icon: Info },
  { id: 'user', label: 'User', icon: UserRound },
  { id: 'share', label: 'Share', icon: Share2 },
  { id: 'model', label: 'Model', icon: Box },
  { id: 'images', label: 'Images', icon: Images },
  { id: 'nodes', label: 'Nodes', icon: Network },
  { id: 'layout', label: 'Layout', icon: ChartNoAxesGantt },
  { id: 'region', label: 'Region', icon: Scan },
  { id: 'layers', label: 'Layers', icon: Layers },
  { id: 'save', label: 'Save', icon: Save },
  { id: 'search', label: 'Search', icon: FileSearch },
  { id: 'tools', label: 'Tools', icon: Wrench },
]

/** The icons at the right end of the header. */
export const headerTools: ToolItem[] = [
  { id: 'account', label: 'Account', icon: CircleUserRound },
  { id: 'camera', label: 'Camera', icon: Aperture },
  { id: 'light', label: 'Light', icon: Contrast },
  { id: 'system', label: 'System', icon: Server },
  { id: 'connection', label: 'Connection', icon: Waypoints },
]
