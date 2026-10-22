import alignSr from '@/assets/mock/align-sr.png'
import type { ApiClient } from '../client'
import type { AlignRoi, AlignView } from '../types'

/** The TIFF size of the machines; the ROIs below are the six of 25FBO015-15's AlignSpec.xml. */
const SIZE = { width: 5860, height: 4020 }

const MACHINE_ROIS: AlignRoi[] = [
  { id: 'P4', x: 5282, y: 22, w: 559, h: 403 },
  { id: 'P5', x: 5, y: 18, w: 581, h: 504 },
  { id: 'P6', x: 11, y: 3532, w: 568, h: 479 },
  { id: 'P7', x: 5331, y: 3488, w: 521, h: 532 },
  { id: 'P8', x: 1097, y: 1743, w: 433, h: 495 },
  { id: 'P9', x: 3973, y: 1739, w: 448, h: 503 },
]

const copy = (rois: AlignRoi[]): AlignRoi[] => rois.map((roi) => ({ ...roi }))

/**
 * The ROI calls with the list kept in memory, as the Go side keeps it in the user's own file: the
 * machine's list stays as it was, and a saved list replaces it until it is reset.
 */
export function createMockAlign(): Pick<
  ApiClient,
  'getAlignView' | 'saveAlignRois' | 'resetAlignRois'
> {
  let saved: AlignRoi[] | null = null

  return {
    async getAlignView(): Promise<AlignView> {
      return {
        image: { url: alignSr, width: 781, height: 536 },
        size: { ...SIZE },
        state: 'ok',
        rois: copy(saved ?? MACHINE_ROIS),
        edited: saved !== null,
      }
    },

    async saveAlignRois(rois) {
      saved = copy(rois)
      return copy(saved)
    },

    async resetAlignRois() {
      saved = null
      return copy(MACHINE_ROIS)
    },
  }
}
