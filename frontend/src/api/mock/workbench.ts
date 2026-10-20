import stripImage from '@/assets/mock/strip-image.png'
import stripThumbnail from '@/assets/mock/strip-thumbnail.png'
import type { WorkbenchSnapshot } from '../types'

/** What the workbench pages show before a machine is connected: the strip of the reference design. */
export function createWorkbenchSnapshot(): WorkbenchSnapshot {
  return {
    header: { model: 'TEST1020-00', lot: 'TEST3', strip: '1' },
    image: { url: stripImage, width: 726, height: 534 },
    thumbnail: { url: stripThumbnail, width: 89, height: 272 },
    cells: { columns: 6, rows: 28, view: { column: 2, row: 7, columns: 3, rows: 3 } },
    readout: {
      cell: 18,
      strip: { x: 29786, y: 43278 },
      wh: { w: 16384, h: 12080 },
      xy: { x: 15116, y: 11957 },
      rgb: [31, 31, 31],
      avgGv: 0,
      stdGv: 0,
    },
  }
}
