import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useApi } from '@/api'
import type { AlignRoi, AlignView } from '@/api/types'
import { nextRoiId } from '@/features/teach/roi-geometry'
import type { Rect } from '@/features/teach/roi-geometry'
import { useAppStore } from './app'

/** The two tools of the ROI toolbar: pick and edit boxes, or draw a new one. */
export type RoiTool = 'select' | 'rect'

/** Undo keeps this many steps. */
const HISTORY_LIMIT = 50

const copy = (rois: readonly AlignRoi[]): AlignRoi[] => rois.map((roi) => ({ ...roi }))

const sameList = (a: readonly AlignRoi[], b: readonly AlignRoi[]) =>
  a.length === b.length &&
  a.every((roi, i) => {
    const other = b[i]
    return (
      roi.id === other.id &&
      roi.x === other.x &&
      roi.y === other.y &&
      roi.w === other.w &&
      roi.h === other.h
    )
  })

/**
 * The ROI boxes of the Metal picture on TEACH. The working list is edited freely; Save sends the
 * whole list to the backend, which keeps it in the user's own file (the machine's data is never
 * written). The list survives moving between nodes and is dropped when another model is loaded.
 */
export const useAlignRoiStore = defineStore('alignRoi', () => {
  const api = useApi()
  const app = useAppStore()

  const view = ref<AlignView | null>(null)
  /** The list as it is on screen. */
  const rois = ref<AlignRoi[]>([])
  /** The list as the backend has it: what Save last wrote, or what was loaded. */
  const saved = ref<AlignRoi[]>([])
  const selectedId = ref<string | null>(null)
  const tool = ref<RoiTool>('select')
  const saving = ref(false)
  /** The last failed save or reset, in words; cleared by the next success or edit. */
  const error = ref<string | null>(null)
  /** Earlier states of the list, newest last. */
  const history = ref<AlignRoi[][]>([])

  const dirty = computed(() => !sameList(rois.value, saved.value))
  const selected = computed(() => rois.value.find((roi) => roi.id === selectedId.value) ?? null)
  const canUndo = computed(() => history.value.length > 0)

  /** Answers of getAlignView come back out of order: only the newest one may land. */
  let loadRequest = 0

  /** Reads the picture and the ROIs; a pending edit is replaced. */
  async function load() {
    const ticket = ++loadRequest
    const next = await api.getAlignView()
    if (ticket !== loadRequest) return
    view.value = next
    rois.value = copy(next.rois)
    saved.value = copy(next.rois)
    selectedId.value = null
    history.value = []
    error.value = null
  }

  /** Loads once; later calls (picking Metal again) keep the edits. */
  async function ensureLoaded() {
    if (!view.value) await load()
  }

  function reset() {
    ++loadRequest
    view.value = null
    rois.value = []
    saved.value = []
    selectedId.value = null
    history.value = []
    error.value = null
  }

  // Another model or host has other pictures and ROIs; the next visit to Metal reads them.
  watch(
    () => [app.model?.name, app.inventoryEpoch] as const,
    (now, before) => {
      if (now[0] !== before[0] || now[1] !== before[1]) reset()
    },
  )

  /** Remembers the list before a change, so that undo can bring it back. */
  function remember() {
    history.value = [...history.value, copy(rois.value)].slice(-HISTORY_LIMIT)
    error.value = null
  }

  function select(id: string | null) {
    selectedId.value = id
  }

  function setTool(next: RoiTool) {
    tool.value = next
  }

  /** Adds a box, selects it and returns its id. */
  function add(rect: Rect): string {
    remember()
    const id = nextRoiId(rois.value)
    rois.value = [...rois.value, { id, ...rect }]
    selectedId.value = id
    return id
  }

  /** Moves or resizes one box. */
  function update(id: string, rect: Rect) {
    const index = rois.value.findIndex((roi) => roi.id === id)
    if (index < 0) return
    const old = rois.value[index]
    if (old.x === rect.x && old.y === rect.y && old.w === rect.w && old.h === rect.h) return
    remember()
    rois.value = rois.value.map((roi, i) => (i === index ? { ...roi, ...rect } : roi))
  }

  /** Deletes the selected box. */
  function removeSelected() {
    const id = selectedId.value
    if (id === null) return
    remember()
    rois.value = rois.value.filter((roi) => roi.id !== id)
    selectedId.value = null
  }

  function undo() {
    const last = history.value.at(-1)
    if (!last) return
    history.value = history.value.slice(0, -1)
    rois.value = last
    if (!rois.value.some((roi) => roi.id === selectedId.value)) selectedId.value = null
    error.value = null
  }

  function message(failure: unknown): string {
    return failure instanceof Error ? failure.message : String(failure)
  }

  /** Writes the list to the user's own file. */
  async function save() {
    if (saving.value || !dirty.value) return
    saving.value = true
    try {
      const result = await api.saveAlignRois(copy(rois.value))
      // The backend clamps the boxes into the picture: what it returns is what is stored.
      rois.value = copy(result)
      saved.value = copy(result)
      if (view.value) view.value = { ...view.value, rois: copy(result), edited: true }
      if (!rois.value.some((roi) => roi.id === selectedId.value)) selectedId.value = null
      history.value = []
      error.value = null
    } catch (failure) {
      error.value = message(failure)
    } finally {
      saving.value = false
    }
  }

  /** Drops the user's list: the machine's own boxes come back. */
  async function restoreMachine() {
    if (saving.value) return
    saving.value = true
    try {
      const result = await api.resetAlignRois()
      rois.value = copy(result)
      saved.value = copy(result)
      if (view.value) view.value = { ...view.value, rois: copy(result), edited: false }
      selectedId.value = null
      history.value = []
      error.value = null
    } catch (failure) {
      error.value = message(failure)
    } finally {
      saving.value = false
    }
  }

  return {
    view,
    rois,
    selectedId,
    selected,
    tool,
    saving,
    error,
    dirty,
    canUndo,
    load,
    ensureLoaded,
    select,
    setTool,
    add,
    update,
    removeSelected,
    undo,
    save,
    restoreMachine,
  }
})
