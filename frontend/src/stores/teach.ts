import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useApi } from '@/api'
import type { SpecNode, SpecSet, TeachSnapshot } from '@/api/types'
import type { LightId } from './workbench'

/** Unit: the specification of the strip's unit; Dummy: that of the dummy area around it. */
export type SpecMode = 'unit' | 'dummy'
/** The two big tabs at the top of the panel. */
export type TeachSection = 'spec' | 'analysis'
/** The tab of the channel table in Image Analysis. */
export type AnalysisChannel = 'red' | 'green' | 'blue'
export type OverlayKey = keyof SpecSet['overlay']

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

  const snapshot = ref<TeachSnapshot | null>(null)
  const section = ref<TeachSection>('spec')
  const mode = ref<SpecMode>('unit')
  /** The Light-1/2/3 tab of the panel (not the bulbs of the toolbar). */
  const light = ref<LightId>(2)
  const channel = ref<AnalysisChannel>('red')

  const checked = ref<Record<string, boolean>>({})
  const overlay = ref<Record<SpecMode, SpecSet['overlay']> | null>(null)

  const spec = computed<SpecSet | null>(() => snapshot.value?.[mode.value] ?? null)

  /** Loads the snapshot once; later calls return at once. */
  async function load() {
    if (snapshot.value) return
    const next = await api.getTeach()
    snapshot.value = next
    const boxes: Record<string, boolean> = {}
    for (const set of [next.unit, next.dummy]) {
      for (const node of flattenSpec(set.tree)) {
        if (node.checked !== undefined) boxes[node.id] = node.checked
      }
    }
    checked.value = boxes
    overlay.value = { unit: { ...next.unit.overlay }, dummy: { ...next.dummy.overlay } }
  }

  function toggleChecked(id: string) {
    if (id in checked.value) checked.value = { ...checked.value, [id]: !checked.value[id] }
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
    load,
    toggleChecked,
    toggleOverlay,
  }
})
