import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useApi } from '@/api'
import type { ImageRef, MedianView, Readout, WorkbenchSnapshot } from '@/api/types'
import { useAppStore } from './app'

/** The tools of the first group of the toolbar, left to right (features/workbench/tools.ts). */
export type ToolId =
  | 'network'
  | 'ruler'
  | 'gv'
  | 'qr'
  | 'layers'
  | 'sliders'
  | 'dashed'
  | 'grip'
  | 'barcode'
  | 'group'
  | 'grid'
/** The two view buttons: the skewed (parallelogram) and the rectangular strip. */
export type ViewMode = 'skew' | 'rect'
export type LightId = 1 | 2 | 3
/** The four channel buttons at the right end of the toolbar. */
export type ChannelId = 'red' | 'green' | 'blue' | 'yellow'

/**
 * The picture of the strip viewer and what its pixels stand for. `size` is the size of the picture
 * the XY of the read-out bar and every measurement refer to; `image` is what is shown (a preview,
 * smaller than that). `real` is a Median picture of the repository whose gray values can be
 * measured; without one the design's picture stands in and nothing can be measured on it.
 */
export interface StripFrame {
  image: ImageRef
  size: { width: number; height: number }
  real: boolean
}

/**
 * The state the workbench pages (TEACH, REVIEW, CALIBRATE, SETTINGS) share: the strip they all
 * show and what the toolbar has selected. It survives page changes, as it does in the original.
 */
export const useWorkbenchStore = defineStore('workbench', () => {
  const api = useApi()
  const app = useAppStore()

  const snapshot = ref<WorkbenchSnapshot | null>(null)
  /** The Median picture of the selected light; null while there is none (or it cannot be had). */
  const median = ref<MedianView | null>(null)
  /** What the bar under the viewer shows: the snapshot's values until the pointer moves. */
  const readout = ref<Readout | null>(null)

  /**
   * true once the pointer has been over the viewer's picture: the bar under an align picture shows
   * nothing before that (the reference captured SR before the pointer moved).
   */
  const pointerSeen = ref(false)
  /** The tools group of the toolbar is dimmed and cannot be used (TEACH with a node selected). */
  const toolsLocked = ref(false)

  const tool = ref<ToolId | null>(null)
  const view = ref<ViewMode>('rect')
  const light = ref<LightId>(2)
  const channel = ref<ChannelId>('red')

  /** The first answer about the Median picture is in (a picture, none, or a failure). */
  const medianLoaded = ref(false)

  /**
   * What the strip viewer shows: the Median picture of the light, else the snapshot's picture. Null
   * until the first answer is in, so that the design's picture does not flash up before a Median
   * picture (the backend decodes a 24 MB TIFF for it) replaces it.
   */
  const frame = computed<StripFrame | null>(() => {
    if (!medianLoaded.value) return null
    const view = median.value
    if (view?.state === 'ok') return { image: view.image, size: view.size, real: true }
    const base = snapshot.value
    if (!base) return null
    return {
      image: base.image,
      size: { width: base.readout.wh.w, height: base.readout.wh.h },
      real: false,
    }
  })

  /** Answers of getMedianView come back out of order: only the newest one may land. */
  let medianRequest = 0

  async function fetchMedian(): Promise<MedianView | null> {
    try {
      return await api.getMedianView(light.value)
    } catch {
      return null
    }
  }

  /** Reads the Median picture of the selected light again (another light, model or host). */
  async function loadMedian() {
    const ticket = ++medianRequest
    const next = await fetchMedian()
    if (ticket !== medianRequest) return
    median.value = next
    medianLoaded.value = true
  }

  /**
   * Loads the snapshot, then the Median picture; later calls (another workbench page) return at
   * once. The page can draw as soon as the snapshot is in: only the picture waits.
   */
  async function load() {
    if (snapshot.value) return
    const next = await api.getWorkbench()
    if (snapshot.value) return
    snapshot.value = next
    readout.value = next.readout
    await loadMedian()
  }

  watch(light, () => {
    if (snapshot.value) void loadMedian()
  })
  watch(
    () => [app.model?.name, app.inventoryEpoch] as const,
    (now, before) => {
      if (snapshot.value && (now[0] !== before[0] || now[1] !== before[1])) void loadMedian()
    },
  )

  // The read-out bar shows the size of the picture; before the pointer has been over it, the
  // position is the middle of a picture that is not the one the snapshot was taken on.
  watch(
    () => (frame.value ? `${frame.value.size.width}x${frame.value.size.height}` : ''),
    () => {
      const size = frame.value?.size
      const base = snapshot.value?.readout
      if (!size || !base) return
      const wh = { w: size.width, h: size.height }
      if (pointerSeen.value) return setReadout({ wh })
      const same = wh.w === base.wh.w && wh.h === base.wh.h
      const xy = same ? base.xy : { x: Math.round(wh.w / 2), y: Math.round(wh.h / 2) }
      setReadout({
        wh,
        xy,
        strip: { x: xy.x + base.strip.x - base.xy.x, y: xy.y + base.strip.y - base.xy.y },
      })
    },
  )

  /** Picking the selected tool again puts it down. */
  function toggleTool(id: ToolId) {
    tool.value = tool.value === id ? null : id
  }

  function setReadout(patch: Partial<Readout>) {
    if (readout.value) readout.value = { ...readout.value, ...patch }
  }

  /**
   * The pointer is at (x, y) pixels of the viewer's picture: XY is that position in the picture the
   * viewer stands for (it shows a scaled-down copy), STRIP is XY moved by the offset the snapshot
   * started with. `picture` is the shown image when it is not the strip: those are not sampled
   * yet, RGB is 0. `gray` is the gray value under the pointer when the strip's picture was sampled.
   */
  function pointAt(x: number, y: number, picture?: ImageRef, gray?: number) {
    const base = snapshot.value?.readout
    const stripFrame = frame.value
    if (!base || !(picture || stripFrame)) return
    const image = picture ?? stripFrame!.image
    const wh = picture ? base.wh : { w: stripFrame!.size.width, h: stripFrame!.size.height }
    const xy = {
      x: Math.round((x * wh.w) / image.width),
      y: Math.round((y * wh.h) / image.height),
    }
    pointerSeen.value = true
    const rgb: Partial<Readout> = picture
      ? { rgb: [0, 0, 0] }
      : gray === undefined
        ? {}
        : { rgb: [gray, gray, gray] }
    setReadout({
      xy,
      strip: { x: xy.x + base.strip.x - base.xy.x, y: xy.y + base.strip.y - base.xy.y },
      ...rgb,
    })
  }

  return {
    snapshot,
    median,
    medianLoaded,
    frame,
    readout,
    pointerSeen,
    toolsLocked,
    tool,
    view,
    light,
    channel,
    load,
    loadMedian,
    toggleTool,
    setReadout,
    pointAt,
  }
})
