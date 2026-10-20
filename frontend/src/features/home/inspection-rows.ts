import type { Channel, InspectionArea, InspectionKind } from '@/api/types'
import { channels } from '@/api/types'
import type { GridColumn } from '@/components/app/types'
import { channelLabel, channelTextClass } from '@/lib/presentation'

/** One row of the grid: the n-th node of every light side by side, keyed "<light>.<column>". */
export type InspectionRow = Record<string, string | (InspectionKind | null)[] | undefined>

export const nodeKey = (lightId: string) => `${lightId}.node`
export const channelKey = (lightId: string, channel: Channel) => `${lightId}.${channel}`

/** Every light is a group of four columns: its node name, then one per colour channel. */
export function inspectionColumns(area: InspectionArea): GridColumn[] {
  return area.lights.flatMap((light, i) => {
    const groupClass = i === 0 && light.id === 'light1' ? 'text-group-dmg' : undefined
    return [
      {
        key: nodeKey(light.id),
        label: 'Node',
        width: '149px',
        group: light.title,
        groupClass,
      },
      ...channels.map((channel) => ({
        key: channelKey(light.id, channel),
        label: channelLabel[channel],
        group: light.title,
        headClass: channelTextClass[channel],
      })),
    ]
  })
}

/** Row i holds node i of each light; a light with fewer nodes leaves its cells empty. */
export function inspectionRows(area: InspectionArea): InspectionRow[] {
  const count = Math.max(0, ...area.lights.map((light) => light.nodes.length))
  return Array.from({ length: count }, (_, i) => {
    const row: InspectionRow = {}
    for (const light of area.lights) {
      const node = light.nodes[i]
      if (!node) continue
      row[nodeKey(light.id)] = node.name
      for (const channel of channels) row[channelKey(light.id, channel)] = node.channels[channel]
    }
    return row
  })
}
