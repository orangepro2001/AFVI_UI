import { describe, expect, it, vi } from 'vitest'
import { createConnectorApi } from './connector'
import type { ConnectorCalls } from './connector'
import type { ConnectorConfig, ConnectorInput, PathCheck } from './types'

const config: ConnectorConfig = {
  machines: [
    { id: 'FM1', path: 'D:\\AFVI\\FM1', status: 'ok', message: '' },
    { id: 'FM2', path: '', status: 'unset', message: '' },
    { id: 'BM', path: '', status: 'unset', message: '' },
  ],
  active: 'FM1',
}

const check: PathCheck = { ok: true, message: '' }

function fakeCalls(): ConnectorCalls {
  return {
    getConnector: vi.fn(async () => config),
    checkMachinePath: vi.fn(async () => check),
    saveConnector: vi.fn(async () => config),
    pickFolder: vi.fn(async () => '/picked'),
  }
}

describe('createConnectorApi', () => {
  it('passes arguments and results through each of the four methods', async () => {
    const calls = fakeCalls()
    const api = createConnectorApi(calls)

    expect(await api.getConnector()).toBe(config)
    expect(calls.getConnector).toHaveBeenCalledTimes(1)

    expect(await api.checkMachinePath('/a b')).toBe(check)
    expect(calls.checkMachinePath).toHaveBeenCalledWith('/a b')

    const input: ConnectorInput = { machines: [{ id: 'FM2', path: 'D:\\x' }], active: 'FM2' }
    expect(await api.saveConnector(input)).toBe(config)
    expect(calls.saveConnector).toHaveBeenCalledWith(input)

    expect(await api.pickFolder('D:\\start')).toBe('/picked')
    expect(calls.pickFolder).toHaveBeenCalledWith('D:\\start')
  })

  it('rethrows a rejection as it is, without falling back to anything', async () => {
    const calls = fakeCalls()
    calls.checkMachinePath = vi.fn(async () => {
      throw new Error('path must be absolute')
    })
    calls.saveConnector = vi.fn(async () => {
      throw new Error('FM2: PxInventory is missing')
    })
    calls.pickFolder = vi.fn(async () => {
      throw new Error('no window')
    })
    const api = createConnectorApi(calls)

    await expect(api.checkMachinePath('rel')).rejects.toThrow('path must be absolute')
    await expect(
      api.saveConnector({ machines: [{ id: 'FM2', path: 'x' }], active: 'FM2' }),
    ).rejects.toThrow('FM2: PxInventory is missing')
    await expect(api.pickFolder('')).rejects.toThrow('no window')
  })

  it('exposes only the four Connector methods', () => {
    const calls = fakeCalls()
    const wide = { ...calls, getModels: vi.fn() } as unknown as ConnectorCalls
    const api = createConnectorApi(wide)
    expect(Object.keys(api).sort()).toEqual(
      ['checkMachinePath', 'getConnector', 'pickFolder', 'saveConnector'].sort(),
    )
  })
})
