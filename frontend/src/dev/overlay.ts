import { createApp, h } from 'vue'
import DesignOverlay from './DesignOverlay.vue'

/**
 * Mounts the design overlay when the URL asks for it (?design=<image>). Only imported under
 * import.meta.env.DEV (main.ts), so a production build contains none of src/dev.
 */
export function mountDesignOverlay(params: URLSearchParams): void {
  const image = params.get('design')
  if (!image) return

  const host = document.createElement('div')
  document.body.append(host)
  const blend = params.get('blend') === 'difference' ? 'difference' : 'normal'
  createApp({
    render: () =>
      h(DesignOverlay, {
        image,
        blend,
        opacity: Number(params.get('opacity') ?? 0.5),
        dx: Number(params.get('dx') ?? 0),
        dy: Number(params.get('dy') ?? 0),
        controls: params.get('controls') !== '0',
      }),
  }).mount(host)
}
