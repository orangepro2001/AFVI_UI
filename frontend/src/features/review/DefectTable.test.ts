import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { DefectRow } from '@/api/types'
import DefectTable from './DefectTable.vue'

const headers = ['Image', 'Merge ID', 'CH', 'Code', 'Size', 'Avr']

describe('DefectTable', () => {
  it('draws the title and the six headers without rows', () => {
    const wrapper = mount(DefectTable, { props: { rows: [] } })
    const text = wrapper.text()
    expect(text).toContain('Inspection - Defect')
    for (const header of headers) expect(text).toContain(header)
    expect(wrapper.findAll('[data-row]').length).toBe(0)
    expect(wrapper.findAll('tbody tr').length).toBe(0)
  })

  it('draws one line per defect', () => {
    const rows: DefectRow[] = [
      { image: 'a.png', mergeId: 'M1', ch: 'R', code: 'C1', size: 1234, avr: 56 },
      { image: 'b.png', mergeId: 'M2', ch: 'G', code: 'C2', size: 7890, avr: 12 },
    ]
    const wrapper = mount(DefectTable, { props: { rows } })
    expect(wrapper.text()).toContain('1234')
    expect(wrapper.text()).toContain('7890')
    expect(wrapper.text()).toContain('M1')
    expect(wrapper.text()).toContain('M2')
  })
})
