import { watch } from 'vue'
import type { Router } from 'vue-router'
import type { Attrs, Recorder } from './recorder'
import type { useAlignRoiStore } from '@/stores/alignRoi'
import type { useAppStore } from '@/stores/app'
import type { useCalibrationStore } from '@/stores/calibration'
import type { useConfigStore } from '@/stores/config'
import type { useMeasureStore } from '@/stores/measure'
import type { useSettingsStore } from '@/stores/settings'
import type { useTeachStore } from '@/stores/teach'
import type { useWorkbenchStore } from '@/stores/workbench'

/** The stores whose changes are the user's operations. */
export interface ObservedStores {
  app: ReturnType<typeof useAppStore>
  workbench: ReturnType<typeof useWorkbenchStore>
  measure: ReturnType<typeof useMeasureStore>
  teach: ReturnType<typeof useTeachStore>
  alignRoi: ReturnType<typeof useAlignRoiStore>
  calibration: ReturnType<typeof useCalibrationStore>
  settings: ReturnType<typeof useSettingsStore>
  config: ReturnType<typeof useConfigStore>
}

/**
 * What one action of a store is written down as. `attrs` describes the call from its arguments
 * (and from the store as it is before the call), `after` adds what the call did. `settle` names a
 * run of the same action (a slider being dragged): only its last call is written.
 */
interface Rule {
  kind: string
  attrs?: (args: unknown[]) => Attrs
  after?: (args: unknown[]) => Attrs
  settle?: (args: unknown[]) => string
}

type Rules = Record<string, Rule>

/** The rect an argument holds, as x, y, w, h. */
const rect = (value: unknown): Attrs => {
  const r = (value ?? {}) as Record<string, number>
  return { x: r.x, y: r.y, w: r.w, h: r.h }
}

/**
 * Every action of the user's that is written down, by store and action name. Actions that only
 * load data, and the ones Go writes down itself (model, Connector and ROI saves), are not here.
 * The journal's kinds are listed in design/spec/96-journal.md.
 */
export function actionRules(s: ObservedStores): Record<string, Rules> {
  return {
    teach: {
      select: { kind: 'node.select', attrs: (a) => ({ id: (a[0] as string | null) ?? 'none' }) },
      toggleChecked: {
        kind: 'node.check',
        attrs: (a) => ({ id: a[0] as string, light: s.teach.light }),
        after: (a) => ({ on: s.teach.checked[a[0] as string] }),
      },
      toggleOverlay: {
        kind: 'overlay',
        attrs: (a) => ({ key: a[0] as string, mode: s.teach.mode }),
        after: (a) => ({ on: s.teach.overlay?.[s.teach.mode][a[0] as 'mk'] }),
      },
      toggleAnalysisRow: {
        kind: 'row.toggle',
        attrs: (a) => ({ table: a[0] as string, no: a[1] as number, light: s.teach.light }),
      },
    },
    alignRoi: {
      select: { kind: 'roi.select', attrs: (a) => ({ id: (a[0] as string | null) ?? 'none' }) },
      setTool: { kind: 'roi.tool', attrs: (a) => ({ tool: a[0] as string }) },
      add: { kind: 'roi.add', attrs: (a) => rect(a[0]) },
      update: { kind: 'roi.edit', attrs: (a) => ({ id: a[0] as string, ...rect(a[1]) }) },
      removeSelected: { kind: 'roi.del', attrs: () => ({ id: s.alignRoi.selectedId }) },
      undo: { kind: 'roi.undo' },
    },
    calibration: {
      setChannelOn: {
        kind: 'cal.channel',
        attrs: (a) => ({ channel: a[0] as number, on: a[1] as boolean }),
      },
      setBrightness: {
        kind: 'cal.brightness',
        attrs: (a) => ({ channel: a[0] as number, value: a[1] as number }),
        settle: (a) => `cal.brightness.${a[0]}`,
      },
      setEnabled: { kind: 'cal.enable', attrs: (a) => ({ on: a[0] as boolean }) },
      setPageIndex: { kind: 'cal.page', attrs: (a) => ({ n: a[0] as number }) },
    },
    settings: {
      setMaskEnabled: {
        kind: 'mask.enable',
        attrs: (a) => ({ mask: a[0] as string, on: a[1] as boolean }),
      },
      setMorphic: {
        kind: 'mask.morphic',
        attrs: (a) => ({ mask: a[0] as string, value: a[1] as number }),
        settle: (a) => `mask.morphic.${a[0]}`,
      },
      setSensitivity: {
        kind: 'mask.sensitivity',
        attrs: (a) => ({ mask: a[0] as string, value: a[1] as number }),
        settle: (a) => `mask.sensitivity.${a[0]}`,
      },
      setMaskLight: {
        kind: 'mask.light',
        attrs: (a) => ({ mask: a[0] as string, light: a[1] as string }),
      },
      setMaskChannel: {
        kind: 'mask.channel',
        attrs: (a) => ({ mask: a[0] as string, channel: a[1] as string }),
      },
      setInspectionLight: {
        kind: 'insp.light',
        attrs: (a) => ({ light: a[0] as number, on: a[1] as boolean }),
      },
      setGlobalAlignLight: { kind: 'align.light', attrs: (a) => ({ light: a[0] as number }) },
    },
    config: {
      setValue: {
        kind: 'config.set',
        attrs: (a) => ({ key: a[0] as string, value: a[1] as string | boolean }),
      },
    },
  }
}

