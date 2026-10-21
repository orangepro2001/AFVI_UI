import type { ConnectorCalls } from '../connector'
import type {
  ConnectorConfig,
  ConnectorInput,
  ConnectorMachine,
  MachineId,
  PathCheck,
} from '../types'

const MACHINES: MachineId[] = ['FM1', 'FM2', 'BM']

function check(path: string): PathCheck {
  const trimmed = path.trim()
  if (trimmed === '') return { ok: false, message: 'path is empty' }
  // A UNC path (\\server, \\server\share) counts too: the Go side accepts a server whose shares are
  // PxInventory and PxRepository.
  const absolute =
    trimmed.startsWith('/') || /^[A-Za-z]:[\\/]/.test(trimmed) || /^\\\\[^\\/]/.test(trimmed)
  if (!absolute) return { ok: false, message: 'path must be absolute' }
  // The mock has no folders to look at: an absolute path passes.
  return { ok: true, message: '' }
}

/**
 * The Connector dialog of the browser: an in-memory configuration that follows the rules of the Go
 * Hub.Save (same messages), but cannot look at real folders.
 */
export function createMockConnector(): ConnectorCalls {
  // Each call to createMockConnector owns its state.
  const paths: Partial<Record<MachineId, string>> = { FM1: 'D:\\AFVI\\FM1' }
  let active: MachineId | '' = 'FM1'

  function config(): ConnectorConfig {
    const machines: ConnectorMachine[] = MACHINES.map((id) => {
      const path = paths[id] ?? ''
      return path === ''
        ? { id, path, status: 'unset', message: '' }
        : { id, path, status: 'ok', message: '' }
    })
    return { machines, active }
  }

  return {
    async getConnector() {
      return config()
    },

    async checkMachinePath(path) {
      return check(path)
    },

    async saveConnector(input: ConnectorInput) {
      const next: Partial<Record<MachineId, string>> = { ...paths }

      for (const machine of input.machines) {
        if (!MACHINES.includes(machine.id)) {
          throw new Error(`unknown machine "${machine.id}"`)
        }
        const path = machine.path.trim()
        if (path === '') {
          delete next[machine.id]
          continue
        }
        const result = check(path)
        if (!result.ok) throw new Error(`${machine.id}: ${result.message}`)
        next[machine.id] = path
      }

      let nextActive: MachineId | ''
      if (input.active !== '') {
        if (!MACHINES.includes(input.active)) {
          throw new Error(`unknown machine "${input.active}"`)
        }
        if ((next[input.active] ?? '') === '') {
          throw new Error(`${input.active} has no folder`)
        }
        nextActive = input.active
      } else if (MACHINES.some((id) => (next[id] ?? '') !== '')) {
        throw new Error('choose the host to read')
      } else {
        nextActive = ''
      }

      for (const id of MACHINES) {
        const path = next[id]
        if (path === undefined) delete paths[id]
        else paths[id] = path
      }
      active = nextActive
      return config()
    },

    async pickFolder() {
      // The mock has no window: as if the user cancelled the folder picker.
      return ''
    },
  }
}
