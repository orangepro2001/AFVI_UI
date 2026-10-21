import { describe, expect, it } from 'vitest'
import { createMedianSetup } from './median'

describe('createMedianSetup', () => {
  it('has four lights, the fourth one unavailable', () => {
    const { lights } = createMedianSetup()
    expect(lights.map((light) => [light.label, light.checked, light.enabled])).toEqual([
      ['Light1', false, true],
      ['Light2', true, true],
      ['Light3', true, true],
      ['Light4', false, false],
    ])
  })

  it('has a 6 x 32 unit map and 55 random units', () => {
    const setup = createMedianSetup()
    expect(setup.columns).toBe(6)
    expect(setup.rows).toBe(32)
    expect(setup.randomCount).toBe(55)
  })
})
