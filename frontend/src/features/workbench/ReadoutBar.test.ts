import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { Readout } from '@/api/types'
import ReadoutBar from './ReadoutBar.vue'

const readout: Readout = {
  cell: 7,
  strip: { x: 101, y: 202 },
  wh: { w: 5062, h: 3842 },
  xy: { x: 33, y: 44 },
  rgb: [11, 22, 33],
  avgGv: 128,
  stdGv: 4.5,
}

describe('ReadoutBar', () => {
  it('draws every label in the full variant', () => {
    const wrapper = mount(ReadoutBar, { props: { readout } })
    const text = wrapper.text()
    expect(text).toContain('CELL :')
    expect(text).toContain('STRIP :')
    expect(text).toContain('WH :')
    expect(text).toContain('XY :')
    expect(text).toContain('RGB :')
    expect(text).toContain('Avg. GV :')
    expect(text).toContain('Std. GV :')
  })

  it('draws only XY and RGB in the xy variant', () => {
    const wrapper = mount(ReadoutBar, { props: { readout, variant: 'xy' } })
    const text = wrapper.text()
    expect(text).toContain('XY :')
    expect(text).toContain('33,')
    expect(text).toContain('44')
    expect(text).toContain('RGB :')
    expect(text).toContain('11,')
    expect(text).toContain('22,')
    expect(text).toContain('33')
    expect(text).not.toContain('CELL :')
    expect(text).not.toContain('STRIP :')
    expect(text).not.toContain('WH :')
    expect(text).not.toContain('Avg. GV :')
    expect(text).not.toContain('Std. GV :')
  })
})
