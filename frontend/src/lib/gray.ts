/** The gray values of a picture: one byte per pixel, rows of `width`. */
export interface GrayPixels {
  data: Uint8Array
  width: number
  height: number
}

/**
 * The gray values of a loaded image (Rec. 601 luma of its colors), read through a canvas; null where
 * there is no canvas (tests) or the image is not loaded yet.
 */
export function grayOfImage(image: HTMLImageElement): GrayPixels | null {
  if (typeof document === 'undefined' || !image.complete || image.naturalWidth === 0) return null
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  context.drawImage(image, 0, 0)
  const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data
  const data = new Uint8Array(canvas.width * canvas.height)
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.round(0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2])
  }
  return { data, width: canvas.width, height: canvas.height }
}

/** Loads the image at `url` and reads its gray values; null where that is not possible. */
export async function readGray(url: string): Promise<GrayPixels | null> {
  if (typeof Image === 'undefined') return null
  const image = new Image()
  image.src = url
  try {
    await image.decode()
  } catch {
    return null
  }
  return grayOfImage(image)
}
