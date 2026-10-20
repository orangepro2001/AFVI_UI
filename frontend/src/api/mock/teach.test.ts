import { describe, expect, it } from 'vitest'
import { createMockApi } from '@/api/mock'
import { createTeachSnapshot } from '@/api/mock/teach'
import type { SpecNode } from '@/api/types'

function flatten(nodes: SpecNode[]): SpecNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children ?? [])])
}

describe('createTeachSnapshot', () => {
  it('starts the Unit tree with Align / ROI and its three children', () => {
    const { unit } = createTeachSnapshot()
    const root = unit.tree[0]
    expect(root.name).toBe('Align / ROI')
    expect(root.children).toHaveLength(3)
    expect(root.children?.map((child) => child.name)).toEqual(['Metal', 'SR', 'DMG'])
    expect(root.children?.every((child) => child.checked === undefined)).toBe(true)
  })

  it('checks OSP > L-Pad and nothing else', () => {
    const { unit } = createTeachSnapshot()
    expect(flatten(unit.tree).find((node) => node.id === 'u-osp-lpad')?.checked).toBe(true)
    expect(flatten(unit.tree).find((node) => node.id === 'u-osp-cpad')?.checked).toBe(false)
    expect(flatten(unit.tree).find((node) => node.id === 'u-au-lpad')?.checked).toBe(false)
  })

  it('starts the Dummy tree at AU, without Align / ROI', () => {
    const { dummy } = createTeachSnapshot()
    expect(dummy.tree.map((node) => node.name)).toEqual(['AU', 'Drill', 'NonMetal', 'ETC'])
    expect(flatten(dummy.tree).some((node) => node.name === 'Align / ROI')).toBe(false)
  })

  it('gives every node of Unit and Dummy a unique id', () => {
    const snapshot = createTeachSnapshot()
    const ids = [...flatten(snapshot.unit.tree), ...flatten(snapshot.dummy.tree)].map(
      (node) => node.id,
    )
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => id.startsWith('u-') || id.startsWith('d-'))).toBe(true)
  })

  it('fills the align lines and overlay of both sets', () => {
    const snapshot = createTeachSnapshot()
    for (const set of [snapshot.unit, snapshot.dummy]) {
      expect(set.globalAlign).toEqual([
        { light: 1, channel: 'Red' },
        { light: 2, channel: 'Red' },
        { light: 3, channel: 'Green' },
      ])
      expect(set.srAlign).toEqual([{ light: 1, channel: 'Red' }])
      expect(set.overlay).toEqual({ mk: true, ac: false, ic: false, sk: false })
    }
  })

  it('is what the mock API returns, freshly built on every call', async () => {
    const api = createMockApi({ live: false })
    const first = await api.getTeach()
    const second = await api.getTeach()
    expect(first).toEqual(createTeachSnapshot())
    expect(second).toEqual(createTeachSnapshot())
    expect(first).not.toBe(second)
    expect(first.unit.tree).not.toBe(second.unit.tree)
  })
})
