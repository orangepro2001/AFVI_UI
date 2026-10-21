import type { MedianSetup } from '../types'

/**
 * The Median dialog of the design (design/reference/left-block-menu-median-image): Light2 and
 * Light3 start checked, Light4 is dimmed (the machine has three lights), and the unit map is
 * 6 columns x 32 rows. The "55" in the random field is what the screenshot shows.
 */
export function createMedianSetup(): MedianSetup {
  return {
    lights: [
      { id: 1, label: 'Light1', checked: false, enabled: true },
      { id: 2, label: 'Light2', checked: true, enabled: true },
      { id: 3, label: 'Light3', checked: true, enabled: true },
      { id: 4, label: 'Light4', checked: false, enabled: false },
    ],
    columns: 6,
    rows: 32,
    randomCount: 55,
  }
}
