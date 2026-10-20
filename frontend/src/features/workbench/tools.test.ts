import { describe, expect, it } from 'vitest'
import { tools, toolbarLeft, toolbarX } from '@/features/workbench/tools'

describe('tools', () => {
  it('has eleven tools with unique ids', () => {
    expect(tools).toHaveLength(11)
    const ids = tools.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('disables network and grip', () => {
    expect(tools.filter((t) => t.disabled).map((t) => t.id)).toEqual(['network', 'grip'])
  })

  it('draws GV as text', () => {
    const gv = tools.find((t) => t.id === 'gv')
    expect(gv?.text).toBe('GV')
    expect(gv?.icon).toBeUndefined()
  })
})

describe('toolbar geometry', () => {
  it('puts the first button at 0 and the last tool at 316', () => {
    expect(toolbarLeft(615)).toBe(0)
    expect(toolbarLeft(931)).toBe(316)
  })

  it('has 11/2/3/4 buttons per group', () => {
    expect(toolbarX.tools).toHaveLength(11)
    expect(toolbarX.views).toHaveLength(2)
    expect(toolbarX.lights).toHaveLength(3)
    expect(toolbarX.channels).toHaveLength(4)
  })

  it('has one centre per tool', () => {
    expect(toolbarX.tools).toHaveLength(tools.length)
  })
})
