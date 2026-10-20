import { type ChildProcess, execFileSync, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { delimiter, join, resolve } from 'node:path'
import type { Plugin } from 'vite'

/**
 * Runs the Tailwind CSS standalone executable (no npm package) from Vite:
 *
 * - `vite build`: one minified run before bundling.
 * - `vite` (dev): one run, then `--watch` for as long as the dev server lives. The result is a
 *   plain CSS file that main.ts imports, so Vite's HMR picks every change up.
 *
 * The executable comes from scripts/tools.sh (see resolveTailwindBin for where it is looked for).
 */
export interface TailwindCliOptions {
  /** Tailwind entry CSS, relative to the Vite root. */
  input: string
  /** Generated CSS (git-ignored), relative to the Vite root. */
  output: string
}

const exeName = process.platform === 'win32' ? 'tailwindcss.exe' : 'tailwindcss'

/**
 * Looks for the executable, first match wins:
 * TAILWINDCSS_BIN, $AFVI_TOOLS_DIR/bin, <repo>/.tools/bin (scripts/tools.sh), then PATH.
 */
export function resolveTailwindBin(
  root: string,
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const candidates = [
    env.TAILWINDCSS_BIN,
    env.AFVI_TOOLS_DIR ? join(env.AFVI_TOOLS_DIR, 'bin', exeName) : undefined,
    resolve(root, '..', '.tools', 'bin', exeName),
    ...(env.PATH ?? '').split(delimiter).map((dir) => join(dir, exeName)),
  ]
  return candidates.find((file): file is string => !!file && existsSync(file))
}

export function tailwindCli(options: TailwindCliOptions): Plugin {
  let root = ''
  let bin = ''
  let child: ChildProcess | undefined

  const cliArgs = (...extra: string[]) => ['-i', options.input, '-o', options.output, ...extra]
  const runOnce = (...extra: string[]) =>
    execFileSync(bin, cliArgs(...extra), { cwd: root, stdio: 'inherit' })
  const stopWatch = () => {
    child?.kill()
    child = undefined
  }

  return {
    name: 'afvi:tailwind-cli',
    enforce: 'pre',
    // Vitest runs a Vite server too; the tests never import the generated CSS.
    apply: () => !process.env.VITEST,

    configResolved(config) {
      root = config.root
      const found = resolveTailwindBin(root)
      if (!found) {
        throw new Error(
          'Tailwind CSS executable not found. Run scripts/tools.sh (or set TAILWINDCSS_BIN).',
        )
      }
      bin = found
    },

    buildStart() {
      if (this.environment.mode === 'build') runOnce('--minify')
    },

    configureServer(server) {
      runOnce()
      // stdin stays an open pipe on purpose: `--watch` ends when stdin closes, so the watcher
      // goes away with this process even if it is killed without a chance to clean up.
      child = spawn(bin, cliArgs('--watch'), { cwd: root, stdio: ['pipe', 'inherit', 'inherit'] })
      server.httpServer?.once('close', stopWatch)
      process.once('exit', stopWatch)
    },

    closeBundle: stopWatch,
  }
}
