import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createTeachSnapshot } from '@/api/mock/teach'
import SpecAlign from './SpecAlign.vue'

const spec = createTeachSnapshot().unit

function mkButton(wrapper: ReturnType<typeof mount>) {
  return wrapper
    .findAll('button[role="checkbox"]')
    .find((button) => button.attributes('aria-label') === 'MK')!
}

describe('SpecAlign', () => {
  it('dims the overlay labels when disabled', () => {
    const wrapper = mount(SpecAlign, { props: { spec, enabled: false } })
    const mk = mkButton(wrapper)
    const label = mk.findAll('span').at(-1)!
    expect(label.classes()).toContain('text-subtle')
    expect(label.classes()).not.toContain('text-foreground')
  })

  it('brightens the overlay labels when enabled', () => {
    const wrapper = mount(SpecAlign, { props: { spec, enabled: true } })
    const mk = mkButton(wrapper)
    const label = mk.findAll('span').at(-1)!
    expect(label.classes()).toContain('text-foreground')
    expect(label.classes()).not.toContain('text-subtle')
  })

  it('emits toggle-overlay on click regardless of enabled', async () => {
    const wrapper = mount(SpecAlign, { props: { spec, enabled: false } })
    await mkButton(wrapper).trigger('click')
    expect(wrapper.emitted('toggle-overlay')).toBeTruthy()
    expect(wrapper.emitted('toggle-overlay')![0]).toEqual(['mk'])
  })
})
