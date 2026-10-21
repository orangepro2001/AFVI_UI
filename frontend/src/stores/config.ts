import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '@/api'
import type { ConfigEntry, ConfigGroup } from '@/api/types'

/** The values of the configuration panel (the Tools button of the rail). */
export const useConfigStore = defineStore('config', () => {
  const api = useApi()

  const groups = ref<ConfigGroup[]>([])
  let request: Promise<void> | null = null

  /** Fetches the groups once; later calls wait for the same request. A failed one may be retried. */
  function load(): Promise<void> {
    request ??= api
      .getConfig()
      .then((result) => {
        groups.value = result
      })
      .catch(() => {
        request = null
      })
    return request
  }

  function find(key: string): ConfigEntry | undefined {
    return groups.value.flatMap((group) => group.entries).find((entry) => entry.key === key)
  }

  /** Changes one value; an unknown key, or a value of the wrong type for a toggle, changes nothing. */
  function setValue(key: string, value: string | boolean) {
    const entry = find(key)
    if (!entry || (entry.kind === 'toggle') !== (typeof value === 'boolean')) return
    entry.value = value
  }

  return { groups, load, setValue }
})
