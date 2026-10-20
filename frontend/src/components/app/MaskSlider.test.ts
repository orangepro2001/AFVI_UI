import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MaskSlider from './MaskSlider.vue'

function mountSlider(modelValue = 0.5) {
  return mount(MaskSlider, { props: { modelValue, label: 'Morphic' } })
}

describe('MaskSlider', () => {
  it('draws the value and the scale', () => {
    const wrapper = mountSlider(0.5)
    const text = wrapper.text()
    expect(text).toContain('0.50')
    expect(text).toContain('0.00')
    expect(text).toContain('1.00')
    expect(wrapper.attributes('aria-valuenow')).toBe('0.5')
  })

  it('steps with the arrow keys', async () => {
    const right = mountSlider(0.5)
    await right.trigger('keydown', { key: 'ArrowRight' })
    expect(right.emitted('update:modelValue')?.[0]).toEqual([0.51])

    const left = mountSlider(0.5)
    await left.trigger('keydown', { key: 'ArrowLeft' })
    expect(left.emitted('update:modelValue')?.[0]).toEqual([0.49])
  })

  it('jumps to the ends with Home and End', async () => {
    const home = mountSlider(0.5)
    await home.trigger('keydown', { key: 'Home' })
    expect(home.emitted('update:modelValue')?.[0]).toEqual([0])

    const end = mountSlider(0.5)
    await end.trigger('keydown', { key: 'End' })
    expect(end.emitted('update:modelValue')?.[0]).toEqual([1])
  })

  it('clamps at the ends', async () => {
    const wrapper = mountSlider(1)
    await wrapper.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([1])
  })
})
