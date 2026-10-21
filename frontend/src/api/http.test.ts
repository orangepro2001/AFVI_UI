import { describe, expect, it, vi } from 'vitest'
import { createHttpCalls } from './http'

function fakeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

describe('createHttpCalls', () => {
  it('calls the expected URLs and strips the trailing slash', async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => fakeResponse({ url: String(input) }))
    const calls = createHttpCalls('http://127.0.0.1:8099/', fetchFn)

    await calls.getModels()
    await calls.getActiveModel()
    await calls.selectModel('a b/c')
    await calls.getTeachSpec()
    await calls.getNodeAnalysis('u-p1')

    const urls = fetchFn.mock.calls.map((call) => call[0])
    expect(urls).toEqual([
      'http://127.0.0.1:8099/api/GetModels',
      'http://127.0.0.1:8099/api/GetActiveModel',
      'http://127.0.0.1:8099/api/SelectModel?name=a%20b%2Fc',
      'http://127.0.0.1:8099/api/GetTeachSpec',
      'http://127.0.0.1:8099/api/GetNodeAnalysis?id=u-p1',
    ])
  })

  it('throws the error text of a non-2xx JSON body', async () => {
    const fetchFn = vi.fn(async () => fakeResponse({ error: 'no PxInventory' }, 404))
    const calls = createHttpCalls('http://x', fetchFn)
    await expect(calls.getModels()).rejects.toThrow('no PxInventory')
  })

  it('throws HTTP <status> when the body is not JSON', async () => {
    const fetchFn = vi.fn(async () => {
      return {
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('not json')
        },
      } as unknown as Response
    })
    const calls = createHttpCalls('http://x', fetchFn)
    await expect(calls.getModels()).rejects.toThrow('HTTP 500')
  })

  it('returns the parsed JSON on success', async () => {
    const fetchFn = vi.fn(async () => fakeResponse([{ name: 'x' }]))
    const calls = createHttpCalls('http://x', fetchFn)
    expect(await calls.getModels()).toEqual([{ name: 'x' }])
  })
})
