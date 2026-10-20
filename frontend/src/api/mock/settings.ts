import type { SettingsSnapshot } from '../types'

/** What SETTINGS shows before a machine is connected: Metal off, SR on, as in the reference design. */
export function createSettingsSnapshot(): SettingsSnapshot {
  return {
    metal: { enabled: false, morphic: 0.5, sensitivity: 0.5, light: '1', channel: 'Gray' },
    sr: { enabled: true, morphic: 0.5, sensitivity: 0.5, light: '3', channel: 'Red' },
    inspectionLights: [
      { light: 1, available: true, enabled: false },
      { light: 2, available: true, enabled: true },
      { light: 3, available: true, enabled: true },
      { light: 4, available: false, enabled: false },
    ],
    globalAlignLight: 1,
    globalAlignOptions: [
      { light: 1, available: true },
      { light: 2, available: true },
      { light: 3, available: true },
      { light: 4, available: false },
    ],
  }
}
