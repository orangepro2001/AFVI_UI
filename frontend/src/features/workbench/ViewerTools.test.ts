import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ViewerTools from './ViewerTools.vue'
import { toolGlyphs } from './tool-glyphs'

function mountTools(variant: 'draw' | 'roi' = 'draw') {
  return mount(ViewerTools, { props: { variant } })
}

describe('ViewerTools', () => {
  it('anchors the tool column to the right edge and renders 20 buttons', () => {
    const wrapper = mountTools()
    const classes = wrapper.element.classList
    expect(classes.contains('right-0')).toBe(true)
    expect(classes.contains('w-[78px]')).toBe(true)
    expect(wrapper.findAll('button').length).toBe(20)
  })

  it('positions the buttons on the two columns', () => {
    const wrapper = mountTools()
    const select = wrapper.find('[aria-label="Select"]')
    expect(select.attributes('style')).toContain('left: 6px')
    expect(select.attributes('style')).toContain('top: 5px')

    const offset = wrapper.find('[aria-label="Rectangle with offset"]')
    expect(offset.attributes('style')).toContain('left: 43px')
    expect(offset.attributes('style')).toContain('top: 68px')

    const save = wrapper.find('[aria-label="Save"]')
    expect(save.attributes('style')).toContain('top: 527px')
  })

  it('marks rect active and enables select, rect and trash in draw', () => {
    const wrapper = mountTools('draw')
    const rect = wrapper.find('[aria-label="Rectangle"]')
    expect(rect.attributes('aria-pressed')).toBe('true')
    expect(rect.classes()).toContain('border-tool-active')

    expect(wrapper.find('[aria-label="Save"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[aria-label="Delete"]').attributes('disabled')).toBeUndefined()
  })

  it('uses the plain tone for the selected rect and enables save in roi', () => {
    const wrapper = mountTools('roi')
    const rect = wrapper.find('[aria-label="Rectangle"]')
    expect(rect.classes()).toContain('border-tool-border')
    expect(rect.classes()).not.toContain('border-tool-active')

    expect(wrapper.find('[aria-label="Save"]').attributes('disabled')).toBeUndefined()

    const pipette = wrapper.find('[aria-label="Pipette"]')
    expect(pipette.attributes('disabled')).toBeDefined()
    expect(pipette.classes()).toContain('text-tool-disabled')
  })

  it('renders the glyph path for every button', () => {
    const wrapper = mountTools()
    const buttons = wrapper.findAll('button')
    const keys = Object.keys(toolGlyphs) as (keyof typeof toolGlyphs)[]
    const used = buttons.map((button) => button.find('svg path').attributes('d'))
    expect(used.length).toBe(20)
    for (const d of used) {
      expect(d).toBeTruthy()
      expect(keys.some((key) => toolGlyphs[key] === d)).toBe(true)
    }
  })

  it('ignores clicks on disabled buttons and selects on enabled ones', async () => {
    const wrapper = mountTools('draw')
    const circle = wrapper.find('[aria-label="Circle"]')
    await circle.trigger('click')
    expect(wrapper.find('[aria-label="Rectangle"]').attributes('aria-pressed')).toBe('true')

    const select = wrapper.find('[aria-label="Select"]')
    await select.trigger('click')
    expect(select.attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('[aria-label="Rectangle"]').attributes('aria-pressed')).toBe('false')
  })
})
