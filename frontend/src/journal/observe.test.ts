import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, describe, expect, it } from 'vitest'
import { apiKey, type ApiClient } from '@/api/client'
import { createMockApi } from '@/api/mock'
import type { GvBox } from '@/api/types'
import { useAlignRoiStore } from '@/stores/alignRoi'
import { useAppStore } from '@/stores/app'
import { useCalibrationStore } from '@/stores/calibration'
import { useConfigStore } from '@/stores/config'
import { useMeasureStore } from '@/stores/measure'
import { useSettingsStore } from '@/stores/settings'
import { useTeachStore } from '@/stores/teach'
import { useWorkbenchStore } from '@/stores/workbench'
import { actionRules, observeOperations } from './observe'
import type { ObservedStores } from './observe'
import type { Attrs, Recorder } from './recorder'

interface Written {
  kind: string
  attrs: Attrs | undefined
  settle?: string
}

let stop: (() => void) | undefined
afterEach(() => stop?.())

async function setup() {
  const mock = createMockApi({ live: false })
  const api: ApiClient = {
    ...mock,
    measureGv: async (_light: number, box: GvBox) => ({
      box,
      pixels: box.w * box.h,
      mean: 40.25,
      std: 2,
      min: 30,
      max: 50,
      saturatedHigh: 0,
      saturatedLow: 0,
    }),
  }
  const app = createApp({}).provide(apiKey, api)
  const pinia = createPinia()
  app.use(pinia)
  setActivePinia(pinia)
  const stores: ObservedStores = app.runWithContext(() => ({
    app: useAppStore(),
    workbench: useWorkbenchStore(),
    measure: useMeasureStore(),
    teach: useTeachStore(),
    alignRoi: useAlignRoiStore(),
    calibration: useCalibrationStore(),
    settings: useSettingsStore(),
    config: useConfigStore(),
  }))
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['/', '/teach', '/review'].map((path) => ({ path, component: { render: () => null } })),
  })
  await router.push('/')

  const written: Written[] = []
  const recorder: Recorder = {
    record: (kind, attrs) => void written.push({ kind, attrs }),
    settle: (key, kind, attrs) => void written.push({ kind, attrs, settle: key }),
    flush: async () => {},
    dispose: () => {},
  }
  stop = observeOperations(recorder, router, stores)
  return { ...stores, router, written, recorder }
}

const last = (written: Written[]) => written[written.length - 1]

