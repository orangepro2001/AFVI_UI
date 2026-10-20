import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '@/api'
import type { ImageRef, Readout, WorkbenchSnapshot } from '@/api/types'

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
 * The state the workbench pages (TEACH, REVIEW, CALIBRATE, SETTINGS) share: the strip they all
 * show and what the toolbar has selected. It survives page changes, as it does in the original.
 */
export const useWorkbenchStore = defineStore('workbench', () => {
  const api = useApi()

  const snapshot = ref<WorkbenchSnapshot | null>(null)
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

  /** Loads the snapshot once; later calls (another workbench page) return at once. */
  async function load() {
    if (snapshot.value) return
    const next = await api.getWorkbench()
    snapshot.value = next
    readout.value = next.readout
  }

  /** Picking the selected tool again puts it down. */
  function toggleTool(id: ToolId) {
    tool.value = tool.value === id ? null : id
  }

  function setReadout(patch: Partial<Readout>) {
    if (readout.value) readout.value = { ...readout.value, ...patch }
  }

  /**
   * The pointer is at (x, y) pixels of the viewer's picture: XY is that position on the whole strip
   * (the viewer shows it scaled down), STRIP is XY moved by the offset the snapshot started with.
   * `picture` is the shown image when it is not the strip: those are not sampled yet, RGB is 0.
   */
  function pointAt(x: number, y: number, picture?: ImageRef) {
    const base = snapshot.value?.readout
    const image = picture ?? snapshot.value?.image
    if (!base || !image) return
    const xy = {
      x: Math.round((x * base.wh.w) / image.width),
      y: Math.round((y * base.wh.h) / image.height),
    }
    pointerSeen.value = true
    setReadout({
      xy,
      strip: { x: xy.x + base.strip.x - base.xy.x, y: xy.y + base.strip.y - base.xy.y },
      ...(picture ? { rgb: [0, 0, 0] as Readout['rgb'] } : {}),
    })
  }

  return {
    snapshot,
    readout,
    pointerSeen,
    toolsLocked,
    tool,
    view,
    light,
    channel,
    load,
    toggleTool,
    setReadout,
    pointAt,
  }
})