/** The dialogs of the rail: the flag of the app store that opens each. */
const dialogs = ['login', 'model', 'grab', 'generate', 'median', 'config', 'connector'] as const

/**
 * Writes down what the user does, as the stores change: pages, tools, lights, boxes and lines,
 * node and ROI edits, panel switches, dialogs. It watches the stores and does not touch them, so
 * the components stay as they are. Returns a function that stops it.
 *
 * Gestures are written when they are over (the last value of a drag, not every step of it).
 */
export function observeOperations(
  recorder: Recorder,
  router: Router,
  stores: ObservedStores,
): () => void {
  const stops: Array<() => void> = []
  const { app, workbench, measure, teach } = stores

  const on = <T>(source: () => T, write: (value: T, before: T | undefined) => void) => {
    stops.push(watch(source, (value, before) => write(value, before)))
  }

  stops.push(
    router.afterEach((to, _from, failure) => {
      if (!failure) recorder.record('nav', { page: to.path })
    }),
  )

  // Actions of the stores.
  for (const [storeName, rules] of Object.entries(actionRules(stores))) {
    const store = (stores as unknown as Record<string, ObservedStores[keyof ObservedStores]>)[
      storeName
    ]
    stops.push(
      store.$onAction(({ name, args, after }) => {
        const rule = rules[name]
        if (!rule) return
        const attrs = rule.attrs?.(args)
        const write = (extra?: Attrs) => {
          const all = { ...attrs, ...extra }
          if (rule.settle) recorder.settle(rule.settle(args), rule.kind, all)
          else recorder.record(rule.kind, all)
        }
        if (rule.after) after(() => write(rule.after?.(args)))
        else write()
      }),
    )
  }

  // The toolbar.
  on(
    () => workbench.tool,
    (tool) => recorder.record('tool', { name: tool ?? 'none' }),
  )
  on(
    () => workbench.light,
    (n) => recorder.record('light', { n }),
  )
  on(
    () => workbench.channel,
    (name) => recorder.record('channel', { name }),
  )
  on(
    () => workbench.view,
    (name) => recorder.record('view', { name }),
  )

  // The TEACH panel.
  on(
    () => teach.mode,
    (name) => recorder.record('spec.mode', { name }),
  )
  on(
    () => teach.section,
    (name) => recorder.record('teach.section', { name }),
  )
  on(
    () => teach.light,
    (n) => recorder.record('teach.light', { n }),
  )
  on(
    () => teach.channel,
    (name) => recorder.record('teach.channel', { name }),
  )

  // The GV box: where it ended and what was measured in it.
  on(
    () => measure.gvTool,
    (name) => recorder.record('gv.tool', { name }),
  )
  on(
    () => [measure.gvBox, measure.stats] as const,
    ([box, stats]) => {
      if (!box) {
        recorder.settle('gv', 'gv.clear')
        return
      }
      const measured = stats && stats.box.x === box.x ? stats : null
      recorder.settle('gv', 'gv', {
        light: workbench.median?.light ?? workbench.light,
        ...rect(box),
        mean: measured?.mean,
        std: measured?.std,
        min: measured?.min,
        max: measured?.max,
        px: measured?.pixels,
      })
    },
  )

  // The ruler: its two ends and its length.
  on(
    () => measure.ruler,
    (line) => {
      if (!line) {
        recorder.settle('ruler', 'ruler.clear')
        return
      }
      recorder.settle('ruler', 'ruler', {
        x1: line.from.x,
        y1: line.from.y,
        x2: line.to.x,
        y2: line.to.y,
        len: Math.hypot(line.to.x - line.from.x, line.to.y - line.from.y),
      })
    },
  )

  // The dialogs of the rail.
  for (const name of dialogs) {
    const flag = `${name}Open` as const
    on(
      () => app[flag],
      (open) => recorder.record('dialog', { name, open }),
    )
  }

  return () => stops.forEach((stop) => stop())
}
