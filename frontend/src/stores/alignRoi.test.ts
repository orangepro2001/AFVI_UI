import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { apiKey, type ApiClient } from '@/api/client'
import { createMockApi } from '@/api/mock'
import { useAlignRoiStore } from './alignRoi'

function storeWith(api: ApiClient = createMockApi({ live: false })) {
  const app = createApp({}).provide(apiKey, api)
  const pinia = createPinia()
  app.use(pinia)
  setActivePinia(pinia)
  return app.runWithContext(() => useAlignRoiStore())
}

async function loaded(api?: ApiClient) {
  const store = storeWith(api)
  await store.load()
  return store
}

const rect = { x: 100, y: 100, w: 300, h: 200 }

describe('alignRoi store', () => {
  it('loads the six machine boxes, clean', async () => {
    const store = await loaded()
    expect(store.rois).toHaveLength(6)
    expect(store.dirty).toBe(false)
    expect(store.view?.edited).toBe(false)
  })

  it('adds a box, selects it and is dirty', async () => {
    const store = await loaded()
    const id = store.add(rect)
    expect(id).toBe('R1')
    expect(store.selectedId).toBe('R1')
    expect(store.rois).toHaveLength(7)
    expect(store.dirty).toBe(true)
  })

  it('moves a box and removes the selected one', async () => {
    const store = await loaded()
    store.update('P4', { x: 10, y: 20, w: 100, h: 100 })
    expect(store.rois.find((roi) => roi.id === 'P4')).toMatchObject({ x: 10, y: 20 })
    store.select('P5')
    store.removeSelected()
    expect(store.rois.map((roi) => roi.id)).not.toContain('P5')
    expect(store.selectedId).toBeNull()
  })

  it('undoes step by step back to clean', async () => {
    const store = await loaded()
    store.add(rect)
    store.update('R1', { ...rect, x: 500 })
    store.undo()
    expect(store.rois.find((roi) => roi.id === 'R1')?.x).toBe(100)
    store.undo()
    expect(store.rois).toHaveLength(6)
    expect(store.dirty).toBe(false)
    expect(store.canUndo).toBe(false)
  })

  it('saves, then restores the machine boxes', async () => {
    const store = await loaded()
    store.add(rect)
    await store.save()
    expect(store.dirty).toBe(false)
    expect(store.view?.edited).toBe(true)
    expect(store.rois).toHaveLength(7)
    await store.restoreMachine()
    expect(store.rois).toHaveLength(6)
    expect(store.view?.edited).toBe(false)
  })

  it('keeps the edit and says why when the save fails', async () => {
    const api = createMockApi({ live: false })
    api.saveAlignRois = vi.fn().mockRejectedValue(new Error('disk full'))
    const store = await loaded(api)
    store.add(rect)
    await store.save()
    expect(store.error).toBe('disk full')
    expect(store.dirty).toBe(true)
  })

  it('does not call the api when nothing changed', async () => {
    const api = createMockApi({ live: false })
    const spy = vi.spyOn(api, 'saveAlignRois')
    const store = await loaded(api)
    await store.save()
    await flushPromises()
    expect(spy).not.toHaveBeenCalled()
  })

  it('loads only once through ensureLoaded and keeps the edits', async () => {
    const store = await loaded()
    store.add(rect)
    await store.ensureLoaded()
    expect(store.rois).toHaveLength(7)
  })
})
