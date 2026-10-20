import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '@/api'
import type { CalibrationChannel, CalibrationSnapshot } from '@/api/types'

/** The slider of a channel runs 0..1000. */
export const BRIGHTNESS_MAX = 1000

/** The CALIBRATE right-hand panel: the light strip picture and the table of the 20 channels. */
export const useCalibrationStore = defineStore('calibration', () => {
  const api = useApi()

  const snapshot = ref<CalibrationSnapshot | null>(null)
  /** The big ON/OFF switch next to the light strip picture. */
  const enabled = ref(true)
  const pageIndex = ref(1)
  const channels = ref<CalibrationChannel[]>([])

  /** Loads the snapshot once; later calls return at once. */
  async function load() {
    if (snapshot.value) return
    const next = await api.getCalibration()
    snapshot.value = next
    enabled.value = next.enabled
    pageIndex.value = next.pageIndex
    channels.value = next.channels.map((channel) => ({ ...channel }))
  }

  function find(channel: number): CalibrationChannel | undefined {
    return channels.value.find((entry) => entry.channel === channel)
  }

  function setChannelOn(channel: number, on: boolean) {
    const entry = find(channel)
    if (entry) entry.on = on
  }

  /** Moves a channel's slider; the value next to it follows. The position is kept within 0..1000. */
  function setBrightness(channel: number, brightness: number) {
    const entry = find(channel)
    if (!entry) return
    const next = Math.min(Math.max(Math.round(brightness), 0), BRIGHTNESS_MAX)
    entry.brightness = next
    entry.value = next
  }

  function setEnabled(value: boolean) {
    enabled.value = value
  }

  function setPageIndex(value: number) {
    pageIndex.value = value
  }

  return {
    snapshot,
    enabled,
    pageIndex,
    channels,
    load,
    setChannelOn,
    setBrightness,
    setEnabled,
    setPageIndex,
  }
})
