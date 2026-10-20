import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DataGrid from './DataGrid.vue'
import type { GridColumn } from './types'

const columns: GridColumn[] = [
  { key: 'name', label: 'Name' },
  { key: 'port', label: 'Port' },
]
const rows = [
  { name: 'Inspector-1', port: 2000 },
  { name: 'Inspector-2', port: 2001 },
]

describe('DataGrid', () => {
  it('renders header and rows', () => {
    const wrapper = mount(DataGrid, { props: { columns, rows } })

    expect(wrapper.findAll('thead th').map((th) => th.text())).toEqual(['Name', 'Port'])
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    expect(wrapper.findAll('tbody td').map((td) => td.text())).toEqual([
      'Inspector-1',
      '2000',
      'Inspector-2',
      '2001',
    ])
  })

  it('pads with blank rows up to minRows', () => {
    const wrapper = mount(DataGrid, { props: { columns, rows, minRows: 5 } })
    expect(wrapper.findAll('tbody tr')).toHaveLength(5)
    expect(wrapper.findAll('tbody tr')[4]!.text()).toBe('')
  })

  it('lets a cell slot draw the value', () => {
    const wrapper = mount(DataGrid, {
      props: { columns, rows },
      slots: { 'cell-port': '<template #cell-port="{ value }"><b>:{{ value }}</b></template>' },
    })
    expect(wrapper.findAll('tbody b').map((b) => b.text())).toEqual([':2000', ':2001'])
  })

  it('adds a group header row when columns have groups', () => {
    const wrapper = mount(DataGrid, {
      props: {
        columns: [
          { key: 'a', label: 'A', group: 'G1' },
          { key: 'b', label: 'B', group: 'G1' },
          { key: 'c', label: 'C', group: 'G2' },
        ],
        rows: [],
      },
    })
    const headerRows = wrapper.findAll('thead tr')
    expect(headerRows).toHaveLength(2)
    expect(headerRows[0]!.findAll('th').map((th) => [th.text(), th.attributes('colspan')])).toEqual(
      [
        ['G1', '2'],
        ['G2', '1'],
      ],
    )
  })

  it('draws no body borders when bordered is false', () => {
    const wrapper = mount(DataGrid, { props: { columns, rows, bordered: false } })
    expect(wrapper.find('tbody td').classes()).not.toContain('border')
    expect(wrapper.find('thead th').classes()).toContain('border')
  })
})
