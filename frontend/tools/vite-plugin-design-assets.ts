import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve, sep } from 'node:path'
import type { Plugin } from 'vite'

const contentTypes: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
}

/**
 * Dev server only: serves <repo>/design/** under /__design/**, the images of the design overlay
 * (src/dev/DesignOverlay.vue, docs/UI_WORKFLOW.md). Nothing of it reaches a production build.
 */
export function designAssets(dir = '../design'): Plugin {
  return {
    name: 'afvi:design-assets',
    apply: 'serve',
    configureServer(server) {
      const root = resolve(server.config.root, dir)
      server.middlewares.use('/__design', (req, res, next) => {
        const relative = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/')
        const file = normalize(join(root, relative))
        const type = contentTypes[extname(file).toLowerCase()]
        // Only images, only below design/ (no ../ out of it).
        if (
          !type ||
          !file.startsWith(root + sep) ||
          !existsSync(file) ||
          !statSync(file).isFile()
        ) {
          next()
          return
        }
        res.setHeader('Content-Type', type)
        res.setHeader('Cache-Control', 'no-store')
        createReadStream(file).pipe(res)
      })
    },
  }
}
