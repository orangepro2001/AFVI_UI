import type { App } from 'vue'
import { useTeachStore } from '@/stores/teach'
import { useWorkbenchStore, type ToolId } from '@/stores/workbench'

const tools: ToolId[] = ['ruler', 'gv']

/**
 * Puts the application into a state a reference image shows (?tool=gv, ?spec=dummy), so that a
 * design overlay can be compared without clicking. Only imported under import.meta.env.DEV (main.ts).
 */
export function applyPreset(params: URLSearchParams, app: App): void {
  const tool = tools.find((id) => id === params.get('tool'))
  app.runWithContext(() => {
    if (tool) useWorkbenchStore().toggleTool(tool)
    if (params.get('spec') === 'dummy') useTeachStore().mode = 'dummy'
  })
}
