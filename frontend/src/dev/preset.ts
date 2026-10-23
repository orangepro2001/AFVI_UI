import type { App } from 'vue'
import { useAppStore } from '@/stores/app'
import { useMeasureStore } from '@/stores/measure'
import { useTeachStore } from '@/stores/teach'
import { useWorkbenchStore, type ToolId } from '@/stores/workbench'

const tools: ToolId[] = ['ruler', 'gv']

/**
 * What `top-toolbar-gv.png` and `top-toolbar-ruler.png` show on the picture, in pixels of the
 * design's strip (WH 16384 x 12080): the GV box is x 220.3, y 113, 152.4 x 98.5 on the 726 x 534
 * picture; the ruler's labels give its ends.
 */
const referenceGvBox = { x: 4972, y: 2556, w: 3439, h: 2228 }
const referenceRuler = { from: { x: 5086, y: 2032 }, to: { x: 8590, y: 3836 } }

/** ?node=<alias> picks a node of the Unit tree; any other value is taken as a node id. */
const nodes: Record<string, string> = {
  metal: 'u-metal',
  sr: 'u-sr',
  dmg: 'u-dmg',
  pad: 'u-au-cpad',
  nonmetal: 'u-nonmetal-sr-all',
  'user-mask': 'u-etc-user-mask',
}

/**
 * Puts the application into a state a reference image shows, so that a design overlay can be
 * compared without clicking. Only imported under import.meta.env.DEV (main.ts).
 *
 *   ?tool=gv|ruler     toolbar tool, with the box / line the reference image shows
 *   ?spec=dummy        Dummy tab of the specification
 *   ?node=metal|sr|dmg|pad|nonmetal|user-mask|<id>   selected node of the tree
 *   ?pointer=x,y       the pointer has been over the picture: XY of the read-out bar
 *   ?dialog=login|model|grab|generate|median|config|connector   one of the rail's dialogs (open on any ?route)
 *   ?busy=1            the "Please wait..." overlay (stays until the page is reloaded)
 *   ?scroll=bottom|<px>   the specification tree scrolled to its end, or by that many pixels
 */
export function applyPreset(params: URLSearchParams, app: App): void {
  const tool = tools.find((id) => id === params.get('tool'))
  const node = params.get('node')
  const pointer = params.get('pointer')?.split(',').map(Number)

  app.runWithContext(() => {
    if (tool) {
      useWorkbenchStore().toggleTool(tool)
      if (tool === 'gv') useMeasureStore().setGvBox(referenceGvBox)
      else useMeasureStore().setRuler(referenceRuler)
    }
    if (params.get('spec') === 'dummy') useTeachStore().mode = 'dummy'
    if (node) useTeachStore().select(nodes[node] ?? node)
    if (pointer && pointer.length === 2 && pointer.every(Number.isFinite)) {
      const workbench = useWorkbenchStore()
      void workbench.load().then(() => {
        workbench.setReadout({ xy: { x: pointer[0]!, y: pointer[1]! }, rgb: [0, 0, 0] })
        workbench.pointerSeen = true
      })
    }
    const app = useAppStore()
    switch (params.get('dialog')) {
      case 'login':
        app.loginOpen = true
        break
      case 'model':
        app.modelOpen = true
        break
      case 'grab':
        app.grabOpen = true
        break
      case 'generate':
        app.generateOpen = true
        break
      case 'median':
        app.medianOpen = true
        break
      case 'config':
        app.configOpen = true
        break
      case 'connector':
        app.connectorOpen = true
        break
    }
    if (params.get('busy') === '1') app.busy = true
  })

  const scroll = params.get('scroll')
  if (scroll === 'bottom' || (scroll !== null && Number.isFinite(Number(scroll)))) {
    // The tree exists once the TEACH page has loaded its snapshot: wait for it to show up.
    const timer = setInterval(() => {
      const scroller = document.querySelector<HTMLElement>('[data-spec-scroller]')
      if (!scroller || scroller.scrollHeight <= scroller.clientHeight) return
      scroller.scrollTop = scroll === 'bottom' ? scroller.scrollHeight : Number(scroll)
      clearInterval(timer)
    }, 100)
    setTimeout(() => clearInterval(timer), 5000)
  }
}
