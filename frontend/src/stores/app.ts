import { defineStore } from 'pinia'
import { onScopeDispose, ref } from 'vue'
import { useApi } from '@/api'
import type { ActiveModel, AppInfo, SessionInfo } from '@/api/types'

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
  /** The loaded model; its name is the MODEL box of the workbench pages. */
  const model = ref<ActiveModel | null>(null)
  /** The "Log in/out" dialog (the User button of the rail). */
  const loginOpen = ref(false)
  /** The "Choose Model Names" dialog (the Model button of the rail). */
  const modelOpen = ref(false)
  /** The "Load grab images" dialog (the Images button). */
  const grabOpen = ref(false)
  /** The "Generate Option" dialog (the Nodes button). */
  const generateOpen = ref(false)
  /** The "Median" dialog (the Layers button). */
  const medianOpen = ref(false)
  /** The configuration panel on the right edge (the Tools button). */
  const configOpen = ref(false)
  /** The Connector dialog (the Share button of the rail). */
  const connectorOpen = ref(false)
  /** Counts the reloads of the inventory (another host was chosen); stores that hold inventory data watch it. */
  const inventoryEpoch = ref(0)
  /** The "Please wait..." overlay that blocks the window while the machine works. */
  const busy = ref(false)
  let busyTimer: ReturnType<typeof setTimeout> | undefined
  const status = ref<MachineStatus>('ready')

  async function load() {
    const [appInfo, sessionInfo, activeModel] = await Promise.all([
      api.getAppInfo(),
      api.getSession(),
      api.getActiveModel(),
    ])
    info.value = appInfo
    session.value = sessionInfo
    user.value = { name: sessionInfo.current, since: parseSessionTime(sessionInfo.since) }
    model.value = activeModel
  }

  /** Loads another model into the backend; the MODEL boxes and TEACH follow it. */
  async function selectModel(name: string) {
    model.value = await api.selectModel(name)
  }

  /** Another host was chosen: read the active model again and tell the inventory holders. */
  async function reloadInventory() {
    model.value = await api.getActiveModel()
    inventoryEpoch.value++
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
    model,
    loginOpen,
    modelOpen,
    grabOpen,
    generateOpen,
    medianOpen,
    configOpen,
    connectorOpen,
    inventoryEpoch,
    busy,
    status,
    load,
    selectModel,
    reloadInventory,
    runBusy,
  }
})
