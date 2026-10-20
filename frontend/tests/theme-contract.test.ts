import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const styles = join(import.meta.dirname, '../src/styles')
const src = join(import.meta.dirname, '../src')

const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

/** Names of the custom properties a stylesheet declares ("--card: #fff;"). */
const declared = (css: string) =>
  new Set([...stripComments(css).matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((m) => m[1]!))

/** Names of the custom properties it reads ("var(--card)"). */
const referenced = (css: string) =>
  new Set([...stripComments(css).matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]!))

const themeFiles = readdirSync(join(styles, 'themes')).filter((f) => f.endsWith('.css'))
const themeCss = (file: string) => readFileSync(join(styles, 'themes', file), 'utf8')
const themeCss0 = themeCss(themeFiles[0]!)

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) yield* walk(path)
    else yield path
  }
}

describe('themes', () => {
  it('there is at least one', () => {
    expect(themeFiles.length).toBeGreaterThan(0)
  })

  it.each(themeFiles)('%s declares the same tokens as the first theme', (file) => {
    expect([...declared(themeCss(file))].sort()).toEqual([...declared(themeCss0)].sort())
  })

  it('theme.css reads only tokens a theme declares, and every theme token is used', () => {
    const exposed = readFileSync(join(styles, 'theme.css'), 'utf8')
    const tokens = declared(themeCss0)
    // --color-* etc. are Tailwind's own namespaces declared in theme.css itself.
    const own = declared(exposed)
    const read = [...referenced(exposed)].filter((name) => !own.has(name))

    expect(read.filter((name) => !tokens.has(name))).toEqual([])
    expect([...tokens].filter((name) => !referenced(exposed).has(name))).toEqual([])
  })
})

describe('raw colours', () => {
  // Colours live in themes/*.css. shadcn-vue's own files (components/ui) and the tests are exempt.
  const files = [...walk(src)].filter(
    (f) =>
      /\.(vue|ts|css)$/.test(f) &&
      !f.includes(`${join(src, 'components/ui')}`) &&
      !f.includes(join(src, 'styles/themes')) &&
      !f.endsWith('generated.css') &&
      !f.endsWith('.test.ts'),
  )

  it('scans the sources', () => {
    expect(files.length).toBeGreaterThan(20)
  })

  // The palette is closed (theme.css): a class like text-red-500 does not exist and would
  // silently style nothing.
  const palette =
    /\b(?:bg|text|border|ring|fill|stroke|from|to|via|outline|divide|decoration|shadow)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}\b/g

  it.each(files.map((f) => relative(src, f)))('%s uses no palette colour classes', (name) => {
    expect(readFileSync(join(src, name), 'utf8').match(palette) ?? []).toEqual([])
  })

  it.each(files.map((f) => relative(src, f)))('%s has no hex/rgb/hsl colour', (name) => {
    const text = readFileSync(join(src, name), 'utf8')
    const colours = text.match(/#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch)\(/g)
    // theme.css may name the two built-in colours.
    const allowed =
      name === join('styles', 'theme.css') ? new Set(['#ffffff', '#000000']) : new Set()
    expect((colours ?? []).filter((c) => !allowed.has(c.toLowerCase()))).toEqual([])
  })
})
