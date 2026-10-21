import type { ApiClient } from './client'

/**
 * The four Connector calls of the Go side, however they are reached (Wails binding or dev HTTP
 * server).
 */
export type ConnectorCalls = Pick<
  ApiClient,
  'getConnector' | 'checkMachinePath' | 'saveConnector' | 'pickFolder'
>

/**
 * The ApiClient methods of the Connector dialog. Unlike the inventory calls they never fall back to
 * the mock: the dialog must show what Go says (a rejected folder, no window for the picker).
 * The four methods are picked one by one, so nothing else of `calls` leaks into the client.
 */
export function createConnectorApi(calls: ConnectorCalls): ConnectorCalls {
  return {
    getConnector: () => calls.getConnector(),
    checkMachinePath: (path) => calls.checkMachinePath(path),
    saveConnector: (input) => calls.saveConnector(input),
    pickFolder: (startDir) => calls.pickFolder(startDir),
  }
}
