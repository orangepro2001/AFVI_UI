import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import type { SpecNode } from '@/api/types'
import SpecTree from './SpecTree.vue'

const nodes: SpecNode[] = [
  {
    id: 'u-au',
    name: 'AU',
    tone: 'gold',
    checked: false,
    children: [{ id: 'u-au-cpad', name: 'C-Pad', tone: 'gold', checked: false }],
  },
  { id: 'u-osp', name: 'OSP', tone: 'gold', checked: false },
  { id: 'u-nonmetal', name: 'NonMetal', tone: 'green', checked: false },
]

beforeEach(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver
  }
})

describe('SpecTree', () => {
  it('marks only the selected chip', () => {
    const wrapper = mount(SpecTree, {
      props: { nodes, checked: {}, selectedId: 'u-osp' },
    })
    const chips = wrapper.findAll('button[aria-pressed]')
    const pressed = chips.filter((chip) => chip.attributes('aria-pressed') === 'true')
    expect(pressed).toHaveLength(1)
    expect(pressed[0].text()).toBe('OSP')
    expect(pressed[0].classes()).toContain('bg-spec-selected')
    for (const chip of chips.filter(
      (candidate) => candidate.attributes('aria-pressed') === 'false',
    )) {
      expect(chip.classes()).not.toContain('bg-spec-selected')
    }
  })

  it('emits select with the node id on click', async () => {
    const wrapper = mount(SpecTree, {
      props: { nodes, checked: {}, selectedId: null },
    })
    const chip = wrapper
      .findAll('button[aria-pressed]')
      .find((candidate) => candidate.text() === 'C-Pad')
    expect(chip).toBeDefined()
    await chip!.trigger('click')
    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')![0]).toEqual(['u-au-cpad'])
  })

  it('marks the scrolling container', () => {
    const wrapper = mount(SpecTree, {
      props: { nodes, checked: {}, selectedId: null },
    })
    expect(wrapper.find('[data-spec-scroller]').exists()).toBe(true)
  })
})
