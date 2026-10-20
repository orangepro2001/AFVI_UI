import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '@/api'
import type { AppInfo } from '@/api/types'

export type MachineStatus = 'ready'

/** Application-wide state: who runs it, which build, what the machine says it is doing. */
export const useAppStore = defineStore('app', () => {
  const api = useApi()

  const info = ref<AppInfo | null>(null)
  const user = ref({ name: 'Admin', since: new Date() })
  const status = ref<MachineStatus>('ready')

  async function load() {
    info.value = await api.getAppInfo()
  }

  return { info, user, status, load }
})
