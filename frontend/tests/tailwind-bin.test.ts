import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveTailwindBin } from '../tools/vite-plugin-tailwind-cli.ts'

const exe = process.platform === 'win32' ? 'tailwindcss.exe' : 'tailwindcss'

function fakeBin(dir: string): string {
  mkdirSync(dir, { recursive: true })
  const file = join(dir, exe)
  writeFileSync(file, '')
  chmodSync(file, 0o755)
  return file
}

describe('resolveTailwindBin', () => {
  const base = mkdtempSync(join(tmpdir(), 'afvi-tw-'))
  const root = join(base, 'repo', 'frontend')
  const noEnv = { PATH: '' }

  it('finds nothing when there is nothing', () => {
    expect(resolveTailwindBin(root, noEnv)).toBeUndefined()
  })

  it('prefers TAILWINDCSS_BIN, then AFVI_TOOLS_DIR, then .tools, then PATH', () => {
    const onPath = fakeBin(join(base, 'path'))
    const inRepo = fakeBin(join(base, 'repo', '.tools', 'bin'))
    const inToolsDir = fakeBin(join(base, 'cache', 'tools', 'bin'))
    const explicit = fakeBin(join(base, 'explicit'))

    const env = {
      PATH: join(base, 'path'),
      AFVI_TOOLS_DIR: join(base, 'cache', 'tools'),
      TAILWINDCSS_BIN: explicit,
    }
    expect(resolveTailwindBin(root, env)).toBe(explicit)
    expect(resolveTailwindBin(root, { ...env, TAILWINDCSS_BIN: undefined })).toBe(inToolsDir)
    expect(resolveTailwindBin(root, { PATH: env.PATH })).toBe(inRepo)
    expect(resolveTailwindBin(join(base, 'elsewhere'), { PATH: env.PATH })).toBe(onPath)
  })

  it('skips a configured path that does not exist', () => {
    const inRepo = fakeBin(join(base, 'repo', '.tools', 'bin'))
    expect(resolveTailwindBin(root, { ...noEnv, TAILWINDCSS_BIN: join(base, 'missing') })).toBe(
      inRepo,
    )
  })
})
