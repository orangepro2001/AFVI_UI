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

  it('does not react while disabled', async () => {
    const wrapper = mount(ToggleSwitch, { props: { modelValue: false, disabled: true } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
