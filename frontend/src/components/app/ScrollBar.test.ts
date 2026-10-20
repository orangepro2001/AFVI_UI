import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ScrollBar from './ScrollBar.vue'

describe('ScrollBar', () => {
  it('places the thumb by fractions of the track', () => {
    const wrapper = mount(ScrollBar, { props: { start: 0.25, size: 0.5 } })
    const thumb = wrapper.find('.bg-sheet-row')
    expect(thumb.attributes('style')).toContain('top: 25%')
    expect(thumb.attributes('style')).toContain('height: 50%')
  })

  it('lays a horizontal thumb out along x', () => {
    const wrapper = mount(ScrollBar, { props: { orientation: 'horizontal', start: 0, size: 0.78 } })
    const thumb = wrapper.find('.bg-sheet-row')
    expect(wrapper.attributes('data-orientation')).toBe('horizontal')
    expect(thumb.attributes('style')).toContain('width: 78%')
  })

  it('clamps a thumb that would leave the track', () => {
    const wrapper = mount(ScrollBar, { props: { start: -1, size: 3 } })
    const thumb = wrapper.find('.bg-sheet-row')
    expect(thumb.attributes('style')).toContain('top: 0%')
    expect(thumb.attributes('style')).toContain('height: 100%')
  })

  it('asks the owner to step when an arrow is pressed', async () => {
    const wrapper = mount(ScrollBar)
    const [back, forward] = wrapper.findAll('button')
    await back!.trigger('click')
    await forward!.trigger('click')
    expect(wrapper.emitted('step')).toEqual([[-1], [1]])
  })
})
