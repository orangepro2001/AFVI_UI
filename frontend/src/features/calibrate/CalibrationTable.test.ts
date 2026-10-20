import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { CalibrationChannel } from '@/api/types'
import CalibrationTable from './CalibrationTable.vue'

function channel(overrides: Partial<CalibrationChannel> & { channel: number }): CalibrationChannel {
  return {
    brightness: 165,
    value: 165,
    angle: 0,
    color: 'White',
    on: false,
    ...overrides,
  }
}

const channels: CalibrationChannel[] = [
  channel({ channel: 1 }),
  channel({ channel: 2, on: true, color: 'Blue' }),
  channel({ channel: 3, on: true, color: 'Green' }),
]

describe('CalibrationTable', () => {
  it('draws the headers, a slider and a switch per row', () => {
    const wrapper = mount(CalibrationTable, { props: { channels } })
    expect(wrapper.text()).toContain('Brigtness')
    expect(wrapper.findAll('[role="slider"]').length).toBe(3)
    expect(wrapper.findAll('[role="switch"]').length).toBe(3)
  })

  it('emits update:on when a row switch is clicked', async () => {
    const wrapper = mount(CalibrationTable, { props: { channels } })
    const switches = wrapper.findAll('[role="switch"]')
    await switches[1]!.trigger('click')
    expect(wrapper.emitted('update:on')).toBeTruthy()
    expect(wrapper.emitted('update:on')![0]).toEqual([2, false])
  })

  it('emits update:brightness on ArrowRight', async () => {
    const wrapper = mount(CalibrationTable, { props: { channels } })
    const sliders = wrapper.findAll('[role="slider"]')
    await sliders[0]!.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('update:brightness')).toBeTruthy()
    expect(wrapper.emitted('update:brightness')![0]).toEqual([1, 175])
  })
})
