import type { ApiClient } from './client'
import { createHttpCalls } from './http'
import { createInventoryApi } from './inventory'
import { createMockApi } from './mock'
import { createWailsApi } from './wails'

export { apiKey, useApi } from './client'
export type { ApiClient } from './client'

/** True inside the Wails window, false in a plain browser (pnpm dev, Vite on its own). */
export function isWails(): boolean {
  return typeof window !== 'undefined' && 'go' in window
}

/**
 * The address of a dev API server given by `?api=...` in the URL. Only a development build honours
 * it: `?api=http://127.0.0.1:8099` makes the frontend in a browser read the real data of
 * `go run scripts/devapi.go`; a production build never does.
 */
export function devApiUrl(search: string, dev: boolean): string | null {
  if (!dev) return null
  const value = new URLSearchParams(search).get('api')
  return value === null || value === '' ? null : value
}

/**
 * Inside Wails the Go methods win; whatever Go does not implement yet is answered by the mock.
 * In a browser everything is the mock, which is how the UI is developed before the backend exists,
 * unless `?api=...` points at scripts/devapi.go.
 */
export function createApi(): ApiClient {
  // ?freeze in the URL stops the timers of the mock: screenshots for design checks stay still.
  const freeze =
    typeof location !== 'undefined' && new URLSearchParams(location.search).has('freeze')
  const mock = createMockApi({ live: !freeze })
  if (isWails()) return { ...mock, ...createWailsApi(mock) }
  const url =
    typeof location !== 'undefined' ? devApiUrl(location.search, import.meta.env.DEV) : null
  if (url) return { ...mock, ...createInventoryApi(createHttpCalls(url), mock) }
  return mock
}
