import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PlainCheckbox from './PlainCheckbox.vue'

describe('PlainCheckbox', () => {
  it('shows its label and reports its state as a check box', () => {
    const on = mount(PlainCheckbox, { props: { modelValue: true, label: 'Light2' } })
    const off = mount(PlainCheckbox, { props: { modelValue: false, label: 'Light1' } })
    expect(on.text()).toBe('Light2')
    expect(on.attributes('role')).toBe('checkbox')
    expect(on.attributes('aria-checked')).toBe('true')
    expect(off.attributes('aria-checked')).toBe('false')
  })

  it('draws the tick only while checked', () => {
    expect(
      mount(PlainCheckbox, { props: { modelValue: true, label: 'a' } })
        .find('svg')
        .exists(),
    ).toBe(true)
    expect(
      mount(PlainCheckbox, { props: { modelValue: false, label: 'a' } })
        .find('svg')
        .exists(),
    ).toBe(false)
  })

  it('asks for the opposite state when pressed', async () => {
    const wrapper = mount(PlainCheckbox, { props: { modelValue: false, label: 'a' } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
  })

  it('does nothing while disabled', async () => {
    const wrapper = mount(PlainCheckbox, {
      props: { modelValue: false, label: 'Light4', disabled: true },
    })
    await wrapper.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
