import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import SpecChip from './SpecChip.vue'

describe('SpecChip', () => {
  it('uses the tone classes by default', () => {
    const wrapper = mount(SpecChip, { props: { label: 'AU', tone: 'gold' } })
    expect(wrapper.classes()).toContain('bg-spec-gold')
    expect(wrapper.classes()).not.toContain('bg-spec-selected')
    expect(wrapper.attributes('aria-pressed')).toBe('false')
  })

  it('replaces the tone classes when selected', () => {
    const wrapper = mount(SpecChip, { props: { label: 'AU', tone: 'gold', selected: true } })
    expect(wrapper.classes()).toContain('bg-spec-selected')
    expect(wrapper.classes()).toContain('text-tab-foreground')
    expect(wrapper.classes()).not.toContain('bg-spec-gold')
    expect(wrapper.attributes('aria-pressed')).toBe('true')
  })

  it('bubbles clicks to the parent onClick', async () => {
    const onClick = vi.fn()
    const wrapper = mount(SpecChip, {
      props: { label: 'AU', tone: 'gold' },
      attrs: { onClick },
    })
    await wrapper.trigger('click')
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
