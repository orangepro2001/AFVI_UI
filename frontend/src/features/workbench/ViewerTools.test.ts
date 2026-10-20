import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ViewerTools from './ViewerTools.vue'

describe('ViewerTools', () => {
  it('anchors the tool column to the right edge of the viewer', () => {
    const wrapper = mount(ViewerTools)
    const classes = wrapper.element.classList
    expect(classes.contains('right-0')).toBe(true)
    expect(classes.contains('w-[73px]')).toBe(true)
  })

  it('places the select button on the first column', () => {
    const wrapper = mount(ViewerTools)
    const select = wrapper.find('[aria-label="Select"]')
    expect(select.exists()).toBe(true)
    expect(select.attributes('style')).toContain('left: 0.5px')
  })

  it('places the outline rectangle on the second column', () => {
    const wrapper = mount(ViewerTools)
    const outline = wrapper.find('[aria-label="Rectangle (outline)"]')
    expect(outline.exists()).toBe(true)
    expect(outline.attributes('style')).toContain('left: 38.5px')
  })
})
