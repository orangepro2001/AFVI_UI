import { describe, expect, it } from 'vitest'
import { createMockConnector } from './connector'

describe('createMockConnector', () => {
  it('starts with FM1 configured and active', async () => {
    const api = createMockConnector()
    const config = await api.getConnector()

    expect(config.machines).toEqual([
      { id: 'FM1', path: 'D:\\AFVI\\FM1', status: 'ok', message: '' },
      { id: 'FM2', path: '', status: 'unset', message: '' },
      { id: 'BM', path: '', status: 'unset', message: '' },
    ])
    expect(config.active).toBe('FM1')
  })

  it('checks a path like the Go side', async () => {
    const api = createMockConnector()

    expect(await api.checkMachinePath('')).toEqual({ ok: false, message: 'path is empty' })
    expect(await api.checkMachinePath('   ')).toEqual({ ok: false, message: 'path is empty' })
    expect(await api.checkMachinePath('rel/path')).toEqual({
      ok: false,
      message: 'path must be absolute',
    })
    expect(await api.checkMachinePath('/home/afvi')).toEqual({ ok: true, message: '' })
    expect(await api.checkMachinePath('C:\\x')).toEqual({ ok: true, message: '' })
    expect(await api.checkMachinePath('D:/x')).toEqual({ ok: true, message: '' })
  })

  it('saves FM2 and switches the active host to it', async () => {
    const api = createMockConnector()
    const config = await api.saveConnector({
      machines: [{ id: 'FM2', path: 'D:\\AFVI\\FM2' }],
      active: 'FM2',
    })

    expect(config.machines).toEqual([
      { id: 'FM1', path: 'D:\\AFVI\\FM1', status: 'ok', message: '' },
      { id: 'FM2', path: 'D:\\AFVI\\FM2', status: 'ok', message: '' },
      { id: 'BM', path: '', status: 'unset', message: '' },
    ])
    expect(config.active).toBe('FM2')
    expect((await api.getConnector()).active).toBe('FM2')
  })

  it('rejects an invalid path and keeps the state', async () => {
    const api = createMockConnector()
    await expect(
      api.saveConnector({ machines: [{ id: 'FM2', path: 'rel' }], active: 'FM2' }),
    ).rejects.toThrow('FM2: path must be absolute')

    const config = await api.getConnector()
    expect(config.machines[1]).toEqual({ id: 'FM2', path: '', status: 'unset', message: '' })
    expect(config.active).toBe('FM1')
  })

  it('rejects an unknown machine', async () => {
    const api = createMockConnector()
    await expect(
      api.saveConnector({
        machines: [{ id: 'XX' as never, path: '/x' }],
        active: 'FM1',
      }),
    ).rejects.toThrow('unknown machine "XX"')
  })

  it('rejects an active host without a folder', async () => {
    const api = createMockConnector()
    await expect(api.saveConnector({ machines: [], active: 'FM2' })).rejects.toThrow(
      'FM2 has no folder',
    )
  })

  it('rejects an empty active while a folder is set', async () => {
    const api = createMockConnector()
    await expect(api.saveConnector({ machines: [], active: '' })).rejects.toThrow(
      'choose the host to read',
    )
  })

  it('allows an empty active once every folder is cleared', async () => {
    const api = createMockConnector()
    const config = await api.saveConnector({
      machines: [
        { id: 'FM1', path: '' },
        { id: 'FM2', path: '' },
        { id: 'BM', path: '' },
      ],
      active: '',
    })

    expect(config.active).toBe('')
    expect(config.machines.every((m) => m.status === 'unset')).toBe(true)
  })

  it('keeps separate state per instance', async () => {
    const a = createMockConnector()
    const b = createMockConnector()

    await a.saveConnector({ machines: [{ id: 'BM', path: '/data/bm' }], active: 'BM' })

    expect((await a.getConnector()).active).toBe('BM')
    expect((await b.getConnector()).active).toBe('FM1')
    expect((await b.getConnector()).machines[2]?.status).toBe('unset')
  })

  it('hands out copies that callers may change', async () => {
    const api = createMockConnector()
    const config = await api.getConnector()
    config.active = 'BM'
    const machine = config.machines[0]
    if (machine) machine.path = '/changed'

    const fresh = await api.getConnector()
    expect(fresh.active).toBe('FM1')
    expect(fresh.machines[0]?.path).toBe('D:\\AFVI\\FM1')
  })

  it('returns an empty string from pickFolder (cancelled)', async () => {
    const api = createMockConnector()
    expect(await api.pickFolder('D:\\AFVI')).toBe('')
  })
})
