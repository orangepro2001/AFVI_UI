import type { ApiClient } from './client'
import { createMockApi } from './mock'
import { createWailsApi } from './wails'

export { apiKey, useApi } from './client'
export type { ApiClient } from './client'

/** True inside the Wails window, false in a plain browser (pnpm dev, Vite on its own). */
export function isWails(): boolean {
  return typeof window !== 'undefined' && 'go' in window
}

/**
 * Inside Wails the Go methods win; whatever Go does not implement yet is answered by the mock.
 * In a browser everything is the mock, which is how the UI is developed before the backend exists.
 */
export function createApi(): ApiClient {
  // ?freeze in the URL stops the timers of the mock: screenshots for design checks stay still.
  const freeze =
    typeof location !== 'undefined' && new URLSearchParams(location.search).has('freeze')
  const mock = createMockApi({ live: !freeze })
  return isWails() ? { ...mock, ...createWailsApi() } : mock
}
