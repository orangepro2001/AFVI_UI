import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useApi } from '@/api'
import type { HomeSnapshot, LogEntry, SystemStats, Unsubscribe } from '@/api/types'

/** The log keeps this many lines: the console is a window on the tail, not an archive. */
export const LOG_LIMIT = 500

/**
 * What the machine reports. It streams for the whole session, so the charts keep their history
 * while another page is open.
 */
export const useMachineStore = defineStore('machine', () => {
  const api = useApi()

  const snapshot = ref<HomeSnapshot | null>(null)
  const stats = ref<SystemStats | null>(null)
  const logs = ref<LogEntry[]>([])
  const ready = computed(() => snapshot.value !== null)

  let unsubscribe: Unsubscribe[] = []

  async function start() {
    stop()
    const first = await api.getHomeSnapshot()
    snapshot.value = first
    stats.value = first.stats
    logs.value = first.logs
    unsubscribe = [
      api.onSystemStats((next) => {
        stats.value = next
      }),
      api.onLog((entry) => {
        logs.value = [...logs.value, entry].slice(-LOG_LIMIT)
      }),
    ]
  }

  function stop() {
    unsubscribe.forEach((off) => off())
    unsubscribe = []
  }

  return { snapshot, stats, logs, ready, start, stop }
})
