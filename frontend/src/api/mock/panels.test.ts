import { describe, expect, it } from 'vitest'
import { createMockApi } from '@/api/mock'
import { createCalibrationSnapshot } from './calibration'
import { createDefects } from './review'
import { createSettingsSnapshot } from './settings'

describe('panel mocks', () => {
  it('has no defects', () => {
    expect(createDefects()).toEqual([])
  })

  it('has the twenty channels of the reference design', () => {
    const snapshot = createCalibrationSnapshot()
    expect(snapshot.channels.length).toBe(20)
    const colors = ['White', 'Blue', 'Green', 'Red']
    for (const entry of snapshot.channels) {
      expect(entry.color).toBe(colors[(entry.channel - 1) % colors.length])
      if (entry.channel <= 4) expect(entry.angle).toBe(0)
      else if (entry.channel <= 12) expect(entry.angle).toBe(30)
      else expect(entry.angle).toBe(60)
    }
    expect(snapshot.channels[7]!.value).toBe(17)
  })

  it('has the settings of the reference design', () => {
    const snapshot = createSettingsSnapshot()
    expect(snapshot.metal.enabled).toBe(false)
    expect(snapshot.sr.enabled).toBe(true)
    expect(snapshot.sr.light).toBe('3')
    expect(snapshot.inspectionLights.length).toBe(4)
    expect(snapshot.inspectionLights[3]!.available).toBe(false)
  })

  it('serves the same data through the mock api', async () => {
    const api = createMockApi({ live: false })
    expect(await api.getDefects()).toEqual(createDefects())
    expect(await api.getCalibration()).toEqual(createCalibrationSnapshot())
    expect(await api.getSettings()).toEqual(createSettingsSnapshot())
  })
})