describe('observeOperations: what is written down', () => {
  it('pages', async () => {
    const { router, written } = await setup()
    await router.push('/teach')
    await router.push('/review')
    expect(written).toEqual([
      { kind: 'nav', attrs: { page: '/teach' } },
      { kind: 'nav', attrs: { page: '/review' } },
    ])
  })

  it('the toolbar: tool, light, channel and view', async () => {
    const { workbench, written } = await setup()
    workbench.toggleTool('gv')
    workbench.toggleTool('gv')
    workbench.light = 3
    workbench.channel = 'blue'
    workbench.view = 'skew'
    await nextTick()
    expect(written).toEqual([
      // A tool picked and put down again within one tick settles to where it ended (null -> null).
      { kind: 'light', attrs: { n: 3 } },
      { kind: 'channel', attrs: { name: 'blue' } },
      { kind: 'view', attrs: { name: 'skew' } },
    ])
    workbench.toggleTool('ruler')
    await nextTick()
    expect(last(written)).toEqual({ kind: 'tool', attrs: { name: 'ruler' } })
    workbench.toggleTool('ruler')
    await nextTick()
    expect(last(written)).toEqual({ kind: 'tool', attrs: { name: 'none' } })
  })

  it('the specification tree: node, checkbox, overlay, mode and panel tabs', async () => {
    const { teach, written } = await setup()
    await teach.load()
    const id = 'u-au-cpad'

    teach.select(id)
    expect(last(written)).toEqual({ kind: 'node.select', attrs: { id } })
    teach.select(null)
    expect(last(written)).toEqual({ kind: 'node.select', attrs: { id: 'none' } })

    const before = teach.checked[id]
    teach.toggleChecked(id)
    expect(last(written)).toEqual({ kind: 'node.check', attrs: { id, light: 2, on: !before } })

    teach.toggleOverlay('ac')
    expect(last(written)).toEqual({
      kind: 'overlay',
      attrs: { key: 'ac', mode: 'unit', on: true },
    })

    teach.mode = 'dummy'
    teach.section = 'analysis'
    teach.light = 3
    teach.channel = 'green'
    await nextTick()
    expect(written.slice(-4).map((w) => w.kind)).toEqual([
      'spec.mode',
      'teach.section',
      'teach.light',
      'teach.channel',
    ])
  })

  it('ROI edits of the Metal picture', async () => {
    const { alignRoi, written } = await setup()
    await alignRoi.load()

    alignRoi.setTool('rect')
    expect(last(written)).toEqual({ kind: 'roi.tool', attrs: { tool: 'rect' } })
    const id = alignRoi.add({ x: 10, y: 20, w: 30, h: 40 })
    expect(last(written)).toEqual({ kind: 'roi.add', attrs: { x: 10, y: 20, w: 30, h: 40 } })
    alignRoi.update(id, { x: 11, y: 21, w: 31, h: 41 })
    expect(last(written)).toEqual({
      kind: 'roi.edit',
      attrs: { id, x: 11, y: 21, w: 31, h: 41 },
    })
    alignRoi.removeSelected()
    expect(last(written)).toEqual({ kind: 'roi.del', attrs: { id } })
    alignRoi.undo()
    expect(last(written)).toEqual({ kind: 'roi.undo', attrs: {} })
    alignRoi.select('P4')
    expect(last(written)).toEqual({ kind: 'roi.select', attrs: { id: 'P4' } })
  })

  it('the GV box and the ruler, each once they have settled', async () => {
    const { measure, workbench, written } = await setup()
    await workbench.load()

    measure.setGvBox({ x: 100, y: 200, w: 300, h: 400 })
    await nextTick()
    expect(last(written)).toMatchObject({ kind: 'gv', settle: 'gv' })
    await flushPromises()
    expect(last(written)).toEqual({
      kind: 'gv',
      settle: 'gv',
      attrs: {
        light: 2,
        x: 100,
        y: 200,
        w: 300,
        h: 400,
        mean: 40.25,
        std: 2,
        min: 30,
        max: 50,
        px: 120000,
      },
    })
    measure.setGvBox(null)
    await nextTick()
    expect(last(written)).toEqual({ kind: 'gv.clear', attrs: undefined, settle: 'gv' })

    measure.setRuler({ from: { x: 5086, y: 2032 }, to: { x: 8590, y: 3836 } })
    await nextTick()
    expect(last(written)).toEqual({
      kind: 'ruler',
      settle: 'ruler',
      attrs: { x1: 5086, y1: 2032, x2: 8590, y2: 3836, len: Math.hypot(3504, 1804) },
    })
    measure.setRuler(null)
    await nextTick()
    expect(last(written)).toEqual({ kind: 'ruler.clear', attrs: undefined, settle: 'ruler' })

    measure.setGvTool('select')
    await nextTick()
    expect(last(written)).toEqual({ kind: 'gv.tool', attrs: { name: 'select' } })
  })

  it('the sliders and switches of CALIBRATE and SETTINGS; a slider drag settles', async () => {
    const { calibration, settings, written } = await setup()
    await calibration.load()
    await settings.load()

    calibration.setChannelOn(3, true)
    expect(last(written)).toEqual({ kind: 'cal.channel', attrs: { channel: 3, on: true } })
    calibration.setBrightness(3, 250)
    expect(last(written)).toEqual({
      kind: 'cal.brightness',
      attrs: { channel: 3, value: 250 },
      settle: 'cal.brightness.3',
    })
    calibration.setEnabled(false)
    expect(last(written)).toEqual({ kind: 'cal.enable', attrs: { on: false } })
    calibration.setPageIndex(2)
    expect(last(written)).toEqual({ kind: 'cal.page', attrs: { n: 2 } })

    settings.setMaskEnabled('metal', false)
    expect(last(written)).toEqual({ kind: 'mask.enable', attrs: { mask: 'metal', on: false } })
    settings.setMorphic('sr', 0.4)
    expect(last(written)).toEqual({
      kind: 'mask.morphic',
      attrs: { mask: 'sr', value: 0.4 },
      settle: 'mask.morphic.sr',
    })
    settings.setSensitivity('sr', 0.7)
    expect(last(written).settle).toBe('mask.sensitivity.sr')
    settings.setMaskLight('sr', '2')
    settings.setMaskChannel('sr', 'Red')
    settings.setInspectionLight(1, true)
    settings.setGlobalAlignLight(2)
    expect(written.slice(-4).map((w) => w.kind)).toEqual([
      'mask.light',
      'mask.channel',
      'insp.light',
      'align.light',
    ])
  })

  it('the values of the configuration panel', async () => {
    const { config, written } = await setup()
    await config.load()
    config.setValue('somekey', true)
    expect(last(written)).toEqual({ kind: 'config.set', attrs: { key: 'somekey', value: true } })
  })

  it('the dialogs of the rail, opened and closed', async () => {
    const { app, written } = await setup()
    app.loginOpen = true
    app.medianOpen = true
    await nextTick()
    app.loginOpen = false
    await nextTick()
    expect(written).toEqual([
      { kind: 'dialog', attrs: { name: 'login', open: true } },
      { kind: 'dialog', attrs: { name: 'median', open: true } },
      { kind: 'dialog', attrs: { name: 'login', open: false } },
    ])
  })

  it('nothing after it is stopped', async () => {
    const { workbench, router, written } = await setup()
    stop?.()
    stop = undefined
    workbench.light = 3
    await router.push('/teach')
    await nextTick()
    expect(written).toEqual([])
  })

  it('leaves out the actions Go writes down itself and the ones that only load', async () => {
    const { app, written, workbench } = await setup()
    await app.selectModel('21csp043-09')
    await workbench.load()
    expect(written).toEqual([])
  })
})

describe('the rules', () => {
  it('name actions the stores really have', async () => {
    const { ...stores } = await setup()
    const observed = stores as unknown as ObservedStores
    for (const [storeName, rules] of Object.entries(actionRules(observed))) {
      const store = (observed as unknown as Record<string, Record<string, unknown>>)[storeName]
      for (const action of Object.keys(rules)) {
        expect(typeof store[action], `${storeName}.${action}`).toBe('function')
      }
    }
  })

  it('give every operation a kind the journal accepts', async () => {
    const stores = await setup()
    const accepted = /^[A-Za-z_][A-Za-z0-9_.-]*$/
    for (const rules of Object.values(actionRules(stores as unknown as ObservedStores))) {
      for (const rule of Object.values(rules)) expect(rule.kind).toMatch(accepted)
    }
  })
})
