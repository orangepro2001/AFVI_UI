import { defineStore } from 'pinia'
import { onScopeDispose, ref } from 'vue'
import { useApi } from '@/api'
import type { AppInfo, SessionInfo } from '@/api/types'

export type MachineStatus = 'ready'

/** "2026-10-20 16:35:23" as a local time. */
function parseSessionTime(text: string): Date {
  const [date = '', time = ''] = text.split(' ')
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number)
  const [hour = 0, minute = 0, second = 0] = time.split(':').map(Number)
  return new Date(year, month - 1, day, hour, minute, second)
}

/** Application-wide state: who runs it, which build, what the machine says it is doing. */
export const useAppStore = defineStore('app', () => {
  const api = useApi()

  const info = ref<AppInfo | null>(null)
  const user = ref({ name: 'Admin', since: new Date(2026, 9, 20, 16, 35, 23) })
  const session = ref<SessionInfo | null>(null)
  /** The "Log in/out" dialog (the User button of the rail). */
  const loginOpen = ref(false)
  /** The "Choose Model Names" dialog (the Model button of the rail). */
  const modelOpen = ref(false)
  /** The "Load grab images" dialog (the Images button). */
  const grabOpen = ref(false)
  /** The "Generate Option" dialog (the Nodes button). */
  const generateOpen = ref(false)
  /** The "Please wait..." overlay that blocks the window while the machine works. */
  const busy = ref(false)
  let busyTimer: ReturnType<typeof setTimeout> | undefined
  const status = ref<MachineStatus>('ready')

  async function load() {
    const [appInfo, sessionInfo] = await Promise.all([api.getAppInfo(), api.getSession()])
    info.value = appInfo
    session.value = sessionInfo
    user.value = { name: sessionInfo.current, since: parseSessionTime(sessionInfo.since) }
  }

  // A timer that outlives the store would write to a store nobody reads any more.
  onScopeDispose(() => clearTimeout(busyTimer))

  /** Shows the overlay for `ms` milliseconds. The mock machine finishes by itself. */
  function runBusy(ms: number) {
    clearTimeout(busyTimer)
    busy.value = true
    busyTimer = setTimeout(() => {
      busy.value = false
    }, ms)
  }

  return {
    info,
    user,
    session,
    loginOpen,
    modelOpen,
    grabOpen,
    generateOpen,
    busy,
    status,
    load,
    runBusy,
  }
})
