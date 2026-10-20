import { describe, expect, it } from 'vitest'
import { pageTabs, routes } from './routes'

describe('routes', () => {
  it('gives every page a unique name and path', () => {
    expect(new Set(routes.map((r) => r.name)).size).toBe(routes.length)
    expect(new Set(routes.map((r) => r.path)).size).toBe(routes.length)
  })

  it('builds the tabs from the routes, in order', () => {
    expect(pageTabs.map((t) => t.label)).toEqual([
      'HOME',
      'TEACH',
      'REVIEW',
      'CALIBRATE',
      'SETTINGS',
    ])
    expect(pageTabs[0]).toEqual({ name: 'home', label: 'HOME', to: '/' })
  })

  it('loads every page lazily', () => {
    for (const route of routes) {
      expect(typeof route.component).toBe('function')
    }
  })
})
