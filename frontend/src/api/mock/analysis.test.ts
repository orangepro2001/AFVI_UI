import { describe, expect, it } from 'vitest'
import { createNodeAnalysis } from '@/api/mock/analysis'
import type { AnalysisRow, LightAnalysis } from '@/api/types'

const lights = [1, 2, 3] as const

function emptyLight(light: LightAnalysis): boolean {
  return (
    light.upper.length === 0 &&
    light.lower.length === 0 &&
    light.channels.red.length === 0 &&
    light.channels.green.length === 0 &&
    light.channels.blue.length === 0
  )
}

function allEmpty(nodeId: string): boolean {
  const analysis = createNodeAnalysis(nodeId)
  return lights.every((index) => emptyLight(analysis[index]))
}

function numbered(rows: AnalysisRow[]): boolean {
  return rows.every((row, index) => row.no === index + 1)
}

describe('createNodeAnalysis', () => {
  it('fills the tables of a pad and clones the channel rows for green and blue', () => {
    for (const id of ['u-au-cpad', 'd-osp-lpad']) {
      const analysis = createNodeAnalysis(id)
      const light2 = analysis[2]

      expect(light2.upper).toHaveLength(9)
      expect(light2.lower).toHaveLength(9)
      expect(light2.channels.red).toHaveLength(18)
      expect(light2.channels.green).toHaveLength(18)
      expect(light2.channels.blue).toHaveLength(18)
      expect(light2.channels.green).toEqual(light2.channels.red)
      expect(light2.channels.blue).toEqual(light2.channels.red)
      expect(light2.channels.green).not.toBe(light2.channels.red)
      expect(light2.channels.blue).not.toBe(light2.channels.red)

      expect(light2.upper[2]).toEqual({
        no: 3,
        name: 'Chain Align',
        value: true,
        tone: 'yellow',
      })
      expect(light2.upper[3].value).toBe(false)
      expect(light2.channels.red[9]).toEqual({
        no: 10,
        name: 'Dark Defect(TH)',
        value: '20.000',
        min: '0.000',
        tone: 'green',
      })

      expect(emptyLight(analysis[1])).toBe(true)
      expect(emptyLight(analysis[3])).toBe(true)
    }
  })

  it('fills the tables of a NonMetal item', () => {
    const analysis = createNodeAnalysis('u-nonmetal-via')
    const light2 = analysis[2]

    expect(light2.upper).toHaveLength(4)
    expect(light2.lower).toEqual([])
    expect(light2.channels.red).toHaveLength(6)
    expect(light2.channels.red[0].value).toBe('255.000')
  })

  it('fills the tables of User Mask', () => {
    const analysis = createNodeAnalysis('u-etc-user-mask')
    const light2 = analysis[2]

    expect(light2.upper).toEqual([])
    expect(light2.lower).toEqual([])
    expect(light2.channels.red).toHaveLength(5)
    expect(light2.channels.red[0].name).toBe('Cell ID')
    expect(light2.channels.red[0].tone).toBe('plain')
  })

  it('fills the table of DMG', () => {
    const analysis = createNodeAnalysis('u-dmg')
    const rows = analysis[2].channels.red

    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe('Min Defect Size(Pixel)')
    expect(rows[0].value).toBe('25.000')
  })

  it('leaves groups, align nodes, drill and unknown ids empty', () => {
    for (const id of ['u-metal', 'u-sr', 'u-au', 'u-drill-hole', 'u-does-not-exist']) {
      expect(allEmpty(id)).toBe(true)
    }
  })

  it('numbers the rows from 1 in every table', () => {
    const light2 = createNodeAnalysis('u-au-cpad')[2]
    expect(numbered(light2.upper)).toBe(true)
    expect(numbered(light2.lower)).toBe(true)
    expect(numbered(light2.channels.red)).toBe(true)
    expect(numbered(light2.channels.green)).toBe(true)
    expect(numbered(light2.channels.blue)).toBe(true)
  })
})
