import { describe, expect, it } from 'vitest'
import { createMockApi } from './index'
import { createWorkbenchSnapshot } from './workbench'

describe('createWorkbenchSnapshot', () => {
  it('returns the header of the reference design', () => {
    const snapshot = createWorkbenchSnapshot()
    expect(snapshot.header).toEqual({ model: 'TEST1020-00', lot: 'TEST3', strip: '1' })
  })

  it('draws a 6x28 cell grid with a view inside it', () => {
    const { cells } = createWorkbenchSnapshot()
    expect(cells.columns).toBe(6)
    expect(cells.rows).toBe(28)
    expect(cells.view.column + cells.view.columns).toBeLessThanOrEqual(cells.columns)
    expect(cells.view.row + cells.view.rows).toBeLessThanOrEqual(cells.rows)
  })

  it('carries an RGB triple', () => {
    expect(createWorkbenchSnapshot().readout.rgb).toHaveLength(3)
  })

  it('points at real images', () => {
    const snapshot = createWorkbenchSnapshot()
    expect(typeof snapshot.image.url).toBe('string')
    expect(snapshot.image.url.length).toBeGreaterThan(0)
    expect(typeof snapshot.thumbnail.url).toBe('string')
    expect(snapshot.thumbnail.url.length).toBeGreaterThan(0)
  })
})

describe('createMockApi().getWorkbench', () => {
  it('answers with the same shape', async () => {
    const snapshot = await createMockApi({ live: false }).getWorkbench()
    expect(snapshot.header.model).toBe('TEST1020-00')
    expect(snapshot.cells).toEqual({
      columns: 6,
      rows: 28,
      view: { column: 2, row: 7, columns: 3, rows: 3 },
    })
    expect(snapshot.image).toMatchObject({ width: 726, height: 534 })
    expect(snapshot.thumbnail).toMatchObject({ width: 89, height: 272 })
    expect(snapshot.readout.cell).toBe(18)
    expect(snapshot.readout.strip).toEqual({ x: 29786, y: 43278 })
  })

  it('returns a new object on every call', async () => {
    const api = createMockApi({ live: false })
    const first = await api.getWorkbench()
    const second = await api.getWorkbench()
    expect(first).not.toBe(second)
    first.readout.cell = 99
    expect(second.readout.cell).toBe(18)
  })
})
