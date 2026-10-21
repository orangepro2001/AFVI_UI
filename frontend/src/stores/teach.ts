import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useApi } from '@/api'
import type {
  AnalysisChannelId,
  AnalysisRow,
  ImageRef,
  NodeAnalysis,
  SpecNode,
  SpecSet,
  TeachSnapshot,
} from '@/api/types'
import { useAppStore } from './app'
import type { LightId } from './workbench'

/** Unit: the specification of the strip's unit; Dummy: that of the dummy area around it. */
export type SpecMode = 'unit' | 'dummy'
/** The two big tabs at the top of the panel. */
export type TeachSection = 'spec' | 'analysis'
/** The tab of the channel table in Image Analysis. */
export type AnalysisChannel = AnalysisChannelId
export type OverlayKey = keyof SpecSet['overlay']
/**
 * What the viewer shows: the strip while no node is selected, the picture of an Align / ROI node,
 * or nothing (every other node has no picture yet).
 */
export type ViewerMode = 'strip' | 'align' | 'blank'

/** The three tables of Image Analysis for the selected node, light tab and channel tab. */
export interface AnalysisTables {
  upper: AnalysisRow[]
  lower: AnalysisRow[]
  channel: AnalysisRow[]
}

/** The three tables of Image Analysis, top to bottom. */
export type AnalysisTableId = keyof AnalysisTables

const NO_TABLES: AnalysisTables = { upper: [], lower: [], channel: [] }

/** Every node of a tree, depth first. */
export function flattenSpec(nodes: SpecNode[]): SpecNode[] {
  return nodes.flatMap((node) => [node, ...flattenSpec(node.children ?? [])])
}

/**
 * The state of the TEACH right-hand panel. Node ids are unique over Unit and Dummy, so one map
 * holds every checkbox.
 */
export const useTeachStore = defineStore('teach', () => {
  const api = useApi()
  const app = useAppStore()

  const snapshot = ref<TeachSnapshot | null>(null)
  const section = ref<TeachSection>('spec')
  const mode = ref<SpecMode>('unit')
  /** The Light-1/2/3 tab of the panel (not the bulbs of the toolbar). */
  const light = ref<LightId>(2)
  const channel = ref<AnalysisChannel>('red')

  /** The checkboxes of every node, one table per light: the panel edits the selected light's. */
  const checkedByLight = ref<Record<LightId, Record<string, boolean>>>({ 1: {}, 2: {}, 3: {} })
  const checked = computed(() => checkedByLight.value[light.value])
  const overlay = ref<Record<SpecMode, SpecSet['overlay']> | null>(null)

  const spec = computed<SpecSet | null>(() => snapshot.value?.[mode.value] ?? null)

  /** The node the operator picked in the tree (its chip turns orange-red); null: none. */
  const selectedId = ref<string | null>(null)
  const analysis = ref<NodeAnalysis | null>(null)
  /** Answers of getNodeAnalysis come back out of order: only the newest one may land. */
  let analysisRequest = 0

  const selectedNode = computed<SpecNode | null>(() => {
    if (!spec.value || selectedId.value === null) return null
    return flattenSpec(spec.value.tree).find((node) => node.id === selectedId.value) ?? null
  })

  const viewerMode = computed<ViewerMode>(() => {
    const node = selectedNode.value
    if (!node) return 'strip'
    return node.align ? 'align' : 'blank'
  })

  /** The Overlay options (MK, A_C, I_C, SK) belong to the specification nodes, not to Align / ROI. */
  const overlayEnabled = computed(() => viewerMode.value === 'blank')

  /** The picture of the selected Align / ROI node. */
  const alignImage = computed<ImageRef | null>(() => {
    const kind = selectedNode.value?.align
    return kind && snapshot.value ? snapshot.value.alignImages[kind] : null
  })

  const tables = computed<AnalysisTables>(() => {
    const light2 = analysis.value?.[light.value]
    if (!light2) return NO_TABLES
    return { upper: light2.upper, lower: light2.lower, channel: light2.channels[channel.value] }
  })

  // Unit and Dummy are different trees: a selection does not carry over. Sync, so that nothing
  // renders a selection of the other tree in between.
  watch(mode, () => select(null), { flush: 'sync' })

  /** Answers of getTeach come back out of order: only the newest one may land. */
  let loadRequest = 0

  /** Loads the snapshot once; later calls return at once. */
  async function load() {
    if (snapshot.value) return
    const ticket = ++loadRequest
    const next = await api.getTeach()
    if (ticket !== loadRequest) return
    const boxes: Record<LightId, Record<string, boolean>> = { 1: {}, 2: {}, 3: {} }
    for (const set of [next.unit, next.dummy]) {
      for (const node of flattenSpec(set.tree)) {
        if (node.checked === undefined) continue
        for (const lightId of [1, 2, 3] as const) {
          boxes[lightId][node.id] = node.lightChecked?.[lightId - 1] ?? node.checked
        }
      }
    }
    snapshot.value = next
    checkedByLight.value = boxes
    overlay.value = { unit: { ...next.unit.overlay }, dummy: { ...next.dummy.overlay } }
  }

  /** Another model was loaded: drop everything and read the new XML. */
  async function reload() {
    snapshot.value = null
    checkedByLight.value = { 1: {}, 2: {}, 3: {} }
    overlay.value = null
    select(null)
    await load()
  }

  // The first model (null -> a value) is the one `load()` reads itself; later changes reload. A
  // host switch (inventoryEpoch) reloads too, even when the model name stays the same, and counts
  // once when both change together.
  watch(
    () => [app.model?.name, app.inventoryEpoch] as const,
    ([name, epoch], [previousName, previousEpoch]) => {
      if (epoch !== previousEpoch || (previousName !== undefined && name !== previousName)) {
        void reload()
      }
    },
  )

  /** Picks a node; picking the selected node again keeps it, null clears the selection. */
  function select(id: string | null) {
    selectedId.value = id
    const ticket = ++analysisRequest
    if (id === null) {
      analysis.value = null
      return
    }
    void api
      .getNodeAnalysis(id)
      .then((next) => {
        if (ticket === analysisRequest) analysis.value = next
      })
      .catch(() => {
        // A failed request leaves the tables empty rather than showing the previous node's rows.
        if (ticket === analysisRequest) analysis.value = null
      })
  }

  /** Flips the switch of one row of the analysis tables (only rows whose value is a boolean). */
  function toggleAnalysisRow(table: AnalysisTableId, no: number) {
    const rows = tables.value[table]
    const row = rows.find((candidate) => candidate.no === no)
    if (row && typeof row.value === 'boolean') row.value = !row.value
  }

  function toggleChecked(id: string) {
    const table = checkedByLight.value[light.value]
    if (!(id in table)) return
    checkedByLight.value = {
      ...checkedByLight.value,
      [light.value]: { ...table, [id]: !table[id] },
    }
  }

  function toggleOverlay(key: OverlayKey) {
    const current = overlay.value
    if (current) current[mode.value] = { ...current[mode.value], [key]: !current[mode.value][key] }
  }

  return {
    snapshot,
    section,
    mode,
    light,
    channel,
    checked,
    overlay,
    spec,
    selectedId,
    selectedNode,
    viewerMode,
    alignImage,
    overlayEnabled,
    analysis,
    tables,
    load,
    select,
    toggleAnalysisRow,
    toggleChecked,
    toggleOverlay,
  }
})
