import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { AnalysisRow } from '@/api/types'
import type { AnalysisTables } from '@/stores/teach'
import AnalysisPanel from './AnalysisPanel.vue'

const empty: AnalysisTables = { upper: [], lower: [], channel: [] }

const upperRows: AnalysisRow[] = [
  { no: 1, name: 'Width', value: true, tone: 'green' },
  { no: 2, name: 'Length', value: '100.000' },
]

const channelRows: AnalysisRow[] = [{ no: 1, name: 'Brightness', value: '12.000', min: '0.000' }]

function mountPanel(tables: AnalysisTables = empty) {
  return mount(AnalysisPanel, {
    props: { light: 2, channel: 'red', tables },
  })
}

describe('AnalysisPanel', () => {
  it('draws the headers and channel tabs without rows', () => {
    const wrapper = mountPanel()

    expect(wrapper.findAll('[data-row]')).toHaveLength(0)
    const heads = wrapper.findAll('[data-head]')
    expect(heads.map((head) => head.attributes('data-head'))).toEqual(['upper', 'lower', 'channel'])
    for (const head of heads) {
      expect(head.text()).toContain('No.')
      expect(head.text()).toContain('Name')
      expect(head.text()).toContain('Value')
    }
    expect(heads[2]!.text()).toContain('Min')

    const tabs = wrapper.findAll('[role="tab"]').map((tab) => tab.text())
    expect(tabs).toEqual(['Red', 'Green', 'Blue'])
  })

  it('draws the rows of the upper table with tones and switches', () => {
    const wrapper = mountPanel({ ...empty, upper: upperRows })
    const rows = wrapper.findAll('[data-table="upper"] [data-row]')
    expect(rows).toHaveLength(2)

    const first = rows[0]!
    const firstSwitch = first.find('[role="switch"]')
    expect(firstSwitch.exists()).toBe(true)
    expect(firstSwitch.attributes('aria-checked')).toBe('true')
    expect(first.text()).toContain('Width')
    const firstName = first.findAll('div')[1]!
    expect(firstName.classes()).toContain('text-analysis-green')

    const second = rows[1]!
    expect(second.find('[role="switch"]').exists()).toBe(false)
    expect(second.text()).toContain('100.000')
    const secondName = second.findAll('div')[1]!
    expect(secondName.classes()).toContain('text-analysis-plain')
    const secondValue = second.findAll('div')[2]!
    expect(secondValue.classes()).toContain('text-center')
  })

  it('emits toggle when a switch is pressed', async () => {
    const wrapper = mountPanel({ ...empty, upper: upperRows })
    const first = wrapper.findAll('[data-table="upper"] [data-row]')[0]!
    await first.find('[role="switch"]').trigger('click')
    expect(wrapper.emitted('toggle')).toEqual([['upper', 1]])
  })

  it('draws the Min column of the channel table and emits the channel', async () => {
    const wrapper = mountPanel({ ...empty, channel: channelRows })
    const row = wrapper.find('[data-table="channel"] [data-row]')
    expect(row.exists()).toBe(true)
    expect(row.text()).toContain('0.000')

    const green = wrapper.findAll('[role="tab"]').find((tab) => tab.text() === 'Green')!
    await green.trigger('click')
    expect(wrapper.emitted('update:channel')).toEqual([['green']])
  })

  it('truncates long names', () => {
    const wrapper = mountPanel({ ...empty, upper: upperRows })
    const name = wrapper.findAll('[data-table="upper"] [data-row]')[0]!.findAll('div')[1]!
    expect(name.classes()).toContain('truncate')
  })
})
