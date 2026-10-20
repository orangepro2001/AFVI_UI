import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '@/api'
import type { LightOption, MaskSettings, SettingsSnapshot } from '@/api/types'

/** The two mask generators of the panel. */
export type MaskKind = 'metal' | 'sr'

/** The sliders run 0..1 in steps of 0.01. */
export function snapMask(value: number): number {
  return Math.min(Math.max(Math.round(value * 100) / 100, 0), 1)
}

/** The SETTINGS right-hand panel. */
export const useSettingsStore = defineStore('settings', () => {
  const api = useApi()

  const snapshot = ref<SettingsSnapshot | null>(null)
  const metal = ref<MaskSettings | null>(null)
  const sr = ref<MaskSettings | null>(null)
  const inspectionLights = ref<(LightOption & { enabled: boolean })[]>([])
  const globalAlignLight = ref(1)
  const globalAlignOptions = ref<LightOption[]>([])

  /** Loads the snapshot once; later calls return at once. */
  async function load() {
    if (snapshot.value) return
    const next = await api.getSettings()
    snapshot.value = next
    metal.value = { ...next.metal }
    sr.value = { ...next.sr }
    inspectionLights.value = next.inspectionLights.map((light) => ({ ...light }))
    globalAlignLight.value = next.globalAlignLight
    globalAlignOptions.value = next.globalAlignOptions.map((option) => ({ ...option }))
  }

  function mask(kind: MaskKind): MaskSettings | null {
    return kind === 'metal' ? metal.value : sr.value
  }

  function setMaskEnabled(kind: MaskKind, enabled: boolean) {
    const target = mask(kind)
    if (target) target.enabled = enabled
  }

  function setMorphic(kind: MaskKind, value: number) {
    const target = mask(kind)
    if (target) target.morphic = snapMask(value)
  }

  function setSensitivity(kind: MaskKind, value: number) {
    const target = mask(kind)
    if (target) target.sensitivity = snapMask(value)
  }

  function setMaskLight(kind: MaskKind, light: string) {
    const target = mask(kind)
    if (target) target.light = light
  }

  function setMaskChannel(kind: MaskKind, channel: string) {
    const target = mask(kind)
    if (target) target.channel = channel
  }

  /** Ticks or unticks a light of the inspection; a light the machine does not have stays as it is. */
  function setInspectionLight(light: number, enabled: boolean) {
    const entry = inspectionLights.value.find((item) => item.light === light)
    if (entry?.available) entry.enabled = enabled
  }

  /** Picks the light that aligns the strip; a light the machine does not have cannot be picked. */
  function setGlobalAlignLight(light: number) {
    const option = globalAlignOptions.value.find((item) => item.light === light)
    if (option?.available) globalAlignLight.value = light
  }

  return {
    snapshot,
    metal,
    sr,
    inspectionLights,
    globalAlignLight,
    globalAlignOptions,
    load,
    setMaskEnabled,
    setMorphic,
    setSensitivity,
    setMaskLight,
    setMaskChannel,
    setInspectionLight,
    setGlobalAlignLight,
  }
})
