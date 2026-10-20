export type GenerateLight = 'all' | 1 | 2 | 3

export interface GenerateOptions {
  light: GenerateLight
  mt: boolean
  sr: boolean
}

export function defaultGenerateOptions(): GenerateOptions {
  return { light: 2, mt: true, sr: true }
}

export function canGenerate(options: GenerateOptions): boolean {
  return options.mt || options.sr
}
