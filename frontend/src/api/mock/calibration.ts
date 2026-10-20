import lightStrip from '@/assets/mock/light-strip.png'
import type { CalibrationChannel, CalibrationSnapshot, LightColor } from '../types'

const COLORS: LightColor[] = ['White', 'Blue', 'Green', 'Red']

/** Brightness (and the value next to it) of channel 1..20. */
const VALUES = [
  1000, 165, 250, 90, 300, 80, 180, 17, 300, 80, 180, 15, 980, 165, 950, 45, 980, 165, 950, 45,
]

/** The channels that are switched on in the reference design (1-based). */
const ON = new Set([2, 3, 4, 14, 16, 18, 20])

function angleOf(channel: number): number {
  if (channel <= 4) return 0
  return channel <= 12 ? 30 : 60
}

/** What CALIBRATE shows before a machine is connected: the 20 channels of the reference design. */
export function createCalibrationSnapshot(): CalibrationSnapshot {
  const channels: CalibrationChannel[] = VALUES.map((value, index) => {
    const channel = index + 1
    return {
      channel,
      brightness: value,
      value,
      angle: angleOf(channel),
      color: COLORS[index % COLORS.length]!,
      on: ON.has(channel),
    }
  })
  return {
    lightImage: { url: lightStrip, width: 478, height: 150 },
    enabled: true,
    pageIndex: 2,
    channels,
  }
}
