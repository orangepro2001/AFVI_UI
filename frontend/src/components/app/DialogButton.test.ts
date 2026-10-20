import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DialogButton from './DialogButton.vue'

describe('DialogButton', () => {
  it('is a plain button with the dim frame, and the primary one has the lighter frame', () => {
    const plain = mount(DialogButton, { slots: { default: 'Cancel' } })
    expect(plain.element.tagName).toBe('BUTTON')
    expect(plain.attributes('type')).toBe('button')
    expect(plain.text()).toBe('Cancel')
    expect(plain.classes()).toContain('border-dialog-line-dim')

    const primary = mount(DialogButton, { props: { primary: true }, slots: { default: 'OK' } })
    expect(primary.classes()).toContain('border-dialog-line')
    expect(primary.classes()).not.toContain('border-dialog-line-dim')
  })

  it('lets the owner position it and passes disabled and click through', async () => {
    const wrapper = mount(DialogButton, {
      props: { class: 'absolute top-[243px]' },
      attrs: { disabled: true },
      slots: { default: 'Apply' },
    })
    expect(wrapper.classes()).toContain('absolute')
    expect(wrapper.attributes('disabled')).toBeDefined()
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })
})
