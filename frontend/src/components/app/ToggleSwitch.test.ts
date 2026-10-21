import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ToggleSwitch from './ToggleSwitch.vue'

describe('ToggleSwitch', () => {
  it('reports its state as a switch', () => {
    const on = mount(ToggleSwitch, { props: { modelValue: true } })
    const off = mount(ToggleSwitch, { props: { modelValue: false } })
    expect(on.attributes('role')).toBe('switch')
    expect(on.attributes('aria-checked')).toBe('true')
    expect(off.attributes('aria-checked')).toBe('false')
  })

  it('asks for the opposite state when pressed', async () => {
    const wrapper = mount(ToggleSwitch, { props: { modelValue: false } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
  })

  it('says ON or OFF in the big variant only', () => {
    expect(mount(ToggleSwitch, { props: { modelValue: true, variant: 'big' } }).text()).toBe('ON')
    expect(mount(ToggleSwitch, { props: { modelValue: false, variant: 'big' } }).text()).toBe('OFF')
    expect(mount(ToggleSwitch, { props: { modelValue: true, variant: 'small' } }).text()).toBe('')
  })

  it('draws the table variant with its own size and colours', () => {
    const on = mount(ToggleSwitch, { props: { modelValue: true, variant: 'table' } })
    const off = mount(ToggleSwitch, { props: { modelValue: false, variant: 'table' } })

    expect(on.classes()).toContain('h-[14px]')
    expect(on.classes()).toContain('w-[31px]')
    expect(on.classes()).toContain('bg-primary')
    expect(on.find('span').classes()).toContain('bg-white')
    expect(on.find('span').classes()).toContain('right-[4px]')
    expect(on.find('span').classes()).toContain('top-[3px]')

    expect(off.classes()).toContain('h-[14px]')
    expect(off.classes()).toContain('w-[31px]')
    expect(off.classes()).toContain('bg-switch-off')
    expect(off.find('span').classes()).toContain('bg-switch-off-knob')
    expect(off.find('span').classes()).toContain('left-[4px]')
    expect(off.find('span').classes()).toContain('top-[3px]')
  })

  it('draws the prop variant as a 28 x 12 switch with a 7px knob', () => {
    const on = mount(ToggleSwitch, { props: { modelValue: true, variant: 'prop' } })
    const off = mount(ToggleSwitch, { props: { modelValue: false, variant: 'prop' } })

    expect(on.classes()).toEqual(expect.arrayContaining(['h-3', 'w-7', 'bg-primary']))
    expect(on.find('span').classes()).toEqual(expect.arrayContaining(['size-[7px]', 'right-[3px]']))
    expect(off.classes()).toContain('bg-switch-off')
    expect(off.find('span').classes()).toEqual(
      expect.arrayContaining(['bg-switch-off-knob', 'left-[3px]']),
    )
  })

  it('does not react while disabled', async () => {
    const wrapper = mount(ToggleSwitch, { props: { modelValue: false, disabled: true } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
